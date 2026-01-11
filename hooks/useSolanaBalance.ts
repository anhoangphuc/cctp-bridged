import { useState, useEffect } from 'react';
import { PublicKey, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getUSDCBalance } from '@/lib/solana/cctp';

interface UseSolanaBalanceParams {
  connection: Connection;
  publicKey: PublicKey | null;
  environment: 'mainnet' | 'testnet';
}

interface UseSolanaBalanceReturn {
  solBalance: number;
  usdcBalance: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch Solana native balance (SOL) and USDC balance
 * Automatically refetches when dependencies change
 */
export function useSolanaBalance({
  connection,
  publicKey,
  environment,
}: UseSolanaBalanceParams): UseSolanaBalanceReturn {
  const [solBalance, setSolBalance] = useState<number>(0);
  const [usdcBalance, setUsdcBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchBalances = async () => {
    if (!publicKey) {
      setSolBalance(0);
      setUsdcBalance(0);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch SOL balance
      const solBalanceLamports = await connection.getBalance(publicKey);
      const solBalanceFormatted = solBalanceLamports / LAMPORTS_PER_SOL;
      setSolBalance(solBalanceFormatted);

      // Fetch USDC balance
      const usdcBalanceBigInt = await getUSDCBalance(
        connection,
        publicKey,
        environment
      );
      const usdcBalanceFormatted = Number(usdcBalanceBigInt) / 1_000_000; // USDC has 6 decimals
      setUsdcBalance(usdcBalanceFormatted);
    } catch (err) {
      console.error('Failed to fetch Solana balances:', err);
      const errorObj = err instanceof Error ? err : new Error('Failed to fetch balances');
      setError(errorObj);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBalances();
  }, [publicKey, connection, environment]);

  return {
    solBalance,
    usdcBalance,
    isLoading,
    error,
    refetch: fetchBalances,
  };
}
