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

// CCTP Token Messenger Minter Program ID
export const SOLANA_TOKEN_MESSENGER_MINTER_PROGRAM = {
  mainnet: new PublicKey('CCTPmbSD7gX1bxKPAmg77w8oFzNFpaQiQUWD43TKaecd'),
  devnet: new PublicKey('CCTPmbSD7gX1bxKPAmg77w8oFzNFpaQiQUWD43TKaecd'),
} as const;

// CCTP Message Transmitter Program ID
export const SOLANA_MESSAGE_TRANSMITTER_PROGRAM = {
  mainnet: new PublicKey('CCTPiPYPc6AsJuwueEnWgSgucamXDZwBd53dQ11YiKX3'),
  devnet: new PublicKey('CCTPiPYPc6AsJuwueEnWgSgucamXDZwBd53dQ11YiKX3'),
} as const;

// Solana CCTP Domain ID
// This is used by Circle's attestation service to identify Solana in cross-chain transfers
export const SOLANA_DOMAIN = 5;

// SPL Token Program ID (standard for all SPL tokens including USDC)
export const SPL_TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

// Associated Token Program ID (for deriving associated token accounts)
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

// USDC Decimals on Solana (same as EVM chains)
export const SOLANA_USDC_DECIMALS = 6;

/**
 * Get USDC mint address based on environment
 */
export function getSolanaUSDCMint(environment: 'mainnet' | 'testnet'): PublicKey {
  // Testnet uses devnet
  return environment === 'mainnet' ? SOLANA_USDC_MINT.mainnet : SOLANA_USDC_MINT.devnet;
}

/**
 * Get Token Messenger Minter Program ID based on environment
 */
export function getSolanaTokenMessengerMinter(environment: 'mainnet' | 'testnet'): PublicKey {
  return environment === 'mainnet'
    ? SOLANA_TOKEN_MESSENGER_MINTER_PROGRAM.mainnet
    : SOLANA_TOKEN_MESSENGER_MINTER_PROGRAM.devnet;
}

/**
 * Get Message Transmitter Program ID based on environment
 */
export function getSolanaMessageTransmitter(environment: 'mainnet' | 'testnet'): PublicKey {
  return environment === 'mainnet'
    ? SOLANA_MESSAGE_TRANSMITTER_PROGRAM.mainnet
    : SOLANA_MESSAGE_TRANSMITTER_PROGRAM.devnet;
}
