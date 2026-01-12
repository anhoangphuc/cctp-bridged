# USDC Bridge Tutorial

Welcome! This tutorial will guide you through bridging USDC across different blockchain networks using Circle's Cross-Chain Transfer Protocol (CCTP).

The code is deployed on: `https://cctp-bridged.vercel.app/`

You can pull the code and self-deployed from: https://github.com/anhoangphuc/cctp-bridged

## Table of Contents

1. [What is USDC Bridging?](#what-is-usdc-bridging)
2. [Prerequisites](#prerequisites)
3. [Getting Started](#getting-started)
4. [Bridge from EVM to EVM](#bridge-from-evm-to-evm)
5. [Bridge from EVM to Solana](#bridge-from-evm-to-solana)
6. [Bridge from Solana to EVM](#bridge-from-solana-to-evm)
7. [Understanding Fees](#understanding-fees)
8. [Transaction Status](#transaction-status)
9. [Troubleshooting](#troubleshooting)
10. [FAQ](#faq)

---

## What is USDC Bridging?

USDC bridging allows you to transfer USDC tokens from one blockchain network to another. Unlike traditional bridges that lock tokens, CCTP **burns** USDC on the source chain and **mints** an equivalent amount on the destination chain, ensuring the USDC remains native and fully backed.

### Supported Networks

**Mainnet:**
- Ethereum
- Polygon
- Arbitrum
- Optimism
- Base
- Solana

**Testnet (for testing):**
- Sepolia (Ethereum)
- Amoy (Polygon)
- Arbitrum Sepolia
- Optimism Sepolia
- Base Sepolia
- Solana Devnet

---

## Prerequisites

Before you start bridging, you'll need:

### 1. **Crypto Wallets**

**For EVM Chains (Ethereum, Polygon, etc.):**
- MetaMask, Rainbow, Coinbase Wallet, or any EVM-compatible wallet
- Some native tokens (ETH, MATIC, etc.) for gas fees

**For Solana:**
- Phantom, Solflare, or Backpack wallet
- Some SOL for transaction fees

### 2. **USDC Tokens**

You need USDC on the source chain you're bridging from

### 3. **Gas/Transaction Fees**

- **EVM chains**: Native token (ETH, MATIC, etc.)
- **Solana**: SOL 

---

## Getting Started

### Step 1: Connect Your Wallets

1. **Open the Bridge Application**
   - Navigate to the bridge website

2. **Connect EVM Wallet** (Blue button)
   - Click "Connect Wallet" in the top-right corner
   - Select your preferred wallet (MetaMask, Rainbow, etc.)
   - Approve the connection in your wallet

3. **Connect Solana Wallet** (Purple button)
   - Click "Select Wallet"
   - Choose your Solana wallet (Phantom, Solflare, etc.)
   - Approve the connection

4. **Select Network Mode**
   - Choose "Testnet" for testing with free tokens
   - Choose "Mainnet" for real USDC transfers (if enabled)

✅ **You're ready!** You'll now see your wallet balances displayed.

---

## Understanding the Bridge Process

Before you start bridging, let's understand what happens in each step:

### For EVM Chains (4 Steps)

When bridging from EVM chains (Ethereum, Polygon, Arbitrum, etc.), there are **4 steps**:

#### **Step 1: Approve** 🔓
**What it does**: Gives permission to the bridge contract to spend your USDC

**Why it's needed**: Smart contracts on EVM chains need explicit permission to move tokens from your wallet. This is a security feature.

**What happens**:
- You sign a transaction approving the TokenMessenger contract
- No USDC is transferred yet
- This only needs to be done once per bridge session

**Time**: ~15-60 seconds

**Gas cost**: Low (~$0.10-$2 depending on network)

---

#### **Step 2: Deposit** 🔥
**What it does**: Burns your USDC on the source chain

**Why it's needed**: CCTP works by destroying USDC on the source chain and creating fresh USDC on the destination chain. This maintains 1:1 backing.

**What happens**:
- Your USDC is permanently burned on the source chain
- A cross-chain message is created with proof of the burn
- The message contains: amount, destination chain, recipient address
- This transaction emits an event that Circle's attestation service monitors

**Time**: ~30 seconds - 2 minutes

**Gas cost**: Medium (~$0.20-$5 depending on network)

**⚠️ Important**: After this step, your USDC is burned. You must complete the remaining steps to receive it on the destination chain.

---

#### **Step 3: Fetch Attestation** 📝
**What it does**: Gets a cryptographic proof from Circle's attestation service

**Why it's needed**: The destination chain needs proof that USDC was actually burned on the source chain. Circle's attestation service validates this and provides a signature.

**What happens**:
- The app polls Circle's Iris API for attestation
- Circle's validators check the burn transaction is confirmed
- Once confirmed, Circle signs the message with their private key
- The app receives the attestation (signature + message)

**Time**: ~1-3 minutes

**Gas cost**: None (this is a read operation)

**💡 Note**: No wallet interaction needed. The app handles this automatically.

---

#### **Step 4: Claim** 🎉
**What it does**: Mints fresh USDC on the destination chain

**Why it's needed**: This is the final step where you receive your USDC on the destination chain.

**What happens**:
- Your wallet switches to the destination network (if needed)
- You submit the message + attestation to the MessageTransmitter contract
- The contract verifies Circle's signature
- If valid, the contract mints fresh USDC to your address

**Time**: ~30 seconds - 2 minutes

**Gas cost**: Medium (~$0.20-$5 depending on network)

**✅ Success**: You now have USDC on the destination chain!

---

### For Solana (3 Steps)

When bridging from Solana, there are only **3 steps** (no approval needed):

#### **Step 1: Deposit** 🔥
**What it does**: Burns your USDC on Solana

**Why it's needed**: Same as EVM - USDC is burned to maintain 1:1 backing

**What happens**:
- Your USDC is burned on Solana
- A cross-chain message is created
- Solana's CCTP program emits an event

**Time**: ~30 seconds - 1 minute (Solana is faster)

**Gas cost**: Very low (~0.001 SOL ≈ $0.10)

**💡 Why no approval?**: Solana uses a different token model. The CCTP program can burn tokens directly from your token account without prior approval.

---

#### **Step 2: Fetch Attestation** 📝
Same as EVM - gets Circle's attestation signature.

**Time**: ~1-3 minutes

**Cost**: Free

---

#### **Step 3: Claim** 🎉
**What it does**: Mints USDC on the destination EVM chain

**What happens**:
- Your wallet switches to the destination EVM network
- You submit the attestation to the MessageTransmitter contract
- Fresh USDC is minted to your EVM wallet

**Time**: ~30 seconds - 2 minutes

**Gas cost**: Medium (~$0.20-$5 depending on destination network)

---

### Key Takeaways

✅ **Your funds are safe at every step** - The bridge process is atomic (all or nothing)

✅ **Burnt ≠ Lost** - Burning on source = Minting on destination

✅ **Attestation is the key** - Circle's signature proves the burn happened

✅ **No intermediate tokens** - You get native USDC, not wrapped versions

✅ **Each step must complete** - Don't close the page until all steps are done

⚠️ **If you get stuck** - Check the transaction on block explorers. If the deposit succeeded, you can always continue later.

---

## Bridge from EVM to EVM

Transfer USDC between Ethereum-compatible chains (e.g., Ethereum → Polygon)

### Step 1: Select Source Chain

Look for the bridge card showing your connected EVM chain (e.g., "Sepolia").

You'll see:
- **Source**: Your current chain name
- Your native token balance (ETH)
- Your USDC balance

### Step 2: Choose Destination

In the **Destination** column:
1. Click the dropdown menu
2. Select the destination EVM chain (e.g., "Polygon Amoy")
3. You'll see the recipient address (your connected wallet address)

### Step 3: Enter Amount

1. Type the amount of USDC you want to bridge
2. Or click **MAX** to bridge your entire USDC balance
3. The **Fast Transfer Fee** will appear below (typically 0.1-0.5 USDC)

### Step 4: Execute Bridge

The bridge process has 4 steps:

#### **Step 1: Approve** ✅
- Click the **Approve** button
- Approve the bridge contract to spend your USDC
- Confirm the transaction in your wallet
- Wait for confirmation (~15 seconds - 2 minutes)

#### **Step 2: Deposit** 🔥
- Click the **Deposit** button after approval succeeds
- This burns your USDC on the source chain
- Confirm the transaction in your wallet
- Wait for confirmation (~15 seconds - 2 minutes)

#### **Step 3: Fetch Attestation** 📝
- Click **Fetch Attestation** after deposit succeeds
- This retrieves a proof from Circle's attestation service
- No wallet interaction needed
- Takes ~1-2 minutes

#### **Step 4: Claim** 🎉
- Click the **Claim** button after attestation is ready
- Your wallet will automatically switch to the destination network
- Confirm the transaction to mint USDC on destination chain
- Wait for confirmation

✅ **Done!** Your USDC is now on the destination chain.

### Step 5: Start a New Bridge

Click the **+ New Bridge** button to bridge more USDC.

---

## Bridge from EVM to Solana

Transfer USDC from any EVM chain to Solana

### Prerequisites
- Connect both your EVM and Solana wallets
- Have USDC on an EVM chain
- Have ETH/MATIC/etc. for gas fees
- Have SOL for claiming on Solana

### Steps

Follow the same process as [EVM to EVM](#bridge-from-evm-to-evm), but:

1. **In Step 2**: Select **"Solana"** (or "Solana Devnet") as destination
2. **Recipient**: You'll see your Solana wallet address
3. **In Step 4 (Claim)**: No network switch needed, you'll sign with your Solana wallet

✅ **Your USDC will arrive in your Solana wallet's USDC token account**

---

## Bridge from Solana to EVM

Transfer USDC from Solana to any EVM chain

### Prerequisites
- Connect both your Solana and EVM wallets
- Have USDC on Solana
- Have SOL for transaction fees

### Steps

The process is similar but with 3 steps instead of 4 (no approval needed):

### Step 1: Select Destination

In the Solana bridge card:
1. Click the dropdown menu under **Destination**
2. Select an EVM chain (e.g., "Sepolia", "Polygon Amoy")
3. You'll see the recipient address (your connected EVM wallet address)

### Step 2: Enter Amount

1. Type the USDC amount or click **MAX**
2. The **Fast Transfer Fee** will appear

### Step 3: Execute Bridge

#### **Step 1: Deposit** 🔥
- Click the **Deposit** button
- Confirm the transaction in your Solana wallet
- Wait for confirmation (~30 seconds - 1 minute)

#### **Step 2: Fetch Attestation** 📝
- Click **Fetch Attestation**
- Wait ~1-2 minutes for Circle's attestation

#### **Step 3: Claim** 🎉
- Click the **Claim** button
- Your wallet will switch to the destination EVM network
- Confirm the transaction to mint USDC
- Wait for confirmation

✅ **Done!** Your USDC is now on the destination EVM chain.

---

## Understanding Fees

### Fast Transfer Fee

- **What it is**: A fee paid to Circle's CCTP Protocol for fast attestation
- **Amount**: Typically 0.1-0.5 USDC (varies by network and amount)
- **Who receives it**: Circle (not us - we don't charge any fees)
- **Why required**: Ensures fast and reliable cross-chain transfers

### Gas Fees

- **EVM Chains**: Paid in native token (ETH, MATIC, etc.)
  - Approve: ~$0.10-$2
  - Deposit: ~$0.20-$5
  - Claim: ~$0.20-$5

- **Solana**: Paid in SOL
  - Deposit: ~0.001 SOL (~$0.10)
  - Claim: ~0.001 SOL (~$0.10)

**💡 Tip**: Gas fees vary by network congestion. Use testnets for practice!

---

## Transaction Status

### Button States

- **Blue/Purple Button**: Ready to click
- **Gray Button (disabled)**: Previous step not complete
- **Spinning Icon**: Transaction in progress
- **✓ Green Checkmark**: Step completed successfully
- **✗ Red X**: Error occurred

### View Transaction Details

Click **"View transaction →"** link to see your transaction on the blockchain explorer.

### Refresh Balances

Click the **refresh icon** (🔄) next to "Source" to update your balances after transactions.

---

## Troubleshooting

### "Insufficient balance" Error

**Problem**: Not enough USDC or gas tokens

**Solution**:
- Check your USDC balance
- Ensure you have enough native tokens for gas fees
- On testnet, get tokens from faucets (see FAQ)

### "User rejected transaction"

**Problem**: You declined the transaction in your wallet

**Solution**: Click the button again and approve in your wallet

### Transaction Stuck on "Processing"

**Problem**: Network congestion or RPC issues

**Solution**:
- Wait 5-10 minutes
- Check the transaction status on blockchain explorer
- If failed, click **+ New Bridge** and try again

### Attestation Taking Too Long

**Problem**: Circle's attestation service may be delayed

**Solution**:
- Wait up to 5 minutes
- The system retries automatically
- If error appears, check your deposit transaction succeeded first

### Wallet Not Connecting

**Problem**: Wallet extension not detected or locked

**Solution**:
- Refresh the page
- Unlock your wallet
- Try a different browser
- Disable conflicting extensions

### Wrong Network

**Problem**: Wallet is on wrong network during claim

**Solution**:
- Click the Claim button again
- The app will prompt you to switch networks
- Approve the network switch in your wallet

---

## FAQ

### How long does bridging take?

- **Total time**: 5 minutes
- **Deposit**: 30 seconds - 2 minutes
- **Attestation**: 1-3 minutes
- **Claim**: 30 seconds - 2 minutes

### Is this safe?

Yes! This bridge uses Circle's official CCTP protocol:
- ✅ No wrapped tokens
- ✅ Native USDC on both sides
- ✅ Audited smart contracts
- ✅ Used by major protocols

### Where can I get testnet tokens?

**Testnet USDC Faucets:**
- Circle Faucet: https://faucet.circle.com/
- Use after getting testnet ETH/SOL

**Testnet Native Tokens:**
- Sepolia ETH: https://sepoliafaucet.com/
- Polygon Amoy: https://faucet.polygon.technology/
- Solana Devnet: Use `solana airdrop 1` with Solana CLI


### What if I lose connection during bridging?

- Your funds are safe
- Completed steps are saved on the blockchain
- Refresh the page and continue from where you left off
- You can check transaction status on blockchain explorers

### Do I need to keep the page open?

- **During transaction**: Yes, keep it open until confirmed
- **During attestation**: No, but recommended to monitor progress
- **Between steps**: You can close and come back later

### Can I bridge to a different wallet address?

Currently, the bridge sends USDC to your connected wallet address on the destination chain. Support for custom recipient addresses may be added in the future.

### Why do I need both wallets connected?

- **EVM to Solana**: Need Solana wallet to receive USDC
- **Solana to EVM**: Need EVM wallet to receive USDC
- Both must be connected before bridging

### Is there a rate limit?

No rate limits from the bridge itself, but:
- Your wallet must have sufficient gas for each transaction
- Circle's attestation service processes requests sequentially

---

## Need Help?

If you encounter issues not covered here:

1. **Check Transaction Status**: Use blockchain explorers
   - EVM: Etherscan, Polygonscan, etc.
   - Solana: Solscan, Solana Explorer

2. **Try Testnet First**: Practice with free testnet tokens

3. **Report Issues**: If something isn't working, please report it at:
   - GitHub: [Create an issue](https://github.com/your-repo/issues)

---

## Tips for Success

✅ **Always test on testnet first** before using mainnet

✅ **Keep some gas tokens** in your wallet for future transactions

✅ **Double-check recipient address** before confirming

✅ **Wait for confirmations** - don't refresh during transactions

✅ **Use the refresh button** to update balances after bridging

✅ **Start with small amounts** until you're comfortable with the process

---

**Happy Bridging! 🌉**

Need to bridge more USDC? Just click **+ New Bridge** and repeat the process!
