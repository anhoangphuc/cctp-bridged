/**
 * Solana CCTP Bridge Utilities
 *
 * Functions for burning and minting USDC on Solana using Circle's CCTP protocol
 */
import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider } from '@coral-xyz/anchor';

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
} from '@/constants/addresses';

// Import IDL types and JSON
import { MessageTransmitterV2 } from '@/lib/abis/message_transmitter_v2';
import { TokenMessengerMinterV2 } from '@/lib/abis/token_messenger_minter_v2';
import MessageTransmitterIDL from '@/lib/abis/message_transmitter_v2.json';
import TokenMessengerMinterIDL from '@/lib/abis/token_messenger_minter_v2.json';

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
 * Get Anchor programs for CCTP V2
 *
 * @param connection - Solana connection (mainnet or devnet)
 * @returns Object containing MessageTransmitter and TokenMessengerMinter programs
 */
export const getProgramsV2 = (connection: Connection) => {
  // Create a dummy wallet for read-only operations
  // For transactions, the actual wallet will be provided
  const dummyWallet = {
    publicKey: PublicKey.default,
    signTransaction: async (tx: any) => tx,
    signAllTransactions: async (txs: any[]) => txs,
  };

  // Create Anchor provider with the connection
  const provider = new AnchorProvider(
    connection,
    dummyWallet as any,
    { commitment: 'confirmed' }
  );

  // Initialize Message Transmitter program
  const messageTransmitterProgram = new Program<MessageTransmitterV2>(
    MessageTransmitterIDL as any,
    provider
  );

  // Initialize Token Messenger Minter program
  const tokenMessengerMinterProgram = new Program<TokenMessengerMinterV2>(
    TokenMessengerMinterIDL as any,
    provider
  );

  return {
    messageTransmitterProgram,
    tokenMessengerMinterProgram,
  };
};

export const getDepositForBurnPdas = (
  {
    messageTransmitterProgram,
    tokenMessengerMinterProgram,
  }: ReturnType<typeof getProgramsV2>,
  usdcAddress: PublicKey,
  destinationDomain: number,
) => {
  const messageTransmitterAccount = findProgramAddress(
    "message_transmitter",
    messageTransmitterProgram.programId
  );
  const tokenMessengerAccount = findProgramAddress(
    "token_messenger",
    tokenMessengerMinterProgram.programId
  );
  const tokenMinterAccount = findProgramAddress(
    "token_minter",
    tokenMessengerMinterProgram.programId
  );
  const localToken = findProgramAddress(
    "local_token",
    tokenMessengerMinterProgram.programId,
    [usdcAddress]
  );
  const remoteTokenMessengerKey = findProgramAddress(
    "remote_token_messenger",
    tokenMessengerMinterProgram.programId,
    [destinationDomain.toString()]
  );
  const authorityPda = findProgramAddress(
    "sender_authority",
    tokenMessengerMinterProgram.programId
  );

  return {
    messageTransmitterAccount,
    tokenMessengerAccount,
    tokenMinterAccount,
    localToken,
    remoteTokenMessengerKey,
    authorityPda,
  };
}

export interface FindProgramAddressResponse {
  publicKey: anchor.web3.PublicKey;
  bump: number;
}

export const findProgramAddress = (
  label: string,
  programId: PublicKey,
  extraSeeds: (string | number[] | Buffer | PublicKey)[] | undefined = undefined
): FindProgramAddressResponse => {
  const seeds = [Buffer.from(anchor.utils.bytes.utf8.encode(label))];
  if (extraSeeds) {
    for (const extraSeed of extraSeeds) {
      if (typeof extraSeed === "string") {
        seeds.push(Buffer.from(anchor.utils.bytes.utf8.encode(extraSeed)));
      } else if (Array.isArray(extraSeed)) {
        seeds.push(Buffer.from(extraSeed as number[]));
      } else if (Buffer.isBuffer(extraSeed)) {
        seeds.push(extraSeed as any);
      } else if (extraSeed instanceof PublicKey) {
        seeds.push(extraSeed.toBuffer() as any);
      }
    }
  }
  const res = PublicKey.findProgramAddressSync(seeds, programId);
  return { publicKey: res[0], bump: res[1] };
};

export const evmAddressToBytes32 = (address: string): string =>
  `0x000000000000000000000000${address.replace("0x", "")}`;

export const getReceiveMessagePdas = async (
  {
      messageTransmitterProgram,
      tokenMessengerMinterProgram,
  }: ReturnType<typeof getProgramsV2>,
  solUsdcAddress: PublicKey,
  remoteUsdcAddressHex: string,
  remoteDomain: string,
  nonce: Buffer
) => {
  const tokenMessengerAccount = findProgramAddress(
      "token_messenger",
      tokenMessengerMinterProgram.programId,
  );
  const messageTransmitterAccount = findProgramAddress(
      "message_transmitter",
      messageTransmitterProgram.programId
  );
  const tokenMinterAccount = findProgramAddress(
      "token_minter",
      tokenMessengerMinterProgram.programId
  );
  const localToken = findProgramAddress(
      "local_token",
      tokenMessengerMinterProgram.programId,
      [solUsdcAddress]
  );
  const remoteTokenMessengerKey = findProgramAddress(
      "remote_token_messenger",
      tokenMessengerMinterProgram.programId,
      [remoteDomain]
  );
  const remoteTokenKey = new PublicKey(hexToBytes(remoteUsdcAddressHex));
  const tokenPair = findProgramAddress(
      "token_pair",
      tokenMessengerMinterProgram.programId,
      [remoteDomain, remoteTokenKey]
  );
  const custodyTokenAccount = findProgramAddress(
      "custody",
      tokenMessengerMinterProgram.programId,
      [solUsdcAddress]
  );
  const authorityPda = findProgramAddress(
      "message_transmitter_authority",
      messageTransmitterProgram.programId,
      [tokenMessengerMinterProgram.programId]
  ).publicKey;
  const tokenMessengerEventAuthority = findProgramAddress(
      "__event_authority",
      tokenMessengerMinterProgram.programId
  );
  const usedNonce = findProgramAddress(
      "used_nonce",
      messageTransmitterProgram.programId,
      [nonce]
  ).publicKey;

  const tokenMessengerAccounts =
      await tokenMessengerMinterProgram.account.tokenMessenger.fetch(
          tokenMessengerAccount.publicKey
      );
  const feeRecipientTokenAccount = await getAssociatedTokenAddress(
      solUsdcAddress,
      tokenMessengerAccounts.feeRecipient
  );

  return {
      messageTransmitterAccount,
      tokenMessengerAccount,
      tokenMinterAccount,
      localToken,
      remoteTokenMessengerKey,
      remoteTokenKey,
      tokenPair,
      custodyTokenAccount,
      authorityPda,
      tokenMessengerEventAuthority,
      usedNonce,
      feeRecipientTokenAccount,
  };
};

export const hexToBytes = (hex: string): Buffer => Buffer.from(hex.replace("0x", ""), "hex");

export const decodeEventNonceFromMessageV2 = (messageHex: string): Buffer => {
  const nonceIndex = 12;
  const nonceBytesLength = 32;
  const message = hexToBytes(messageHex);
  const eventNonceBytes = message.subarray(
      nonceIndex,
      nonceIndex + nonceBytesLength
  );
  return eventNonceBytes;
};