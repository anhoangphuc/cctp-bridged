'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import type { NetworkEnvironment, NetworkContextType } from '@/types/network';

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [environment, setEnvironment] = useState<NetworkEnvironment>('mainnet');

  return (
    <NetworkContext.Provider value={{ environment, setEnvironment }}>
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
