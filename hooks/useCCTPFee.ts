import { useState, useEffect } from 'react';
import { formatUnits, parseUnits } from 'viem';
import { fetchCCTPFee } from '@/lib/cctp/api';
import { CHAIN_DOMAINS, USDC_DECIMALS } from '@/constants/tokens';

interface UseCCTPFeeParams {
  sourceChainId: number | 'solana';
  destinationChainId: number | 'solana' | null;
  amount: string;
  environment: 'mainnet' | 'testnet';
  enabled?: boolean;
}

interface UseCCTPFeeReturn {
  fee: string;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to fetch CCTP bridge fee from Circle's Iris API
 * Automatically refetches when dependencies change
 */
export function useCCTPFee({
  sourceChainId,
  destinationChainId,
  amount,
  environment,
  enabled = true,
}: UseCCTPFeeParams): UseCCTPFeeReturn {
  const [fee, setFee] = useState<string>('0');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Don't fetch if disabled or missing required params
    if (!enabled || !destinationChainId || !amount || parseFloat(amount) <= 0) {
      setFee('0');
      setIsLoading(false);
      setError(null);
      return;
    }

    const fetchFee = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Parse amount to wei/lamports
        const amountInBaseUnits = parseUnits(amount, USDC_DECIMALS);

        // Determine source domain
        const sourceDomain = sourceChainId === 'solana'
          ? 5 // Solana domain
          : CHAIN_DOMAINS[sourceChainId as keyof typeof CHAIN_DOMAINS];

        // Determine destination domain
        const destinationDomain = destinationChainId === 'solana'
          ? 5 // Solana domain
          : CHAIN_DOMAINS[destinationChainId as keyof typeof CHAIN_DOMAINS];

        // Fetch fee from Iris API
        const { fee: feeInBaseUnits } = await fetchCCTPFee(
          environment,
          sourceDomain,
          destinationDomain,
          amountInBaseUnits,
          1000 // Target finality threshold for fast transfer
        );

        // Convert fee to USDC display format
        const feeInUsdc = formatUnits(feeInBaseUnits, USDC_DECIMALS);
        setFee(parseFloat(feeInUsdc).toFixed(6));
      } catch (err) {
        console.error('Failed to fetch CCTP fee:', err);
        const errorObj = err instanceof Error ? err : new Error('Failed to fetch fee');
        setError(errorObj);
        setFee('0');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFee();
  }, [sourceChainId, destinationChainId, amount, environment, enabled]);

  return { fee, isLoading, error };
}
