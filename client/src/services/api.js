/**
 * MedVault API Client Service
 * Connects frontend React components to the Zero Data Exposure Backend.
 */

function resolveApiBase() {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.startsWith('https://')) {
    const trimmed = envUrl.replace(/\/+$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  }
  return '/api';
}

const API_BASE = resolveApiBase();

export function getAuthHeaders() {
  const saved = localStorage.getItem('medvault_auth');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      const token = parsed.sessionToken || parsed.token;
      if (token) {
        return { Authorization: `Bearer ${token}` };
      }
    } catch (e) {
      console.warn('[API Auth Error] Could not read sessionToken from localStorage:', e);
    }
  }

  // Fallback: check document.cookie for medvault_token
  if (typeof document !== 'undefined' && document.cookie) {
    const match = document.cookie.match(/(?:^|;\s*)medvault_token=([^;]+)/);
    if (match && match[1]) {
      return { Authorization: `Bearer ${decodeURIComponent(match[1])}` };
    }
  }

  return {};
}

async function handleApiResponse(res, defaultErrorMsg) {
  if (res.ok) {
    return await res.json().catch(() => ({}));
  }

  let errData = {};
  try {
    errData = await res.json();
  } catch {}

  const errorMessage = errData.error || errData.message || defaultErrorMsg || `Server returned error (${res.status})`;

  if (res.status === 401) {
    console.warn('[API 401 Unauthorized]:', errorMessage);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('medvault:unauthorized', { detail: { message: errorMessage } }));
    }
    throw new Error(errorMessage || 'Session expired or unauthenticated. Please sign in again.');
  }

  if (res.status === 403) {
    console.warn('[API 403 Forbidden]:', errorMessage);
    throw new Error(errorMessage || 'Permission denied: caller is not authorized for this resource.');
  }

  if (res.status === 404) {
    throw new Error(errorMessage || 'Requested resource was not found on the server.');
  }

  if (res.status === 410) {
    throw new Error(errorMessage || 'Access grant has expired.');
  }

  throw new Error(errorMessage);
}

export const api = {
  // --- Samurai Level: Real Email & Password Authentication ---
  async register(email, password, role = 'patient', name = '') {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role, name })
    });
    return handleApiResponse(res, 'Registration failed');
  },

  async login(email, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return handleApiResponse(res, 'Invalid email or password');
  },

  async googleAuth(googleData, role = 'patient') {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...googleData, role })
    });
    return handleApiResponse(res, 'Google authentication failed');
  },

  async firebaseAuth(firebaseData, role = 'patient') {
    return this.googleAuth(firebaseData, role);
  },

  // --- Step 2: Web3 Authentication ---
  async getNonce(walletAddress = null) {
    const query = walletAddress ? `?address=${encodeURIComponent(walletAddress)}` : '';
    const res = await fetch(`${API_BASE}/auth/nonce${query}`);
    return handleApiResponse(res, 'Failed to fetch authentication nonce');
  },

  async verifySignature(message, signature, role = 'patient', walletAddress = null, nonce = null) {
    // Attempt /auth/connect first, with fallback to /auth/verify
    const payload = {
      message,
      signature,
      role,
      walletAddress: walletAddress || undefined,
      nonce: nonce || undefined
    };

    let res = await fetch(`${API_BASE}/auth/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.status === 404) {
      res = await fetch(`${API_BASE}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    return handleApiResponse(res, 'Cryptographic wallet signature verification failed');
  },

  // --- Step 3: Encrypted Records ---
  async uploadRecord(recordIdHex, label, mimeType, encryptedBlob, rawKeyBase64) {
    const formData = new FormData();
    formData.append('recordId', recordIdHex);
    formData.append('recordIdHex', recordIdHex);
    formData.append('label', label);
    formData.append('mimeType', mimeType);
    formData.append('encryptedKeyMaterial', rawKeyBase64);
    formData.append('encryptedFile', encryptedBlob, `${label}.enc`);

    // Resilient endpoint fallback: try /records/upload, fallback to /records
    let res = await fetch(`${API_BASE}/records/upload`, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
      body: formData
    });

    if (res.status === 404) {
      res = await fetch(`${API_BASE}/records`, {
        method: 'POST',
        headers: { ...getAuthHeaders() },
        body: formData
      });
    }

    return handleApiResponse(res, 'Failed to upload encrypted record to storage');
  },

  async getRecords() {
    const res = await fetch(`${API_BASE}/records`, {
      headers: { ...getAuthHeaders() }
    });
    return handleApiResponse(res, 'Failed to retrieve records');
  },

  async getRecordById(id) {
    const res = await fetch(`${API_BASE}/records/${id}`, {
      headers: { ...getAuthHeaders() }
    });
    return handleApiResponse(res, 'Record not found or access denied');
  },

  // --- Step 1 & 3: Time-Boxed Grants ---
  async getGrants() {
    const res = await fetch(`${API_BASE}/grants`, {
      headers: { ...getAuthHeaders() }
    });
    return handleApiResponse(res, 'Failed to retrieve active grants');
  },

  async createGrant(recordIdHex, doctorAddress, expiresInSeconds, encryptedKeyForDoctor) {
    const res = await fetch(`${API_BASE}/grants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({
        recordId: recordIdHex,
        recordIdHex,
        granteeWallet: doctorAddress,
        doctorAddress,
        expiresInSeconds,
        encryptedKeyMaterial: encryptedKeyForDoctor,
        encryptedKeyForDoctor
      })
    });
    return handleApiResponse(res, 'Failed to create access grant');
  },

  async revokeGrant(grantId) {
    const res = await fetch(`${API_BASE}/grants/${grantId}`, {
      method: 'DELETE',
      headers: { ...getAuthHeaders() }
    });
    return handleApiResponse(res, 'Failed to revoke access grant');
  },

  // --- Step 4: Immutable Audit Trail ---
  async getAuditTrail(recordIdHex) {
    const res = await fetch(`${API_BASE}/audit/${recordIdHex}`, {
      headers: { ...getAuthHeaders() }
    });
    return handleApiResponse(res, 'Failed to fetch audit trail');
  },

  async getAuditLogs() {
    const res = await fetch(`${API_BASE}/audit`, {
      headers: { ...getAuthHeaders() }
    });
    return handleApiResponse(res, 'Failed to fetch audit logs');
  },

  async getSecurityInfo() {
    const res = await fetch(`${API_BASE}/security/info`, {
      headers: { ...getAuthHeaders() }
    });
    return handleApiResponse(res, 'Failed to fetch security information');
  },

  // --- Step 5: Secure Doctor Retrieval ---
  async retrieveRecordForDoctor(recordIdHex) {
    const res = await fetch(`${API_BASE}/records/${recordIdHex}/retrieve`, {
      headers: { ...getAuthHeaders() }
    });
    return handleApiResponse(res, 'Access denied or grant expired');
  },

  // --- Step 6: AI Health Assistant & Clinical Copilot ---
  async aiChat(message, history = [], context = {}) {
    const res = await fetch(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ message, history, context })
    });
    return handleApiResponse(res, 'AI assistant unavailable');
  },

  // --- Step 7: Live Database Cluster Inspector ---
  async inspectDatabase() {
    const res = await fetch(`${API_BASE}/admin/db-inspect`);
    return handleApiResponse(res, 'Failed to inspect database');
  }
};
