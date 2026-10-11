import jwt from 'jsonwebtoken';
import { ethers } from 'ethers';
import { SiweMessage } from 'siwe';

const JWT_SECRET = process.env.JWT_SECRET || 'medvault-principal-secret-key-32-chars-long-secure';
// Ephemeral store for address => { nonce, expiresAt }
const addressNonceStore = new Map();

/**
 * Generates an EIP-4361 compliant nonce for a given wallet address.
 * Nonces expire after 5 minutes.
 */
export function issueNonceForAddress(walletAddress) {
  const nonce = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const normalized = walletAddress ? walletAddress.toLowerCase() : 'anonymous';
  
  addressNonceStore.set(normalized, {
    nonce,
    expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes TTL
  });
  
  // Also store by nonce directly for reverse lookup
  addressNonceStore.set(`nonce_${nonce}`, {
    walletAddress: normalized,
    expiresAt: Date.now() + 5 * 60 * 1000
  });

  return nonce;
}

/**
 * Validates and consumes the nonce for a specific wallet address.
 * Prevents replay attacks by deleting the nonce immediately.
 */
export function consumeNonce(walletAddress, nonce) {
  const normalized = walletAddress ? walletAddress.toLowerCase() : null;
  const storedByAddress = normalized ? addressNonceStore.get(normalized) : null;
  const storedByNonce = addressNonceStore.get(`nonce_${nonce}`);

  const match = (storedByAddress && storedByAddress.nonce === nonce) || storedByNonce;

  if (!match) return false;
  if (match.expiresAt < Date.now()) {
    if (normalized) addressNonceStore.delete(normalized);
    addressNonceStore.delete(`nonce_${nonce}`);
    return false;
  }

  // Consume immediately
  if (normalized) addressNonceStore.delete(normalized);
  addressNonceStore.delete(`nonce_${nonce}`);
  return true;
}

/**
 * Step 3: EIP-4361 SIWE challenge verification and stateless JWT issuance.
 */
export async function authenticateWalletSignature(walletAddress, signature, nonce, messageStr, role = 'PATIENT') {
  const normalizedAddress = walletAddress.toLowerCase();

  // 1. Verify Nonce was legitimately issued and unexpired
  const validNonce = consumeNonce(normalizedAddress, nonce);
  if (!validNonce) {
    throw new Error('Invalid or expired authentication nonce. Please request a fresh challenge.');
  }

  // 2. Cryptographic signature recovery & verification
  let recoveredAddress = null;

  if (messageStr) {
    // If full SIWE message string is supplied
    try {
      const siwe = new SiweMessage(messageStr);
      const { data: fields } = await siwe.verify({ signature });
      recoveredAddress = fields.address.toLowerCase();
    } catch (siweErr) {
      // Fallback direct recovery
      recoveredAddress = ethers.verifyMessage(messageStr, signature).toLowerCase();
    }
  } else {
    // Standard structured SIWE message reconstruction
    recoveredAddress = ethers.verifyMessage(nonce, signature).toLowerCase();
  }

  if (recoveredAddress !== normalizedAddress) {
    throw new Error(`Cryptographic mismatch: Signature recovered address (${recoveredAddress}) does not match supplied wallet (${normalizedAddress}).`);
  }

  // 3. Issue stateless JWT
  const userRole = String(role).toUpperCase() === 'DOCTOR' ? 'DOCTOR' : 'PATIENT';
  const tokenPayload = {
    walletAddress: normalizedAddress,
    role: userRole
  };

  const sessionToken = issueSessionToken(tokenPayload);

  return {
    sessionToken,
    role: userRole,
    walletAddress: normalizedAddress
  };
}

/**
 * Issues a signed JWT session token with 8-hour expiry.
 */
export function issueSessionToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '8h',
    algorithm: 'HS256'
  });
}

/**
 * Middleware: Enforces valid Bearer JWT on protected endpoints.
 * Injects verified wallet identity into req.user = { walletAddress, role, email, name, id }.
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication Required: Missing Bearer token in Authorization header.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      walletAddress: (decoded.walletAddress || '').toLowerCase(),
      role: decoded.role || 'PATIENT',
      email: decoded.email || null,
      name: decoded.name || null,
      id: decoded.id || null
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Session token is expired or invalid.' });
  }
}

/**
 * Middleware: Optionally extracts verified identity if Bearer JWT is present.
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = {
        walletAddress: (decoded.walletAddress || '').toLowerCase(),
        role: decoded.role || 'PATIENT',
        email: decoded.email || null,
        name: decoded.name || null,
        id: decoded.id || null
      };
    } catch (err) {
      // Ignore token decode failure in optionalAuth
    }
  }
  next();
}
