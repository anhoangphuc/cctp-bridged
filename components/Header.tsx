'use client';

import { useState, useRef, useEffect } from 'react';
import { useNetwork } from '@/lib/context/NetworkContext';
import { WalletConnect } from '@/components/WalletConnect';
import { SolanaWalletButton } from '@/components/SolanaWalletButton';
import { isMainnetEnabled } from '@/lib/config';
import type { NetworkEnvironment } from '@/types/network';

export function Header() {
  const { environment, setEnvironment } = useNetwork();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mainnetEnabled = isMainnetEnabled();

  const handleSelect = (env: NetworkEnvironment) => {
    setEnvironment(env);
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="w-full border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Title */}
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              CCTP Bridge
            </h1>
          </div>

          {/* Right Side: Network Switcher + Wallet Connect */}
          <div className="flex items-center gap-4">
            {/* Network Environment Switcher - Only show if mainnet is enabled */}
            {mainnetEnabled ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
                >
                  <span className="capitalize">{environment}</span>
                  <svg
                    className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {isOpen && (
                  <div className="absolute right-0 mt-2 w-40 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg overflow-hidden z-50">
                    <button
                      onClick={() => handleSelect('mainnet')}
                      className={`w-full px-4 py-2.5 text-left text-sm font-medium transition-colors ${
                        environment === 'mainnet'
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                          : 'text-zinc-900 dark:text-zinc-50 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                      }`}
                    >
                      Mainnet
                    </button>
                    <button
                      onClick={() => handleSelect('testnet')}
                      className={`w-full px-4 py-2.5 text-left text-sm font-medium transition-colors ${
                        environment === 'testnet'
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                          : 'text-zinc-900 dark:text-zinc-50 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                      }`}
                    >
                      Testnet
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // Show static badge when mainnet is disabled (testnet only mode)
              <div className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50 capitalize">
                  {environment}
                </span>
              </div>
            )}

            {/* Wallet Connect Buttons */}
            <div className="flex items-center gap-3">
              <WalletConnect />
              <SolanaWalletButton />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
