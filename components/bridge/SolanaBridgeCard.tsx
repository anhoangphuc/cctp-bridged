'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, usePublicClient, useSwitchChain } from 'wagmi';
import { PublicKey, Transaction, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { CHAIN_DOMAINS } from '@/constants/cctp';
import { MESSAGE_TRANSMITTER_V2_EVM_ABI } from '@/constants/abis';
import { MESSAGE_TRANSMITTER_ADDRESS } from '@/constants/addresses';
import { formatUnits, parseUnits, parseAbi } from 'viem';
import { fetchCCTPFee, fetchCCTPAttestation } from '@/lib/cctp/api';
import { evmAddressToBytes32, getDepositForBurnPdas, getProgramsV2, getUSDCBalance as getSolanaUSDCBalance } from '@/lib/solana/cctp';
import { useCustomConnection } from '@/lib/solana/SolanaWalletProvider';
import { getSolanaUSDCMint } from '@/constants/addresses';
import * as anchor from '@coral-xyz/anchor';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { getBytes } from 'ethers';
import { mainnetChains, testnetChains } from '@/lib/wagmi/config';
import { BridgeStepButton } from './BridgeStepButton';

type StepStatus = 'pending' | 'processing' | 'success' | 'error';

interface StepState {
  status: StepStatus;
  txHash?: string;
  error?: string;
  attestation?: string;
  messageHash?: string;
}

interface SolanaBridgeCardProps {
  publicKey: PublicKey;
  environment: 'mainnet' | 'testnet';
}

/**
 * Solana Bridge Card Component
 * Handles bridging from Solana to EVM chains
 */
export function SolanaBridgeCard({
  publicKey,
  environment,
}: SolanaBridgeCardProps) {
  const connection = useCustomConnection();
  const { sendTransaction } = useWallet();
  const { switchChainAsync } = useSwitchChain();
  const { chain: currentChain, address: evmAddress } = useAccount();
  const { writeContractAsync: writeClaim } = useWriteContract();
  const [solBalance, setSolBalance] = useState<number>(0);
  const [usdcBalance, setUsdcBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [destinationChainId, setDestinationChainId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [minimumFee, setMinimumFee] = useState<string>('0');
  const [steps, setSteps] = useState<Record<string, StepState>>({
    deposit: { status: 'pending' },
    fetchAttestation: { status: 'pending' },
    claim: { status: 'pending' },
  });

  // Get available EVM chains based on environment
  const chains = environment === 'mainnet' ? mainnetChains : testnetChains;
  const destinationChain = chains.find(c => c.id === destinationChainId);

  // Get public client for destination chain
  const destinationPublicClient = usePublicClient({ chainId: destinationChainId || undefined });

  // Fetch minimum fee when destination chain or amount changes
  useEffect(() => {
    const fetchFee = async () => {
      if (!destinationChainId || !amount || parseFloat(amount) <= 0) {
        setMinimumFee('0');
        return;
      }

      try {
        const amountInMicroUsdc = parseUnits(amount, 6); // USDC has 6 decimals
        const sourceDomain = 5; // Solana domain
        const destinationDomain = CHAIN_DOMAINS[destinationChainId as keyof typeof CHAIN_DOMAINS];

        const { fee } = await fetchCCTPFee(
          environment,
          sourceDomain,
          destinationDomain,
          amountInMicroUsdc,
          1000 // Target finality threshold for fast transfer
        );

        // Convert fee to USDC display format
        const feeInUsdc = formatUnits(fee, 6);
        setMinimumFee(parseFloat(feeInUsdc).toFixed(6));
      } catch (error) {
        console.error('Failed to fetch fee:', error);
        setMinimumFee('0');
      }
    };

    fetchFee();
  }, [destinationChainId, amount, environment]);

  // Fetch balances
  useEffect(() => {
    const fetchBalances = async () => {
      try {
        setIsLoading(true);

        // Fetch SOL balance
        const solBalanceLamports = await connection.getBalance(publicKey);
        setSolBalance(solBalanceLamports / LAMPORTS_PER_SOL);

        // Fetch USDC balance
        const usdcBalanceBigInt = await getSolanaUSDCBalance(
          connection,
          publicKey,
          environment
        );
        setUsdcBalance(Number(usdcBalanceBigInt) / 1_000_000); // USDC has 6 decimals
      } catch (error) {
        console.error('Failed to fetch Solana balances:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBalances();
  }, [publicKey, connection, environment]);

  const handleMaxClick = () => {
    setAmount(usdcBalance.toString());
  };

  const handleRefreshBalances = async () => {
    setIsRefreshing(true);
    try {
      // Fetch SOL balance
      const solBalanceLamports = await connection.getBalance(publicKey);
      setSolBalance(solBalanceLamports / LAMPORTS_PER_SOL);

      // Fetch USDC balance
      const usdcBalanceBigInt = await getSolanaUSDCBalance(
        connection,
        publicKey,
        environment
      );
      setUsdcBalance(Number(usdcBalanceBigInt) / 1_000_000);
    } catch (error) {
      console.error('Failed to refresh Solana balances:', error);
    } finally {
      // Add a small delay so the user sees the refresh animation
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleNewBridge = () => {
    // Reset all states
    setDestinationChainId(null);
    setAmount('');
    setMinimumFee('0');
    setSteps({
      deposit: { status: 'pending' },
      fetchAttestation: { status: 'pending' },
      claim: { status: 'pending' },
    });
  };

  // Handler for Deposit step (Solana -> EVM)
  const handleDeposit = async () => {
    if (!destinationChainId || !amount) return;

    try {
      setSteps(prev => ({ ...prev, deposit: { status: 'processing' } }));

      console.log('Depositing from Solana...', {
        amount,
        destinationChainId,
      });

      const destinationDomain = CHAIN_DOMAINS[destinationChainId as keyof typeof CHAIN_DOMAINS];
      const { messageTransmitterProgram, tokenMessengerMinterProgram } = await getProgramsV2(connection);
      const usdcAddress = getSolanaUSDCMint(environment);
      const userTokenAccount = await getAssociatedTokenAddress(usdcAddress, publicKey, false, TOKEN_PROGRAM_ID);

      const pdas = getDepositForBurnPdas({ messageTransmitterProgram, tokenMessengerMinterProgram }, usdcAddress, destinationDomain);

      const messageSentEventKeypair = Keypair.generate();
      if (!evmAddress) {
        throw new Error('Require connected EVM address');
      }

      // Fetch fee and finality from Iris API
      const amountInMicroUsdc = parseUnits(amount, 6);
      const sourceDomain = 5; // Solana domain

      const { fee, finalityThreshold } = await fetchCCTPFee(
        environment,
        sourceDomain,
        destinationDomain,
        amountInMicroUsdc,
        1000 // Target finality threshold for fast transfer
      );

      // Convert EVM address to bytes32 format and then to Solana PublicKey
      const evmAddressBytes32 = evmAddressToBytes32(evmAddress);
      const mintRecipientPubkey = new PublicKey(getBytes(evmAddressBytes32));

      const burnTokenAccount = await getAssociatedTokenAddress(usdcAddress, publicKey, false, TOKEN_PROGRAM_ID);

      const depositInstruction = await tokenMessengerMinterProgram.methods
        .depositForBurn({
          amount: new anchor.BN(amountInMicroUsdc.toString()),
          destinationDomain,
          mintRecipient: mintRecipientPubkey,
          destinationCaller: PublicKey.default,
          maxFee: new anchor.BN(fee.toString()),
          minFinalityThreshold: finalityThreshold,
        })
        .accounts({
          eventRentPayer: publicKey, // Connected Solana wallet pays for event account rent
          burnTokenAccount,
          messageTransmitter: pdas.messageTransmitterAccount.publicKey,
          tokenMessenger: pdas.tokenMessengerAccount.publicKey,
          remoteTokenMessenger: pdas.remoteTokenMessengerKey.publicKey,
          tokenMinter: pdas.tokenMinterAccount.publicKey,
          burnTokenMint: usdcAddress,
          messageSentEventData: messageSentEventKeypair.publicKey,
          program: tokenMessengerMinterProgram.programId,
        })
        .accountsPartial({
          owner: publicKey,
        })
        .instruction();

      // Create transaction
      const transaction = new Transaction();

      // Add deposit instruction
      transaction.add(depositInstruction);

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Sign transaction with message event keypair
      transaction.partialSign(messageSentEventKeypair);

      if (!sendTransaction) {
        throw new Error('Wallet does not support sending transactions');
      }

      const signature = await sendTransaction(transaction, connection, { preflightCommitment: 'confirmed' });

      console.log('Deposit transaction submitted:', signature);

      // Store signature and continue processing
      setSteps(prev => ({ ...prev, deposit: { status: 'processing', txHash: signature } }));

      // Wait for confirmation with timeout
      const startTime = Date.now();
      const timeout = 60000; // 60 seconds timeout

      // Poll for transaction confirmation
      // eslint-disable-next-line no-constant-condition
      while (true) {
        // Check if timeout exceeded
        if (Date.now() - startTime > timeout) {
          throw new Error('Transaction confirmation timeout - please check the transaction status on Solana Explorer');
        }

        const { value: txStatus } = await connection.getSignatureStatus(signature);

        if (txStatus && (txStatus.confirmationStatus === 'confirmed' || txStatus.confirmationStatus === 'finalized')) {
          // Check if transaction failed
          if (txStatus.err) {
            throw new Error('Transaction failed: ' + JSON.stringify(txStatus.err));
          }
          break;
        }

        // Delay next poll (e.g., 500ms)
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Transaction successful
      setSteps(prev => ({ ...prev, deposit: { status: 'success', txHash: signature } }));

    } catch (error) {
      console.error('Deposit error:', error);
      setSteps(prev => ({
        ...prev,
        deposit: {
          status: 'error',
          error: error instanceof Error ? error.message : 'Deposit failed',
        },
      }));
    }
  };

  // Handler for Fetch Attestation step
  const handleFetchAttestation = async () => {
    if (!steps.deposit.txHash) return;

    try {
      setSteps(prev => ({ ...prev, fetchAttestation: { status: 'processing' } }));

      // Get Solana domain
      const sourceDomain = 5; // Solana domain
      const txHash = steps.deposit.txHash;

      console.log('Fetching attestation for Solana tx:', txHash);

      // Fetch attestation from Circle's Iris API
      const { attestation, messageBytes } = await fetchCCTPAttestation(
        environment,
        sourceDomain,
        txHash,
        60,    // maxAttempts: Try for up to 2 minutes (60 * 2 seconds)
        2000   // pollInterval: 2 seconds
      );

      setSteps(prev => ({
        ...prev,
        fetchAttestation: {
          status: 'success',
          attestation,
          messageHash: messageBytes,
        },
      }));
    } catch (error) {
      console.error('Fetch attestation error:', error);
      setSteps(prev => ({
        ...prev,
        fetchAttestation: {
          status: 'error',
          error: error instanceof Error ? error.message : 'Fetch attestation failed',
        },
      }));
    }
  };

  // Handler for Claim step (mint on EVM chain)
  const handleClaim = async () => {
    if (!destinationChainId || !destinationPublicClient || !steps.fetchAttestation.attestation || !steps.fetchAttestation.messageHash) {
      console.error('Missing required data for claim');
      return;
    }

    try {
      setSteps(prev => ({ ...prev, claim: { status: 'processing' } }));

      // Check if wallet is on the correct network (destination chain)
      if (currentChain?.id !== destinationChainId) {
        console.log('Switching network to destination chain:', destinationChainId);

        // Prompt user to switch to destination network
        await switchChainAsync({ chainId: destinationChainId });

        // Wait a bit for the network switch to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Get MessageTransmitter address on destination chain
      const messageTransmitterAddress = MESSAGE_TRANSMITTER_ADDRESS[destinationChainId as keyof typeof MESSAGE_TRANSMITTER_ADDRESS] as `0x${string}`;

      // Get the message bytes and attestation from fetchAttestation step
      const messageBytes = steps.fetchAttestation.messageHash as `0x${string}`;
      const attestation = steps.fetchAttestation.attestation as `0x${string}`;

      console.log('Claiming on destination chain:', {
        destinationChainId,
        messageTransmitterAddress,
        messageBytes,
        attestation,
      });

      // Submit receiveMessage transaction on destination chain
      const hash = await writeClaim({
        address: messageTransmitterAddress,
        abi: parseAbi(MESSAGE_TRANSMITTER_V2_EVM_ABI),
        functionName: 'receiveMessage',
        args: [messageBytes, attestation],
        chainId: destinationChainId,
      });

      // Store hash and continue processing
      setSteps(prev => ({ ...prev, claim: { status: 'processing', txHash: hash } }));

      // Wait for transaction confirmation on destination chain
      const receipt = await destinationPublicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === 'success') {
        setSteps(prev => ({ ...prev, claim: { status: 'success', txHash: hash } }));
      } else {
        setSteps(prev => ({
          ...prev,
          claim: {
            status: 'error',
            txHash: hash,
            error: 'Transaction reverted',
          },
        }));
      }
    } catch (error) {
      console.error('Claim error:', error);
      setSteps(prev => ({
        ...prev,
        claim: {
          status: 'error',
          error: error instanceof Error ? error.message : 'Claim failed',
        },
      }));
    }
  };

  const getExplorerUrl = (chainId: number, txHash: string) => {
    const explorers: Record<number, string> = {
      // Mainnet
      1: 'https://etherscan.io/tx/',
      137: 'https://polygonscan.com/tx/',
      42161: 'https://arbiscan.io/tx/',
      10: 'https://optimistic.etherscan.io/tx/',
      8453: 'https://basescan.org/tx/',
      // Testnet
      11155111: 'https://sepolia.etherscan.io/tx/',
      80002: 'https://amoy.polygonscan.com/tx/',
      421614: 'https://sepolia.arbiscan.io/tx/',
      11155420: 'https://sepolia-optimism.etherscan.io/tx/',
      84532: 'https://sepolia.basescan.org/tx/',
    };
    return `${explorers[chainId] || 'https://etherscan.io/tx/'}${txHash}`;
  };

  const getSolanaExplorerUrl = (signature: string) => {
    const cluster = environment === 'mainnet' ? '' : '?cluster=devnet';
    return `https://solscan.io/tx/${signature}${cluster}`;
  };

  return (
    <div className="p-8 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 relative">
      {/* New Bridge button - shown only after successful claim */}
      {steps.claim.status === 'success' && (
        <button
          onClick={handleNewBridge}
          className="absolute top-4 right-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Bridge
        </button>
      )}

      {/* Three column layout */}
      <div className="grid grid-cols-3 gap-8">
        {/* Column 1: Source Network Info */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase">
              Source
            </h4>
            <button
              onClick={handleRefreshBalances}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
              title="Refresh balance"
            >
              <svg
                className={`w-4 h-4 text-zinc-600 dark:text-zinc-400 ${isRefreshing ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
          <div>
            <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              Solana {environment === 'testnet' ? 'Devnet' : ''}
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-600 dark:text-zinc-400">SOL</span>
                <span className="font-mono text-zinc-900 dark:text-zinc-50 text-base">
                  {isLoading ? '...' : solBalance.toFixed(4)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-600 dark:text-zinc-400">USDC</span>
                <span className="font-mono text-zinc-900 dark:text-zinc-50 text-base">
                  {isLoading ? '...' : usdcBalance.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Bridge Details */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase mb-4">
            Destination
          </h4>
          <div>
            <select
              value={destinationChainId || ''}
              onChange={(e) => setDestinationChainId(Number(e.target.value) || null)}
              className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select network</option>
              {chains.map((destChain) => (
                <option key={destChain.id} value={destChain.id}>
                  {destChain.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-3">
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="USDC Amount"
                className="w-full px-4 py-2 pr-16 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 text-base font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                onClick={handleMaxClick}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
              >
                MAX
              </button>
            </div>
            {/* Recipient Address */}
            {destinationChainId && evmAddress && (
              <div className="px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Recipient</div>
                <div className="font-mono text-sm text-zinc-900 dark:text-zinc-50 break-all">
                  {evmAddress}
                </div>
              </div>
            )}
            {destinationChainId && amount && parseFloat(amount) > 0 && (
              <div className="flex justify-between items-center text-sm px-1">
                <div className="flex items-center gap-1 group relative">
                  <span className="text-zinc-600 dark:text-zinc-400">Fast Transfer Fee</span>
                  <svg
                    className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 cursor-help"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2.5 bg-zinc-900 dark:bg-zinc-800 text-white text-xs rounded-lg shadow-lg z-10">
                    <div className="relative">
                      This fee is required and paid to the CCTP Protocol. We don't receive any fee.
                      <div className="absolute -bottom-1 left-4 w-2 h-2 bg-zinc-900 dark:bg-zinc-800 rotate-45"></div>
                    </div>
                  </div>
                </div>
                <span className="font-mono text-zinc-900 dark:text-zinc-50">
                  {minimumFee} USDC
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Bridge Status/Action */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase mb-4">
            Action
          </h4>

          <div className="space-y-3">
            {/* Step 1: Deposit */}
            <BridgeStepButton
              step="Deposit"
              status={steps.deposit.status}
              txHash={steps.deposit.txHash}
              chainId={undefined} // Solana
              getExplorerUrl={steps.deposit.txHash ? () => getSolanaExplorerUrl(steps.deposit.txHash!) : undefined}
              error={steps.deposit.error}
              onClick={handleDeposit}
              disabled={!destinationChainId || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > usdcBalance}
            />

            {/* Step 2: Fetch Attestation */}
            <BridgeStepButton
              step="Fetch Attestation"
              status={steps.fetchAttestation.status}
              error={steps.fetchAttestation.error}
              onClick={handleFetchAttestation}
              disabled={steps.deposit.status !== 'success'}
            />

            {/* Step 3: Claim */}
            <BridgeStepButton
              step="Claim"
              status={steps.claim.status}
              txHash={steps.claim.txHash}
              chainId={destinationChainId || undefined}
              getExplorerUrl={getExplorerUrl}
              error={steps.claim.error}
              onClick={handleClaim}
              disabled={steps.fetchAttestation.status !== 'success'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
