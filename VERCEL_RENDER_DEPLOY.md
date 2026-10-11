# MedVault Deployment Guide: Vercel (Frontend) + Render (Backend)

This guide walks you through deploying **MedVault** with the **Frontend on Vercel** and the **Backend & Database on Render**.

```
┌─────────────────────────────────┐           ┌──────────────────────────────────┐
│         VERCEL FRONTEND         │   HTTPS   │          RENDER BACKEND          │
│   (React + Vite + Web Crypto)   │ ────────> │      (Express + Prisma ORM)      │
│     https://medvault.vercel.app │   CORS    │  https://medvault-api.onrender.com│
└─────────────────────────────────┘           └──────────────────────────────────┘
                                                               │
                                                               ▼
                                              ┌──────────────────────────────────┐
                                              │        RENDER POSTGRESQL         │
                                              │    (Records, Grants, Audits)     │
                                              └──────────────────────────────────┘
```

---

## Part 1: Deploy Backend on Render

### Method A: 1-Click via Render Blueprint (Recommended)

1. Push your repository to GitHub.
2. Go to **[dashboard.render.com](https://dashboard.render.com/)** and click **New +** $\rightarrow$ **Blueprint**.
3. Select your GitHub repository.
4. Render will read the included [`render.yaml`](render.yaml) and automatically create:
   - **`medvault-api`**: Node.js Web Service
   - **`medvault-db`**: Managed PostgreSQL Database
5. Click **Apply**.
6. When deployment finishes, copy your Web Service URL (e.g. `https://medvault-api.onrender.com`).

---

### Method B: Manual Web Service Setup on Render

If you prefer to configure manually without the blueprint:

1. **Create the Database:**
   - In Render Dashboard, click **New +** $\rightarrow$ **PostgreSQL**.
   - Name: `medvault-db`
   - Database: `medvault`
   - User: `medvault`
   - Plan: `Free`
   - Click **Create Database** and copy the **Internal Database URL** (or External if connecting from outside Render).

2. **Create the Backend Web Service:**
   - In Render Dashboard, click **New +** $\rightarrow$ **Web Service**.
   - Connect your GitHub repository.
   - Configure the following settings:
     | Setting | Value |
     | :--- | :--- |
     | **Name** | `medvault-api` |
     | **Region** | Choose closest to your users (e.g., Oregon, Frankfurt) |
     | **Root Directory** | `server` |
     | **Runtime** | `Node` |
     | **Build Command** | `npm install && npx prisma generate` |
     | **Start Command** | `node index.js` |
     | **Instance Type** | `Free` (or `Starter`) |
     | **Health Check Path** | `/health` |

3. **Add Environment Variables in Render:**
   In the **Environment** tab of `medvault-api`, add:
   | Key | Value | Description |
   | :--- | :--- | :--- |
   | `NODE_ENV` | `production` | Enables production optimizations & error masking |
   | `DATABASE_URL` | *Paste your Render Postgres URL* | Database connection string |
   | `JWT_SECRET` | *(Generate a 64-char random hex string)* | Session token signing key |
   | `CORS_ORIGIN` | `*` | *Automatically permits all `*.vercel.app` domains* |
   | `RPC_URL` | `https://rpc-amoy.polygon.technology/` | EVM RPC endpoint |
   | `CONTRACT_ADDRESS`| `0x38b8AcE4624DEb11568A57866e4a28Ece055D0f6` | MedVault smart contract address |
   | `RELAYER_PRIVATE_KEY` | *(Optional for dev, required for on-chain audit relay)* | Wallet private key with Amoy POL |

4. Click **Create Web Service**.
5. Test the liveness probe in your browser:
   `https://your-service-name.onrender.com/health`
   Should return: `{"status":"UP","service":"MedVault Core Backend",...}`

---

### Run Database Migrations on Render

Once your database is created on Render, initialize the tables and composite indexes:

**Option 1: Using Render Web Shell (under `medvault-api` $\rightarrow$ Shell tab):**
```bash
npx prisma db push
```

**Option 2: From your local machine:**
```bash
# Set external database URL from Render Postgres dashboard
export DATABASE_URL="postgresql://medvault:password@dpg-xxx.render.com/medvault"
cd server
npm run db:push
# or run the schema.sql:
psql $DATABASE_URL -f migrations/schema.sql
```

---

## Part 2: Deploy Frontend on Vercel

The repository already includes pre-configured [`vercel.json`](vercel.json) (at the root) and [`client/vercel.json`](client/vercel.json) with SPA fallback rewrites.

1. Go to **[vercel.com/new](https://vercel.com/new)** and import your GitHub repository.
2. In the **Configure Project** screen:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click `Edit` and select `client` (or leave as `./` since root `vercel.json` is configured).
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

3. **Configure Environment Variables in Vercel:**
   Expand the **Environment Variables** section and add:

   | Key | Value | Notes |
   | :--- | :--- | :--- |
   | `VITE_API_URL` | `https://your-service-name.onrender.com` | **Your live Render Backend URL** (with or without `/api`) |
   | `VITE_CHAIN_ID` | `80002` | Polygon Amoy Testnet (or `84532` for Base Sepolia) |
   | `VITE_CONTRACT_ADDRESS` | `0x38b8AcE4624DEb11568A57866e4a28Ece055D0f6` | MedVault EVM Contract |

4. Click **Deploy**.
5. Vercel will build the React SPA in ~20 seconds.
6. Once deployed, Vercel gives you a URL like: `https://medvault-omega.vercel.app`.

---

## Part 3: Verification & Sanity Check

1. **Open your Vercel URL** in the browser: `https://your-app.vercel.app`
2. **Connect Wallet**:
   - Click **Connect Wallet** (Patient or Doctor mode).
   - The frontend calls `GET https://your-service-name.onrender.com/api/auth/nonce`.
   - Sign the SIWE message in MetaMask or Coinbase Wallet.
   - Authenticated with zero CORS errors!
3. **Upload an Encrypted Record**:
   - Select a medical file (PDF or image).
   - Browser Web Crypto API encrypts the file with AES-256-GCM.
   - Encrypted blob is sent to Render API.
   - Receive storage CID and record ID.
4. **Grant Access & Audit**:
   - Create a 24-hour grant for a doctor address.
   - Switch wallets and retrieve the decryption key envelope.
   - Inspect the audit trail under `/audit/:recordId`.

---

## Production Security Notes

1. **CORS is Pre-Configured for Vercel**:
   The backend in [`server/index.js`](server/index.js) dynamically recognizes any domain matching `*.vercel.app` as well as any custom domain specified in `CORS_ORIGIN`. Both Vercel production and preview branch URLs work automatically.
2. **Zero Plaintext Invariant Guaranteed**:
   Even with the distributed setup across Vercel and Render, plaintext medical data is encrypted inside the browser *before* any HTTP transmission occurs. Render never sees or stores plaintext PHI.
3. **Render Free Tier Spin-Down**:
   On the Render Free tier, web services spin down after 15 minutes of inactivity. When a request arrives, it may take 30–45 seconds to spin up. For instant zero-latency responses in production, upgrade the Render instance type from `Free` to `Starter` ($7/mo).
