import { mainnet, sepolia, polygon, polygonAmoy, arbitrum, arbitrumSepolia, optimism, optimismSepolia, base, baseSepolia } from 'wagmi/chains';

// CCTP Domain mappings for each chain
export const CHAIN_DOMAINS = {
  // Mainnet
  [mainnet.id]: 0,
  [polygon.id]: 7,
  [arbitrum.id]: 3,
  [optimism.id]: 2,
  [base.id]: 6,

  // Testnet
  [sepolia.id]: 0,
  [polygonAmoy.id]: 7,
  [arbitrumSepolia.id]: 3,
  [optimismSepolia.id]: 2,
  [baseSepolia.id]: 6,
} as const;

// Solana domain ID (used for cross-chain transfers with EVM)
export const SOLANA_DOMAIN_ID = 5;

