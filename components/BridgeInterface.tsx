'use client';

import { useState } from 'react';
import { useAccount, useBalance, useReadContract } from 'wagmi';
import { useNetwork } from '@/lib/context/NetworkContext';
import { mainnetChains, testnetChains } from '@/lib/wagmi/config';
import { USDC_ADDRESSES, USDC_DECIMALS, ERC20_ABI } from '@/constants/tokens';
import { formatUnits } from 'viem';
import type { Chain } from 'wagmi/chains';

export function BridgeInterface() {
  const { address, isConnected } = useAccount();
  const { environment } = useNetwork();
  const chains = environment === 'mainnet' ? mainnetChains : testnetChains;

  if (!isConnected || !address) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center p-12 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Connect your wallet to start bridging USDC
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-6">
        Bridge USDC on {environment === 'mainnet' ? 'Mainnet' : 'Testnet'}
      </h2>

      <div className="space-y-4">
        {chains.map((chain) => (
          <NetworkBridgeCard
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

function NetworkBridgeCard({
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
    <div className="p-6 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      {/* Header with Network Name and Balances */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {chain.name}
        </h3>
        <div className="flex gap-4 text-sm">
          <div className="text-zinc-600 dark:text-zinc-400">
            ETH: <span className="font-mono text-zinc-900 dark:text-zinc-50">{formattedEth}</span>
          </div>
          <div className="text-zinc-600 dark:text-zinc-400">
            USDC: <span className="font-mono text-zinc-900 dark:text-zinc-50">{formattedUsdc}</span>
          </div>
        </div>
      </div>

      {/* Bridge Form */}
      <div className="space-y-4">
        {/* Destination Chain Selector */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Destination
          </label>
          <select
            value={destinationChainId || ''}
            onChange={(e) => setDestinationChainId(Number(e.target.value) || null)}
            className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          >
            <option value="">Select destination network</option>
            {availableChains.map((destChain) => (
              <option key={destChain.id} value={destChain.id}>
                {destChain.name}
              </option>
            ))}
          </select>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Amount (USDC)
          </label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-2 pr-16 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
            <button
              onClick={handleMaxClick}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
            >
              MAX
            </button>
          </div>
        </div>

        {/* Bridge Button */}
        <button
          disabled={!destinationChainId || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > usdcBalanceNumber}
          className="w-full px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium text-sm transition-colors"
        >
          {!destinationChainId
            ? 'Select destination'
            : !amount || parseFloat(amount) <= 0
            ? 'Enter amount'
            : parseFloat(amount) > usdcBalanceNumber
            ? 'Insufficient balance'
            : `Bridge ${amount} USDC to ${destinationChain?.name}`
          }
        </button>
      </div>
    </div>
  );
}
