'use client';

import { useState, useEffect } from 'react';
import { useAccount, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useNetwork } from '@/lib/context/NetworkContext';
import { mainnetChains, testnetChains } from '@/lib/wagmi/config';
import { USDC_ADDRESSES, USDC_DECIMALS, ERC20_ABI, TOKEN_MESSENGER_ADDRESSES, APPROVE_EVM_ABI } from '@/constants/tokens';
import { formatUnits, parseUnits, parseAbi } from 'viem';
import type { Chain } from 'wagmi/chains';

type BridgeStep = 'idle' | 'approve' | 'deposit' | 'fetchAttestation' | 'claim' | 'completed';
type StepStatus = 'pending' | 'processing' | 'success' | 'error';

interface StepState {
  status: StepStatus;
  txHash?: string;
  error?: string;
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
  const [destinationChainId, setDestinationChainId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [currentStep, setCurrentStep] = useState<BridgeStep>('idle');
  const [steps, setSteps] = useState<Record<string, StepState>>({
    approve: { status: 'pending' },
    deposit: { status: 'pending' },
    fetchAttestation: { status: 'pending' },
    claim: { status: 'pending' },
  });

  // Wagmi hooks for approve transaction
  const { writeContractAsync: writeApprove, data: approveHash, error: approveError } = useWriteContract();
  const { isLoading: isApproving, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  // Log approve errors
  useEffect(() => {
    if (approveError) {
      console.error('Approve error from hook:', approveError);
    }
  }, [approveError]);

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

  // Track approve transaction status
  useEffect(() => {
    if (currentStep === 'approve') {
      if (isApproving) {
        setSteps(prev => ({
          ...prev,
          approve: { status: 'processing', txHash: approveHash },
        }));
      } else if (isApproveSuccess && approveHash) {
        setSteps(prev => ({
          ...prev,
          approve: { status: 'success', txHash: approveHash },
        }));
        // Move to next step
        setCurrentStep('deposit');
      } else if (approveError) {
        setSteps(prev => ({
          ...prev,
          approve: {
            status: 'error',
            error: approveError.message || 'Approval failed',
          },
        }));
        setCurrentStep('idle');
      }
    }
  }, [isApproving, isApproveSuccess, approveError, approveHash, currentStep]);

  const handleBridge = async () => {
    console.log('handleBridge called', { destinationChainId, amount });

    if (!destinationChainId || !amount) {
      console.log('Missing destinationChainId or amount');
      return;
    }

    try {
      // Start the bridging process
      setCurrentStep('approve');

      // Step 1: Approve USDC spending
      const tokenMessengerAddress = TOKEN_MESSENGER_ADDRESSES[chain.id as keyof typeof TOKEN_MESSENGER_ADDRESSES] as `0x${string}`;
      const usdcAddress = USDC_ADDRESSES[chain.id as keyof typeof USDC_ADDRESSES] as `0x${string}`;
      const amountInWei = parseUnits(amount, USDC_DECIMALS);

      console.log('Approve details:', {
        chainId: chain.id,
        tokenMessengerAddress,
        usdcAddress,
        amountInWei: amountInWei.toString(),
      });

      setSteps(prev => ({
        ...prev,
        approve: { status: 'processing' },
      }));

      const hash = await writeApprove({
        address: usdcAddress,
        abi: parseAbi(APPROVE_EVM_ABI),
        functionName: 'approve',
        args: [tokenMessengerAddress, amountInWei],
      });

      console.log('Approve transaction submitted:', hash);
    } catch (error) {
      console.error('Bridge error:', error);
      setSteps(prev => ({
        ...prev,
        approve: {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      }));
      setCurrentStep('idle');
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

          {currentStep === 'idle' ? (
            <button
              onClick={handleBridge}
              disabled={!destinationChainId || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > usdcBalanceNumber}
              className="w-full px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors"
            >
              {!destinationChainId
                ? 'Select network'
                : !amount || parseFloat(amount) <= 0
                ? 'Enter amount'
                : parseFloat(amount) > usdcBalanceNumber
                ? 'Insufficient'
                : 'Bridge'
              }
            </button>
          ) : (
            <div className="space-y-3">
              {/* Step 1: Approve */}
              <BridgeStepItem
                step="Approve"
                status={steps.approve.status}
                txHash={steps.approve.txHash}
                chainId={chain.id}
                getExplorerUrl={getExplorerUrl}
                error={steps.approve.error}
              />

              {/* Step 2: Deposit */}
              <BridgeStepItem
                step="Deposit"
                status={steps.deposit.status}
                txHash={steps.deposit.txHash}
                chainId={chain.id}
                getExplorerUrl={getExplorerUrl}
                error={steps.deposit.error}
              />

              {/* Step 3: Fetch Attestation */}
              <BridgeStepItem
                step="Fetch Attestation"
                status={steps.fetchAttestation.status}
                error={steps.fetchAttestation.error}
              />

              {/* Step 4: Claim */}
              <BridgeStepItem
                step="Claim"
                status={steps.claim.status}
                txHash={steps.claim.txHash}
                chainId={destinationChainId || chain.id}
                getExplorerUrl={getExplorerUrl}
                error={steps.claim.error}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BridgeStepItem({
  step,
  status,
  txHash,
  chainId,
  getExplorerUrl,
  error,
}: {
  step: string;
  status: StepStatus;
  txHash?: string;
  chainId?: number;
  getExplorerUrl?: (chainId: number, txHash: string) => string;
  error?: string;
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

  const getStatusText = () => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'processing':
        return 'Processing...';
      case 'success':
        return 'Success';
      case 'error':
        return 'Failed';
    }
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
      <div className="flex-shrink-0 mt-0.5">{getStatusIcon()}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{step}</span>
          <span className={`text-xs ${
            status === 'success' ? 'text-green-600 dark:text-green-400' :
            status === 'error' ? 'text-red-600 dark:text-red-400' :
            status === 'processing' ? 'text-blue-600 dark:text-blue-400' :
            'text-zinc-500 dark:text-zinc-400'
          }`}>
            {getStatusText()}
          </span>
        </div>
        {txHash && chainId && getExplorerUrl && (
          <a
            href={getExplorerUrl(chainId, txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline truncate block"
          >
            View transaction →
          </a>
        )}
        {error && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
        )}
      </div>
    </div>
  );
}
