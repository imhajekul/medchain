import crypto from 'crypto';
import { ethers } from 'ethers';
import { db } from '../db.js';
import {
  issueNonceForAddress,
  authenticateWalletSignature,
  issueSessionToken
} from '../middleware/auth.js';
import { verifyFirebaseIdToken } from '../services/firebase.service.js';

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

function verifyPassword(password, hash, salt) {
  try {
    const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
  } catch {
    return false;
  }
}

/**
 * POST /auth/register
 * Samurai Level Full-Stack Email/Password Registration.
 * Inputs: { email, password, role?, name?, walletAddress? }
 * Outputs: { sessionToken, user: { id, email, walletAddress, role, name } }
 */
export async function registerUser(req, res) {
  try {
    const { email, password, role, name, walletAddress } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing required fields. Required: { email, password }.'
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Invalid email address format.' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    // Check if user already exists
    const existing = await db.query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    const assignedRole = String(role || 'PATIENT').toUpperCase() === 'DOCTOR' ? 'DOCTOR' : 'PATIENT';
    const sovereignWallet = walletAddress && walletAddress.startsWith('0x')
      ? walletAddress.toLowerCase()
      : ethers.Wallet.createRandom().address.toLowerCase();

    const { hash, salt } = hashPassword(password);
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const displayName = name ? String(name).trim() : (assignedRole === 'DOCTOR' ? 'Dr. Provider' : 'MedVault Patient');

    await db.query(
      `INSERT INTO users (id, email, password_hash, salt, role, wallet_address, name)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, normalizedEmail, hash, salt, assignedRole, sovereignWallet, displayName]
    );

    const userPayload = {
      id: userId,
      email: normalizedEmail,
      walletAddress: sovereignWallet,
      role: assignedRole,
      name: displayName
    };

    const sessionToken = issueSessionToken(userPayload);

    return res.status(201).json({
      sessionToken,
      user: userPayload,
      message: 'Account registered successfully.'
    });
  } catch (error) {
    console.error('[Registration Error]:', error.message);
    return res.status(500).json({ error: 'Internal server error during registration.' });
  }
}

/**
 * POST /auth/login
 * Samurai Level Full-Stack Email/Password Login.
 * Inputs: { email, password }
 * Outputs: { sessionToken, user: { id, email, walletAddress, role, name } }
 */
export async function loginUser(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing required credentials. Required: { email, password }.'
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const result = await db.query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = result.rows[0];
    const isPasswordValid = verifyPassword(password, user.password_hash, user.salt);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const userPayload = {
      id: user.id,
      email: user.email,
      walletAddress: user.wallet_address,
      role: user.role,
      name: user.name || (user.role === 'DOCTOR' ? 'Dr. Provider' : 'MedVault Patient')
    };

    const sessionToken = issueSessionToken(userPayload);

    return res.status(200).json({
      sessionToken,
      user: userPayload,
      role: user.role,
      walletAddress: user.wallet_address,
      message: 'Logged in successfully.'
    });
  } catch (error) {
    console.error('[Login Error]:', error.message);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
}

/**
 * GET or POST /auth/nonce
 * Generates an EIP-4361 compliant nonce for a target wallet address
 */
export function getNonce(req, res) {
  const walletAddress = req.query.address || req.body?.walletAddress || req.ip;
  const nonce = issueNonceForAddress(walletAddress);
  return res.status(200).json({ nonce });
}

/**
 * POST /auth/connect
 * EIP-4361 Challenge-Response Authentication Endpoint.
 * Inputs: { walletAddress, signature, nonce, message?, role? }
 * Outputs: { sessionToken, role }
 */
export async function connectWallet(req, res) {
  try {
    let { walletAddress, signature, nonce, message, role } = req.body;

    // If full SIWE message is passed, defensively extract address and nonce if omitted
    if (message) {
      try {
        if (!walletAddress) {
          const addressMatch = message.match(/(0x[a-fA-F0-9]{40})/);
          if (addressMatch) walletAddress = addressMatch[1];
        }
        if (!nonce) {
          const nonceMatch = message.match(/Nonce:\s*([a-zA-Z0-9]+)/);
          if (nonceMatch) nonce = nonceMatch[1];
        }
      } catch (e) {}
    }

    if (!walletAddress || !signature || !nonce) {
      return res.status(400).json({
        error: 'Missing required parameters. Required: { walletAddress, signature, nonce }.'
      });
    }

    const { sessionToken, role: assignedRole } = await authenticateWalletSignature(
      walletAddress,
      signature,
      nonce,
      message,
      role
    );

    return res.status(200).json({
      sessionToken,
      token: sessionToken,
      role: assignedRole,
      walletAddress: walletAddress.toLowerCase(),
      user: {
        id: `user_${walletAddress.substring(2, 8).toLowerCase()}`,
        walletAddress: walletAddress.toLowerCase(),
        role: assignedRole
      }
    });
  } catch (error) {
    console.error('[SIWE Connect Error]:', error.message);
    return res.status(401).json({
      error: 'Authentication failed: Invalid cryptographic proof.',
      details: error.message
    });
  }
}

/**
 * GET /auth/me
 * Returns current authenticated context from JWT
 */
export function getMe(req, res) {
  return res.status(200).json({ user: req.user });
}

/**
 * POST /auth/google
 * Google OAuth Sign-In & Registration Endpoint.
 * Inputs: { email, name?, role?, googleId?, idToken? }
 * Outputs: { sessionToken, user: { id, email, walletAddress, role, name } }
 */
export async function googleAuth(req, res) {
  try {
    let { email, name, role, idToken } = req.body;

    // Verify Firebase ID Token if provided by client
    if (idToken) {
      try {
        const decoded = await verifyFirebaseIdToken(idToken);
        if (decoded?.email) {
          email = decoded.email;
        }
        if (decoded?.name && !name) {
          name = decoded.name;
        }
      } catch (tokenErr) {
        console.warn('[Firebase Verification Notice]:', tokenErr.message);
        if (process.env.NODE_ENV === 'production' && !email) {
          return res.status(401).json({ error: 'Invalid or expired Firebase authentication token.' });
        }
      }
    }

    if (!email) {
      return res.status(400).json({ error: 'Missing email from Google authentication.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const assignedRole = String(role || 'PATIENT').toUpperCase() === 'DOCTOR' ? 'DOCTOR' : 'PATIENT';

    // 1. Check if user already exists
    let result = await db.query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
    let user;

    if (result.rows.length > 0) {
      user = result.rows[0];
    } else {
      // 2. Auto-register Google user
      const sovereignWallet = ethers.Wallet.createRandom().address.toLowerCase();
      const userId = `usr_g_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const displayName = name ? String(name).trim() : (assignedRole === 'DOCTOR' ? 'Dr. Google User' : 'Google Patient');
      const dummySalt = crypto.randomBytes(16).toString('hex');
      const dummyHash = crypto.randomBytes(32).toString('hex');

      await db.query(
        `INSERT INTO users (id, email, password_hash, salt, role, wallet_address, name)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [userId, normalizedEmail, dummyHash, dummySalt, assignedRole, sovereignWallet, displayName]
      );

      user = {
        id: userId,
        email: normalizedEmail,
        wallet_address: sovereignWallet,
        role: assignedRole,
        name: displayName
      };
    }

    const userPayload = {
      id: user.id,
      email: user.email,
      walletAddress: user.wallet_address,
      role: user.role,
      name: user.name || (user.role === 'DOCTOR' ? 'Dr. Healthcare Provider' : 'MedVault Patient')
    };

    const sessionToken = issueSessionToken(userPayload);

    res.cookie('medvault_token', sessionToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.status(200).json({
      sessionToken,
      token: sessionToken,
      user: userPayload,
      role: user.role,
      walletAddress: user.wallet_address,
      message: 'Google authentication successful.'
    });
  } catch (error) {
    console.error('[Google Auth Error]:', error.message);
    return res.status(500).json({ error: 'Internal server error during Google authentication.' });
  }
}
