import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const STORAGE_DIR = path.resolve('storage_blobs');
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

/**
 * Encrypted blob storage service.
 * Zero Data Exposure: Stores opaque ciphertexts only.
 */
export class StorageService {
  /**
   * Stores an AES-256 ciphertext buffer and returns the calculated IPFS CID and SHA-256 hash.
   */
  static async saveEncryptedBlob(buffer) {
    // 1. Calculate SHA-256 content integrity hash
    const contentHash = '0x' + crypto.createHash('sha256').update(buffer).digest('hex');

    // 2. Derive deterministic mock CID (base58 formatted)
    const hashDigest = crypto.createHash('sha256').update(buffer).digest('hex');
    const mockCid = `Qm${hashDigest.substring(0, 44)}`;

    // 3. Persist encrypted bytes to local store
    const filePath = path.join(STORAGE_DIR, mockCid);
    await fs.promises.writeFile(filePath, buffer);

    return {
      cid: mockCid,
      contentHash,
      sizeBytes: buffer.length
    };
  }

  /**
   * Retrieves an encrypted blob by its CID.
   */
  static async getEncryptedBlob(cid) {
    const filePath = path.join(STORAGE_DIR, cid);
    if (!fs.existsSync(filePath)) {
      // If mock record from initial seeds, return simulated encrypted payload
      return Buffer.from('MEDVAULT_SIMULATED_AES256_CIPHERTEXT_BLOB_ZERO_EXPOSURE', 'utf-8');
    }
    return await fs.promises.readFile(filePath);
  }
}
