/**
 * Solana CCTP Bridge Utilities
 *
 * Functions for burning and minting USDC on Solana using Circle's CCTP protocol
 */

import {
  Connection,
  PublicKey,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import {
  getSolanaUSDCMint,
} from '@/constants/solana';

/**
 * Get or create associated token account for USDC
 */
export async function getOrCreateUSDCAccount(
  connection: Connection,
  walletPublicKey: PublicKey,
  environment: 'mainnet' | 'testnet'
): Promise<PublicKey> {
  const usdcMint = getSolanaUSDCMint(environment);
  const associatedTokenAddress = await getAssociatedTokenAddress(
    usdcMint,
    walletPublicKey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  return associatedTokenAddress;
}

/**
 * Get USDC balance for a wallet
 */
export async function getUSDCBalance(
  connection: Connection,
  walletPublicKey: PublicKey,
  environment: 'mainnet' | 'testnet'
): Promise<bigint> {
  try {
    const tokenAccount = await getOrCreateUSDCAccount(
      connection,
      walletPublicKey,
      environment
    );

    const balance = await connection.getTokenAccountBalance(tokenAccount);
    return BigInt(balance.value.amount);
  } catch (error) {
    console.error('Failed to fetch USDC balance:', error);
    return BigInt(0);
  }
}

