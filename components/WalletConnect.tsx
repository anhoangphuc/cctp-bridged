'use client';

import { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export function WalletConnect() {
  const [mounted, setMounted] = useState(false);

  // Only render the wallet button after component mounts on client
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a placeholder with same dimensions to prevent layout shift
    return (
      <div className="bg-blue-600 rounded-lg h-10 px-4 flex items-center justify-center text-sm font-medium text-white">
        Connect Wallet
      </div>
    );
  }

  return (
    <ConnectButton
      showBalance={false}
      chainStatus="icon"
    />
  );
}
