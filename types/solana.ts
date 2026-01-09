import { PublicKey } from '@solana/web3.js';

/**
 * Solana-specific type definitions for CCTP bridge
 */

export interface SolanaChain {
  id: 'solana-mainnet' | 'solana-devnet';
  name: string;
  domain: number;
  isSolana: true;
}

export interface SolanaBridgeState {
  sourceChain: 'solana-mainnet' | 'solana-devnet';
  destinationChain: number | 'solana-mainnet' | 'solana-devnet'; // Can be EVM chainId or Solana chain
  amount: string;
  recipient?: string; // EVM address or Solana address
}

export interface SolanaTransactionResult {
  signature: string;
  messageAccount?: PublicKey;
}

export interface SolanaBridgeStepStatus {
  status: 'pending' | 'loading' | 'success' | 'error';
  txHash?: string;
  signature?: string; // Solana transaction signature
  error?: string;
}

/**
 * Combined chain type that can be either EVM or Solana
 */
export type ChainIdentifier = number | 'solana-mainnet' | 'solana-devnet';

/**
 * Check if a chain identifier is a Solana chain
 */
export function isSolanaChain(chain: ChainIdentifier): chain is 'solana-mainnet' | 'solana-devnet' {
  return chain === 'solana-mainnet' || chain === 'solana-devnet';
}

/**
 * Get Solana domain (always 5 for both mainnet and devnet)
 */
export function getSolanaDomain(): number {
  return 5;
}
