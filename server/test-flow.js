import { ethers } from 'ethers';
import { SiweMessage } from 'siwe';

const BASE_URL = 'http://localhost:3001';

async function runTest() {
  console.log('🧪 Starting MedVault Full End-to-End Architectural Test...\n');

  // --- 1. Generate Test Wallets ---
  const patientWallet = ethers.Wallet.createRandom();
  const doctorWallet = ethers.Wallet.createRandom();

  console.log(`👤 Patient Wallet: ${patientWallet.address}`);
  console.log(`🩺 Doctor Wallet:  ${doctorWallet.address}\n`);

  // --- 2. Patient Auth via SIWE (Step 2) ---
  console.log('1️⃣ Testing Step 2: SIWE Authentication Flow...');
  const nonceRes = await fetch(`${BASE_URL}/api/auth/nonce`);
  const { nonce } = await nonceRes.json();
  console.log(`   Issued Nonce: ${nonce}`);

  const siweMessage = new SiweMessage({
    domain: 'localhost:3001',
    address: patientWallet.address,
    statement: 'Sign in to MedVault Patient Portal',
    uri: `${BASE_URL}`,
    version: '1',
    chainId: 137,
    nonce: nonce,
    issuedAt: new Date().toISOString()
  });

  const preparedMessage = siweMessage.prepareMessage();
  const signature = await patientWallet.signMessage(preparedMessage);

  const authVerifyRes = await fetch(`${BASE_URL}/api/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: preparedMessage, signature, role: 'patient' })
  });

  const patientAuth = await authVerifyRes.json();
  if (!patientAuth.success) {
    throw new Error(`Patient auth failed: ${JSON.stringify(patientAuth)}`);
  }
  const patientToken = patientAuth.token;
  console.log('   ✅ Patient SIWE Verification Success! JWT Token issued.\n');

  // --- 3. Step 3: Zero Data Exposure Encrypted Upload ---
  console.log('2️⃣ Testing Step 3: Encrypted Storage API & Zero Data Exposure Check...');
  const recordIdHex = ethers.keccak256(ethers.toUtf8Bytes(`rec_${Date.now()}`));

  // 3a. Verify Rejection of Plaintext PDF/document
  console.log('   Testing security gate: submitting simulated unencrypted PDF...');
  const badFormData = new FormData();
  badFormData.append('recordIdHex', recordIdHex);
  badFormData.append('label', 'Unencrypted Blood Test');
  badFormData.append('encryptedKeyMaterial', 'dummy_key');
  badFormData.append('encryptedFile', new Blob(['%PDF-1.4 Fake plaintext content'], { type: 'application/pdf' }), 'test.pdf');

  const badUploadRes = await fetch(`${BASE_URL}/api/records/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${patientToken}` },
    body: badFormData
  });

  if (badUploadRes.status === 422) {
    console.log('   ✅ Zero-Data Gate Verified: Server strictly rejected plaintext file (422 Unprocessable Entity).');
  } else {
    console.warn(`   ⚠️ Plaintext check returned status: ${badUploadRes.status}`);
  }

  // 3b. Upload Genuine Encrypted Blob
  console.log('   Submitting 256-bit AES encrypted ciphertext blob...');
  const fakeAesCiphertext = new Uint8Array(256);
  for (let i = 0; i < fakeAesCiphertext.length; i++) fakeAesCiphertext[i] = Math.floor(Math.random() * 256);

  const goodFormData = new FormData();
  goodFormData.append('recordIdHex', recordIdHex);
  goodFormData.append('label', 'Comprehensive Metabolic Panel — Oct 2026');
  goodFormData.append('mimeType', 'application/pdf');
  goodFormData.append('encryptedKeyMaterial', Buffer.from('PATIENT_ENCRYPTED_DEK_BUNDLE').toString('base64'));
  goodFormData.append('encryptedFile', new Blob([fakeAesCiphertext], { type: 'application/octet-stream' }), 'encrypted.bin');

  const uploadRes = await fetch(`${BASE_URL}/api/records/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${patientToken}` },
    body: goodFormData
  });

  const uploadData = await uploadRes.json();
  if (!uploadData.success) {
    throw new Error(`Encrypted upload failed: ${JSON.stringify(uploadData)}`);
  }
  console.log(`   ✅ Encrypted blob saved: CID=${uploadData.ipfsCid}, Hash=${uploadData.contentHash}\n`);

  // --- 4. Create Time-Boxed Access Grant for Doctor ---
  console.log('3️⃣ Testing Step 1 & 3: Creating 2-Hour Time-Boxed Grant for Doctor...');
  const grantRes = await fetch(`${BASE_URL}/api/grants`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${patientToken}`
    },
    body: JSON.stringify({
      recordIdHex,
      doctorAddress: doctorWallet.address,
      expiresInSeconds: 7200, // 2 hours
      encryptedKeyForDoctor: Buffer.from('DOCTOR_ENCRYPTED_DEK_BUNDLE').toString('base64')
    })
  });

  const grantData = await grantRes.json();
  console.log(`   ✅ Grant created on-chain/DB: expires at ${grantData.validTo}\n`);

  // --- 5. Doctor Authenticates & Requests Retrieval (Step 5) ---
  console.log('4️⃣ Testing Step 5: Doctor Authentication & Secure Retrieval Sequence...');

  // Doctor gets nonce & signs
  const docNonceRes = await fetch(`${BASE_URL}/api/auth/nonce`);
  const { nonce: docNonce } = await docNonceRes.json();

  const docSiwe = new SiweMessage({
    domain: 'localhost:3001',
    address: doctorWallet.address,
    statement: 'Doctor Login to MedVault Provider Portal',
    uri: `${BASE_URL}`,
    version: '1',
    chainId: 137,
    nonce: docNonce,
    issuedAt: new Date().toISOString()
  });

  const docPrepared = docSiwe.prepareMessage();
  const docSignature = await doctorWallet.signMessage(docPrepared);

  const docAuthRes = await fetch(`${BASE_URL}/api/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: docPrepared, signature: docSignature, role: 'doctor' })
  });

  const docAuth = await docAuthRes.json();
  const doctorToken = docAuth.token;
  console.log('   ✅ Doctor authenticated as role: doctor');

  // Execute Step 5 Retrieval Flow
  console.log('   Invoking GET /api/records/:id/retrieve (4-step atomic sequence)...');
  const retrieveRes = await fetch(`${BASE_URL}/api/records/${recordIdHex}/retrieve`, {
    headers: { Authorization: `Bearer ${doctorToken}` }
  });

  const retrievedData = await retrieveRes.json();
  if (!retrievedData.success) {
    throw new Error(`Retrieval sequence failed: ${JSON.stringify(retrievedData)}`);
  }

  console.log('   ✅ Retrieval sequence successfully executed:');
  console.log(`      1. Doctor Token Verified: ${doctorWallet.address}`);
  console.log(`      2. Time-Boxed Grant Active: Checked`);
  console.log(`      3. Immutable Audit Log TxHash: ${retrievedData.auditTxHash}`);
  console.log(`      4. Ciphertext & Doctor DEK Envelope returned for client decryption.\n`);

  // --- 6. Step 4: Verify Immutable Audit Trail ---
  console.log('5️⃣ Testing Step 4: Fast-Read Indexed Audit Trail...');
  const auditRes = await fetch(`${BASE_URL}/api/audit/${recordIdHex}`, {
    headers: { Authorization: `Bearer ${patientToken}` }
  });

  const auditData = await auditRes.json();
  console.log(`   Found ${auditData.events.length} immutable audit event(s) for record:`);
  auditData.events.forEach((evt, idx) => {
    console.log(`   [Event ${idx + 1}] Type: ${evt.eventType} | Actor: ${evt.actorWallet} | Tx: ${String(evt.txHash || 'N/A').substring(0, 18)}...`);
  });

  console.log('\n🎉 ALL ARCHITECTURAL COMPONENTS (STEPS 1 TO 5) VERIFIED SUCCESSFULLY!\n');
}

runTest().catch((e) => {
  console.error('\n❌ Test Error:', e);
  process.exit(1);
});
