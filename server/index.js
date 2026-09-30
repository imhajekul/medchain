import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ─── Mock Data ────────────────────────────────────────────────
const records = [
  {
    id: 'rec_001',
    label: 'Complete Blood Count — Sept 2026',
    ownerWallet: '0x7a3b...f92d',
    storageCID: 'QmX7b2c...9f3a',
    createdAt: '2026-09-15T14:30:00Z',
    fileSize: '245 KB',
    fileType: 'PDF',
    activeGrants: 2,
    status: 'encrypted'
  },
  {
    id: 'rec_002',
    label: 'Lipid Panel Results — Aug 2026',
    ownerWallet: '0x7a3b...f92d',
    storageCID: 'QmY8c3d...0g4b',
    createdAt: '2026-08-22T09:15:00Z',
    fileSize: '189 KB',
    fileType: 'PDF',
    activeGrants: 1,
    status: 'encrypted'
  },
  {
    id: 'rec_003',
    label: 'HbA1c Test — July 2026',
    ownerWallet: '0x7a3b...f92d',
    storageCID: 'QmZ9d4e...1h5c',
    createdAt: '2026-07-10T11:45:00Z',
    fileSize: '132 KB',
    fileType: 'PDF',
    activeGrants: 0,
    status: 'encrypted'
  },
  {
    id: 'rec_004',
    label: 'Thyroid Function Panel — June 2026',
    ownerWallet: '0x7a3b...f92d',
    storageCID: 'QmA0e5f...2i6d',
    createdAt: '2026-06-05T16:20:00Z',
    fileSize: '210 KB',
    fileType: 'PDF',
    activeGrants: 0,
    status: 'encrypted'
  }
];

const grants = [
  {
    id: 'grant_001',
    recordId: 'rec_001',
    granteeWallet: '0x4e2f...a81c',
    granteeName: 'Dr. Sarah Chen',
    expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    createdAt: '2026-09-25T10:00:00Z',
    shareableLink: 'https://medvault.app/access/grant_001'
  },
  {
    id: 'grant_002',
    recordId: 'rec_001',
    granteeWallet: '0x9b8c...d73e',
    granteeName: 'Dr. James Wilson',
    expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    createdAt: '2026-09-24T15:30:00Z',
    shareableLink: 'https://medvault.app/access/grant_002'
  }
];

const auditEvents = [
  {
    id: 'evt_001',
    grantId: 'grant_001',
    recordId: 'rec_001',
    eventType: 'issued',
    actorWallet: '0x7a3b...f92d',
    actorName: 'Alex Morgan (You)',
    timestamp: '2026-09-25T10:00:00Z',
    txHash: '0xabc123...def456'
  },
  {
    id: 'evt_002',
    grantId: 'grant_001',
    recordId: 'rec_001',
    eventType: 'accessed',
    actorWallet: '0x4e2f...a81c',
    actorName: 'Dr. Sarah Chen',
    timestamp: '2026-09-25T11:30:00Z',
    txHash: '0xghi789...jkl012'
  }
];

// ─── Routes (from 03-API-SPEC.md) ────────────────────────────

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// POST /auth/connect — simulate wallet auth
app.post('/api/auth/connect', (req, res) => {
  const { walletAddress } = req.body;
  if (!walletAddress) {
    return res.status(401).json({ error: 'Missing wallet address' });
  }
  res.json({
    sessionToken: `session_${Date.now()}`,
    role: 'patient',
    walletAddress,
    displayName: 'Alex Morgan'
  });
});

// GET /records — list records
app.get('/api/records', (req, res) => {
  res.json({ records });
});

// GET /records/:id — single record
app.get('/api/records/:id', (req, res) => {
  const record = records.find(r => r.id === req.params.id);
  if (!record) return res.status(404).json({ error: 'Record not found' });
  res.json(record);
});

// POST /records — upload (simulated)
app.post('/api/records', (req, res) => {
  const { label } = req.body;
  if (!label) return res.status(400).json({ error: 'Label is required' });
  const newRecord = {
    id: `rec_${Date.now()}`,
    label,
    ownerWallet: '0x7a3b...f92d',
    storageCID: `Qm${Math.random().toString(36).substr(2, 10)}`,
    createdAt: new Date().toISOString(),
    fileSize: '0 KB',
    fileType: 'PDF',
    activeGrants: 0,
    status: 'encrypted'
  };
  records.unshift(newRecord);
  res.status(201).json(newRecord);
});

// POST /grants — create a grant
app.post('/api/grants', (req, res) => {
  const { recordId, granteeWallet, expiresInSeconds } = req.body;
  if (!recordId || !granteeWallet || !expiresInSeconds) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const record = records.find(r => r.id === recordId);
  if (!record) return res.status(404).json({ error: 'Record not found' });

  const newGrant = {
    id: `grant_${Date.now()}`,
    recordId,
    granteeWallet,
    granteeName: granteeWallet,
    expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
    status: 'active',
    createdAt: new Date().toISOString(),
    shareableLink: `https://medvault.app/access/grant_${Date.now()}`
  };
  grants.unshift(newGrant);
  record.activeGrants += 1;
  res.status(201).json(newGrant);
});

// GET /grants/:id — grant status
app.get('/api/grants/:id', (req, res) => {
  const grant = grants.find(g => g.id === req.params.id);
  if (!grant) return res.status(404).json({ error: 'Grant not found' });
  // Check expiry
  if (grant.status === 'active' && new Date(grant.expiresAt) < new Date()) {
    grant.status = 'expired';
    return res.status(410).json({ ...grant, message: 'Grant expired' });
  }
  res.json(grant);
});

// GET /audit/:recordId — audit log
app.get('/api/audit/:recordId', (req, res) => {
  const events = auditEvents.filter(e => e.recordId === req.params.recordId);
  res.json({ events });
});

// GET /stats
app.get('/api/stats', (req, res) => {
  res.json({
    totalRecords: records.length,
    activeGrants: grants.filter(g => g.status === 'active').length,
    expiredGrants: grants.filter(g => g.status === 'expired').length,
    totalAccesses: auditEvents.filter(e => e.eventType === 'accessed').length,
    storageUsed: '776 KB'
  });
});

// ─── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  🏥 MedVault API server running at http://localhost:${PORT}`);
  console.log(`  📋 Endpoints:`);
  console.log(`     GET  /api/health`);
  console.log(`     POST /api/auth/connect`);
  console.log(`     GET  /api/records`);
  console.log(`     GET  /api/records/:id`);
  console.log(`     POST /api/records`);
  console.log(`     POST /api/grants`);
  console.log(`     GET  /api/grants/:id`);
  console.log(`     GET  /api/audit/:recordId\n`);
});
