'use client';

import { useState } from 'react';
import { useAccount, useBalance, useReadContract } from 'wagmi';
import { useNetwork } from '@/lib/context/NetworkContext';
import { mainnetChains, testnetChains } from '@/lib/wagmi/config';
import { USDC_ADDRESSES, USDC_DECIMALS, ERC20_ABI } from '@/constants/tokens';
import { formatUnits } from 'viem';
import type { Chain } from 'wagmi/chains';

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
            <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-2">
              Network
            </label>
            <select
              value={destinationChainId || ''}
              onChange={(e) => setDestinationChainId(Number(e.target.value) || null)}
              className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select</option>
              {availableChains.map((destChain) => (
                <option key={destChain.id} value={destChain.id}>
                  {destChain.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-2">
              Amount
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-2.5 pr-16 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <div className="flex flex-col gap-3">
            <button
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
            {destinationChainId && amount && parseFloat(amount) > 0 && (
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                <div className="flex items-center justify-between">
                  <span>Status:</span>
                  <span className="text-zinc-900 dark:text-zinc-50">Ready</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
