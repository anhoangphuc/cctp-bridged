/**
 * Solana CCTP Bridge Utilities
 *
 * Functions for burning and minting USDC on Solana using Circle's CCTP protocol
 */

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import {
  getSolanaUSDCMint,
  getSolanaTokenMessengerMinter,
  getSolanaMessageTransmitter,
  SOLANA_DOMAIN_ID,
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

/**
 * Convert EVM address (0x-prefixed hex) to Solana bytes32 format
 */
export function evmAddressToBytes32(evmAddress: string): Buffer {
  // Remove 0x prefix if present
  const cleanAddress = evmAddress.startsWith('0x')
    ? evmAddress.slice(2)
    : evmAddress;

  // Pad to 32 bytes (64 hex characters)
  const paddedAddress = cleanAddress.padStart(64, '0');

  return Buffer.from(paddedAddress, 'hex');
}

/**
 * Convert Solana PublicKey to bytes32 format
 */
export function solanaAddressToBytes32(publicKey: PublicKey): Buffer {
  return publicKey.toBuffer();
}

/**
 * Build deposit for burn instruction (Solana -> EVM or Solana)
 *
 * This burns USDC on Solana and initiates a cross-chain transfer
 */
export async function buildDepositForBurnInstruction(
  walletPublicKey: PublicKey,
  amount: bigint,
  destinationDomain: number,
  mintRecipient: Buffer, // 32-byte recipient address
  environment: 'mainnet' | 'testnet',
  maxFee: bigint = BigInt(0),
  finalityThreshold: number = 0
): Promise<{
  instruction: TransactionInstruction;
  messageAccount: PublicKey;
}> {
  const usdcMint = getSolanaUSDCMint(environment);
  const tokenMessengerMinter = getSolanaTokenMessengerMinter(environment);

  // Get user's USDC token account
  const sourceTokenAccount = await getAssociatedTokenAddress(
    usdcMint,
    walletPublicKey,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  // Derive necessary PDAs (Program Derived Addresses)
  // These are deterministic addresses derived from the program IDs

  // Token Messenger account
  const [tokenMessenger] = PublicKey.findProgramAddressSync(
    [Buffer.from('token_messenger')],
    tokenMessengerMinter
  );

  // Token Minter account
  const [tokenMinter] = PublicKey.findProgramAddressSync(
    [Buffer.from('token_minter')],
    tokenMessengerMinter
  );

  // Local Token account
  const [localToken] = PublicKey.findProgramAddressSync(
    [Buffer.from('local_token'), usdcMint.toBuffer()],
    tokenMessengerMinter
  );

  // Remote Token Messenger for destination domain
  const [remoteTokenMessenger] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('remote_token_messenger'),
      Buffer.from([destinationDomain >> 24, destinationDomain >> 16, destinationDomain >> 8, destinationDomain]),
    ],
    tokenMessengerMinter
  );

  // Message Sent Event Data account (ephemeral account to store message)
  // This should be a unique account for each transaction
  const messageAccount = PublicKey.unique();

  // Build the instruction data
  // Format: instruction_discriminator (8 bytes) + params
  const instructionData = Buffer.alloc(8 + 8 + 4 + 32 + 32 + 8 + 4);
  let offset = 0;

  // Instruction discriminator for depositForBurn (this is a placeholder - actual value from IDL)
  // You'll need to get the correct discriminator from the CCTP Solana program IDL
  instructionData.writeBigUInt64LE(BigInt('0x1234567890abcdef'), offset); // PLACEHOLDER
  offset += 8;

  // Amount (u64)
  instructionData.writeBigUInt64LE(amount, offset);
  offset += 8;

  // Destination domain (u32)
  instructionData.writeUInt32LE(destinationDomain, offset);
  offset += 4;

  // Mint recipient (32 bytes)
  mintRecipient.copy(instructionData, offset);
  offset += 32;

  // Destination caller (32 bytes - all zeros for now, means anyone can call)
  Buffer.alloc(32).copy(instructionData, offset);
  offset += 32;

  // Max fee (u64)
  instructionData.writeBigUInt64LE(maxFee, offset);
  offset += 8;

  // Finality threshold (u32)
  instructionData.writeUInt32LE(finalityThreshold, offset);

  const instruction = new TransactionInstruction({
    programId: tokenMessengerMinter,
    keys: [
      { pubkey: walletPublicKey, isSigner: true, isWritable: true },
      { pubkey: sourceTokenAccount, isSigner: false, isWritable: true },
      { pubkey: usdcMint, isSigner: false, isWritable: true },
      { pubkey: tokenMessenger, isSigner: false, isWritable: false },
      { pubkey: remoteTokenMessenger, isSigner: false, isWritable: false },
      { pubkey: tokenMinter, isSigner: false, isWritable: false },
      { pubkey: localToken, isSigner: false, isWritable: true },
      { pubkey: messageAccount, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: instructionData,
  });

  return { instruction, messageAccount };
}

/**
 * Build receive message instruction (EVM or Solana -> Solana)
 *
 * This mints USDC on Solana after receiving attestation from Circle
 */
export async function buildReceiveMessageInstruction(
  messageBytes: Buffer,
  attestation: Buffer,
  environment: 'mainnet' | 'testnet'
): Promise<TransactionInstruction> {
  const messageTransmitter = getSolanaMessageTransmitter(environment);
  const usdcMint = getSolanaUSDCMint(environment);

  // Parse message to get recipient
  // Message format is defined by CCTP protocol
  // For now, we'll need to decode this properly based on CCTP message format

  // This is a simplified version - you'll need to properly parse the message
  const instruction = new TransactionInstruction({
    programId: messageTransmitter,
    keys: [
      // Keys will depend on the specific message content
      // This is a placeholder structure
    ],
    data: Buffer.concat([
      Buffer.from([0x01]), // Instruction discriminator for receiveMessage
      messageBytes,
      attestation,
    ]),
  });

  return instruction;
}

/**
 * Parse message bytes to extract recipient and other details
 */
export function parseMessageBytes(messageBytes: Buffer): {
  version: number;
  sourceDomain: number;
  destinationDomain: number;
  nonce: bigint;
  sender: Buffer;
  recipient: Buffer;
  destinationCaller: Buffer;
  messageBody: Buffer;
} {
  let offset = 0;

  const version = messageBytes.readUInt32BE(offset);
  offset += 4;

  const sourceDomain = messageBytes.readUInt32BE(offset);
  offset += 4;

  const destinationDomain = messageBytes.readUInt32BE(offset);
  offset += 4;

  const nonce = messageBytes.readBigUInt64BE(offset);
  offset += 8;

  const sender = messageBytes.slice(offset, offset + 32);
  offset += 32;

  const recipient = messageBytes.slice(offset, offset + 32);
  offset += 32;

  const destinationCaller = messageBytes.slice(offset, offset + 32);
  offset += 32;

  const messageBody = messageBytes.slice(offset);

  return {
    version,
    sourceDomain,
    destinationDomain,
    nonce,
    sender,
    recipient,
    destinationCaller,
    messageBody,
  };
}

/**
 * Get Solana cluster URL based on environment
 */
export function getSolanaClusterUrl(environment: 'mainnet' | 'testnet'): string {
  return environment === 'mainnet'
    ? 'https://api.mainnet-beta.solana.com'
    : 'https://api.devnet.solana.com';
}
