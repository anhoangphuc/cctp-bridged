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
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              CCTP Bridge
            </h1>
            <div className="flex items-center gap-2">
              {/* GitHub Link */}
              <a
                href="https://github.com/anhoangphuc/cctp-bridged"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="View on GitHub"
              >
                <svg
                  className="w-5 h-5 text-zinc-700 dark:text-zinc-300"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
              {/* LinkedIn Link */}
              <a
                href="https://www.linkedin.com/in/ta-phuc-437a12185/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Connect on LinkedIn"
              >
                <svg
                  className="w-5 h-5 text-zinc-700 dark:text-zinc-300"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            </div>
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
