'use client';

import { useState, useEffect } from 'react';
import { useAccount, useBalance, useReadContract, useWriteContract, usePublicClient, useSwitchChain } from 'wagmi';
import { useWallet } from '@solana/wallet-adapter-react';
import { Keypair, LAMPORTS_PER_SOL, PublicKey, Transaction, SystemProgram, Connection } from '@solana/web3.js';
import { useNetwork } from '@/lib/context/NetworkContext';
import { mainnetChains, testnetChains } from '@/lib/wagmi/config';
import { USDC_ADDRESSES, USDC_DECIMALS, ERC20_ABI, TOKEN_MESSENGER_ADDRESSES, APPROVE_EVM_ABI, TOKEN_MESSENGER_V2_EVM_ABI, MESSAGE_TRANSMITTER_V2_EVM_ABI, MESSAGE_TRANSMITTER_ADDRESS, CHAIN_DOMAINS } from '@/constants/tokens';
import { formatUnits, parseUnits, parseAbi, pad  } from 'viem';
import { hoodi, type Chain } from 'wagmi/chains';
import { fetchCCTPFee, fetchCCTPAttestation } from '@/lib/cctp/api';
import { evmAddressToBytes32, getDepositForBurnPdas as getDepositForBurnPdas, getProgramsV2, getUSDCBalance as getSolanaUSDCBalance } from '@/lib/solana/cctp';
import { useCustomConnection } from '@/lib/solana/SolanaWalletProvider';
import { getSolanaUSDCMint } from '@/constants/solana';
import * as anchor from '@coral-xyz/anchor';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { getBytes } from 'ethers';
import bs58 from 'bs58';

type StepStatus = 'pending' | 'processing' | 'success' | 'error';

interface StepState {
  status: StepStatus;
  txHash?: string;
  error?: string;
  attestation?: string;
  messageHash?: string;
}

export function WalletBalances() {
  const { address: evmAddress, isConnected: isEvmConnected } = useAccount();
  const { publicKey: solanaPublicKey, connected: isSolanaConnected } = useWallet();
  const { environment } = useNetwork();

  const chains = environment === 'mainnet' ? mainnetChains : testnetChains;

  // Check if any wallet is connected
  const isAnyWalletConnected = isEvmConnected || isSolanaConnected;

  if (!isAnyWalletConnected) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center p-12 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Connect your wallet to start bridging USDC
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-6">
        Bridge USDC on {environment === 'mainnet' ? 'Mainnet' : 'Testnet'}
      </h2>

      <div className="space-y-4">
        {/* Show EVM chains only if EVM wallet is connected */}
        {isEvmConnected && evmAddress && chains.map((chain) => (
          <ChainBalance
            key={chain.id}
            chain={chain}
            address={evmAddress}
            availableChains={chains.filter(c => c.id !== chain.id)}
          />
        ))}

        {/* Show Solana balance only if Solana wallet is connected */}
        {isSolanaConnected && solanaPublicKey && (
          <SolanaBalance
            publicKey={solanaPublicKey}
            environment={environment}
          />
        )}
      </div>
    </div>
  );
}

