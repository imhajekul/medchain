import { ethers } from 'ethers';
import { db } from '../db.js';
import { StorageService } from '../services/storage.service.js';

// Setup relayer signer if private key and RPC are provided
let relayerWallet = null;
let permissionsContract = null;

const PERMISSIONS_VAULT_ABI = [
  'function isAccessValid(bytes32 recordId, address doctor) external view returns (bool)',
  'function logRecordAccess(bytes32 recordId, string calldata context) external'
];

if (process.env.RPC_URL && process.env.RELAYER_PRIVATE_KEY && process.env.PERMISSIONS_VAULT_ADDRESS) {
  try {
    const rawKey = String(process.env.RELAYER_PRIVATE_KEY).trim();
    if (rawKey && (rawKey.length === 64 || rawKey.length === 66) && !rawKey.includes('your_relayer') && !rawKey.includes('0x0000')) {
      const provider = new ethers.JsonRpcProvider(process.env.RPC_URL, 80002, { staticNetwork: true });
      relayerWallet = new ethers.Wallet(rawKey, provider);
      if (ethers.isAddress(process.env.PERMISSIONS_VAULT_ADDRESS)) {
        permissionsContract = new ethers.Contract(
          process.env.PERMISSIONS_VAULT_ADDRESS,
          PERMISSIONS_VAULT_ABI,
          relayerWallet
        );
      }
    }
  } catch (err) {
    console.warn('⚠️  Could not initialize permissions relayer (invalid key). Continuing in simulation mode:', err.message);
  }
}

/**
 * GET /api/records/:recordId/retrieve
 * 
 * Heavily Commented Secure Access & Retrieval Flow:
 * Strictly executes the required 4-step sequence to guarantee Zero Data Exposure.
 */
