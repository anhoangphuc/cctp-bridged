import { mainnet, sepolia, polygon, polygonAmoy, arbitrum, arbitrumSepolia, optimism, optimismSepolia, base, baseSepolia } from 'wagmi/chains';

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

// ERC20 ABI for balanceOf function
export const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
] as const;
