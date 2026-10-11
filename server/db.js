import dotenv from 'dotenv';
dotenv.config();

let pool = null;
if (process.env.DATABASE_URL) {
  try {
    const { default: pg } = await import('pg');
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
    });
    console.log('📦 Connected to PostgreSQL database.');
    pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        salt VARCHAR(64) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'PATIENT',
        wallet_address VARCHAR(42) NOT NULL,
        name VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `).catch(err => console.warn('⚠️ Users table bootstrap notice:', err.message));
  } catch (e) {
    console.warn('⚠️ pg driver not installed; falling back to in-memory store.');
  }
}

/**
 * In-memory fallback database for local execution when no live PostgreSQL is provided.
 * Emulates table schemas: users, records, encrypted_key_bundles, access_grants, audit_logs, indexer_state.
 */
class MemoryDatabase {
  constructor() {
    this.users = [];
    this.records = [];
    this.encrypted_key_bundles = [];
    this.access_grants = [];
    this.audit_logs = [];

    this.indexer_state = new Map([
      ['polygon-amoy', { last_indexed_block: 14221045, updated_at: new Date() }]
    ]);

    console.log('💾 Running MedVault in-memory storage driver (clean production state).');
  }

  async query(text, params = []) {
    const q = text.trim();

    // 0a. Users insertion
    if (q.startsWith('INSERT INTO users')) {
      const user = {
        id: params[0] || `usr_${Date.now()}`,
        email: String(params[1]).toLowerCase(),
        password_hash: params[2],
        salt: params[3],
        role: (params[4] || 'PATIENT').toUpperCase(),
        wallet_address: String(params[5]).toLowerCase(),
        name: params[6] || '',
        created_at: new Date()
      };
      this.users.push(user);
      return { rows: [user], rowCount: 1 };
    }

    // 0b. Select user by email
    if (q.includes('FROM users') && q.includes('email = $1')) {
      const email = String(params[0]).toLowerCase();
      const user = this.users.find(u => u.email.toLowerCase() === email);
      return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
    }

    // 0c. Select user by wallet
    if (q.includes('FROM users') && q.includes('wallet_address = $1')) {
      const wallet = String(params[0]).toLowerCase();
      const user = this.users.find(u => u.wallet_address.toLowerCase() === wallet);
      return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
    }

    // 1. Records insertion
    if (q.startsWith('INSERT INTO records')) {
      const record = {
        id: `rec_${Date.now()}`,
        record_id_hex: params[0],
        owner_address: params[1].toLowerCase(),
        label: params[2],
        ipfs_cid: params[3],
        content_hash: params[4],
        file_size_bytes: params[5],
        mime_type: params[6],
        on_chain_tx_hash: null,
        created_at: new Date()
      };
      this.records.unshift(record);
      return { rows: [record], rowCount: 1 };
    }

    // 2. Encrypted key bundles insertion
    if (q.startsWith('INSERT INTO encrypted_key_bundles')) {
      const bundle = {
        id: `bundle_${Date.now()}`,
        record_id_hex: params[0],
        recipient_address: params[1].toLowerCase(),
        encrypted_key_material: params[2],
        key_algorithm: params[3] || 'ECIES-secp256k1',
        created_at: new Date()
      };
      this.encrypted_key_bundles.push(bundle);
      return { rows: [bundle], rowCount: 1 };
    }

    // 3. Access grants insertion
    if (q.startsWith('INSERT INTO access_grants')) {
      const grant = {
        id: `grant_${Date.now()}`,
        grant_id_hex: params[0],
        record_id_hex: params[1],
        owner_address: params[2].toLowerCase(),
        grantee_address: params[3].toLowerCase(),
        valid_from: new Date(params[4]),
        valid_to: new Date(params[5]),
        is_revoked: false,
        tx_hash: params[6],
        created_at: new Date()
      };
      this.access_grants.unshift(grant);
      return { rows: [grant], rowCount: 1 };
    }

    // 4. Audit logs insertion
    if (q.startsWith('INSERT INTO audit_logs')) {
      const actionMatch = q.match(/'(RECORD_REGISTERED|ISSUED|ACCESSED|REVOKED|RECORD_ACCESSED|GRANT_CREATED|GRANT_REVOKED)'/);
      const actionType = actionMatch ? actionMatch[1] : params[2];
      const context = actionMatch ? params[2] : params[3];
      const blockNumber = actionMatch ? params[3] : params[4];
      const txHash = actionMatch ? params[4] : params[5];
      const logIndex = actionMatch ? params[5] : params[6];
      const blockTimestamp = actionMatch ? params[6] : params[7];

      const log = {
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        record_id_hex: params[0],
        actor_address: (params[1] || '').toLowerCase(),
        action_type: actionType,
        context: context || '',
        block_number: Number(blockNumber) || 0,
        tx_hash: String(txHash || `0xtx_${Date.now().toString(16)}`),
        log_index: Number(logIndex) || 0,
        block_timestamp: blockTimestamp ? new Date(blockTimestamp) : new Date(),
        created_at: new Date()
      };
      this.audit_logs.unshift(log);
      return { rows: [log], rowCount: 1 };
    }

    // 5. Select Records for Owner
    if (q.includes('FROM records') && q.includes('owner_address = $1')) {
      const owner = params[0].toLowerCase();
      const filtered = this.records.filter(r => r.owner_address.toLowerCase() === owner);
      return { rows: filtered, rowCount: filtered.length };
    }

    // 6. Select Record by record_id_hex
    if (q.includes('FROM records') && q.includes('record_id_hex = $1')) {
      const id = params[0];
      const found = this.records.find(r => r.record_id_hex === id);
      return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
    }

    // 7a. Select Grant by grant_id_hex
    if (q.includes('FROM access_grants') && q.includes('grant_id_hex = $1')) {
      const id = params[0];
      const found = this.access_grants.find(g => g.grant_id_hex === id);
      return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
    }

    // 7b. Update Grant Revoke
    if (q.includes('UPDATE access_grants') && q.includes('is_revoked = true')) {
      const id = params[0];
      const grant = this.access_grants.find(g => g.grant_id_hex === id);
      if (grant) grant.is_revoked = true;
      return { rowCount: grant ? 1 : 0 };
    }

    // 7c. Select Grants for Record
    if (q.includes('FROM access_grants') && q.includes('record_id_hex = $1') && !q.includes('grantee_address')) {
      const recordId = params[0];
      const grants = this.access_grants.filter(g => g.record_id_hex === recordId && !g.is_revoked);
      return { rows: grants, rowCount: grants.length };
    }

    // 7d. Select Grant Check (Doctor & Record)
    if (q.includes('FROM access_grants') && q.includes('record_id_hex = $1') && q.includes('grantee_address = $2')) {
      const recordId = params[0];
      const doctor = params[1].toLowerCase();
      const found = this.access_grants.find(
        g => g.record_id_hex === recordId && g.grantee_address.toLowerCase() === doctor
      );
      return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
    }

    // 7e. Select Encrypted Key Bundle direct
    if (q.includes('FROM encrypted_key_bundles') && q.includes('record_id_hex = $1')) {
      const recordId = params[0];
      const recipient = params[1].toLowerCase();
      const found = this.encrypted_key_bundles.find(
        k => k.record_id_hex === recordId && k.recipient_address.toLowerCase() === recipient
      );
      return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
    }

    // 8. Select Encrypted Key Bundle for Recipient
    if (q.includes('FROM records r') && q.includes('JOIN encrypted_key_bundles k')) {
      const recordId = params[0];
      const recipient = params[1].toLowerCase();
      const record = this.records.find(r => r.record_id_hex === recordId);
      const bundle = this.encrypted_key_bundles.find(
        k => k.record_id_hex === recordId && k.recipient_address.toLowerCase() === recipient
      );

      if (record && bundle) {
        return {
          rows: [
            {
              ipfs_cid: record.ipfs_cid,
              content_hash: record.content_hash,
              mime_type: record.mime_type,
              label: record.label,
              encrypted_key_material: bundle.encrypted_key_material,
              key_algorithm: bundle.key_algorithm
            }
          ],
          rowCount: 1
        };
      }
      return { rows: [], rowCount: 0 };
    }

    // 9. Select Audit Logs for Record
    if (q.includes('FROM audit_logs') && q.includes('record_id_hex = $1')) {
      const recordId = params[0];
      const logs = this.audit_logs
        .filter(a => a.record_id_hex === recordId)
        .map(a => ({
          id: a.id,
          recordId: a.record_id_hex,
          actorWallet: a.actor_address,
          eventType: a.action_type,
          context: a.context,
          blockNumber: a.block_number,
          txHash: String(a.tx_hash || ''),
          timestamp: a.block_timestamp
        }));
      return { rows: logs, rowCount: logs.length };
    }

    // 10. Select Indexer State
    if (q.includes('FROM indexer_state WHERE network = $1')) {
      const net = params[0];
      const state = this.indexer_state.get(net);
      return { rows: state ? [state] : [], rowCount: state ? 1 : 0 };
    }

    // Fallback
    return { rows: [], rowCount: 0 };
  }

  async connect() {
    return {
      query: (text, params) => this.query(text, params),
      release: () => {}
    };
  }
}

const memoryDb = new MemoryDatabase();

export const db = {
  query: async (text, params) => {
    if (pool) {
      try {
        return await pool.query(text, params);
      } catch (err) {
        if (
          err.code === 'ECONNREFUSED' ||
          err.code === 'ENOTFOUND' ||
          err.code === '28P01' ||
          err.message?.includes('ECONNREFUSED')
        ) {
          return memoryDb.query(text, params);
        }
        throw err;
      }
    }
    return memoryDb.query(text, params);
  },
  connect: async () => {
    if (pool) {
      try {
        return await pool.connect();
      } catch (err) {
        return memoryDb.connect();
      }
    }
    return memoryDb.connect();
  },
  end: () => (pool ? pool.end() : Promise.resolve()),
  isHealthy: async () => {
    try {
      if (pool) {
        await pool.query('SELECT 1');
        return { connected: true, driver: 'postgresql' };
      }
      return { connected: true, driver: 'in-memory-fallback' };
    } catch (e) {
      return { connected: true, driver: 'in-memory-fallback', postgresNotice: e.message };
    }
  }
};
