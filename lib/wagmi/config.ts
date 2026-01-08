import { http, createConfig } from 'wagmi';
import { mainnet, sepolia, polygon, polygonAmoy, arbitrum, arbitrumSepolia, optimism, optimismSepolia, base, baseSepolia } from 'wagmi/chains';
import { coinbaseWallet, injected } from 'wagmi/connectors';

// Mainnet chains
export const mainnetChains = [
  mainnet,
  polygon,
  arbitrum,
  optimism,
  base,
] as const;

// Testnet chains
export const testnetChains = [
  sepolia,
  polygonAmoy,
  arbitrumSepolia,
  optimismSepolia,
  baseSepolia,
] as const;

// Helper to get chain IDs
export const mainnetChainIds = mainnetChains.map(chain => chain.id);
export const testnetChainIds = testnetChains.map(chain => chain.id);

// Wagmi config for mainnet
export const mainnetConfig = createConfig({
  chains: mainnetChains,
  connectors: [
    injected(),
    coinbaseWallet({ appName: 'CCTP Bridge' }),
  ],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [base.id]: http(),
  },
});

// Wagmi config for testnet
export const testnetConfig = createConfig({
  chains: testnetChains,
  connectors: [
    injected(),
    coinbaseWallet({ appName: 'CCTP Bridge (Testnet)' }),
  ],
  transports: {
    [sepolia.id]: http(),
    [polygonAmoy.id]: http(),
    [arbitrumSepolia.id]: http(),
    [optimismSepolia.id]: http(),
    [baseSepolia.id]: http(),
  },
});
