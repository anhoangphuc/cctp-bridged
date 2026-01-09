import { PublicKey } from '@solana/web3.js';

/**
 * Solana CCTP Constants
 *
 * Circle's CCTP protocol on Solana uses program-based architecture
 * instead of traditional smart contracts.
 */

// USDC Token Mint addresses on Solana
export const SOLANA_USDC_MINT = {
  mainnet: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  devnet: new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'),
} as const;

/**
 * Get USDC mint address based on environment
 */
export function getSolanaUSDCMint(environment: 'mainnet' | 'testnet'): PublicKey {
  // Testnet uses devnet
  return environment === 'mainnet' ? SOLANA_USDC_MINT.mainnet : SOLANA_USDC_MINT.devnet;
}
