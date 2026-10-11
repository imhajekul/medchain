import { ethers } from 'ethers';
import { db } from '../db.js';

const MEDVAULT_ACCESS_ABI = [
  'event RecordRegistered(bytes32 indexed recordId, address indexed owner, string cid)',
  'event GrantCreated(bytes32 indexed grantId, bytes32 indexed recordId, address indexed grantee, uint256 expiresAt)',
  'event RecordAccessed(bytes32 indexed grantId, address indexed actor, uint256 timestamp)',
  'event GrantRevoked(bytes32 indexed grantId, uint256 timestamp)'
];

export class BlockchainIndexer {
  constructor() {
    this.rpcUrl = process.env.RPC_URL;
    this.contractAddress = process.env.CONTRACT_ADDRESS;
    this.isRunning = false;
    this.confirmations = 3;
    this.provider = null;
    this.contract = null;
  }

  async start() {
    if (!this.rpcUrl || !this.contractAddress) {
      console.log('ℹ️  Blockchain Indexer in simulation/local mode (RPC_URL or CONTRACT_ADDRESS not configured).');
      return;
    }

    try {
      const amoyNetwork = ethers.Network.from({ name: 'polygon-amoy', chainId: 80002 });
      this.provider = new ethers.JsonRpcProvider(this.rpcUrl, amoyNetwork, { staticNetwork: true });
      this.contract = new ethers.Contract(this.contractAddress, MEDVAULT_ACCESS_ABI, this.provider);
      this.isRunning = true;
      console.log(`⚡ Blockchain Indexer connected to ${this.rpcUrl} watching contract: ${this.contractAddress}`);
      this.pollLoop();
    } catch (err) {
      console.error('[Indexer Connection Error]:', err.message);
    }
  }

  stop() {
    this.isRunning = false;
    console.log('🛑 Blockchain Indexer poll loop stopped.');
  }

  getStatus() {
    return {
      active: this.isRunning,
      mode: this.rpcUrl && this.contractAddress ? 'live' : 'simulation',
      rpcConfigured: Boolean(this.rpcUrl),
      contractConfigured: Boolean(this.contractAddress)
    };
  }

  async pollLoop() {
    let failureCount = 0;
    while (this.isRunning) {
      try {
        await this.syncNewBlocks();
        failureCount = 0;
        await new Promise(r => setTimeout(r, 6000));
      } catch (err) {
        failureCount++;
        const backoff = Math.min(30000, 5000 * failureCount);
        if (failureCount <= 2 || failureCount % 10 === 0) {
          console.warn(`[Indexer Poll Notice]: ${err.message}. Retrying in ${backoff / 1000}s...`);
        }
        await new Promise(r => setTimeout(r, backoff));
      }
    }
  }

  async syncNewBlocks() {
    const latestBlock = await this.provider.getBlockNumber();
    const safeTargetBlock = latestBlock - this.confirmations;

    const state = await db.query(
      `SELECT last_indexed_block FROM indexer_state WHERE network = 'polygon-amoy'`
    );

    let startBlock = state.rows.length > 0 ? Number(state.rows[0].last_indexed_block) + 1 : safeTargetBlock - 50;
    if (startBlock > safeTargetBlock) return;

    const endBlock = Math.min(startBlock + 200, safeTargetBlock);

    const filter = {
      address: this.contractAddress,
      fromBlock: startBlock,
      toBlock: endBlock
    };

    const logs = await this.provider.getLogs(filter);
    for (const log of logs) {
      await this.processLog(log);
    }

    await db.query(
      `INSERT INTO indexer_state (network, last_indexed_block, updated_at)
       VALUES ('polygon-amoy', $1, CURRENT_TIMESTAMP)`,
      [endBlock]
    );
  }

  async processLog(log) {
    try {
      const parsed = this.contract.interface.parseLog({
        topics: log.topics,
        data: log.data
      });
      if (!parsed) return;

      const block = await this.provider.getBlock(log.blockNumber);
      const blockTimestamp = new Date((block?.timestamp || Math.floor(Date.now() / 1000)) * 1000);

      switch (parsed.name) {
        case 'RecordRegistered': {
          const { recordId, owner, cid } = parsed.args;
          await db.query(
            `INSERT INTO audit_logs (record_id_hex, actor_address, action_type, context, block_number, tx_hash, log_index, block_timestamp)
             VALUES ($1, $2, 'RECORD_REGISTERED', $3, $4, $5, $6, $7)`,
            [recordId, owner.toLowerCase(), `IPFS CID: ${cid}`, log.blockNumber, log.transactionHash, log.index, blockTimestamp]
          );
          break;
        }

        case 'GrantCreated': {
          const { grantId, recordId, grantee, expiresAt } = parsed.args;
          await db.query(
            `INSERT INTO access_grants (grant_id_hex, record_id_hex, owner_address, grantee_address, valid_from, valid_to, tx_hash)
             VALUES ($1, $2, '0xowner', $3, CURRENT_TIMESTAMP, to_timestamp($4), $5)`,
            [grantId, recordId, grantee.toLowerCase(), Number(expiresAt), log.transactionHash]
          );

          await db.query(
            `INSERT INTO audit_logs (record_id_hex, actor_address, action_type, context, block_number, tx_hash, log_index, block_timestamp)
             VALUES ($1, $2, 'ISSUED', $3, $4, $5, $6, $7)`,
            [recordId, grantee.toLowerCase(), `Grant created: ${grantId}`, log.blockNumber, log.transactionHash, log.index, blockTimestamp]
          );
          break;
        }

        case 'RecordAccessed': {
          const { grantId, actor, timestamp } = parsed.args;
          // Lookup record associated with grant
          const grantRes = await db.query(
            `SELECT record_id_hex FROM access_grants WHERE grant_id_hex = $1`,
            [grantId]
          );
          const recordId = grantRes.rows[0]?.record_id_hex || grantId;

          await db.query(
            `INSERT INTO audit_logs (record_id_hex, actor_address, action_type, context, block_number, tx_hash, log_index, block_timestamp)
             VALUES ($1, $2, 'ACCESSED', $3, $4, $5, $6, $7)`,
            [recordId, actor.toLowerCase(), `Record accessed via grant ${grantId}`, log.blockNumber, log.transactionHash, log.index, new Date(Number(timestamp) * 1000)]
          );
          break;
        }

        case 'GrantRevoked': {
          const { grantId, timestamp } = parsed.args;
          const grantRes = await db.query(
            `SELECT record_id_hex FROM access_grants WHERE grant_id_hex = $1`,
            [grantId]
          );
          const recordId = grantRes.rows[0]?.record_id_hex || grantId;

          await db.query(
            `UPDATE access_grants SET is_revoked = true WHERE grant_id_hex = $1`,
            [grantId]
          );

          await db.query(
            `INSERT INTO audit_logs (record_id_hex, actor_address, action_type, context, block_number, tx_hash, log_index, block_timestamp)
             VALUES ($1, $2, 'REVOKED', $3, $4, $5, $6, $7)`,
            [recordId, '0xowner', `Grant revoked: ${grantId}`, log.blockNumber, log.transactionHash, log.index, new Date(Number(timestamp) * 1000)]
          );
          break;
        }
      }
    } catch (err) {
      console.error('[Error processing blockchain event]:', err.message);
    }
  }
}

export const indexer = new BlockchainIndexer();
