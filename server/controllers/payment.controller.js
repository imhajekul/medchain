import Razorpay from 'razorpay';
import crypto from 'crypto';
import { db } from '../db.js';

// Conversion rate: 1 POL = 500 INR (0.10 POL = 50 INR)
const POL_INR_RATE = 500;

/**
 * POST /api/payment/create-order
 * Creates a real Razorpay UPI order and stores an initial pending payment record in MongoDB.
 */
export async function createRazorpayOrder(req, res) {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret || keyId.includes('placeholder')) {
      return res.status(400).json({
        error: 'Razorpay Gateway is not configured. Please define RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in server/.env.'
      });
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });

    const user = req.user;
    const walletAddress = (req.body.walletAddress || user?.walletAddress || '').toLowerCase();
    const userId = req.body.userId || user?.id || (walletAddress ? `usr_${walletAddress.slice(2, 10)}` : 'usr_default');
    const amountInINR = Number(req.body.amount || req.body.amountInr) || 50;

    if (!walletAddress) {
      return res.status(400).json({ error: 'walletAddress is required.' });
    }

    if (amountInINR < 10) {
      return res.status(400).json({ error: 'Minimum top-up amount is ₹10.' });
    }

    // Token equivalent (e.g. ₹50 -> 0.1 POL, ₹100 -> 0.2 POL, ₹250 -> 0.5 POL)
    const tokenCredit = amountInINR === 50 ? "0.1" : (amountInINR === 100 ? "0.2" : (amountInINR === 250 ? "0.5" : (amountInINR / POL_INR_RATE).toFixed(4).toString()));
    const amountInPaise = Math.round(amountInINR * 100);
    const receipt = `rcpt_${Date.now()}`;

    // Real order creation via official Razorpay SDK
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt,
      notes: {
        walletAddress,
        userId: String(userId),
        tokenCredit
      }
    });

    // Store initial payment record in MongoDB with status "pending"
    await db.createPayment({
      orderId: order.id,
      walletAddress,
      userId: String(userId),
      amountPaise: order.amount,
      amountInr: amountInINR,
      polAmount: Number(tokenCredit),
      currency: order.currency || "INR",
      status: "pending",
      method: "UPI",
      notes: {
        receipt,
        walletAddress,
        userId: String(userId),
        tokenCredit
      },
      created_at: new Date()
    });

    // Store initial pending payment record in audit_logs
    await db.logAuditEvent({
      actorAddress: walletAddress,
      actionType: 'PAYMENT_PENDING',
      context: `Order ${order.id} initiated for ₹${amountInINR} (${tokenCredit} POL)`,
      txHash: order.id
    });

    return res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency || "INR",
      keyId,
      polAmount: Number(tokenCredit)
    });
  } catch (err) {
    console.error('[Create Razorpay Order Error]:', err);
    return res.status(500).json({ error: 'Failed to create Razorpay payment order', details: err.message });
  }
}

/**
 * POST /api/payment/webhook
 * Secure Webhook handler with HMAC SHA-256 signature verification.
 */
