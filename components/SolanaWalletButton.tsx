'use client';

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export function SolanaWalletButton() {
  return (
    <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700 !rounded-lg !h-10 !px-4 !text-sm !font-medium !transition-colors" />
  );
}
