import crypto from 'crypto';
import { db } from './db.js';
import { createRazorpayOrder, handleRazorpayWebhook, getPaymentStatus } from './controllers/payment.controller.js';

async function runPaymentTests() {
  console.log('🧪 Starting Razorpay UPI Payment Integration Unit Test...');

  const testWallet = `0x${crypto.randomBytes(20).toString('hex')}`;
  const testUserId = `usr_${testWallet.slice(2, 10)}`;

  // 1. Test createRazorpayOrder
  console.log('➡️ 1. Testing createRazorpayOrder...');
  let createdOrder = null;
  const mockReq1 = {
    body: {
      walletAddress: testWallet,
      userId: testUserId,
      amount: 50
    }
  };
  const mockRes1 = {
    statusCode: 200,
    status(c) { this.statusCode = c; return this; },
    json(data) { createdOrder = data; return this; }
  };

  await createRazorpayOrder(mockReq1, mockRes1);
  if (!createdOrder?.orderId || createdOrder.amount !== 5000) {
    throw new Error(`Order creation failed: ${JSON.stringify(createdOrder)}`);
  }
  console.log(`   ✅ Order created successfully: ${createdOrder.orderId}, keyId: ${createdOrder.keyId}`);

  // 2. Test getPaymentStatus (pending)
  console.log('➡️ 2. Testing getPaymentStatus (pending)...');
  let statusResult1 = null;
  const mockReq2 = { query: { orderId: createdOrder.orderId } };
  const mockRes2 = {
    statusCode: 200,
    status(c) { this.statusCode = c; return this; },
    json(data) { statusResult1 = data; return this; }
  };
  await getPaymentStatus(mockReq2, mockRes2);
  if (statusResult1?.status !== 'pending' || statusResult1.confirmed !== false) {
    throw new Error(`Expected pending status: ${JSON.stringify(statusResult1)}`);
  }
  console.log(`   ✅ Status confirmed pending: confirmed=${statusResult1.confirmed}`);

  // 3. Test handleRazorpayWebhook
  console.log('➡️ 3. Testing handleRazorpayWebhook (valid HMAC-SHA256 signature)...');
  const mockPaymentId = `pay_${Date.now()}`;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_webhook_secret_key_123';
  process.env.RAZORPAY_WEBHOOK_SECRET = webhookSecret;

  const webhookPayload = {
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: mockPaymentId,
          order_id: createdOrder.orderId,
          amount: 5000,
          currency: 'INR',
          status: 'captured',
          notes: {
            walletAddress: testWallet,
            userId: testUserId,
            tokenCredit: '0.1'
          }
        }
      }
    }
  };

  const rawBuffer = Buffer.from(JSON.stringify(webhookPayload));
  const validSignature = crypto.createHmac('sha256', webhookSecret).update(rawBuffer).digest('hex');

  // Test invalid signature rejection
  let invalidStatus = null;
  const mockReqInvalid = {
    rawBody: rawBuffer,
    headers: { 'x-razorpay-signature': 'bad_signature_hex' },
    body: webhookPayload
  };
  const mockResInvalid = {
    statusCode: 200,
    status(c) { this.statusCode = c; return this; },
    json(data) { invalidStatus = data; return this; }
  };
  await handleRazorpayWebhook(mockReqInvalid, mockResInvalid);
  if (mockResInvalid.statusCode !== 400) {
    throw new Error(`Expected 400 for bad signature, got: ${mockResInvalid.statusCode}`);
  }
  console.log('   ✅ Bad signature properly rejected with 400 Bad Request');

  // Test valid signature acceptance
  let webhookResult = null;
  const mockReqValid = {
    rawBody: rawBuffer,
    headers: { 'x-razorpay-signature': validSignature },
    body: webhookPayload
  };
  const mockResValid = {
    statusCode: 200,
    status(c) { this.statusCode = c; return this; },
    json(data) { webhookResult = data; return this; }
  };
  await handleRazorpayWebhook(mockReqValid, mockResValid);
  if (webhookResult?.status !== 'ok') {
    throw new Error(`Webhook failed: ${JSON.stringify(webhookResult)}`);
  }
  console.log('   ✅ Webhook processed successfully with valid signature');

  // 4. Test Webhook Idempotency (duplicate call)
  console.log('➡️ 4. Testing Webhook Idempotency...');
  let idempotentResult = null;
  await handleRazorpayWebhook(mockReqValid, {
    statusCode: 200,
    status(c) { this.statusCode = c; return this; },
    json(data) { idempotentResult = data; return this; }
  });
  if (idempotentResult?.message !== 'Already processed') {
    throw new Error(`Expected 'Already processed', got: ${JSON.stringify(idempotentResult)}`);
  }
  console.log('   ✅ Duplicate webhook call safely detected as already processed');

  // 5. Test getPaymentStatus (confirmed)
  console.log('➡️ 5. Testing getPaymentStatus (confirmed)...');
  let statusResult2 = null;
  await getPaymentStatus(mockReq2, {
    statusCode: 200,
    status(c) { this.statusCode = c; return this; },
    json(data) { statusResult2 = data; return this; }
  });
  if (statusResult2?.status !== 'confirmed' || statusResult2.confirmed !== true) {
    throw new Error(`Expected confirmed status: ${JSON.stringify(statusResult2)}`);
  }
  console.log(`   ✅ Status confirmed in database: paymentId=${statusResult2.paymentId}, confirmed=${statusResult2.confirmed}`);

  // 6. Test User Balance in MongoDB
  const walletData = await db.getUserWallet(testWallet);
  if (walletData.balance < 0.1) {
    throw new Error(`Expected balance >= 0.1 POL, got: ${walletData.balance}`);
  }
  console.log(`   ✅ User wallet balance verified in DB: ${walletData.balance} POL`);

  console.log('\n🎉 ALL PAYMENT INTEGRATION TESTS PASSED (100% VERIFIED)!');
}

runPaymentTests().then(() => process.exit(0)).catch(err => {
  console.error('\n❌ Payment Test Failed:', err);
  process.exit(1);
});
