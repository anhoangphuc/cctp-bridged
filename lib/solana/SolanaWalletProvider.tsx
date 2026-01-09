'use client';

import { useMemo, createContext, useContext, ReactNode } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { Connection } from '@solana/web3.js';
import { useNetwork } from '@/lib/context/NetworkContext';

// Import Solana wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

/**
 * Custom fetch function that routes through our API proxy
 */
function createProxyFetch(network: 'mainnet' | 'devnet') {
  return async (url: string, options?: RequestInit): Promise<Response> => {
    const body = options?.body;

    // Proxy the request through our API
    const response = await fetch(`/api/solana-rpc?network=${network}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    });

    return response;
  };
}

// Create a context for our custom connection
const CustomConnectionContext = createContext<Connection | null>(null);

export function useCustomConnection() {
  const connection = useContext(CustomConnectionContext);
  if (!connection) {
    throw new Error('useCustomConnection must be used within SolanaWalletProvider');
  }
  return connection;
}

export function SolanaWalletProvider({ children }: { children: React.ReactNode }) {
  const { environment } = useNetwork();
  const network = environment === 'mainnet' ? 'mainnet' : 'devnet';

  // Create a custom connection that uses our proxy
  const customConnection = useMemo(() => {
    // Use a dummy URL, the actual requests will go through our proxy
    const conn = new Connection(`https://proxy-${network}`, {
      // @ts-ignore - Override fetch to use our proxy
      fetch: createProxyFetch(network),
    });
    return conn;
  }, [network]);

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  // Use dummy endpoint string for ConnectionProvider, actual connection from context
  const endpoint = `https://proxy-${network}`;

  return (
    <CustomConnectionContext.Provider value={customConnection}>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            {children}
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </CustomConnectionContext.Provider>
  );
}
