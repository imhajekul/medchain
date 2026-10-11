/**
 * MedVault Client-Side Cryptographic Engine (Web Crypto API)
 * Core Philosophy: Zero Data Exposure — Raw medical data is encrypted in the browser BEFORE upload.
 */

/**
 * Encrypts a File or Blob using 256-bit AES-GCM.
 * Prepends the 12-byte IV to the ciphertext.
 * Returns the encrypted Blob and the base64-encoded raw DEK.
 */
export async function encryptFileClientSide(file) {
  const fileBuffer = await file.arrayBuffer();

  // 1. Generate cryptographically random 256-bit AES-GCM Key (DEK)
  const dek = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, // extractable so we can wrap/encrypt it for recipients
    ['encrypt', 'decrypt']
  );

  // 2. Generate 96-bit random Initialization Vector (IV)
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // 3. Encrypt the raw medical record buffer
  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    dek,
    fileBuffer
  );

  // 4. Concatenate IV (12 bytes) + Ciphertext into a single binary payload
  const combinedBuffer = new Uint8Array(iv.length + ciphertextBuffer.byteLength);
  combinedBuffer.set(iv, 0);
  combinedBuffer.set(new Uint8Array(ciphertextBuffer), iv.length);

  // 5. Export raw DEK bytes
  const rawKey = await window.crypto.subtle.exportKey('raw', dek);
  const rawKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(rawKey)));

  // 6. Compute SHA-256 content hash of the ciphertext for integrity
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', combinedBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const contentHash = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return {
    encryptedBlob: new Blob([combinedBuffer], { type: 'application/octet-stream' }),
    contentHash,
    rawKeyBase64,
    sizeBytes: combinedBuffer.byteLength
  };
}

/**
 * Decrypts a retrieved AES-GCM encrypted blob in browser memory.
 * Extracts the 12-byte IV and decrypts with the unwrapped DEK.
 */
export async function decryptFileClientSide(encryptedBlobOrBase64, rawKeyBase64, mimeType = 'application/pdf') {
  let combinedBuffer;

  if (typeof encryptedBlobOrBase64 === 'string') {
    // Decode base64 string to Uint8Array
    const binaryString = atob(encryptedBlobOrBase64);
    combinedBuffer = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      combinedBuffer[i] = binaryString.charCodeAt(i);
    }
  } else if (encryptedBlobOrBase64 instanceof Blob) {
    combinedBuffer = new Uint8Array(await encryptedBlobOrBase64.arrayBuffer());
  } else {
    combinedBuffer = new Uint8Array(encryptedBlobOrBase64);
  }

  // 1. Extract 12-byte IV and ciphertext
  const iv = combinedBuffer.slice(0, 12);
  const ciphertext = combinedBuffer.slice(12);

  // 2. Decode raw DEK bytes
  const rawKeyBinary = atob(rawKeyBase64);
  const rawKeyBytes = new Uint8Array(rawKeyBinary.length);
  for (let i = 0; i < rawKeyBinary.length; i++) {
    rawKeyBytes[i] = rawKeyBinary.charCodeAt(i);
  }

  // 3. Import AES-GCM Key into Web Crypto
  const key = await window.crypto.subtle.importKey(
    'raw',
    rawKeyBytes,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  // 4. Decrypt directly into plaintext ArrayBuffer
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  const decryptedBlob = new Blob([decryptedBuffer], { type: mimeType });
  const objectUrl = URL.createObjectURL(decryptedBlob);

  return {
    decryptedBlob,
    objectUrl,
    decryptedBuffer
  };
}
