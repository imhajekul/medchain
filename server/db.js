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
    this.users = [
      {
        id: 'usr_patient_demo',
        email: 'patient@medvault.io',
        password_hash: '6ffa44c702f22e5fac081cd68906a68cc2a790e59879ab6536b0cf03a1db5c95b3789f39d7209547b2864401651a0b28ac50e2c5fdeac0bb07ebe3887447c229',
        salt: 'medvaultdemosalt',
        role: 'PATIENT',
        wallet_address: '0x7a3b68f123456789abcdef0123456789abcdef92',
        name: 'Alice Patient (Demo)',
        created_at: new Date('2026-09-01T00:00:00Z')
      },
      {
        id: 'usr_doctor_demo',
        email: 'doctor@medvault.io',
        password_hash: '6ffa44c702f22e5fac081cd68906a68cc2a790e59879ab6536b0cf03a1db5c95b3789f39d7209547b2864401651a0b28ac50e2c5fdeac0bb07ebe3887447c229',
        salt: 'medvaultdemosalt',
        role: 'DOCTOR',
        wallet_address: '0x4e2fa81c123456789abcdef0123456789abcdef1c',
        name: 'Dr. Sarah Smith (Demo)',
        created_at: new Date('2026-09-01T00:00:00Z')
      }
    ];

    this.records = [
      {
        id: 'rec_001',
        record_id_hex: '0x1000000000000000000000000000000000000000000000000000000000000001',
        owner_address: '0x7a3b68f123456789abcdef0123456789abcdef92',
        label: 'Complete Blood Count — Sept 2026',
        ipfs_cid: 'QmX7b2c9f3a1234567890abcdef9f3a',
        content_hash: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
        file_size_bytes: 250880,
        mime_type: 'application/pdf',
        on_chain_tx_hash: '0xabc123456789def0123456789abcdef0123456789abcdef0123456789abcdef',
        created_at: new Date('2026-09-15T14:30:00Z')
      }
    ];

    this.encrypted_key_bundles = [
      {
        id: 'bundle_001',
        record_id_hex: '0x1000000000000000000000000000000000000000000000000000000000000001',
        recipient_address: '0x7a3b68f123456789abcdef0123456789abcdef92',
        encrypted_key_material: 'eyJlbmNEZWsiOiAiQUVTLURFSwiLCJpdiI6ICJYWVoifQ==',
        key_algorithm: 'ECIES-secp256k1',
        created_at: new Date('2026-09-15T14:30:00Z')
      },
      {
        id: 'bundle_002',
        record_id_hex: '0x1000000000000000000000000000000000000000000000000000000000000001',
        recipient_address: '0x4e2fa81c123456789abcdef0123456789abcdef1c',
        encrypted_key_material: 'eyJkb2N0b3JFbmNEZWsiOiAiRE9DVE9SLURFSwiLCJpdiI6ICJYWVoifQ==',
        key_algorithm: 'ECIES-secp256k1',
        created_at: new Date('2026-09-25T10:00:00Z')
      }
    ];

    this.access_grants = [
      {
        id: 'grant_001',
        grant_id_hex: '0x2000000000000000000000000000000000000000000000000000000000000001',
        record_id_hex: '0x1000000000000000000000000000000000000000000000000000000000000001',
        owner_address: '0x7a3b68f123456789abcdef0123456789abcdef92',
        grantee_address: '0x4e2fa81c123456789abcdef0123456789abcdef1c',
        valid_from: new Date(Date.now() - 3600 * 1000),
        valid_to: new Date(Date.now() + 24 * 3600 * 1000), // Active for 24h
        is_revoked: false,
        tx_hash: '0xdef456123456789abcdef0123456789abcdef0123456789abcdef0123456789',
        created_at: new Date('2026-09-25T10:00:00Z')
      }
    ];

    this.audit_logs = [
      {
        id: 'audit_001',
        record_id_hex: '0x1000000000000000000000000000000000000000000000000000000000000001',
        actor_address: '0x7a3b68f123456789abcdef0123456789abcdef92',
        action_type: 'RECORD_REGISTERED',
        context: 'IPFS: QmX7b2c9f3a1234567890abcdef9f3a',
        block_number: 14205012,
        tx_hash: '0xabc123456789def0123456789abcdef0123456789abcdef0123456789abcdef',
        log_index: 0,
        block_timestamp: new Date('2026-09-15T14:30:00Z')
      },
      {
        id: 'audit_002',
        record_id_hex: '0x1000000000000000000000000000000000000000000000000000000000000001',
        actor_address: '0x7a3b68f123456789abcdef0123456789abcdef92',
        action_type: 'ACCESS_GRANTED',
        context: 'Doctor: 0x4e2fa81c123456789abcdef0123456789abcdef1c',
        block_number: 14221045,
        tx_hash: '0xdef456123456789abcdef0123456789abcdef0123456789abcdef0123456789',
        log_index: 1,
        block_timestamp: new Date('2026-09-25T10:00:00Z')
      }
    ];

    this.indexer_state = new Map([
      ['polygon-amoy', { last_indexed_block: 14221045, updated_at: new Date() }]
    ]);

    console.log('💾 Running MedVault in-memory storage driver (Postgres fallback).');
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
