import crypto from 'crypto';
import { db } from '../db.js';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_medvault';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'medvault_secret_key';
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'medvault_webhook_secret';

// Conversion rate: 1 POL = 500 INR (0.10 POL = 50 INR)
const POL_INR_RATE = 500;

// Helper to check if production / live Razorpay credentials exist
function isRealRazorpayConfigured() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  return Boolean(
    keyId &&
    keySecret &&
    !keyId.includes('test_medvault') &&
    !keyId.includes('rzp_test_medvault')
  );
}

/**
 * POST /api/payments/razorpay/create-order
 * Initiates a Razorpay UPI order for wallet top-up.
 */
export async function createRazorpayOrder(req, res) {
  try {
    const user = req.user;
    if (!user || !user.walletAddress) {
      return res.status(401).json({ error: 'Authentication required: No verified wallet session.' });
    }

    const walletAddress = user.walletAddress.toLowerCase();
    const amountInr = Number(req.body.amountInr) || 50; // Default ₹50 for 0.10 POL

    if (amountInr < 10) {
      return res.status(400).json({ error: 'Minimum top-up amount is ₹10.' });
    }

    const polAmount = Number((amountInr / POL_INR_RATE).toFixed(4));
    const amountPaise = Math.round(amountInr * 100);
    const receipt = `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const hasLiveKeys = isRealRazorpayConfigured();

    let orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // If live/valid Razorpay credentials provided, call official Razorpay Orders API
    if (hasLiveKeys) {
      try {
        const authHeader = 'Basic ' + Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
        const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader
          },
          body: JSON.stringify({
            amount: amountPaise,
            currency: 'INR',
            receipt,
            payment_capture: 1,
            notes: {
              walletAddress,
              polAmount,
              userEmail: user.email || ''
            }
          })
        });

        if (rzpResponse.ok) {
          const rzpData = await rzpResponse.json();
          orderId = rzpData.id;
        } else {
          console.warn('⚠️ Razorpay upstream API returned error:', await rzpResponse.text());
        }
      } catch (upstreamErr) {
        console.warn('⚠️ Razorpay API fetch failed:', upstreamErr.message);
      }
    }

    // Persist order in MongoDB payments collection
    await db.createPayment({
      orderId,
      walletAddress,
      amountPaise,
      amountInr,
      polAmount,
      currency: 'INR',
      status: hasLiveKeys ? 'CREATED' : 'TEST_MODE_PENDING',
      method: 'UPI',
      notes: {
        receipt,
        userEmail: user.email || '',
        isTestMode: !hasLiveKeys
      }
    });

    return res.status(200).json({
      success: true,
      orderId,
      amount: amountPaise,
      amountInr,
      polAmount,
      currency: 'INR',
      keyId: hasLiveKeys ? process.env.RAZORPAY_KEY_ID : null,
      isTestMode: !hasLiveKeys,
      receipt,
      message: hasLiveKeys ? 'Order created successfully' : 'UPI Gateway in Test Mode: Real funds transfer is disabled'
    });
  } catch (err) {
    console.error('[Create Razorpay Order Error]:', err);
    return res.status(500).json({ error: 'Failed to create payment order', details: err.message });
  }
}

/**
 * POST /api/payments/razorpay/verify
 * Verifies Razorpay payment signature & status.
 * Rejects simulation when gateway is in Test Mode.
 */
export async function verifyRazorpayPayment(req, res) {
  try {
    const user = req.user;
    if (!user || !user.walletAddress) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const walletAddress = user.walletAddress.toLowerCase();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amountInr,
      polAmount: customPolAmount
    } = req.body;

    const inrValue = Number(amountInr) || 50;
    const polAmount = Number(customPolAmount) || Number((inrValue / POL_INR_RATE).toFixed(4));
    const hasLiveKeys = isRealRazorpayConfigured();

    // If in Development / Testing Mode: do NOT credit artificial funds
    if (!hasLiveKeys) {
      return res.status(400).json({
        success: false,
        error: 'UPI Gateway in Test Mode: Real funds transfer is disabled',
        isTestMode: true,
        message: 'UPI Gateway in Test Mode: Real funds transfer is disabled. Please configure valid RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET on the server to enable real UPI payment verification.'
      });
    }

    // Verify HMAC-SHA256 signature strictly against secret
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing required Razorpay payment verification parameters.' });
    }

    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid Razorpay payment signature. Payment verification rejected.' });
    }

    // Check if webhook already processed and credited the order
    const storedOrder = await db.getPayment(razorpay_order_id);
    if (storedOrder && (storedOrder.status === 'CAPTURED_VIA_WEBHOOK' || storedOrder.status === 'PAID')) {
      const currentWallet = await db.getUserWallet(walletAddress);
      return res.status(200).json({
        success: true,
        verified: true,
        newBalance: currentWallet.balance,
        message: `Payment verified and finalized via Webhook! Balance: ${currentWallet.balance} POL.`
      });
    }

    // Update payment record in MongoDB as signature verified
    await db.updatePayment(razorpay_order_id, {
      payment_id: razorpay_payment_id,
      status: 'SIGNATURE_VERIFIED_PENDING_WEBHOOK',
      signature: razorpay_signature,
      verified_at: new Date()
    });

    // Return verification status awaiting webhook finalization
    const currentWallet = await db.getUserWallet(walletAddress);
    return res.status(200).json({
      success: true,
      verified: true,
      awaitingWebhook: true,
      newBalance: currentWallet.balance,
      message: 'Signature verified successfully. Finalizing credit via server webhook.'
    });
  } catch (err) {
    console.error('[Verify Payment Error]:', err);
    return res.status(500).json({ error: 'Failed to verify payment', details: err.message });
  }
}

/**
 * POST /api/payments/razorpay/webhook
 * Razorpay Webhook listener with HMAC-SHA256 signature verification.
 */
export async function handleRazorpayWebhook(req, res) {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || RAZORPAY_WEBHOOK_SECRET;

    // Use rawBody buffer if saved by Express middleware, or body string
    const rawPayload = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);

    if (signature && secret) {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(rawPayload)
        .digest('hex');

      if (expectedSignature !== signature) {
        console.warn('⚠️ Webhook signature mismatch.');
        if (process.env.NODE_ENV === 'production') {
          return res.status(400).json({ error: 'Invalid webhook signature' });
        }
      }
    }

    const eventData = req.body;
    const eventType = eventData.event;
    console.log(`🔔 Received Razorpay Webhook Event: "${eventType}"`);

    // Handle payment.captured or order.paid
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = eventData.payload?.payment?.entity || {};
      const orderId = paymentEntity.order_id;
      const paymentId = paymentEntity.id;
      const amountPaise = paymentEntity.amount;
      const amountInr = amountPaise ? amountPaise / 100 : 50;
      const notes = paymentEntity.notes || {};

      let targetWallet = notes.walletAddress;
      let targetPol = notes.polAmount ? Number(notes.polAmount) : Number((amountInr / POL_INR_RATE).toFixed(4));

      // If notes are empty, look up original order in MongoDB payments collection
      if (!targetWallet && orderId) {
        const storedOrder = await db.getPayment(orderId);
        if (storedOrder) {
          targetWallet = storedOrder.user_address;
          targetPol = storedOrder.pol_amount || targetPol;
        }
      }

      if (targetWallet) {
        // Idempotency check: don't credit twice if webhook retries
        const existingOrder = orderId ? await db.getPayment(orderId) : null;
        if (existingOrder && existingOrder.status === 'CAPTURED_VIA_WEBHOOK') {
          console.log(`ℹ️ Webhook event for order ${orderId} already processed.`);
          return res.status(200).json({ status: 'ok', message: 'Already processed' });
        }

        await db.creditWalletBalance(targetWallet, targetPol, {
          paymentId,
          orderId,
          amountInr,
          method: 'Razorpay UPI Gateway',
          from: 'Razorpay UPI Gateway',
          description: `Automatic webhook credit via UPI (${targetPol} POL / ₹${amountInr})`
        });

        if (orderId) {
          await db.updatePayment(orderId, {
            payment_id: paymentId,
            status: 'CAPTURED_VIA_WEBHOOK',
            webhook_event: eventType,
            captured_at: new Date()
          });
        }

        console.log(`✅ Webhook credited ${targetPol} POL to ${targetWallet}`);
      }
    }

    return res.status(200).json({ status: 'ok', received: true });
  } catch (err) {
    console.error('[Razorpay Webhook Error]:', err);
    return res.status(500).json({ error: 'Webhook processing failed', details: err.message });
  }
}

/**
 * GET /api/wallet/balance
 * Fetches user's current MongoDB wallet balance & recent transactions.
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
 * Fetches user's complete transaction history.
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
