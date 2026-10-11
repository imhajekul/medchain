import dotenv from 'dotenv';
dotenv.config();

let mongoClient = null;
let mongoDbInstance = null;
let pool = null;

const mongoUri = process.env.MONGODB_URI || 
  (process.env.DATABASE_URL && (process.env.DATABASE_URL.startsWith('mongodb://') || process.env.DATABASE_URL.startsWith('mongodb+srv://')) ? process.env.DATABASE_URL : null);

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. MongoDB Cluster Database Driver
 * ─────────────────────────────────────────────────────────────────────────────
 */
class MongoDatabase {
  constructor(db) {
    this.db = db;
    this.users = db.collection('users');
    this.records = db.collection('records');
    this.encrypted_key_bundles = db.collection('encrypted_key_bundles');
    this.access_grants = db.collection('access_grants');
    this.audit_logs = db.collection('audit_logs');
    this.indexer_state = db.collection('indexer_state');
    this.initIndexes();
  }

  async initIndexes() {
    try {
      await this.users.createIndex({ email: 1 }, { unique: true, background: true });
      await this.users.createIndex({ wallet_address: 1 }, { background: true });
      await this.records.createIndex({ record_id_hex: 1 }, { unique: true, background: true });
      await this.records.createIndex({ owner_address: 1 }, { background: true });
      await this.access_grants.createIndex({ grant_id_hex: 1 }, { unique: true, background: true });
      await this.access_grants.createIndex({ record_id_hex: 1 }, { background: true });
      await this.access_grants.createIndex({ owner_address: 1 }, { background: true });
      await this.access_grants.createIndex({ grantee_address: 1 }, { background: true });
      await this.audit_logs.createIndex({ record_id_hex: 1 }, { background: true });
      await this.indexer_state.createIndex({ network: 1 }, { unique: true, background: true });
    } catch (e) {
      console.warn('⚠️ MongoDB indexing notice:', e.message);
    }
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
      await this.users.insertOne(user);
      return { rows: [user], rowCount: 1 };
    }

    // 0b. Select user by email
    if (q.includes('FROM users') && q.includes('email = $1')) {
      const email = String(params[0]).toLowerCase();
      const user = await this.users.findOne({ email });
      return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
    }

    // 0c. Select user by wallet
    if (q.includes('FROM users') && q.includes('wallet_address = $1')) {
      const wallet = String(params[0]).toLowerCase();
      const user = await this.users.findOne({ wallet_address: wallet });
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
      await this.records.insertOne(record);
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
      await this.encrypted_key_bundles.insertOne(bundle);
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
      await this.access_grants.insertOne(grant);
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
      await this.audit_logs.insertOne(log);
      return { rows: [log], rowCount: 1 };
    }

    // 5. Select Records for Owner
    if (q.includes('FROM records') && (q.includes('owner_address = $1') || q.includes('owner_address) = LOWER($1)'))) {
      const owner = String(params[0] || '').toLowerCase();
      const recs = await this.records.find({ owner_address: owner }).sort({ created_at: -1 }).toArray();
      const now = new Date();

      const formatted = await Promise.all(recs.map(async (r) => {
        const activeGrantsCount = await this.access_grants.countDocuments({
          record_id_hex: r.record_id_hex,
          is_revoked: false,
          valid_to: { $gt: now }
        });

        return {
          id: r.record_id_hex,
          recordId: r.record_id_hex,
          record_id_hex: r.record_id_hex,
          label: r.label,
          ownerWallet: r.owner_address,
          owner_address: r.owner_address,
          storageCID: r.ipfs_cid,
          ipfsCid: r.ipfs_cid,
          ipfs_cid: r.ipfs_cid,
          contentHash: r.content_hash,
          content_hash: r.content_hash,
          fileSizeBytes: r.file_size_bytes,
          file_size_bytes: r.file_size_bytes,
          mimeType: r.mime_type,
          mime_type: r.mime_type,
          activeGrants: activeGrantsCount,
          created_at: r.created_at,
          createdAt: r.created_at
        };
      }));

      return { rows: formatted, rowCount: formatted.length };
    }

