'use client';

import { useAccount, useBalance, useReadContract } from 'wagmi';
import { useNetwork } from '@/lib/context/NetworkContext';
import { mainnetChains, testnetChains } from '@/lib/wagmi/config';
import { USDC_ADDRESSES, USDC_DECIMALS, ERC20_ABI } from '@/constants/tokens';
import { formatUnits } from 'viem';

export function WalletBalances() {
  const { address, isConnected } = useAccount();
  const { environment } = useNetwork();

  const chains = environment === 'mainnet' ? mainnetChains : testnetChains;

  if (!isConnected || !address) {
    return null;
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-6">
        Your Balances on {environment === 'mainnet' ? 'Mainnet' : 'Testnet'}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {chains.map((chain) => (
          <ChainBalance
            key={chain.id}
            chainId={chain.id}
            chainName={chain.name}
            address={address}
          />
        ))}
      </div>
    </div>
  );
}

function ChainBalance({
  chainId,
  chainName,
  address,
}: {
  chainId: number;
  chainName: string;
  address: `0x${string}`;
}) {
  // Fetch ETH balance
  const { data: ethBalance } = useBalance({
    address,
    chainId,
  });

  // Fetch USDC balance
  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESSES[chainId as keyof typeof USDC_ADDRESSES] as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
    chainId,
  });

  const formattedEth = ethBalance ? parseFloat(formatUnits(ethBalance.value, 18)).toFixed(4) : '0.0000';
  const formattedUsdc = usdcBalance ? parseFloat(formatUnits(usdcBalance as bigint, USDC_DECIMALS)).toFixed(2) : '0.00';

  return (
    <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
        {chainName}
      </h3>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">ETH</span>
          <span className="font-mono text-sm text-zinc-900 dark:text-zinc-50">
            {formattedEth}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">USDC</span>
          <span className="font-mono text-sm text-zinc-900 dark:text-zinc-50">
            {formattedUsdc}
          </span>
        </div>
      </div>
    </div>
  );
}
