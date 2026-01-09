'use client';

import { useState } from 'react';
import { useAccount, useBalance, useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { useNetwork } from '@/lib/context/NetworkContext';
import { mainnetChains, testnetChains } from '@/lib/wagmi/config';
import { USDC_ADDRESSES, USDC_DECIMALS, ERC20_ABI, TOKEN_MESSENGER_ADDRESSES, APPROVE_EVM_ABI, TOKEN_MESSENGER_V2_EVM_ABI, CHAIN_DOMAINS } from '@/constants/tokens';
import { formatUnits, parseUnits, parseAbi, pad, toHex } from 'viem';
import type { Chain } from 'wagmi/chains';

type StepStatus = 'pending' | 'processing' | 'success' | 'error';

interface StepState {
  status: StepStatus;
  txHash?: string;
  error?: string;
  attestation?: string;
  messageHash?: string;
}

export function WalletBalances() {
  const { address, isConnected } = useAccount();
  const { environment } = useNetwork();

  const chains = environment === 'mainnet' ? mainnetChains : testnetChains;

  if (!isConnected || !address) {
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
        {chains.map((chain) => (
          <ChainBalance
            key={chain.id}
            chain={chain}
            address={address}
            availableChains={chains.filter(c => c.id !== chain.id)}
          />
        ))}
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
  const [steps, setSteps] = useState<Record<string, StepState>>({
    approve: { status: 'pending' },
    deposit: { status: 'pending' },
    fetchAttestation: { status: 'pending' },
    claim: { status: 'pending' },
  });

  // Wagmi hooks for transactions
  const { writeContractAsync: writeApprove } = useWriteContract();
  const { writeContractAsync: writeDeposit } = useWriteContract();
  const publicClient = usePublicClient();

  // Fetch ETH balance
  const { data: ethBalance } = useBalance({
    address,
    chainId: chain.id,
  });

  // Fetch USDC balance
  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESSES[chain.id as keyof typeof USDC_ADDRESSES] as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
    chainId: chain.id,
  });

  const formattedEth = ethBalance ? parseFloat(formatUnits(ethBalance.value, 18)).toFixed(4) : '0.0000';
  const formattedUsdc = usdcBalance ? parseFloat(formatUnits(usdcBalance as bigint, USDC_DECIMALS)).toFixed(2) : '0.00';
  const usdcBalanceNumber = usdcBalance ? parseFloat(formatUnits(usdcBalance as bigint, USDC_DECIMALS)) : 0;

  const handleMaxClick = () => {
    setAmount(usdcBalanceNumber.toString());
  };

  const destinationChain = availableChains.find(c => c.id === destinationChainId);

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
      const destinationDomain = CHAIN_DOMAINS[destinationChainId as keyof typeof CHAIN_DOMAINS];

      // Convert recipient address to bytes32 (pad to 32 bytes)
      const mintRecipient = pad(address as `0x${string}`, { size: 32 });

      // Set to processing state
      setSteps(prev => ({ ...prev, deposit: { status: 'processing' } }));

      // Submit depositForBurn transaction
      let fee = amountInWei / BigInt(10000); // 1 bps for fee
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
          fee,                            // maxFee (1 bps for now)
          0,                              // minFinalityThreshold (0 for default)
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

      // Determine API endpoint based on environment
      const apiUrl = environment === 'mainnet'
        ? 'https://iris-api.circle.com'
        : 'https://iris-api-sandbox.circle.com';

      // Get source chain domain
      const sourceDomain = CHAIN_DOMAINS[chain.id as keyof typeof CHAIN_DOMAINS];
      const txHash = steps.deposit.txHash;

      // Poll Circle's attestation API
      let attestationResponse: any = null;
      let messageBytes: string | null = null;
      const maxAttempts = 60; // Try for up to 2 minutes (60 * 2 seconds)
      let attempts = 0;

      while (attempts < maxAttempts) {
        attempts++;

        try {
          const response = await fetch(
            `${apiUrl}/v2/messages/${sourceDomain}?transactionHash=${txHash}`,
            {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
              },
            }
          );

          attestationResponse = await response.json();

          // Check if we have a valid attestation
          if (
            !attestationResponse.error &&
            attestationResponse.messages &&
            attestationResponse.messages.length > 0 &&
            attestationResponse.messages[0].attestation !== 'PENDING'
          ) {
            // Found the attestation
            messageBytes = attestationResponse.messages[0].message;
            break;
          }

          // Wait 2 seconds to avoid getting rate limited
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (fetchError) {
          console.error('Attestation fetch attempt failed:', fetchError);
          // Wait 2 seconds before retrying
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      if (!attestationResponse || !attestationResponse.messages || attestationResponse.messages.length === 0) {
        throw new Error('Attestation not received within timeout period');
      }

      const message = attestationResponse.messages[0];
      const attestation = message.attestation;

      if (!attestation || attestation === 'PENDING') {
        throw new Error('Attestation is still pending');
      }

      setSteps(prev => ({
        ...prev,
        fetchAttestation: {
          status: 'success',
          attestation,
          messageHash: messageBytes || undefined,
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
    if (!destinationChainId) return;

    try {
      setSteps(prev => ({ ...prev, claim: { status: 'processing' } }));

      // TODO: Implement claim logic
      console.log('Claim not yet implemented');

      // Placeholder - remove when implementing
      setTimeout(() => {
        setSteps(prev => ({ ...prev, claim: { status: 'success', txHash: '0x...' } }));
      }, 2000);
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
    <div className="p-8 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
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
  getExplorerUrl?: (chainId: number, txHash: string) => string;
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

      {txHash && chainId && getExplorerUrl && (
        <a
          href={getExplorerUrl(chainId, txHash)}
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