    // 5b. Select Grants for Owner or Grantee (listGrants)
    if (q.includes('FROM access_grants') && (q.includes('owner_address) = LOWER($1)') || q.includes('grantee_address) = LOWER($1)'))) {
      const wallet = String(params[0] || '').toLowerCase();
      const grants = await this.access_grants.find({
        $or: [{ owner_address: wallet }, { grantee_address: wallet }]
      }).sort({ created_at: -1 }).toArray();

      const formatted = await Promise.all(grants.map(async (g) => {
        const parentRecord = await this.records.findOne({ record_id_hex: g.record_id_hex });
        return {
          id: g.grant_id_hex,
          grantId: g.grant_id_hex,
          grant_id_hex: g.grant_id_hex,
          recordId: g.record_id_hex,
          record_id_hex: g.record_id_hex,
          recordLabel: parentRecord ? parentRecord.label : 'Medical Record',
          label: parentRecord ? parentRecord.label : 'Medical Record',
          ownerWallet: g.owner_address,
          owner_address: g.owner_address,
          granteeWallet: g.grantee_address,
          grantee_address: g.grantee_address,
          granteeName: g.grantee_address,
          validFrom: g.valid_from,
          valid_from: g.valid_from,
          expiresAt: g.valid_to,
          valid_to: g.valid_to,
          isRevoked: g.is_revoked,
          is_revoked: g.is_revoked,
          created_at: g.created_at,
          createdAt: g.created_at
        };
      }));

      return { rows: formatted, rowCount: formatted.length };
    }

    // 6. Select Record by record_id_hex
    if (q.includes('FROM records') && q.includes('record_id_hex = $1')) {
      const id = params[0];
      const found = await this.records.findOne({ record_id_hex: id });
      return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
    }

    // 7a. Select Grant by grant_id_hex
    if (q.includes('FROM access_grants') && q.includes('grant_id_hex = $1')) {
      const id = params[0];
      const found = await this.access_grants.findOne({ grant_id_hex: id });
      return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
    }

    // 7b. Update Grant Revoke
    if (q.includes('UPDATE access_grants') && q.includes('is_revoked = true')) {
      const id = params[0];
      const res = await this.access_grants.updateOne(
        { grant_id_hex: id },
        { $set: { is_revoked: true, updated_at: new Date() } }
      );
      return { rowCount: res.matchedCount };
    }

    // 7c. Select Grants for Record
    if (q.includes('FROM access_grants') && q.includes('record_id_hex = $1') && !q.includes('grantee_address')) {
      const recordId = params[0];
      const grants = await this.access_grants.find({ record_id_hex: recordId, is_revoked: false }).toArray();
      return { rows: grants, rowCount: grants.length };
    }

    // 7d. Select Grant Check (Doctor & Record)
    if (q.includes('FROM access_grants') && q.includes('record_id_hex = $1') && q.includes('grantee_address = $2')) {
      const recordId = params[0];
      const doctor = params[1].toLowerCase();
      const found = await this.access_grants.findOne({
        record_id_hex: recordId,
        grantee_address: doctor
      });
      return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
    }

    // 7e. Select Encrypted Key Bundle direct
    if (q.includes('FROM encrypted_key_bundles') && q.includes('record_id_hex = $1')) {
      const recordId = params[0];
      const recipient = params[1].toLowerCase();
      const found = await this.encrypted_key_bundles.findOne({
        record_id_hex: recordId,
        recipient_address: recipient
      });
      return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
    }

    // 8. Select Encrypted Key Bundle for Recipient (JOIN simulation)
    if (q.includes('FROM records r') && q.includes('JOIN encrypted_key_bundles k')) {
      const recordId = params[0];
      const recipient = params[1].toLowerCase();
      const record = await this.records.findOne({ record_id_hex: recordId });
      const bundle = await this.encrypted_key_bundles.findOne({
        record_id_hex: recordId,
        recipient_address: recipient
      });

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
      const logs = await this.audit_logs.find({ record_id_hex: recordId }).sort({ block_timestamp: -1, created_at: -1 }).toArray();
      const formatted = logs.map(a => ({
        id: a.id || a._id,
        recordId: a.record_id_hex,
        actorWallet: a.actor_address,
        eventType: a.action_type,
        context: a.context,
        blockNumber: a.block_number,
        txHash: String(a.tx_hash || ''),
        timestamp: a.block_timestamp
      }));
      return { rows: formatted, rowCount: formatted.length };
    }

    // 9b. Select All Audit Logs for User
    if (q.includes('FROM audit_logs') && !q.includes('record_id_hex = $1')) {
      let filter = {};
      if (params.length > 0 && params[0]) {
        const wallet = String(params[0]).toLowerCase();
        const userRecs = await this.records.find({ owner_address: wallet }).toArray();
        const userRecIds = userRecs.map(r => r.record_id_hex);
        filter = {
          $or: [
            { actor_address: wallet },
            { record_id_hex: { $in: userRecIds } }
          ]
        };
      }
      const logs = await this.audit_logs.find(filter).sort({ block_timestamp: -1, created_at: -1 }).limit(100).toArray();
      const formatted = logs.map(a => ({
        id: a.id || a._id,
        recordId: a.record_id_hex,
        actorWallet: a.actor_address,
        eventType: a.action_type,
        context: a.context,
        blockNumber: a.block_number,
        txHash: String(a.tx_hash || ''),
        timestamp: a.block_timestamp || a.created_at || new Date()
      }));
      return { rows: formatted, rowCount: formatted.length };
    }

