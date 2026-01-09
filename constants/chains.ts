import {
  mainnet,
  sepolia,
  polygon,
  polygonAmoy,
  arbitrum,
  arbitrumSepolia,
  optimism,
  optimismSepolia,
  base,
  baseSepolia,
} from 'wagmi/chains';
import { SOLANA_DOMAIN_ID } from './tokens';

/**
 * Chain configuration including both EVM and Solana chains
 */

export interface EVMChainConfig {
  id: number;
  name: string;
  domain: number;
  isTestnet: boolean;
  isSolana: false;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export interface SolanaChainConfig {
  id: 'solana-mainnet' | 'solana-devnet';
  name: string;
  domain: number;
  isTestnet: boolean;
  isSolana: true;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export type ChainConfig = EVMChainConfig | SolanaChainConfig;

// EVM Mainnet chains
export const MAINNET_CHAINS: EVMChainConfig[] = [
  {
    id: mainnet.id,
    name: 'Ethereum',
    domain: 0,
    isTestnet: false,
    isSolana: false,
    nativeCurrency: mainnet.nativeCurrency,
  },
  {
    id: polygon.id,
    name: 'Polygon',
    domain: 7,
    isTestnet: false,
    isSolana: false,
    nativeCurrency: polygon.nativeCurrency,
  },
  {
    id: arbitrum.id,
    name: 'Arbitrum',
    domain: 3,
    isTestnet: false,
    isSolana: false,
    nativeCurrency: arbitrum.nativeCurrency,
  },
  {
    id: optimism.id,
    name: 'Optimism',
    domain: 2,
    isTestnet: false,
    isSolana: false,
    nativeCurrency: optimism.nativeCurrency,
  },
  {
    id: base.id,
    name: 'Base',
    domain: 6,
    isTestnet: false,
    isSolana: false,
    nativeCurrency: base.nativeCurrency,
  },
];

// EVM Testnet chains
export const TESTNET_CHAINS: EVMChainConfig[] = [
  {
    id: sepolia.id,
    name: 'Sepolia',
    domain: 0,
    isTestnet: true,
    isSolana: false,
    nativeCurrency: sepolia.nativeCurrency,
  },
  {
    id: polygonAmoy.id,
    name: 'Polygon Amoy',
    domain: 7,
    isTestnet: true,
    isSolana: false,
    nativeCurrency: polygonAmoy.nativeCurrency,
  },
  {
    id: arbitrumSepolia.id,
    name: 'Arbitrum Sepolia',
    domain: 3,
    isTestnet: true,
    isSolana: false,
    nativeCurrency: arbitrumSepolia.nativeCurrency,
  },
  {
    id: optimismSepolia.id,
    name: 'Optimism Sepolia',
    domain: 2,
    isTestnet: true,
    isSolana: false,
    nativeCurrency: optimismSepolia.nativeCurrency,
  },
  {
    id: baseSepolia.id,
    name: 'Base Sepolia',
    domain: 6,
    isTestnet: true,
    isSolana: false,
    nativeCurrency: baseSepolia.nativeCurrency,
  },
];

// Solana chains
export const SOLANA_MAINNET: SolanaChainConfig = {
  id: 'solana-mainnet',
  name: 'Solana',
  domain: SOLANA_DOMAIN_ID,
  isTestnet: false,
  isSolana: true,
  nativeCurrency: {
    name: 'SOL',
    symbol: 'SOL',
    decimals: 9,
  },
};

export const SOLANA_DEVNET: SolanaChainConfig = {
  id: 'solana-devnet',
  name: 'Solana Devnet',
  domain: SOLANA_DOMAIN_ID,
  isTestnet: true,
  isSolana: true,
  nativeCurrency: {
    name: 'SOL',
    symbol: 'SOL',
    decimals: 9,
  },
};

// All supported chains grouped by environment
export const SUPPORTED_CHAINS = {
  mainnet: [...MAINNET_CHAINS, SOLANA_MAINNET],
  testnet: [...TESTNET_CHAINS, SOLANA_DEVNET],
} as const;
