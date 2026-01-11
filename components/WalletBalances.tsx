'use client';

import { useAccount } from 'wagmi';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNetwork } from '@/lib/context/NetworkContext';
import { mainnetChains, testnetChains } from '@/lib/wagmi/config';
import { EVMBridgeCard, SolanaBridgeCard } from '@/components/bridge';

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
          <EVMBridgeCard
            key={chain.id}
            chain={chain}
            address={evmAddress}
            availableChains={chains.filter(c => c.id !== chain.id)}
          />
        ))}

        {/* Show Solana balance only if Solana wallet is connected */}
        {isSolanaConnected && solanaPublicKey && (
          <SolanaBridgeCard
            publicKey={solanaPublicKey}
            environment={environment}
          />
        )}
      </div>
    </div>
  );
}
