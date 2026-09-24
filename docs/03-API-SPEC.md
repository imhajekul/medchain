# MedVault — API Specification

> Companion to `02-ARCHITECTURE.md`. This document details the API contract; architecture covers system components and data flow.

## Authentication

All endpoints except `/auth/connect` require a signed session token obtained via wallet signature (SIWE-style challenge/response).

## Endpoints

### `POST /auth/connect`
Authenticate via wallet signature.
- **Body:** `{ walletAddress, signature, nonce }`
- **Response:** `{ sessionToken, role: "patient" | "doctor" }`

### `POST /records`
Upload an encrypted record.
- **Body:** `{ encryptedFile (blob), label, encryptedKeyMaterial }`
- **Response:** `{ recordId, storageCID }`
- **Notes:** file must already be client-side encrypted before this call; the server never sees plaintext

### `GET /records/:id`
Fetch record metadata (owner only).
- **Response:** `{ recordId, label, storageCID, createdAt, activeGrants: [...] }`

### `POST /grants`
Create a time-boxed access grant.
- **Body:** `{ recordId, granteeWallet, expiresInSeconds }`
- **Response:** `{ grantId, expiresAt, shareableLink }`
- **Notes:** triggers an on-chain transaction; response should be returned only after transaction confirmation (or with a pending state + webhook/poll for MVP simplicity)

### `GET /grants/:id`
Check grant status.
- **Response:** `{ grantId, status: "active" | "expired" | "revoked", expiresAt }`

### `GET /grants/:id/decrypt-key`
Retrieve the per-recipient key material needed to decrypt the record.
- **Auth:** caller's wallet must match `granteeWallet` on the grant, and grant must be active
- **Response:** `{ encryptedKeyMaterial }` — decrypted client-side by the recipient using their private key

### `DELETE /grants/:id` *(stretch goal, not MVP)*
Revoke an active grant early.
- **Auth:** caller must be the record owner
- **Response:** `{ grantId, status: "revoked" }`

### `GET /audit/:recordId`
Full access history for a record (owner only).
- **Response:** `{ events: [{ eventType, actorWallet, timestamp }] }`

## Error Handling (MVP baseline)

| Code | Meaning |
|---|---|
| 401 | Missing/invalid session token |
| 403 | Caller not authorized for this resource (e.g., not the record owner, or grant expired) |
| 404 | Record or grant not found |
| 410 | Grant expired (distinct from 404, so the UI can show "expired" vs "never existed") |

## Rate Limiting & Abuse Prevention (MVP-level notes)

- Basic per-wallet rate limiting on `/grants` creation to prevent spam-granting
- No public listing endpoint for records — all reads are owner- or grantee-scoped, never enumerable
