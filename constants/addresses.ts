import { PublicKey } from "@solana/web3.js";
import { mainnet, polygon, arbitrum, optimism, base, sepolia, polygonAmoy, arbitrumSepolia, optimismSepolia, baseSepolia } from "viem/chains";

// TokenMessenger contract addresses for CCTP

export const TOKEN_MESSENGER_ADDRESSES = {
  // Mainnet
  [mainnet.id]: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
  [polygon.id]: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
  [arbitrum.id]: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
  [optimism.id]: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',
  [base.id]: '0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d',

  // Testnet - All testnets use the same address
  [sepolia.id]: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA', // Ethereum Sepolia (Domain 0)
  [polygonAmoy.id]: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA', // Polygon PoS Amoy (Domain 7)
  [arbitrumSepolia.id]: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA', // Arbitrum Sepolia (Domain 3)
  [optimismSepolia.id]: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA', // OP Sepolia (Domain 2)
  [baseSepolia.id]: '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA', // Base Sepolia (Domain 6)
} as const;

export const MESSAGE_TRANSMITTER_ADDRESS = {
  // Mainnet
  [mainnet.id]: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
  [polygon.id]: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
  [arbitrum.id]: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
  [optimism.id]: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',
  [base.id]: '0x81D40F21F12A8F0E3252Bccb954D722d4c464B64',

  // Testnet
  [sepolia.id]: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
  [polygonAmoy.id]: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
  [arbitrumSepolia.id]: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
  [optimismSepolia.id]: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
  [baseSepolia.id]: '0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275',
} as const;

// USDC contract addresses for each chain
export const USDC_ADDRESSES = {
  // Mainnet
  [mainnet.id]: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  [polygon.id]: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  [arbitrum.id]: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  [optimism.id]: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  [base.id]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',

  // Testnet
  [sepolia.id]: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  [polygonAmoy.id]: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
  [arbitrumSepolia.id]: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
  [optimismSepolia.id]: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
  [baseSepolia.id]: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
} as const;

// USDC decimals (standard is 6 for all chains)
export const USDC_DECIMALS = 6;


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