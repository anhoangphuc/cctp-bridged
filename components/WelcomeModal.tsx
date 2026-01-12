'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    // Check if user has dismissed the modal permanently
    const dismissed = localStorage.getItem('welcomeModalDismissed');
    if (!dismissed) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('welcomeModalDismissed', 'true');
    }
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Close"
          >
            <svg
              className="w-5 h-5 text-zinc-500 dark:text-zinc-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Content */}
          <div className="space-y-6">
            {/* Welcome icon */}
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>

            {/* Title */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
                Welcome to CCTP Bridge! 🌉
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400">
                Bridge USDC seamlessly across multiple blockchain networks
              </p>
            </div>

            {/* Description */}
            <div className="space-y-3">
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                Transfer USDC between Ethereum, Polygon, Arbitrum, Optimism, Base, and Solana using Circle's official CCTP protocol.
              </p>
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>New to bridging?</strong> We've created a comprehensive tutorial to help you get started!
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Link
                href="/tutorial"
                className="block w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-center font-semibold rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
                onClick={handleClose}
              >
                View Tutorial →
              </Link>
              <button
                onClick={handleClose}
                className="w-full px-6 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 font-medium rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Start Bridging Now
              </button>
            </div>

            {/* Don't show again checkbox */}
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 cursor-pointer"
                />
                <span className="text-sm text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200 transition-colors">
                  Don't show this again
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
