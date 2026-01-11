'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import type { NetworkEnvironment, NetworkContextType } from '@/types/network';
import { getDefaultEnvironment, isMainnetEnabled } from '@/lib/config';

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [environment, setEnvironment] = useState<NetworkEnvironment>(getDefaultEnvironment());

  // Wrapper to enforce mainnet availability
  const setEnvironmentSafe = (env: NetworkEnvironment) => {
    // If mainnet is disabled and someone tries to set it to mainnet, force testnet
    if (env === 'mainnet' && !isMainnetEnabled()) {
      console.warn('Mainnet is disabled. Staying on testnet.');
      return;
    }
    setEnvironment(env);
  };

  return (
    <NetworkContext.Provider value={{ environment, setEnvironment: setEnvironmentSafe }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
}