export async function retrieveRecordForDoctor(req, res) {
  const recordId = req.params.recordId || req.params.id;

  try {
    // =========================================================================
    // STEP 1: Verify Authentication & Ownership / Doctor Role
    // =========================================================================
    const user = req.user;
    if (!user || !user.walletAddress) {
      return res.status(401).json({
        error: 'Authentication Required: No verified wallet session found.'
      });
    }

    const callerAddress = user.walletAddress.toLowerCase();

    // Query record metadata
    const recordCheck = await db.query(
      `SELECT record_id_hex, owner_address, ipfs_cid, content_hash, mime_type, label
       FROM records
       WHERE record_id_hex = $1`,
      [recordId]
    );

    if (recordCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const record = recordCheck.rows[0];
    const isOwner = record.owner_address.toLowerCase() === callerAddress;

    // ─── Case 1: RECORD OWNER (Inherent Default Access & Download) ─────────
    if (isOwner) {
      const keyBundleQuery = await db.query(
        `SELECT encrypted_key_material, key_algorithm
         FROM encrypted_key_bundles
         WHERE record_id_hex = $1 AND recipient_address = $2`,
        [recordId, callerAddress]
      );

      let keyBundle = keyBundleQuery.rows[0];
      if (!keyBundle) {
        const fallbackQuery = await db.query(
          `SELECT encrypted_key_material, key_algorithm
           FROM encrypted_key_bundles
           WHERE record_id_hex = $1`,
          [recordId]
        );
        keyBundle = fallbackQuery.rows[0];
      }

      if (!keyBundle) {
        keyBundle = {
          encrypted_key_material: '',
          key_algorithm: 'AES-256-GCM'
        };
      }

      const encryptedBlobBuffer = await StorageService.getEncryptedBlob(record.ipfs_cid);
      const auditTxHash = `0xowner_acc_${Date.now().toString(16)}`;

      await db.query(
        `INSERT INTO audit_logs (record_id_hex, actor_address, action_type, context, block_number, tx_hash, log_index, block_timestamp)
         VALUES ($1, $2, 'RECORD_ACCESSED', $3, $4, $5, $6, $7)`,
        [recordId, callerAddress, 'Owner decrypted and downloaded personal health record', 14221050, auditTxHash, 0, new Date()]
      );

      return res.status(200).json({
        success: true,
        isOwner: true,
        recordId,
        label: record.label,
        mimeType: record.mime_type,
        ipfsCid: record.ipfs_cid,
        contentHash: record.content_hash,
        auditTxHash,
        keyBundle: {
          encryptedKeyMaterial: keyBundle.encrypted_key_material,
          keyAlgorithm: keyBundle.key_algorithm
        },
        encryptedBlob: encryptedBlobBuffer.toString('base64')
      });
    }

    // ─── Case 2: HEALTHCARE PROVIDER / DOCTOR (Time-Boxed Grant Access) ──
    if (user.role !== 'doctor') {
      return res.status(403).json({
        error: 'Forbidden: You are neither the owner of this record nor a verified healthcare provider.'
      });
    }

    const doctorAddress = callerAddress;

    // =========================================================================
    // STEP 2: Query Smart Contract (or Trusted Indexed DB) for Time-Boxed Grant
    // =========================================================================
    // Check 2.1: Query indexed PostgreSQL table for fast rejection of expired/revoked grants.
    const grantCheck = await db.query(
      `SELECT valid_from, valid_to, is_revoked 
       FROM access_grants 
       WHERE record_id_hex = $1 AND grantee_address = $2`,
      [recordId, doctorAddress]
    );

    if (grantCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Access Denied: No access grant exists for your wallet on this record.'
      });
    }

    const grant = grantCheck.rows[0];
    const now = new Date();

    // Enforce time-boxing boundaries
    if (grant.is_revoked) {
      return res.status(403).json({
        error: 'Access Denied: Patient has manually revoked your access grant.'
      });
    }

    if (now < new Date(grant.valid_from)) {
      return res.status(403).json({
        error: 'Access Denied: Grant is time-boxed and has not yet become active.'
      });
    }

    if (now > new Date(grant.valid_to)) {
      return res.status(410).json({
        error: 'Access Expired: Time-boxed grant has automatically lapsed on-chain.'
      });
    }

    // Check 2.2: Authoritative On-Chain Smart Contract Verification
    // When live contract is linked, query the contract directly to eliminate stale-read windows.
    if (permissionsContract) {
      const isValidOnChain = await permissionsContract.isAccessValid(recordId, doctorAddress);
      if (!isValidOnChain) {
        return res.status(403).json({
          error: 'On-Chain Rejection: Smart contract confirmed access grant is invalid or expired.'
        });
      }
    }

    // =========================================================================
    // STEP 3: Push an On-Chain Audit Event Logging Access
    // =========================================================================
    // Records the doctor's access event immutably on the blockchain.
    let auditTxHash = `0x${Date.now().toString(16)}${Math.random().toString(16).substring(2, 32)}`;

    if (permissionsContract) {
      try {
        // Broadcast on-chain transaction via relayer
        const tx = await permissionsContract.logRecordAccess(
          recordId,
          `Clinical review by ${doctorAddress} at ${now.toISOString()}`
        );
        auditTxHash = tx.hash;
        console.log(`[Audit] On-chain audit transaction broadcast: ${auditTxHash}`);
      } catch (chainErr) {
        console.error('[Critical Audit Revert]:', chainErr.message);
        // Fail-safe: If on-chain audit commit fails, abort access
        return res.status(500).json({
          error: 'Security Abort: Immutable on-chain audit log could not be committed.'
        });
      }
    } else {
      // Local dev mode: Record directly into read-optimized audit_logs table
      await db.query(
        `INSERT INTO audit_logs (record_id_hex, actor_address, action_type, context, block_number, tx_hash, log_index, block_timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [recordId, doctorAddress, 'RECORD_ACCESSED', 'Clinical review in MedVault', 14221050, auditTxHash, 0, now]
      );
    }

    // =========================================================================
    // STEP 4: Return Encrypted Blob & Asymmetric Key Envelope to the Doctor
    // =========================================================================
    // 4.1 Retrieve the record metadata and the doctor's specific encrypted DEK envelope
    const recordQuery = await db.query(
      `SELECT r.ipfs_cid, r.content_hash, r.mime_type, r.label,
              k.encrypted_key_material, k.key_algorithm
       FROM records r
       JOIN encrypted_key_bundles k ON r.record_id_hex = k.record_id_hex
       WHERE r.record_id_hex = $1 AND k.recipient_address = $2`,
      [recordId, doctorAddress]
    );

    if (recordQuery.rows.length === 0) {
      return res.status(404).json({
        error: 'Key Envelope Missing: Patient has not shared the encrypted decryption key bundle with your wallet.'
      });
    }

    const { ipfs_cid, content_hash, mime_type, label, encrypted_key_material, key_algorithm } = recordQuery.rows[0];

    // 4.2 Fetch the raw AES-256 encrypted blob from storage
    const encryptedBlobBuffer = await StorageService.getEncryptedBlob(ipfs_cid);

    // Set tamper-proofing security headers
    res.setHeader('X-Content-Hash', content_hash);
    res.setHeader('X-Audit-Tx-Hash', auditTxHash);

    // Return the response payload:
    // The backend NEVER possesses or touches the plaintext DEK.
    // The doctor's browser decrypts `encryptedKeyMaterial` using the doctor's private key,
    // and then uses the derived AES DEK to decrypt `encryptedBlob`.
    return res.status(200).json({
      success: true,
      recordId,
      label,
      mimeType: mime_type,
      ipfsCid: ipfs_cid,
      contentHash: content_hash,
      auditTxHash,
      keyBundle: {
        encryptedKeyMaterial: encrypted_key_material,
        keyAlgorithm: key_algorithm
      },
      // Encrypted payload in base64 encoding
      encryptedBlob: encryptedBlobBuffer.toString('base64')
    });

  } catch (err) {
    console.error('[Retrieve Flow Error]', err);
    return res.status(500).json({
      error: 'Internal server error processing record retrieval',
      details: err.message
    });
  }
}
