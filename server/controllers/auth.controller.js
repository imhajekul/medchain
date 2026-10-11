import { issueNonceForAddress, authenticateWalletSignature } from '../middleware/auth.js';

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
    const { walletAddress, signature, nonce, message, role } = req.body;

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
      role: assignedRole,
      walletAddress: walletAddress.toLowerCase()
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
