# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

USDC bridge application using Circle's Cross-Chain Transfer Protocol (CCTP). Supports bridging USDC between:
- EVM chains (Ethereum, Polygon, Arbitrum, Optimism, Base, etc.)
- Solana

## Development Commands

- `npm run dev` - Start development server on http://localhost:3000
- `npm run build` - Build production bundle
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Technology Stack

- **Framework**: Next.js 16.1.1 with App Router
- **React**: 19.2.3
- **TypeScript**: v5 with strict mode enabled
- **Styling**: Tailwind CSS v4
- **Fonts**: Geist Sans and Geist Mono

## CCTP Integration Architecture

### Protocol Overview

CCTP enables native USDC transfers across blockchains by burning USDC on the source chain and minting equivalent USDC on the destination chain. Key components:

1. **TokenMessenger** - Contract on source chain that burns USDC
2. **MessageTransmitter** - Handles cross-chain message attestation
3. **Circle Attestation Service** - Provides attestation signatures
4. **Destination Minting** - Mints USDC on destination chain

### Chain Support

**EVM Chains:**
- Each supported EVM chain needs TokenMessenger and MessageTransmitter contract addresses
- Use ethers.js or viem for EVM wallet connections and contract interactions

**Solana:**
- Uses Solana CCTP program
- Requires @solana/web3.js and @solana/wallet-adapter for integration

### Network Configuration

The UI must support configurable RPC URLs for each network:
- Store network configurations (chain ID, RPC URL, contract addresses)
- Allow users to modify RPC endpoints via UI settings
- Validate RPC connectivity before transactions

## UI Design Principles

- **Clean and straightforward**: Minimize clutter, focus on core bridging functionality
- **Clear flow**: Source chain → Amount → Destination chain → Confirm
- **Network selector**: Easy-to-use dropdown or modal for selecting chains
- **RPC URL configuration**: Settings panel to customize network endpoints
- **Transaction status**: Clear progress indicators for multi-step CCTP process

## Key Implementation Areas

### 1. Wallet Integration
- EVM: WalletConnect, MetaMask, Coinbase Wallet
- Solana: Phantom, Solflare, Backpack

### 2. CCTP Flow
```
Source Chain:
1. User approves USDC to TokenMessenger
2. Call depositForBurn() on TokenMessenger
3. Get message bytes and attestation

Attestation:
4. Poll Circle API for attestation signature

Destination Chain:
5. Call receiveMessage() with message + attestation
6. USDC minted to recipient
```

### 3. Bridge Form State
- Source chain selection
- Destination chain selection
- Amount input with balance validation
- Recipient address (default to sender, allow custom)
- Fee estimation

### 4. Network Management
- Network configuration object with RPC URLs
- RPC health checks
- Fallback RPC providers
- User-configurable endpoints

## TypeScript Configuration Notes

- Import alias: `@/*` maps to root directory
- Strict mode enabled - all types must be properly defined
- No implicit any allowed

## File Structure Recommendations

When building out the application, organize as follows:
- `app/` - Next.js App Router pages and layouts
- `components/` - React components (BridgeForm, NetworkSelector, etc.)
- `lib/cctp/` - CCTP protocol integration logic
- `lib/chains/` - Chain configurations and network definitions
- `lib/wallets/` - Wallet adapter integrations
- `types/` - TypeScript type definitions
- `hooks/` - React hooks for wallet, CCTP, balances
- `constants/` - Contract addresses, supported chains, RPC URLs