    // 10. Select Indexer State
    if (q.includes('FROM indexer_state WHERE network = $1')) {
      const net = params[0];
      const state = await this.indexer_state.findOne({ network: net });
      return { rows: state ? [state] : [], rowCount: state ? 1 : 0 };
    }

    // 10b. Update Indexer State
    if (q.startsWith('INSERT INTO indexer_state')) {
      const net = params[0] || 'polygon-amoy';
      const block = params[1] || params[0];
      await this.indexer_state.updateOne(
        { network: 'polygon-amoy' },
        { $set: { network: 'polygon-amoy', last_indexed_block: block, updated_at: new Date() } },
        { upsert: true }
      );
      return { rowCount: 1 };
    }

    return { rows: [], rowCount: 0 };
  }

  async inspect() {
    const [users, records, grants, auditLogs] = await Promise.all([
      this.users.find({}, { projection: { password_hash: 0, salt: 0 } }).sort({ created_at: -1 }).limit(50).toArray(),
      this.records.find({}).sort({ created_at: -1 }).limit(50).toArray(),
      this.access_grants.find({}).sort({ created_at: -1 }).limit(50).toArray(),
      this.audit_logs.find({}).sort({ created_at: -1 }).limit(50).toArray()
    ]);

    const counts = {
      users: await this.users.countDocuments(),
      records: await this.records.countDocuments(),
      grants: await this.access_grants.countDocuments(),
      auditLogs: await this.audit_logs.countDocuments()
    };

    return {
      activeDriver: 'mongodb-cluster',
      databaseName: this.db.databaseName,
      counts,
      data: { users, records, grants, auditLogs }
    };
  }
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 2. In-Memory Database Driver (Fallback & Local Evaluation)
 * ─────────────────────────────────────────────────────────────────────────────
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
    if (q.includes('FROM records') && (q.includes('owner_address = $1') || q.includes('owner_address) = LOWER($1)'))) {
      const owner = String(params[0] || '').toLowerCase();
      const filtered = this.records
        .filter(r => r.owner_address.toLowerCase() === owner)
        .map(r => {
          const activeGrants = this.access_grants.filter(
            g => g.record_id_hex === r.record_id_hex && !g.is_revoked && new Date(g.valid_to) > new Date()
          ).length;
          return {
            id: r.record_id_hex,
            recordId: r.record_id_hex,
            record_id_hex: r.record_id_hex,
            label: r.label,
            ownerWallet: r.owner_address,
            owner_address: r.owner_address,
            storageCID: r.ipfs_cid,
            ipfsCid: r.ipfs_cid,
            ipfs_cid: r.ipfs_cid,
            contentHash: r.content_hash,
            content_hash: r.content_hash,
            fileSizeBytes: r.file_size_bytes,
            file_size_bytes: r.file_size_bytes,
            mimeType: r.mime_type,
            mime_type: r.mime_type,
            activeGrants,
            created_at: r.created_at,
            createdAt: r.created_at
          };
        });
      return { rows: filtered, rowCount: filtered.length };
    }

    // 5b. Select Grants for Owner or Grantee (listGrants)
    if (q.includes('FROM access_grants') && (q.includes('owner_address) = LOWER($1)') || q.includes('grantee_address) = LOWER($1)'))) {
      const wallet = String(params[0] || '').toLowerCase();
      const filtered = this.access_grants
        .filter(g => g.owner_address.toLowerCase() === wallet || g.grantee_address.toLowerCase() === wallet)
        .map(g => {
          const parentRecord = this.records.find(r => r.record_id_hex === g.record_id_hex);
          return {
            id: g.grant_id_hex,
            grantId: g.grant_id_hex,
            grant_id_hex: g.grant_id_hex,
            recordId: g.record_id_hex,
            record_id_hex: g.record_id_hex,
            recordLabel: parentRecord ? parentRecord.label : 'Medical Record',
            label: parentRecord ? parentRecord.label : 'Medical Record',
            ownerWallet: g.owner_address,
            owner_address: g.owner_address,
            granteeWallet: g.grantee_address,
            grantee_address: g.grantee_address,
            granteeName: g.grantee_address,
            validFrom: g.valid_from,
            valid_from: g.valid_from,
            expiresAt: g.valid_to,
            valid_to: g.valid_to,
            isRevoked: g.is_revoked,
            is_revoked: g.is_revoked,
            created_at: g.created_at,
            createdAt: g.created_at
          };
        });
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

    // 9b. Select All Audit Logs for User
    if (q.includes('FROM audit_logs') && !q.includes('record_id_hex = $1')) {
      let filtered = this.audit_logs;
      if (params.length > 0 && params[0]) {
        const wallet = String(params[0]).toLowerCase();
        const userRecIds = this.records.filter(r => r.owner_address.toLowerCase() === wallet).map(r => r.record_id_hex);
        filtered = this.audit_logs.filter(a => (a.actor_address && a.actor_address.toLowerCase() === wallet) || userRecIds.includes(a.record_id_hex));
      }
      const logs = filtered.map(a => ({
        id: a.id,
        recordId: a.record_id_hex,
        actorWallet: a.actor_address,
        eventType: a.action_type,
        context: a.context,
        blockNumber: a.block_number,
        txHash: String(a.tx_hash || ''),
        timestamp: a.block_timestamp || new Date()
      }));
      return { rows: logs, rowCount: logs.length };
    }

    // 10. Select Indexer State
    if (q.includes('FROM indexer_state WHERE network = $1')) {
      const net = params[0];
      const state = this.indexer_state.get(net);
      return { rows: state ? [state] : [], rowCount: state ? 1 : 0 };
    }

    return { rows: [], rowCount: 0 };
  }

  async inspect() {
    return {
      activeDriver: 'in-memory-fallback',
      databaseName: 'medvault-memory',
      counts: {
        users: this.users.length,
        records: this.records.length,
        grants: this.access_grants.length,
        auditLogs: this.audit_logs.length
      },
      data: {
        users: this.users.map(({ password_hash, salt, ...rest }) => rest),
        records: this.records,
        grants: this.access_grants,
        auditLogs: this.audit_logs
      }
    };
  }

  async connect() {
    return {
      query: (text, params) => this.query(text, params),
      release: () => {}
    };
  }
}

