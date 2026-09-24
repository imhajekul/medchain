# MedVault — Architecture & API Specification

## 1. System Overview

```
┌─────────────┐      ┌──────────────┐      ┌────────────────────┐
│   Patient   │      │   Backend    │      │  Off-chain storage  │
│  (browser)  │◄────►│     API      │◄────►│   (IPFS / Arweave)  │
└─────────────┘      └──────┬───────┘      │  — encrypted files  │
                             │              └────────────────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  Smart Contract   │
                    │  (testnet, e.g.   │
                    │  Polygon / Base)  │
                    │  — access grants  │
                    │  — audit events   │
                    └────────┬──────────┘
                             │
┌─────────────┐              │
│   Doctor    │◄─────────────┘
│  (browser)  │  reads grant, fetches
└─────────────┘  ciphertext, decrypts locally
```

**Design principle:** raw medical files never touch the blockchain. The chain stores only pointers (content hash / storage address) and access-control metadata. Files are encrypted client-side before leaving the patient's browser.

## 2. Components

### 2.1 Frontend (patient + doctor views)
- Framework: React (kept generic for now — a stack decision, not a scoping decision, revisit at Kenshi)
- Wallet connection: Sign-In with Ethereum (SIWE) or a wallet-abstraction provider (e.g., embedded wallet) to reduce onboarding friction for non-crypto-native patients — **this UX decision is the single highest-risk item in the project and should be prototyped early at Kenshi**

### 2.2 Backend API
- Thin service layer between frontend, off-chain storage, and the smart contract
- Does **not** hold plaintext medical data or private keys
- Responsible for: coordinating uploads, relaying encrypted blobs to storage, reading contract state, serving audit logs

### 2.3 Off-chain storage
- IPFS or Arweave for encrypted file blobs
- Only the content hash (CID) is referenced on-chain

### 2.4 Smart contract (testnet)
- Holds: record pointer (CID) ↔ owner (patient wallet)
- Holds: access grants (grantee wallet, record pointer, expiry timestamp)
- Emits events on: grant created, record accessed, grant expired/revoked
- Chosen chain: an EVM-compatible testnet (Polygon Amoy or Base Sepolia) for low/no gas cost during development

### 2.5 Encryption
- Client-side symmetric encryption (e.g., AES-256) of the file before upload
- The symmetric key itself is encrypted per-recipient (asymmetric, e.g., via the recipient's public key) and attached to the access grant — so only a valid grantee can derive the key to decrypt

## 3. API Endpoints (MVP)

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/connect` | Authenticate patient/doctor via wallet signature |
| POST | `/records` | Upload an encrypted record (returns CID) |
| GET | `/records/:id` | Fetch encrypted record metadata (owner only) |
| POST | `/grants` | Create an access grant (record, grantee, expiry) — writes to contract |
| GET | `/grants/:id` | Fetch grant status (active / expired / revoked) |
| GET | `/grants/:id/decrypt-key` | Return the per-recipient encrypted key material, only if grant is valid and caller is the grantee |
| DELETE | `/grants/:id` | Revoke a grant early (stretch goal, not MVP) |
| GET | `/audit/:recordId` | Fetch full access history for a record (owner only) |

## 4. Data Model (simplified)

- **Record**: `id, ownerWallet, storageCID, encryptedKeyMaterial, createdAt`
- **Grant**: `id, recordId, granteeWallet, expiresAt, status, createdAt`
- **AuditEvent**: `id, grantId, eventType (issued | accessed | expired), timestamp`

## 5. Key Architectural Risks

| Risk | Mitigation |
|---|---|
| Wallet UX friction drives away non-crypto-native patients | Prototype wallet-abstraction login first at Kenshi before building anything else |
| Gas costs / chain latency on every grant creation | Use a cheap L2 testnet; consider batching or off-chain signature + on-chain settlement pattern later |
| Lost private key = permanently locked-out patient | Flag as a known limitation for MVP; social/guardian recovery is a v2+ research item |
| Off-chain storage availability (IPFS pinning) | Use a pinning service for the MVP rather than relying on public IPFS persistence |
