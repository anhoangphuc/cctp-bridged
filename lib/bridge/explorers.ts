/**
 * Block explorer URL generation utilities
 * Provides functions to get transaction explorer URLs for different chains
 */

/**
 * EVM chain explorer base URLs
 */
const EVM_EXPLORERS: Record<number, string> = {
  // Mainnet
  1: 'https://etherscan.io/tx/',
  137: 'https://polygonscan.com/tx/',
  42161: 'https://arbiscan.io/tx/',
  10: 'https://optimistic.etherscan.io/tx/',
  8453: 'https://basescan.org/tx/',

  // Testnet
  11155111: 'https://sepolia.etherscan.io/tx/',
  80002: 'https://amoy.polygonscan.com/tx/',
  421614: 'https://sepolia.arbiscan.io/tx/',
  11155420: 'https://sepolia-optimism.etherscan.io/tx/',
  84532: 'https://sepolia.basescan.org/tx/',
};

/**
 * Get block explorer URL for an EVM transaction
 * @param chainId - EVM chain ID
 * @param txHash - Transaction hash
 * @returns Full URL to view transaction on block explorer
 */
export function getEVMExplorerUrl(chainId: number, txHash: string): string {
  const baseUrl = EVM_EXPLORERS[chainId] || 'https://etherscan.io/tx/';
  return `${baseUrl}${txHash}`;
}

/**
 * Get block explorer URL for a Solana transaction
 * @param signature - Solana transaction signature
 * @param environment - Network environment (mainnet or testnet/devnet)
 * @returns Full URL to view transaction on Solscan
 */
export function getSolanaExplorerUrl(
  signature: string,
  environment: 'mainnet' | 'testnet'
): string {
  const cluster = environment === 'mainnet' ? '' : '?cluster=devnet';
  return `https://solscan.io/tx/${signature}${cluster}`;
}

/**
 * Get block explorer URL for any chain (EVM or Solana)
 * @param chainId - Chain ID (number for EVM, 'solana' for Solana)
 * @param txHash - Transaction hash or signature
 * @param environment - Network environment (required for Solana)
 * @returns Full URL to view transaction on block explorer
 */
export function getExplorerUrl(
  chainId: number | 'solana',
  txHash: string,
  environment?: 'mainnet' | 'testnet'
): string {
  if (chainId === 'solana') {
    if (!environment) {
      throw new Error('Environment parameter required for Solana explorer URLs');
    }
    return getSolanaExplorerUrl(txHash, environment);
  }

  return getEVMExplorerUrl(chainId, txHash);
}
