// Mock data for MedVault — simulates backend responses
// Uses the exact data model from 02-ARCHITECTURE.md

export const mockPatient = {
  walletAddress: '0x7a3b...f92d',
  fullAddress: '0x7a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f92d',
  displayName: 'Alex Morgan',
  role: 'patient',
  connectedAt: '2026-09-15T10:30:00Z'
};

export const mockDoctor = {
  walletAddress: '0x4e2f...a81c',
  fullAddress: '0x4e2f3a1b5c6d7e8f9a0b1c2d3e4f5a6b7c8a81c',
  displayName: 'Dr. Sarah Chen',
  role: 'doctor',
  connectedAt: '2026-09-20T14:00:00Z'
};

export const mockRecords = [
  {
    id: 'rec_001',
    label: 'Complete Blood Count — Sept 2026',
    ownerWallet: '0x7a3b...f92d',
    storageCID: 'QmX7b2c...9f3a',
    encryptedKeyMaterial: 'enc_key_001',
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
    encryptedKeyMaterial: 'enc_key_002',
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
    encryptedKeyMaterial: 'enc_key_003',
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
    encryptedKeyMaterial: 'enc_key_004',
    createdAt: '2026-06-05T16:20:00Z',
    fileSize: '210 KB',
    fileType: 'PDF',
    activeGrants: 0,
    status: 'encrypted'
  }
];

export const mockGrants = [
  {
    id: 'grant_001',
    recordId: 'rec_001',
    recordLabel: 'Complete Blood Count — Sept 2026',
    granteeWallet: '0x4e2f...a81c',
    granteeName: 'Dr. Sarah Chen',
    expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours from now
    status: 'active',
    createdAt: '2026-09-25T10:00:00Z',
    shareableLink: 'https://medvault.app/access/grant_001'
  },
  {
    id: 'grant_002',
    recordId: 'rec_001',
    recordLabel: 'Complete Blood Count — Sept 2026',
    granteeWallet: '0x9b8c...d73e',
    granteeName: 'Dr. James Wilson',
    expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days
    status: 'active',
    createdAt: '2026-09-24T15:30:00Z',
    shareableLink: 'https://medvault.app/access/grant_002'
  },
  {
    id: 'grant_003',
    recordId: 'rec_002',
    recordLabel: 'Lipid Panel Results — Aug 2026',
    granteeWallet: '0x4e2f...a81c',
    granteeName: 'Dr. Sarah Chen',
    expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12 hours
    status: 'active',
    createdAt: '2026-09-23T09:00:00Z',
    shareableLink: 'https://medvault.app/access/grant_003'
  },
  {
    id: 'grant_004',
    recordId: 'rec_003',
    recordLabel: 'HbA1c Test — July 2026',
    granteeWallet: '0x2d1e...c45f',
    granteeName: 'Dr. Emily Patel',
    expiresAt: '2026-09-20T10:00:00Z',
    status: 'expired',
    createdAt: '2026-09-13T10:00:00Z',
    shareableLink: 'https://medvault.app/access/grant_004'
  }
];

export const mockAuditEvents = [
  {
    id: 'evt_001',
    grantId: 'grant_001',
    recordId: 'rec_001',
    eventType: 'issued',
    actorWallet: '0x7a3b...f92d',
    actorName: 'Alex Morgan (You)',
    targetWallet: '0x4e2f...a81c',
    targetName: 'Dr. Sarah Chen',
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
  },
  {
    id: 'evt_003',
    grantId: 'grant_002',
    recordId: 'rec_001',
    eventType: 'issued',
    actorWallet: '0x7a3b...f92d',
    actorName: 'Alex Morgan (You)',
    targetWallet: '0x9b8c...d73e',
    targetName: 'Dr. James Wilson',
    timestamp: '2026-09-24T15:30:00Z',
    txHash: '0xmno345...pqr678'
  },
  {
    id: 'evt_004',
    grantId: 'grant_002',
    recordId: 'rec_001',
    eventType: 'accessed',
    actorWallet: '0x9b8c...d73e',
    actorName: 'Dr. James Wilson',
    timestamp: '2026-09-24T18:00:00Z',
    txHash: '0xstu901...vwx234'
  },
  {
    id: 'evt_005',
    grantId: 'grant_003',
    recordId: 'rec_002',
    eventType: 'issued',
    actorWallet: '0x7a3b...f92d',
    actorName: 'Alex Morgan (You)',
    targetWallet: '0x4e2f...a81c',
    targetName: 'Dr. Sarah Chen',
    timestamp: '2026-09-23T09:00:00Z',
    txHash: '0xyza567...bcd890'
  },
  {
    id: 'evt_006',
    grantId: 'grant_004',
    recordId: 'rec_003',
    eventType: 'issued',
    actorWallet: '0x7a3b...f92d',
    actorName: 'Alex Morgan (You)',
    targetWallet: '0x2d1e...c45f',
    targetName: 'Dr. Emily Patel',
    timestamp: '2026-09-13T10:00:00Z',
    txHash: '0xefg123...hij456'
  },
  {
    id: 'evt_007',
    grantId: 'grant_004',
    recordId: 'rec_003',
    eventType: 'accessed',
    actorWallet: '0x2d1e...c45f',
    actorName: 'Dr. Emily Patel',
    timestamp: '2026-09-14T09:00:00Z',
    txHash: '0xklm789...nop012'
  },
  {
    id: 'evt_008',
    grantId: 'grant_004',
    recordId: 'rec_003',
    eventType: 'expired',
    actorWallet: 'system',
    actorName: 'System',
    timestamp: '2026-09-20T10:00:00Z',
    txHash: '0xqrs345...tuv678'
  }
];

// Statistics for dashboard
export const mockStats = {
  totalRecords: 4,
  activeGrants: 3,
  expiredGrants: 1,
  totalAccesses: 3,
  storageUsed: '776 KB'
};

// Expiry duration presets
export const expiryPresets = [
  { label: '1 Hour', value: 3600 },
  { label: '6 Hours', value: 21600 },
  { label: '24 Hours', value: 86400 },
  { label: '3 Days', value: 259200 },
  { label: '7 Days', value: 604800 },
  { label: 'Custom', value: null }
];
