/**
 * MedVault API Client Service
 * Connects frontend React components to the Zero Data Exposure Backend.
 */

function resolveApiBase() {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    const trimmed = envUrl.replace(/\/+$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  }
  if (window.location.port === '5173') {
    return 'http://localhost:3001/api';
  }
  return '/api';
}

const API_BASE = resolveApiBase();

function getAuthHeaders() {
  const saved = localStorage.getItem('medvault_auth');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.sessionToken) {
        return { Authorization: `Bearer ${parsed.sessionToken}` };
      }
    } catch (e) {}
  }
  return {};
}

export const api = {
  // --- Step 2: Web3 Authentication ---
  async getNonce() {
    const res = await fetch(`${API_BASE}/auth/nonce`);
    if (!res.ok) throw new Error('Failed to fetch authentication nonce');
    return await res.json();
  },

  async verifySignature(message, signature, role = 'patient') {
    const res = await fetch(`${API_BASE}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, signature, role })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Signature verification failed');
    }
    return await res.json();
  },

  // --- Step 3: Encrypted Records ---
  async uploadRecord(recordIdHex, label, mimeType, encryptedBlob, rawKeyBase64) {
    const formData = new FormData();
    formData.append('recordIdHex', recordIdHex);
    formData.append('label', label);
    formData.append('mimeType', mimeType);
    formData.append('encryptedKeyMaterial', rawKeyBase64);
    formData.append('encryptedFile', encryptedBlob, `${label}.enc`);

    const res = await fetch(`${API_BASE}/records/upload`, {
      method: 'POST',
      headers: { ...getAuthHeaders() },
      body: formData
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to upload encrypted record');
    }
    return await res.json();
  },

  async getRecords() {
    const res = await fetch(`${API_BASE}/records`, {
      headers: { ...getAuthHeaders() }
    });
    if (!res.ok) throw new Error('Failed to fetch records');
    return await res.json();
  },

  async getRecordById(id) {
    const res = await fetch(`${API_BASE}/records/${id}`, {
      headers: { ...getAuthHeaders() }
    });
    if (!res.ok) throw new Error('Record not found');
    return await res.json();
  },

  // --- Step 1 & 3: Time-Boxed Grants ---
  async createGrant(recordIdHex, doctorAddress, expiresInSeconds, encryptedKeyForDoctor) {
    const res = await fetch(`${API_BASE}/grants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({
        recordIdHex,
        doctorAddress,
        expiresInSeconds,
        encryptedKeyForDoctor
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create access grant');
    }
    return await res.json();
  },

  // --- Step 4: Immutable Audit Trail ---
  async getAuditTrail(recordIdHex) {
    const res = await fetch(`${API_BASE}/audit/${recordIdHex}`, {
      headers: { ...getAuthHeaders() }
    });
    if (!res.ok) throw new Error('Failed to fetch audit trail');
    return await res.json();
  },

  // --- Step 5: Secure Doctor Retrieval ---
  async retrieveRecordForDoctor(recordIdHex) {
    const res = await fetch(`${API_BASE}/records/${recordIdHex}/retrieve`, {
      headers: { ...getAuthHeaders() }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Access denied or grant expired');
    }
    return await res.json();
  }
};
