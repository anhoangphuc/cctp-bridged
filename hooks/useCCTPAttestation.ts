import { useState, useCallback } from 'react';
import { fetchCCTPAttestation } from '@/lib/cctp/api';
import { CHAIN_DOMAINS } from '@/constants/cctp';

interface AttestationResult {
  attestation: string;
  messageBytes: string;
}

interface UseCCTPAttestationReturn {
  fetchAttestation: (params: {
    sourceChainId: number | 'solana';
    txHash: string;
    environment: 'mainnet' | 'testnet';
  }) => Promise<AttestationResult>;
  isLoading: boolean;
  error: Error | null;
  data: AttestationResult | null;
}

/**
 * Hook to fetch CCTP attestation from Circle's Iris API
 * Provides a callback function to manually trigger attestation fetching
 */
export function useCCTPAttestation(): UseCCTPAttestationReturn {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<AttestationResult | null>(null);

  const fetchAttestation = useCallback(async ({
    sourceChainId,
    txHash,
    environment,
  }: {
    sourceChainId: number | 'solana';
    txHash: string;
    environment: 'mainnet' | 'testnet';
  }): Promise<AttestationResult> => {
    setIsLoading(true);
    setError(null);

    try {
      // Determine source domain
      const sourceDomain = sourceChainId === 'solana'
        ? 5 // Solana domain
        : CHAIN_DOMAINS[sourceChainId as keyof typeof CHAIN_DOMAINS];

      // Fetch attestation from Circle's Iris API
      const result = await fetchCCTPAttestation(
        environment,
        sourceDomain,
        txHash,
        60,    // maxAttempts: Try for up to 2 minutes (60 * 2 seconds)
        2000   // pollInterval: 2 seconds
      );

      setData(result);
      setIsLoading(false);
      return result;
    } catch (err) {
      console.error('Failed to fetch CCTP attestation:', err);
      const errorObj = err instanceof Error ? err : new Error('Failed to fetch attestation');
      setError(errorObj);
      setIsLoading(false);
      throw errorObj;
    }
  }, []);

  return {
    fetchAttestation,
    isLoading,
    error,
    data,
  };
}
