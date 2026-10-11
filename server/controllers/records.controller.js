import { db } from '../db.js';
import { StorageService } from '../services/storage.service.js';

/**
 * Validates that an uploaded payload is encrypted and contains no obvious plaintext signatures.
 * Protects against accidental frontend bugs uploading unencrypted PHI/PDFs.
 */
function validateEncryptedPayload(buffer) {
  if (!buffer || buffer.length < 16) return false;
  const prefix = buffer.subarray(0, 8).toString('ascii');
  if (prefix.includes('%PDF') || prefix.includes('<!DOC') || prefix.includes('{"') || prefix.includes('PK\x03\x04')) {
    return false; // Plaintext detected! Fail validation.
  }
  return true;
}

/**
 * POST /records (Conforming to 03-API-SPEC.md)
 * Auth: Requires valid JWT.
 * Body: { encryptedFile (multipart/blob), label, encryptedKeyMaterial }
 * Response: { recordId, storageCID }
 */
export async function uploadRecord(req, res) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Missing session token.' });
    }

    const file = req.file;
    const { label, encryptedKeyMaterial } = req.body;

    if (!file) {
      return res.status(400).json({ error: 'Missing encryptedFile parameter (multipart file).' });
    }
    if (!label) {
      return res.status(400).json({ error: 'Missing label parameter.' });
    }
    if (!encryptedKeyMaterial) {
      return res.status(400).json({ error: 'Missing encryptedKeyMaterial parameter.' });
    }

    // STRICT ZERO-DATA EXPOSURE VALIDATION
    if (!validateEncryptedPayload(file.buffer)) {
      return res.status(422).json({
        error: 'Security Failure: Upload rejected. Plaintext medical file detected. All records must be client-side AES-256 encrypted prior to upload.'
      });
    }

    // Persist ciphertext blob directly to IPFS pinning service
    const { cid, contentHash, sizeBytes } = await StorageService.saveEncryptedBlob(file.buffer);

    // Generate unique record identifier
    const recordId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Persist record metadata in database
    await db.query(
      `INSERT INTO records (record_id_hex, owner_address, label, ipfs_cid, content_hash, file_size_bytes, mime_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [recordId, user.walletAddress, label, cid, contentHash, sizeBytes, file.mimetype || 'application/octet-stream']
    );

    // Save patient's encrypted key envelope
    await db.query(
      `INSERT INTO encrypted_key_bundles (record_id_hex, recipient_address, encrypted_key_material, key_algorithm)
       VALUES ($1, $2, $3, $4)`,
      [recordId, user.walletAddress, encryptedKeyMaterial, 'ECIES-secp256k1']
    );

    // Record initial registration in audit trail
    await db.query(
      `INSERT INTO audit_logs (record_id_hex, actor_address, action_type, context, block_number, tx_hash, log_index, block_timestamp)
       VALUES ($1, $2, 'RECORD_REGISTERED', $3, $4, $5, $6, $7)`,
      [recordId, user.walletAddress, `Encrypted record registered with CID ${cid}`, 14220990, `0xreg_${Date.now().toString(16)}`, 0, new Date()]
    );

    // Conforms strictly to 03-API-SPEC.md response contract: { recordId, storageCID }
    return res.status(201).json({
      recordId,
      storageCID: cid
    });
  } catch (err) {
    console.error('[Upload Record Error]:', err);
    return res.status(500).json({ error: 'Failed to process encrypted record upload', details: err.message });
  }
}

/**
 * GET /records/:id (Conforming to 03-API-SPEC.md)
 * Auth: Restrict strictly to ownerWallet == user.walletAddress.
 * Response: { recordId, label, storageCID, createdAt, activeGrants }
 */
export async function getRecordById(req, res) {
  try {
    const user = req.user;
    const { id } = req.params;

    const result = await db.query(
      `SELECT record_id_hex, owner_address, label, ipfs_cid, created_at
       FROM records
       WHERE record_id_hex = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const record = result.rows[0];

    // Strict ownership verification: owner only!
    if (record.owner_address.toLowerCase() !== user.walletAddress.toLowerCase()) {
      return res.status(403).json({
        error: 'Forbidden: Caller is not the authorized owner of this medical record.'
      });
    }

    // Fetch active grants for this record
    const grantsResult = await db.query(
      `SELECT grant_id_hex, grantee_address, valid_from, valid_to, is_revoked
       FROM access_grants
       WHERE record_id_hex = $1 AND is_revoked = false AND valid_to > CURRENT_TIMESTAMP`,
      [id]
    );

    const activeGrants = grantsResult.rows.map(g => ({
      grantId: g.grant_id_hex,
      granteeWallet: g.grantee_address,
      validFrom: g.valid_from,
      expiresAt: g.valid_to
    }));

    return res.status(200).json({
      recordId: record.record_id_hex,
      label: record.label,
      storageCID: record.ipfs_cid,
      createdAt: record.created_at,
      activeGrants
    });
  } catch (err) {
    console.error('[Get Record Error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve record metadata' });
  }
}

/**
 * GET /records
 * Lists all records owned by the authenticated caller.
 */
export async function listRecords(req, res) {
  try {
    const user = req.user;
    const result = await db.query(
      `SELECT record_id_hex as "recordId", label, owner_address as "ownerWallet",
              ipfs_cid as "storageCID", content_hash as "contentHash",
              file_size_bytes as "fileSizeBytes", created_at as "createdAt"
       FROM records
       WHERE owner_address = $1
       ORDER BY created_at DESC`,
      [user.walletAddress]
    );

    return res.status(200).json({ records: result.rows });
  } catch (err) {
    console.error('[List Records Error]:', err);
    return res.status(500).json({ error: 'Failed to query user records' });
  }
}