export async function handleRazorpayWebhook(req, res) {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    // Verify webhook signature using HMAC SHA-256 against rawBody buffer
    if (webhookSecret) {
      const rawBody = req.rawBody ? req.rawBody : Buffer.from(JSON.stringify(req.body));
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (expectedSignature !== signature) {
        console.warn('⚠️ Razorpay webhook HMAC signature mismatch.');
        return res.status(400).json({ error: 'Invalid webhook signature' });
      }
    }

    const eventData = req.body;
    const eventType = eventData.event;
    console.log(`🔔 Received Razorpay Webhook Event: "${eventType}"`);

    // Handle payment.captured or order.paid
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = eventData.payload?.payment?.entity || {};
      const notes = paymentEntity.notes || {};
      const paymentId = paymentEntity.id;
      const orderId = paymentEntity.order_id;
      const amountPaise = paymentEntity.amount;
      const amountInINR = amountPaise ? amountPaise / 100 : 50;

      const walletAddress = (notes.walletAddress || '').toLowerCase();
      const userId = notes.userId || '';
      const tokenCredit = notes.tokenCredit ? Number(notes.tokenCredit) : Number((amountInINR / POL_INR_RATE).toFixed(4));

      // Idempotency check: Ensure this payment_id hasn't already been processed
      const existingPayment = orderId ? await db.getPayment(orderId) : null;
      const existingPaymentById = paymentId ? await db.getPaymentByPaymentId(paymentId) : null;
      if ((existingPayment && existingPayment.status === 'confirmed') || (existingPaymentById && existingPaymentById.status === 'confirmed')) {
        console.log(`ℹ️ Payment order ${orderId} / payment ${paymentId} has already been confirmed.`);
        return res.status(200).json({ status: "ok", message: "Already processed" });
      }

      let targetWallet = walletAddress;
      if (!targetWallet && existingPayment) {
        targetWallet = existingPayment.user_address || existingPayment.walletAddress;
      }

      if (targetWallet) {
        // Update payment status to "confirmed"
        if (orderId) {
          await db.updatePayment(orderId, {
            payment_id: paymentId,
            status: "confirmed",
            webhook_event: eventType,
            confirmed_at: new Date()
          });
        }

        // Atomically increment the user's POL balance in MongoDB
        await db.creditWalletBalance(targetWallet, tokenCredit, {
          paymentId,
          orderId,
          amountInr: amountInINR,
          method: 'Received via UPI (Razorpay Verified)',
          from: 'Razorpay UPI Gateway',
          description: `Received via UPI (Razorpay Verified) • ${tokenCredit} POL (₹${amountInINR})`
        });

        // Record the verified event in audit_logs with transaction ID and note
        await db.logAuditEvent({
          actorAddress: targetWallet,
          actionType: 'PAYMENT_CONFIRMED',
          context: 'Received via UPI (Razorpay Verified)',
          txHash: paymentId
        });

        console.log(`✅ Webhook verified & confirmed: credited ${tokenCredit} POL to ${targetWallet}`);
      }
    }

    return res.status(200).json({ status: "ok" });
  } catch (err) {
    console.error('[Razorpay Webhook Error]:', err);
    return res.status(500).json({ error: 'Webhook processing failed', details: err.message });
  }
}

/**
 * GET /api/payment/status
 * Polling endpoint to check payment order status.
 */
export async function getPaymentStatus(req, res) {
  try {
    const orderId = req.query.orderId || req.params.orderId;
    if (!orderId) {
      return res.status(400).json({ error: 'orderId parameter is required.' });
    }

    const payment = await db.getPayment(orderId);
    if (!payment) {
      return res.status(404).json({ error: 'Payment order not found.' });
    }

    return res.status(200).json({
      orderId: payment.order_id,
      status: payment.status,
      paymentId: payment.payment_id || null,
      amountInr: payment.amount_inr,
      polAmount: payment.pol_amount,
      confirmed: payment.status === 'confirmed'
    });
  } catch (err) {
    console.error('[Get Payment Status Error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve payment status', details: err.message });
  }
}

/**
 * POST /api/payment/verify
 * Optional client signature verification callback.
 */
export async function verifyRazorpayPayment(req, res) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const keySecret = process.env.RAZORPAY_KEY_SECRET || RAZORPAY_KEY_SECRET;

    if (keySecret && razorpay_order_id && razorpay_payment_id && razorpay_signature) {
      const generatedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (generatedSignature !== razorpay_signature) {
        return res.status(400).json({ error: 'Invalid Razorpay payment signature.' });
      }
    }

    const payment = await db.getPayment(razorpay_order_id);
    return res.status(200).json({
      success: true,
      verified: true,
      status: payment?.status || 'pending',
      orderId: razorpay_order_id
    });
  } catch (err) {
    console.error('[Verify Payment Error]:', err);
    return res.status(500).json({ error: 'Failed to verify payment', details: err.message });
  }
}

/**
 * GET /api/wallet/balance
 * Returns user's current MongoDB wallet balance & recent transactions.
 */
export async function getWalletBalance(req, res) {
  try {
    const user = req.user;
    if (!user || !user.walletAddress) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const walletInfo = await db.getUserWallet(user.walletAddress);
    return res.status(200).json({
      success: true,
      walletAddress: walletInfo.walletAddress,
      balance: walletInfo.balance,
      currency: 'POL',
      inrEquivalent: Math.round(walletInfo.balance * POL_INR_RATE),
      transactions: walletInfo.transactions
    });
  } catch (err) {
    console.error('[Get Wallet Balance Error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve wallet balance', details: err.message });
  }
}

/**
 * GET /api/wallet/transactions
 * Returns user's complete transaction history.
 */
export async function getWalletTransactions(req, res) {
  try {
    const user = req.user;
    if (!user || !user.walletAddress) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const walletInfo = await db.getUserWallet(user.walletAddress);
    return res.status(200).json({
      success: true,
      transactions: walletInfo.transactions
    });
  } catch (err) {
    console.error('[Get Wallet Transactions Error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve wallet transactions', details: err.message });
  }
}
