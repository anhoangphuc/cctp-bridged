'use client';

import { WagmiProvider as WagmiProviderBase } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { ReactNode, useMemo } from 'react';
import { mainnetConfig, testnetConfig } from '@/lib/wagmi/config';
import { useNetwork } from '@/lib/context/NetworkContext';
import '@rainbow-me/rainbowkit/styles.css';

// Create a stable QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function WagmiProvider({ children }: { children: ReactNode }) {
  const { environment } = useNetwork();

  // Switch config based on environment
  const config = useMemo(() => {
    return environment === 'mainnet' ? mainnetConfig : testnetConfig;
  }, [environment]);

  return (
    <WagmiProviderBase key={environment} config={config} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProviderBase>
  );
}