const memoryDb = new MemoryDatabase();
let mongoDb = null;

// Initialize MongoDB Cluster if connection URI is provided
if (mongoUri) {
  try {
    const { MongoClient, ServerApiVersion } = await import('mongodb');
    mongoClient = new MongoClient(mongoUri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: false,
        deprecationErrors: true,
      },
      connectTimeoutMS: 5000,
      socketTimeoutMS: 10000
    });
    await mongoClient.connect();
    const dbName = process.env.MONGODB_DB_NAME || 'medvault';
    mongoDbInstance = mongoClient.db(dbName);
    mongoDb = new MongoDatabase(mongoDbInstance);
    console.log(`🍃 Connected to MongoDB Cluster: Database "${dbName}".`);
  } catch (err) {
    console.warn(`⚠️ MongoDB Cluster connection failed (${err.message}). Falling back to memory store.`);
  }
} else if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('mongodb')) {
  try {
    const { default: pg } = await import('pg');
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false
    });
    console.log('📦 Connected to PostgreSQL database.');
  } catch (e) {
    console.warn('⚠️ pg driver not installed; falling back to in-memory store.');
  }
} else {
  console.log('💾 Running MedVault in-memory storage driver (Postgres/MongoDB fallback ready).');
}

export const db = {
  query: async (text, params) => {
    if (mongoDb) {
      try {
        return await mongoDb.query(text, params);
      } catch (err) {
        console.error('[MongoDB Query Error]:', err.message);
        return memoryDb.query(text, params);
      }
    }
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
    if (mongoDb) return { query: (t, p) => mongoDb.query(t, p), release: () => {} };
    if (pool) {
      try {
        return await pool.connect();
      } catch (err) {
        return memoryDb.connect();
      }
    }
    return memoryDb.connect();
  },

  inspectDatabase: async () => {
    if (mongoDb) return await mongoDb.inspect();
    return await memoryDb.inspect();
  },

  getMongoDb: () => mongoDbInstance,

  end: async () => {
    if (mongoClient) await mongoClient.close();
    if (pool) await pool.end();
  },

  isHealthy: async () => {
    if (mongoDb) {
      try {
        await mongoDbInstance.command({ ping: 1 });
        return { connected: true, driver: 'mongodb-cluster', database: mongoDbInstance.databaseName };
      } catch (e) {
        return { connected: true, driver: 'in-memory-fallback', mongoNotice: e.message };
      }
    }
    if (pool) {
      try {
        await pool.query('SELECT 1');
        return { connected: true, driver: 'postgresql' };
      } catch (e) {
        return { connected: true, driver: 'in-memory-fallback', postgresNotice: e.message };
      }
    }
    return { connected: true, driver: 'in-memory-fallback' };
  }
};