function ChainBalance({
  chain,
  address,
  availableChains,
}: {
  chain: Chain;
  address: `0x${string}`;
  availableChains: readonly Chain[];
}) {
  const { environment } = useNetwork();
  const [destinationChainId, setDestinationChainId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [minimumFee, setMinimumFee] = useState<string>('0');
  const [steps, setSteps] = useState<Record<string, StepState>>({
    approve: { status: 'pending' },
    deposit: { status: 'pending' },
    fetchAttestation: { status: 'pending' },
    claim: { status: 'pending' },
  });

  // Wagmi hooks for transactions
  const { writeContractAsync: writeApprove } = useWriteContract();
  const { writeContractAsync: writeDeposit } = useWriteContract();
  const { writeContractAsync: writeClaim } = useWriteContract();
  const publicClient = usePublicClient();
  const { switchChainAsync } = useSwitchChain();
  const { chain: currentChain } = useAccount();

  // Get public client for destination chain
  const destinationPublicClient = usePublicClient({ chainId: destinationChainId || undefined });

  // Fetch ETH balance
  const { data: ethBalance, refetch: refetchEth } = useBalance({
    address,
    chainId: chain.id,
    query: {
      enabled: true,
      refetchInterval: false,
    }
  });

  // Fetch USDC balance
  const { data: usdcBalance, refetch: refetchUsdc } = useReadContract({
    address: USDC_ADDRESSES[chain.id as keyof typeof USDC_ADDRESSES] as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
    chainId: chain.id,
    query: {
      enabled: true,
      refetchInterval: false,
    }
  });

  // Refetch balances when environment changes (mainnet/testnet switch)
  useEffect(() => {
    const timer = setTimeout(() => {
      refetchEth();
      refetchUsdc();
    }, 100);
    return () => clearTimeout(timer);
  }, [environment, refetchEth, refetchUsdc]);

  const formattedEth = ethBalance ? parseFloat(formatUnits(ethBalance.value, 18)).toFixed(4) : '0.0000';
  const formattedUsdc = usdcBalance ? parseFloat(formatUnits(usdcBalance as bigint, USDC_DECIMALS)).toFixed(2) : '0.00';
  const usdcBalanceNumber = usdcBalance ? parseFloat(formatUnits(usdcBalance as bigint, USDC_DECIMALS)) : 0;

  const handleMaxClick = () => {
    setAmount(usdcBalanceNumber.toString());
  };

  const handleNewBridge = () => {
    // Reset all states
    setDestinationChainId(null);
    setAmount('');
    setMinimumFee('0');
    setSteps({
      approve: { status: 'pending' },
      deposit: { status: 'pending' },
      fetchAttestation: { status: 'pending' },
      claim: { status: 'pending' },
    });
  };

  const destinationChain = availableChains.find(c => c.id === destinationChainId);

  // Fetch minimum fee when destination chain or amount changes
  useEffect(() => {
    const fetchFee = async () => {
      if (!destinationChainId || !amount || parseFloat(amount) <= 0) {
        setMinimumFee('0');
        return;
      }

      try {
        const amountInWei = parseUnits(amount, USDC_DECIMALS);
        const sourceDomain = CHAIN_DOMAINS[chain.id as keyof typeof CHAIN_DOMAINS];
        const destinationDomain = CHAIN_DOMAINS[destinationChainId as keyof typeof CHAIN_DOMAINS];

        const { fee } = await fetchCCTPFee(
          environment,
          sourceDomain,
          destinationDomain,
          amountInWei,
          1000 // Target finality threshold for fast transfer
        );

        // Convert fee to USDC display format
        const feeInUsdc = formatUnits(fee, USDC_DECIMALS);
        setMinimumFee(parseFloat(feeInUsdc).toFixed(6));
      } catch (error) {
        console.error('Failed to fetch fee:', error);
        setMinimumFee('0');
      }
    };

    fetchFee();
  }, [destinationChainId, amount, chain.id, environment]);

  // Handler for Approve step
  const handleApprove = async () => {
    if (!destinationChainId || !amount || !publicClient) return;

    try {
      const tokenMessengerAddress = TOKEN_MESSENGER_ADDRESSES[chain.id as keyof typeof TOKEN_MESSENGER_ADDRESSES] as `0x${string}`;
      const usdcAddress = USDC_ADDRESSES[chain.id as keyof typeof USDC_ADDRESSES] as `0x${string}`;
      const amountInWei = parseUnits(amount, USDC_DECIMALS);

      // Set to processing state
      setSteps(prev => ({ ...prev, approve: { status: 'processing' } }));

      // Submit transaction
      const hash = await writeApprove({
        address: usdcAddress,
        abi: parseAbi(APPROVE_EVM_ABI),
        functionName: 'approve',
        args: [tokenMessengerAddress, amountInWei],
      });

      // Store hash and continue processing
      setSteps(prev => ({ ...prev, approve: { status: 'processing', txHash: hash } }));

      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === 'success') {
        setSteps(prev => ({ ...prev, approve: { status: 'success', txHash: hash } }));
      } else {
        setSteps(prev => ({
          ...prev,
          approve: {
            status: 'error',
            txHash: hash,
            error: 'Transaction reverted',
          },
        }));
      }
    } catch (error) {
      console.error('Approve error:', error);
      setSteps(prev => ({
        ...prev,
        approve: {
          status: 'error',
          error: error instanceof Error ? error.message : 'Approval failed',
        },
      }));
    }
  };

  // Handler for Deposit step
  const handleDeposit = async () => {
    if (!destinationChainId || !amount || !publicClient) return;

    try {
      const tokenMessengerAddress = TOKEN_MESSENGER_ADDRESSES[chain.id as keyof typeof TOKEN_MESSENGER_ADDRESSES] as `0x${string}`;
      const usdcAddress = USDC_ADDRESSES[chain.id as keyof typeof USDC_ADDRESSES] as `0x${string}`;
      const amountInWei = parseUnits(amount, USDC_DECIMALS);
      const sourceDomain = CHAIN_DOMAINS[chain.id as keyof typeof CHAIN_DOMAINS];
      const destinationDomain = CHAIN_DOMAINS[destinationChainId as keyof typeof CHAIN_DOMAINS];

      // Convert recipient address to bytes32 (pad to 32 bytes)
      const mintRecipient = pad(address as `0x${string}`, { size: 32 });

      // Set to processing state
      setSteps(prev => ({ ...prev, deposit: { status: 'processing' } }));

      // Fetch fee from Iris API
      const { fee, finalityThreshold } = await fetchCCTPFee(
        environment,
        sourceDomain,
        destinationDomain,
        amountInWei,
        1000 // Target finality threshold
      );

      // Submit depositForBurn transaction
      const hash = await writeDeposit({
        address: tokenMessengerAddress,
        abi: parseAbi(TOKEN_MESSENGER_V2_EVM_ABI),
        functionName: 'depositForBurn',
        args: [
          amountInWei,                    // amount
          destinationDomain,              // destinationDomain
          mintRecipient,                  // mintRecipient (bytes32)
          usdcAddress,                    // burnToken
          pad('0x0', { size: 32 }),       // destinationCaller (0x0 for any caller)
          fee,                            // maxFee
          finalityThreshold,              // minFinalityThreshold
        ],
      });

      // Store hash and continue processing
      setSteps(prev => ({ ...prev, deposit: { status: 'processing', txHash: hash } }));

      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === 'success') {
        setSteps(prev => ({ ...prev, deposit: { status: 'success', txHash: hash } }));
      } else {
        setSteps(prev => ({
          ...prev,
          deposit: {
            status: 'error',
            txHash: hash,
            error: 'Transaction reverted',
          },
        }));
      }
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
    if (!publicClient || !steps.deposit.txHash) return;

    try {
      setSteps(prev => ({ ...prev, fetchAttestation: { status: 'processing' } }));

      // Get source chain domain
      const sourceDomain = CHAIN_DOMAINS[chain.id as keyof typeof CHAIN_DOMAINS];
      const txHash = steps.deposit.txHash;

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

  // Handler for Claim step
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
          <h4 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase mb-4">
            Source
          </h4>
          <div>
            <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              {chain.name}
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-600 dark:text-zinc-400">ETH</span>
                <span className="font-mono text-zinc-900 dark:text-zinc-50 text-base">
                  {formattedEth}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-600 dark:text-zinc-400">USDC</span>
                <span className="font-mono text-zinc-900 dark:text-zinc-50 text-base">
                  {formattedUsdc}
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
              {availableChains.map((destChain) => (
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
            {/* Step 1: Approve */}
            <BridgeStepButton
              step="Approve"
              status={steps.approve.status}
              txHash={steps.approve.txHash}
              chainId={chain.id}
              getExplorerUrl={getExplorerUrl}
              error={steps.approve.error}
              onClick={handleApprove}
              disabled={!destinationChainId || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > usdcBalanceNumber}
            />

            {/* Step 2: Deposit */}
            <BridgeStepButton
              step="Deposit"
              status={steps.deposit.status}
              txHash={steps.deposit.txHash}
              chainId={chain.id}
              getExplorerUrl={getExplorerUrl}
              error={steps.deposit.error}
              onClick={handleDeposit}
              disabled={steps.approve.status !== 'success'}
            />

            {/* Step 3: Fetch Attestation */}
            <BridgeStepButton
              step="Fetch Attestation"
              status={steps.fetchAttestation.status}
              error={steps.fetchAttestation.error}
              onClick={handleFetchAttestation}
              disabled={steps.deposit.status !== 'success'}
            />

            {/* Step 4: Claim */}
            <BridgeStepButton
              step="Claim"
              status={steps.claim.status}
              txHash={steps.claim.txHash}
              chainId={destinationChainId || chain.id}
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

function BridgeStepButton({
  step,
  status,
  txHash,
  chainId,
  getExplorerUrl,
  error,
  onClick,
  disabled,
}: {
  step: string;
  status: StepStatus;
  txHash?: string;
  chainId?: number;
  getExplorerUrl?: (chainId: number, txHash: string) => string | (() => string);
  error?: string;
  onClick: () => void;
  disabled: boolean;
}) {
  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return (
          <div className="w-5 h-5 rounded-full border-2 border-zinc-300 dark:border-zinc-600" />
        );
      case 'processing':
        return (
          <div className="w-5 h-5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
        );
      case 'success':
        return (
          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'error':
        return (
          <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
    }
  };

  const getButtonText = () => {
    if (status === 'success') return 'Completed';
    if (status === 'processing') {
      // Show gerund form during processing
      if (step === 'Approve') return 'Approving...';
      if (step === 'Deposit') return 'Depositing...';
      if (step === 'Fetch Attestation') return 'Fetching...';
      if (step === 'Claim') return 'Claiming...';
      return 'Processing...';
    }
    if (status === 'error') return 'Retry';
    return step;
  };

  const getTransactionUrl = () => {
    if (!txHash || !getExplorerUrl) return null;

    // For Solana transactions (chainId is undefined), getExplorerUrl is a function that takes no args
    if (chainId === undefined && typeof getExplorerUrl === 'function') {
      return (getExplorerUrl as () => string)();
    }

    // For EVM transactions, getExplorerUrl takes chainId and txHash
    if (chainId !== undefined && typeof getExplorerUrl === 'function') {
      return (getExplorerUrl as (chainId: number, txHash: string) => string)(chainId, txHash);
    }

    return null;
  };

  const transactionUrl = getTransactionUrl();

  return (
    <div className="space-y-2">
      <button
        onClick={onClick}
        disabled={disabled || status === 'processing' || status === 'success'}
        className={`w-full px-4 py-3 rounded-lg font-medium text-sm transition-colors flex items-center justify-between ${
          status === 'success'
            ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 cursor-not-allowed'
            : status === 'error'
            ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/30'
            : status === 'processing'
            ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 cursor-not-allowed'
            : disabled
            ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        <span>{getButtonText()}</span>
        {getStatusIcon()}
      </button>

      {transactionUrl && (
        <a
          href={transactionUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline block px-2"
        >
          View transaction →
        </a>
      )}

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 px-2">{error}</p>
      )}
    </div>
  );
}

// Solana Balance Component
function SolanaBalance({
  publicKey,
  environment,
}: {
  publicKey: PublicKey;
  environment: 'mainnet' | 'testnet';
}) {
  const connection = useCustomConnection();
  const { sendTransaction } = useWallet();
  const { switchChainAsync } = useSwitchChain();
  const { chain: currentChain, address: evmAddress } = useAccount();
  const { writeContractAsync: writeClaim } = useWriteContract();
  const [solBalance, setSolBalance] = useState<number>(0);
  const [usdcBalance, setUsdcBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
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

      // TODO: Implement Solana depositForBurn transaction
      // This will:
      // 1. Burn USDC on Solana
      // 2. Emit message for attestation
      console.log('Depositing from Solana...', {
        amount,
        destinationChainId,
      });

      const destinationDomain = CHAIN_DOMAINS[destinationChainId as keyof typeof CHAIN_DOMAINS];
      const { messageTransmitterProgram, tokenMessengerMinterProgram } = await getProgramsV2(connection);
      const usdcAddress = getSolanaUSDCMint(environment);
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

      // Add rent paymen      // Add deposit instruction
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

      const signature = await sendTransaction(transaction, connection, { preflightCommitment: 'confirmed' } );

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
          <h4 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase mb-4">
            Source
          </h4>
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
