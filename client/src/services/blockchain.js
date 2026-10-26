import { ethers } from 'ethers';

// Chain Configuration defaults (Polygon Amoy Testnet)
export const CHAIN_CONFIG = {
  chainId: Number(import.meta.env.VITE_CHAIN_ID || 80002),
  chainIdHex: `0x${Number(import.meta.env.VITE_CHAIN_ID || 80002).toString(16)}`,
  chainName: import.meta.env.VITE_CHAIN_NAME || 'Polygon Amoy',
  rpcUrl: import.meta.env.VITE_RPC_URL || 'https://polygon-amoy-bor-rpc.publicnode.com',
  blockExplorer: 'https://amoy.polygonscan.com/',
  contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS || '0x38b8AcE4624DEb11568A57866e4a28Ece055D0f6',
  nativeCurrency: {
    name: 'MATIC',
    symbol: 'MATIC',
    decimals: 18
  }
};

export const MEDVAULT_ABI = [
  'function registerRecord(bytes32 recordId, string calldata cid) external',
  'function createGrant(bytes32 recordId, address grantee, uint256 durationInSeconds) external returns (bytes32)',
  'function revokeGrant(bytes32 grantId) external',
  'function logAccessEvent(bytes32 grantId) external',
  'function isGrantActive(bytes32 grantId) external view returns (bool)',
  'function getGrantForDoctor(bytes32 recordId, address doctor) external view returns (bytes32 grantId, bool active)'
];

/**
 * Ensures the connected Web3 wallet is on the correct network (e.g., Polygon Amoy).
 * Prompts wallet_switchEthereumChain or wallet_addEthereumChain if needed.
 */
export async function ensureCorrectNetwork(provider = null) {
  if (typeof window === 'undefined' || !window.ethereum) {
    return { ok: true, simulated: true };
  }

  try {
    const currentChainHex = await window.ethereum.request({ method: 'eth_chainId' });
    const currentChainId = parseInt(currentChainHex, 16);

    if (currentChainId === CHAIN_CONFIG.chainId) {
      return { ok: true, currentChainId };
    }

    console.log(`[Web3] Switching from chain ${currentChainId} to target chain ${CHAIN_CONFIG.chainId} (${CHAIN_CONFIG.chainName})`);

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: CHAIN_CONFIG.chainIdHex }]
      });
      return { ok: true, currentChainId: CHAIN_CONFIG.chainId };
    } catch (switchError) {
      // 4902 indicates chain has not been added to wallet yet
      if (switchError.code === 4902 || switchError?.data?.originalError?.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: CHAIN_CONFIG.chainIdHex,
            chainName: CHAIN_CONFIG.chainName,
            rpcUrls: [CHAIN_CONFIG.rpcUrl],
            nativeCurrency: CHAIN_CONFIG.nativeCurrency,
            blockExplorerUrls: [CHAIN_CONFIG.blockExplorer]
          }]
        });
        return { ok: true, currentChainId: CHAIN_CONFIG.chainId };
      }
      throw switchError;
    }
  } catch (err) {
    console.error('[Web3 Network Switch Error]:', err);
    throw new Error(`Please switch your wallet to ${CHAIN_CONFIG.chainName} (Chain ID: ${CHAIN_CONFIG.chainId}) to continue.`);
  }
}

/**
 * Helper to obtain the MedVaultAccess smart contract instance.
 */
export function getMedVaultContract(signerOrProvider) {
  if (!CHAIN_CONFIG.contractAddress || !ethers.isAddress(CHAIN_CONFIG.contractAddress)) {
    throw new Error('Valid MedVault contract address not configured.');
  }
  return new ethers.Contract(CHAIN_CONFIG.contractAddress, MEDVAULT_ABI, signerOrProvider);
}
