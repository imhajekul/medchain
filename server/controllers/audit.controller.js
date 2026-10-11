import { db } from '../db.js';

/**
 * GET /audit/:recordId (Conforming to 03-API-SPEC.md)
 * Auth: Scoped strictly to ownerWallet.
 * Response: { events: [{ eventType, actorWallet, timestamp, txHash }] }
 */
export async function getAuditTrail(req, res) {
  try {
    const user = req.user;
    const { recordId } = req.params;

    if (!user) {
      return res.status(401).json({ error: 'Authentication Required: Missing session token.' });
    }

    // 1. Verify caller is the record owner
    const recordCheck = await db.query(
      `SELECT record_id_hex, owner_address FROM records WHERE record_id_hex = $1`,
      [recordId]
    );

    if (recordCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const record = recordCheck.rows[0];
    if (record.owner_address.toLowerCase() !== user.walletAddress.toLowerCase()) {
      return res.status(403).json({
        error: 'Forbidden: Access history is strictly confidential and scoped to the record owner.'
      });
    }

    // 2. Query tamper-proof audit trail
    const result = await db.query(
      `SELECT action_type as "eventType", actor_address as "actorWallet",
              block_timestamp as "timestamp", tx_hash as "txHash"
       FROM audit_logs
       WHERE record_id_hex = $1
       ORDER BY block_timestamp DESC`,
      [recordId]
    );

    // Conforms strictly to 03-API-SPEC.md response contract
    return res.status(200).json({
      events: result.rows.map(row => ({
        eventType: row.eventType,
        actorWallet: row.actorWallet,
        timestamp: row.timestamp,
        txHash: row.txHash
      }))
    });
  } catch (err) {
    console.error('[Get Audit Trail Error]:', err);
    return res.status(500).json({ error: 'Failed to fetch audit events', details: err.message });
  }
}

/**
 * GET /audit (or /api/audit)
 * Auth: Scoped to authenticated user session.
 * Response: { events: [{ id, eventType, actorWallet, recordId, context, timestamp, txHash }] }
 */
export async function getUserAuditLogs(req, res) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication Required: Missing session token.' });
    }

    const wallet = user.walletAddress ? user.walletAddress.toLowerCase() : null;
    const result = await db.query(
      `SELECT action_type as "eventType", actor_address as "actorWallet",
              block_timestamp as "timestamp", tx_hash as "txHash",
              record_id_hex as "recordId", context
       FROM audit_logs
       ORDER BY block_timestamp DESC`,
      [wallet]
    );

    return res.status(200).json({
      events: (result.rows || []).map(row => ({
        id: row.id || `${row.txHash || 'tx'}_${row.timestamp || Date.now()}`,
        eventType: row.eventType || 'SECURITY_AUDIT',
        actorWallet: row.actorWallet,
        recordId: row.recordId,
        context: row.context,
        timestamp: row.timestamp,
        txHash: row.txHash
      }))
    });
  } catch (err) {
    console.error('[Get User Audit Logs Error]:', err);
    return res.status(500).json({ error: 'Failed to fetch audit events', details: err.message });
  }
}

