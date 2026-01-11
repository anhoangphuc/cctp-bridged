import { StepStatus } from '@/hooks/useBridgeSteps';

interface BridgeStepButtonProps {
  step: string;
  status: StepStatus;
  txHash?: string;
  chainId?: number;
  getExplorerUrl?: (chainId: number, txHash: string) => string | (() => string);
  error?: string;
  onClick: () => void;
  disabled: boolean;
}

/**
 * Reusable step button component for bridge transactions
 * Shows different states: pending, processing, success, error
 * Displays transaction links and error messages
 */
export function BridgeStepButton({
  step,
  status,
  txHash,
  chainId,
  getExplorerUrl,
  error,
  onClick,
  disabled,
}: BridgeStepButtonProps) {
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
