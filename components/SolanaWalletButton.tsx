'use client';

import { useState, useEffect } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export function SolanaWalletButton() {
  const [mounted, setMounted] = useState(false);

  // Only render the wallet button after component mounts on client
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a placeholder with same dimensions to prevent layout shift
    return (
      <div className="bg-purple-600 rounded-lg h-10 px-4 flex items-center justify-center text-sm font-medium text-white">
        Select Wallet
      </div>
    );
  }

  return (
    <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700 !rounded-lg !h-10 !px-4 !text-sm !font-medium !transition-colors" />
  );
}
