-- =============================================================================
-- MedVault Database Schema (PostgreSQL)
-- Implements Zero Data Exposure metadata mapping and fast-read on-chain audit trail
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Records Table: Pointers to encrypted blobs on IPFS / decentralized storage
CREATE TABLE IF NOT EXISTS records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_id_hex VARCHAR(66) UNIQUE NOT NULL, -- bytes32 on-chain ID (0x...)
    owner_address VARCHAR(42) NOT NULL,        -- Patient 0x address (lowercase)
    label VARCHAR(255) NOT NULL,
    ipfs_cid VARCHAR(100) NOT NULL,            -- IPFS CID pointing to AES-256 ciphertext
    content_hash VARCHAR(66) NOT NULL,         -- SHA-256 of encrypted blob for integrity verification
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL DEFAULT 'application/octet-stream',
    on_chain_tx_hash VARCHAR(66),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_records_owner ON records(owner_address);
CREATE INDEX IF NOT EXISTS idx_records_record_id_hex ON records(record_id_hex);

-- 2. Encrypted Key Envelopes: Client-side asymmetrically encrypted DEKs
-- GUARANTEE: Server never stores raw DEK; only opaque ciphertext encrypted for recipient's public key
CREATE TABLE IF NOT EXISTS encrypted_key_bundles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_id_hex VARCHAR(66) NOT NULL REFERENCES records(record_id_hex) ON DELETE CASCADE,
    recipient_address VARCHAR(42) NOT NULL,    -- Patient or Doctor wallet (lowercase)
    encrypted_key_material TEXT NOT NULL,      -- Asymmetrically encrypted AES DEK (base64)
    key_algorithm VARCHAR(50) NOT NULL DEFAULT 'ECIES-secp256k1',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_record_recipient UNIQUE (record_id_hex, recipient_address)
);

CREATE INDEX IF NOT EXISTS idx_key_bundles_recipient ON encrypted_key_bundles(recipient_address);

-- 3. Access Grants: Mirrors on-chain permissions for fast read operations & validation
CREATE TABLE IF NOT EXISTS access_grants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    grant_id_hex VARCHAR(66) UNIQUE NOT NULL,
    record_id_hex VARCHAR(66) NOT NULL REFERENCES records(record_id_hex) ON DELETE CASCADE,
    owner_address VARCHAR(42) NOT NULL,
    grantee_address VARCHAR(42) NOT NULL,
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_to TIMESTAMP WITH TIME ZONE NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    tx_hash VARCHAR(66) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_grants_grantee_active ON access_grants(grantee_address, valid_to, is_revoked);
CREATE INDEX IF NOT EXISTS idx_grants_record ON access_grants(record_id_hex);

-- 4. Audit Trail Table: Read-optimized replica of on-chain events
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_id_hex VARCHAR(66) NOT NULL,
    actor_address VARCHAR(42) NOT NULL,
    action_type VARCHAR(50) NOT NULL, -- RECORD_REGISTERED, ACCESS_GRANTED, ACCESS_REVOKED, RECORD_ACCESSED
    context TEXT,
    block_number BIGINT NOT NULL,
    tx_hash VARCHAR(66) NOT NULL,
    log_index INT NOT NULL,
    block_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_audit_event UNIQUE (tx_hash, log_index)
);

CREATE INDEX IF NOT EXISTS idx_audit_record ON audit_logs(record_id_hex, block_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_address);

-- 5. Indexer State tracking for crash-resilient block synchronization
CREATE TABLE IF NOT EXISTS indexer_state (
    network VARCHAR(50) PRIMARY KEY,
    last_indexed_block BIGINT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Users Table: Multi-user authentication & credentials (Samurai Level Full-Stack)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(64) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'PATIENT', -- PATIENT or DOCTOR
    wallet_address VARCHAR(42) NOT NULL,         -- Cryptographic self-sovereign wallet
    name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);

