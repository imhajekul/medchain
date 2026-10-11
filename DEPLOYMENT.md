# MedVault — Production Deployment Guide & Operations Manual

This guide outlines the production deployment architecture, security invariants, database migrations, container orchestration, and operations procedures for **MedVault**, a decentralized, patient-owned medical records platform built upon a **Zero Data Exposure** security model.

---

## 1. System Architecture & Security Invariant

```
       [ Client Browser (React + Web Crypto API) ]
           │
           │ 1. AES-256-GCM Encrypted Blob + ECIES Encrypted DEK
           ▼
[ Reverse Proxy / Nginx / Cloudflare ]
           │ (TLS 1.3 Termination, Rate Limiting, Security Headers)
           ▼
[ MedVault Core API Server (Node 20 / Express / Helmet) ]
    ├── Nonce Rotation & SIWE Session Verification (EIP-4361)
    ├── Plaintext Magic Byte Inspection (Rejects Unencrypted Files with HTTP 422)
    ├── Relayer Signing for On-Chain Audit Logging
    ▼                                           ▲
[ PostgreSQL 16 (Prisma) ]             [ EVM Smart Contract ]
  - Record metadata pointers           (MedVaultAccess.sol)
  - Time-boxed grants                   - Immutable access grants
  - Fast-read audit logs                - Auto-expiry timestamp validation
                                        - Relayer-logged access events
```

### Strict System Invariant
- **Zero Plaintext PHI Exposure**: Plaintext Protected Health Information (PHI) **never** touches backend servers, memory caches, logs, databases, or the blockchain.
- **Client-Side Cryptography**: Files are encrypted inside the user's browser using 256-bit AES-GCM before leaving the device. The backend strictly handles encrypted blobs and storage CID pointers.
- **Cryptographic Auditability**: Every access grant and retrieval event is verified on-chain.

---

## 2. Production Deployment Options

### Option A: Docker Compose (Recommended for VPS / Dedicated Servers)

The easiest and most resilient way to run the entire production stack (PostgreSQL 16, MedVault API, and Nginx SPA) is using Docker Compose:

1. **Clone the repository and prepare environment variables:**
   ```bash
   cp .env.example .env
   ```
   *Edit `.env` to configure your `JWT_SECRET`, `POSTGRES_PASSWORD`, and Polygon/Base RPC keys.*

2. **Launch all services with healthchecks:**
   ```bash
   docker compose up -d --build
   ```

3. **Verify running containers:**
   ```bash
   docker compose ps
   ```
   Expected output:
   - `medvault-postgres` (healthy on port `5432`)
   - `medvault-server` (healthy on port `3001`)
   - `medvault-client` (healthy on port `80`)

4. **Verify Container Health & Probes:**
   ```bash
   # Liveness Probe
   curl -i http://localhost:3001/health

   # Readiness Probe (Verifies PostgreSQL connection pool & Indexer)
   curl -i http://localhost:3001/ready
   ```

5. **Stop and clean up:**
   ```bash
   docker compose down
   ```

---

### Option B: Cloud PaaS Deployment (Render / Railway / Fly.io)

MedVault includes a native [render.yaml](render.yaml) blueprint:

1. Link your GitHub repository in your [Render Dashboard](https://dashboard.render.com/).
2. Select **Blueprints** and choose `render.yaml`.
3. Render automatically provisions:
   - Managed **PostgreSQL** database.
   - **MedVault Core API** with healthcheck path `/health` and auto-generated secure secrets.
   - **MedVault Client** static SPA with automatic client-side routing rewrites.

---

### Option C: Enterprise Kubernetes (`k8s/`)

Production Kubernetes manifests with rolling updates, resource boundaries, and TLS ingress are provided in [k8s/medvault-k8s.yaml](k8s/medvault-k8s.yaml):

1. **Apply the namespace, secrets, and configuration:**
   ```bash
   kubectl apply -f k8s/medvault-k8s.yaml
   ```

2. **Monitor rollout status:**
   ```bash
   kubectl rollout status deployment/medvault-server -n medvault
   kubectl rollout status deployment/medvault-client -n medvault
   ```

3. **Inspect pods and services:**
   ```bash
   kubectl get pods,services,ingress -n medvault
   ```

---

## 3. Database Management & Migrations

### Running Migrations in Production

When using a live PostgreSQL instance (e.g. AWS RDS, Google Cloud SQL, Supabase, Neon):

1. **Configure your connection string:**
   ```bash
   export DATABASE_URL="postgresql://user:password@host:5432/medvault?schema=public"
   ```

2. **Apply migrations using Prisma CLI:**
   ```bash
   cd server
   npm run db:generate   # Generates Prisma Client artifacts
   npm run db:push       # Synchronizes schema with database
   ```

3. **Apply raw DDL with indexes:**
   ```bash
   psql $DATABASE_URL -f migrations/schema.sql
   ```

---

## 4. Smart Contract Deployment (Polygon Amoy / Base Sepolia / Mainnet)

1. **Configure Deployer Credentials in `.env`:**
   ```bash
   export RPC_URL="https://rpc-amoy.polygon.technology/"
   export DEPLOYER_PRIVATE_KEY="0x..."
   export RELAYER_ADDRESS="0x..."
   ```

2. **Deploy MedVaultAccess.sol:**
   ```bash
   cd contracts
   node deploy.js
   ```

3. **Record Contract Address:**
   Update `CONTRACT_ADDRESS` in `server/.env` and `VITE_CONTRACT_ADDRESS` in `client/.env`.

---

## 5. Security & Production Checklist

- [x] **Zero Plaintext Invariant Enforced**: Backend inspects byte headers and returns `422 Unprocessable Entity` if unencrypted files are sent.
- [x] **Rate Limiting**: `express-rate-limit` prevents brute-force nonce exhaustion and upload spam.
- [x] **Security Headers**: `helmet` enforces strict MIME sniffing protection, X-Frame-Options, and XSS filtering.
- [x] **Reverse Proxy Trust**: `app.set('trust proxy', 1)` configured for correct IP tracking behind load balancers.
- [x] **Graceful Shutdown**: `SIGTERM` and `SIGINT` cleanly drain HTTP connections and close database connection pools.
- [x] **Container Health Probes**: `/health` (liveness) and `/ready` (readiness) with HTTP 200/503 status code reporting.
- [x] **Replay Attack Protection**: Single-use cryptographic nonces with 5-minute TTL.
- [x] **Time-Boxed Access Control**: Evaluates `valid_to < now` and returns `410 Gone` on expired grants.
- [x] **Confidential Audit Logs**: Audit trail access is strictly scoped to verified record owners (`403 Forbidden` for non-owners).
- [x] **Automated CI/CD**: GitHub Actions workflow verifies unit tests, integration tests, client build, and Docker compilation.
