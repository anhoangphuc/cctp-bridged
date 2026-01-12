export default function TutorialPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
            USDC Bridge Tutorial
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            This tutorial will guide you through bridging USDC across different blockchain networks using Circle's Cross-Chain Transfer Protocol (CCTP).
          </p>
          <div className="mt-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              📍 <strong>Deployed at:</strong>{' '}
              <a href="https://cctp-bridged.vercel.app/" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-700 dark:hover:text-blue-300">
                https://cctp-bridged.vercel.app/
              </a>
            </p>
            <p className="text-sm text-blue-900 dark:text-blue-100 mt-2">
              💻 <strong>Source code:</strong>{' '}
              <a href="https://github.com/anhoangphuc/cctp-bridged" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-700 dark:hover:text-blue-300">
                https://github.com/anhoangphuc/cctp-bridged
              </a>
            </p>
          </div>
        </div>

        {/* Table of Contents */}
        <nav className="mb-12 p-6 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">Table of Contents</h2>
          <ol className="space-y-2 text-zinc-700 dark:text-zinc-300">
            <li><a href="#what-is-bridging" className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline">1. What is USDC Bridging?</a></li>
            <li><a href="#prerequisites" className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline">2. Prerequisites</a></li>
            <li><a href="#getting-started" className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline">3. Getting Started</a></li>
            <li><a href="#understanding-process" className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline">4. Understanding the Bridge Process</a></li>
            <li><a href="#evm-to-evm" className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline">5. Bridge from EVM to EVM</a></li>
            <li><a href="#evm-to-solana" className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline">6. Bridge from EVM to Solana</a></li>
            <li><a href="#solana-to-evm" className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline">7. Bridge from Solana to EVM</a></li>
            <li><a href="#understanding-fees" className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline">8. Understanding Fees</a></li>
            <li><a href="#troubleshooting" className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline">9. Troubleshooting</a></li>
            <li><a href="#faq" className="hover:text-blue-600 dark:hover:text-blue-400 hover:underline">10. FAQ</a></li>
          </ol>
        </nav>

        {/* Content Sections */}
        <div className="prose prose-zinc dark:prose-invert max-w-none">

          {/* What is USDC Bridging */}
          <section id="what-is-bridging" className="mb-12 scroll-mt-8">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">What is USDC Bridging?</h2>
            <p className="text-zinc-700 dark:text-zinc-300 mb-4">
              USDC bridging allows you to transfer USDC tokens from one blockchain network to another. Unlike traditional bridges that lock tokens, CCTP <strong>burns</strong> USDC on the source chain and <strong>mints</strong> an equivalent amount on the destination chain, ensuring the USDC remains native and fully backed.
              The platform currently supports only testnet mode. For mainnet, you can pull your code and run yourself. 
            </p>

            <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mt-6 mb-3">Supported Networks</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">Mainnet</h4>
                <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
                  <li>• Ethereum</li>
                  <li>• Polygon</li>
                  <li>• Arbitrum</li>
                  <li>• Optimism</li>
                  <li>• Base</li>
                  <li>• Solana</li>
                </ul>
              </div>
              <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">Testnet (for testing)</h4>
                <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
                  <li>• Sepolia (Ethereum)</li>
                  <li>• Amoy (Polygon)</li>
                  <li>• Arbitrum Sepolia</li>
                  <li>• Optimism Sepolia</li>
                  <li>• Base Sepolia</li>
                  <li>• Solana Devnet</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Prerequisites */}
          <section id="prerequisites" className="mb-12 scroll-mt-8">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">Prerequisites</h2>

            <div className="space-y-6">
              <div className="p-6 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-3">1. Crypto Wallets</h3>
                <div className="space-y-3">
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-50 mb-1">For EVM Chains (Ethereum, Polygon, etc.):</p>
                    <ul className="text-zinc-700 dark:text-zinc-300 text-sm space-y-1 ml-4">
                      <li>• MetaMask, Rainbow, Coinbase Wallet, or any EVM-compatible wallet</li>
                      <li>• Some native tokens (ETH, MATIC, etc.) for gas fees</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-50 mb-1">For Solana:</p>
                    <ul className="text-zinc-700 dark:text-zinc-300 text-sm space-y-1 ml-4">
                      <li>• Phantom, Solflare, or Backpack wallet</li>
                      <li>• Some SOL for transaction fees</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-3">2. USDC Tokens</h3>
                <p className="text-zinc-700 dark:text-zinc-300 text-sm">
                  You need USDC on the source chain you're bridging from
                </p>
              </div>

              <div className="p-6 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-3">3. Gas/Transaction Fees</h3>
                <ul className="text-zinc-700 dark:text-zinc-300 text-sm space-y-1 ml-4">
                  <li>• <strong>EVM chains:</strong> Native token (ETH, MATIC, etc.)</li>
                  <li>• <strong>Solana:</strong> SOL</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Getting Started */}
          <section id="getting-started" className="mb-12 scroll-mt-8">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">Getting Started</h2>

            <div className="space-y-4">
              <div className="p-6 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">Step 1: Connect Your Wallets</h3>
                <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-2 ml-4">
                  <li><strong>1. Open the Bridge Application</strong> - Navigate to the bridge website</li>
                  <li><strong>2. Connect EVM Wallet</strong> (Blue button) - Click "Connect Wallet" and select your wallet</li>
                  <li><strong>3. Connect Solana Wallet</strong> (Purple button) - Click "Select Wallet" and choose your Solana wallet</li>
                  <li><strong>4. Select Network Mode</strong> - Choose "Testnet" for testing or "Mainnet" for real transfers</li>
                </ol>
                <p className="text-sm text-blue-900 dark:text-blue-100 mt-4">✅ <strong>You're ready!</strong> You'll now see your wallet balances displayed.</p>
              </div>
            </div>
          </section>

          {/* Understanding the Bridge Process */}
          <section id="understanding-process" className="mb-12 scroll-mt-8">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">Understanding the Bridge Process</h2>

            <div className="mb-8 p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
              <p className="text-purple-900 dark:text-purple-100">
                Before you start bridging, let's understand what happens in each step.
              </p>
            </div>

            {/* EVM 4 Steps */}
            <h3 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">For EVM Chains (4 Steps)</h3>

            <div className="space-y-6 mb-8">
              {/* Step 1: Approve */}
              <div className="p-6 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🔓</span>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">Step 1: Approve</h4>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-2"><strong>What it does:</strong> Gives permission to the bridge contract to spend your USDC</p>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-2"><strong>Why it's needed:</strong> Smart contracts on EVM chains need explicit permission to move tokens from your wallet. This is a security feature.</p>
                    <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
                      <p>⏱️ <strong>Time:</strong> ~15-60 seconds</p>
                      <p>💰 <strong>Gas cost:</strong> Low (~$0.10-$2)</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Deposit */}
              <div className="p-6 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🔥</span>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">Step 2: Deposit</h4>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-2"><strong>What it does:</strong> Burns your USDC on the source chain</p>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-2"><strong>Why it's needed:</strong> CCTP works by destroying USDC on the source chain and creating fresh USDC on the destination chain. This maintains 1:1 backing.</p>
                    <div className="mt-3 p-3 rounded bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                      <p className="text-xs text-yellow-900 dark:text-yellow-100">⚠️ <strong>Important:</strong> After this step, your USDC is burned. You must complete the remaining steps to receive it on the destination chain.</p>
                    </div>
                    <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
                      <p>⏱️ <strong>Time:</strong> ~30 seconds - 2 minutes</p>
                      <p>💰 <strong>Gas cost:</strong> Medium (~$0.20-$5)</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3: Fetch Attestation */}
              <div className="p-6 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">📝</span>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">Step 3: Fetch Attestation</h4>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-2"><strong>What it does:</strong> Gets a cryptographic proof from Circle's attestation service</p>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-2"><strong>Why it's needed:</strong> The destination chain needs proof that USDC was actually burned on the source chain.</p>
                    <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
                      <p>⏱️ <strong>Time:</strong> ~1-3 minutes</p>
                      <p>💰 <strong>Gas cost:</strong> None (read operation)</p>
                      <p>💡 <strong>Note:</strong> No wallet interaction needed. The app handles this automatically.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 4: Claim */}
              <div className="p-6 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🎉</span>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">Step 4: Claim</h4>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-2"><strong>What it does:</strong> Mints fresh USDC on the destination chain</p>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-2"><strong>Why it's needed:</strong> This is the final step where you receive your USDC on the destination chain.</p>
                    <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
                      <p>⏱️ <strong>Time:</strong> ~30 seconds - 2 minutes</p>
                      <p>💰 <strong>Gas cost:</strong> Medium (~$0.20-$5)</p>
                      <p>✅ <strong>Success:</strong> You now have USDC on the destination chain!</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Solana 3 Steps */}
            <h3 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">For Solana (3 Steps)</h3>
            <p className="text-zinc-700 dark:text-zinc-300 mb-4">
              When bridging from Solana, there are only <strong>3 steps</strong> (no approval needed because Solana uses a different token model).
            </p>

            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                <p className="text-sm text-purple-900 dark:text-purple-100">
                  <strong>Step 1:</strong> Deposit 🔥 (Burns USDC on Solana)<br/>
                  <strong>Step 2:</strong> Fetch Attestation 📝 (Gets Circle's proof)<br/>
                  <strong>Step 3:</strong> Claim 🎉 (Mints USDC on destination)
                </p>
              </div>
            </div>

            {/* Key Takeaways */}
            <div className="mt-8 p-6 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <h4 className="font-semibold text-green-900 dark:text-green-100 mb-3">Key Takeaways</h4>
              <ul className="text-sm text-green-800 dark:text-green-200 space-y-2">
                <li>✅ <strong>Your funds are safe at every step</strong> - The bridge process is atomic (all or nothing)</li>
                <li>✅ <strong>Burnt ≠ Lost</strong> - Burning on source = Minting on destination</li>
                <li>✅ <strong>Attestation is the key</strong> - Circle's signature proves the burn happened</li>
                <li>✅ <strong>No intermediate tokens</strong> - You get native USDC, not wrapped versions</li>
                <li>✅ <strong>Each step must complete</strong> - Don't close the page until all steps are done</li>
              </ul>
            </div>
          </section>

          {/* EVM to EVM */}
          <section id="evm-to-evm" className="mb-12 scroll-mt-8">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">Bridge from EVM to EVM</h2>
            <p className="text-zinc-700 dark:text-zinc-300 mb-6">Transfer USDC between Ethereum-compatible chains (e.g., Ethereum → Polygon)</p>

            <div className="space-y-6">
              <div className="p-6 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-3">Step 1: Select Source Chain</h3>
                <p className="text-sm text-zinc-700 dark:text-zinc-300">Look for the bridge card showing your connected EVM chain. You'll see your balances displayed.</p>
              </div>

              <div className="p-6 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-3">Step 2: Choose Destination</h3>
                <ol className="text-sm text-zinc-700 dark:text-zinc-300 space-y-2 ml-4">
                  <li>1. Click the dropdown menu in the Destination column</li>
                  <li>2. Select the destination EVM chain</li>
                  <li>3. You'll see the recipient address (your connected wallet address)</li>
                </ol>
              </div>

              <div className="p-6 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-3">Step 3: Enter Amount</h3>
                <ol className="text-sm text-zinc-700 dark:text-zinc-300 space-y-2 ml-4">
                  <li>1. Type the amount of USDC you want to bridge</li>
                  <li>2. Or click <strong>MAX</strong> to bridge your entire balance</li>
                  <li>3. The <strong>Fast Transfer Fee</strong> will appear (typically 0.1-0.5 USDC)</li>
                </ol>
              </div>

              <div className="p-6 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-3">Step 4: Execute Bridge (4 Steps)</h3>
                <ol className="text-sm text-zinc-700 dark:text-zinc-300 space-y-3 ml-4">
                  <li><strong>1. Approve</strong> - Click Approve button → Confirm in wallet → Wait for confirmation</li>
                  <li><strong>2. Deposit</strong> - Click Deposit button → Confirm in wallet → Wait for confirmation</li>
                  <li><strong>3. Fetch Attestation</strong> - Click button → Wait ~1-2 minutes (automatic)</li>
                  <li><strong>4. Claim</strong> - Click Claim → Wallet switches networks → Confirm → Done! 🎉</li>
                </ol>
              </div>

              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-900 dark:text-green-100">
                  ✅ <strong>Done!</strong> Your USDC is now on the destination chain. Click <strong>+ New Bridge</strong> to bridge more.
                </p>
              </div>
            </div>
          </section>

          {/* EVM to Solana */}
          <section id="evm-to-solana" className="mb-12 scroll-mt-8">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">Bridge from EVM to Solana</h2>
            <p className="text-zinc-700 dark:text-zinc-300 mb-4">Transfer USDC from any EVM chain to Solana</p>

            <div className="mb-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Prerequisites</h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>✓ Connect both your EVM and Solana wallets</li>
                <li>✓ Have USDC on an EVM chain</li>
                <li>✓ Have ETH/MATIC/etc. for gas fees</li>
                <li>✓ Have SOL for claiming on Solana</li>
              </ul>
            </div>

            <p className="text-zinc-700 dark:text-zinc-300">
              Follow the same process as <a href="#evm-to-evm" className="text-blue-600 dark:text-blue-400 hover:underline">EVM to EVM</a>, but select <strong>"Solana"</strong> (or "Solana Devnet") as your destination. The recipient will be your Solana wallet address, and in Step 4 (Claim), you'll sign with your Solana wallet instead of switching networks.
            </p>
          </section>

          {/* Solana to EVM */}
          <section id="solana-to-evm" className="mb-12 scroll-mt-8">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">Bridge from Solana to EVM</h2>
            <p className="text-zinc-700 dark:text-zinc-300 mb-4">Transfer USDC from Solana to any EVM chain</p>

            <div className="mb-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Prerequisites</h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>✓ Connect both your Solana and EVM wallets</li>
                <li>✓ Have USDC on Solana</li>
                <li>✓ Have SOL for transaction fees</li>
              </ul>
            </div>

            <p className="text-zinc-700 dark:text-zinc-300 mb-4">
              The process is similar but with <strong>3 steps</strong> instead of 4 (no approval needed):
            </p>

            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  <strong>Step 1: Deposit</strong> 🔥 - Click Deposit → Confirm in Solana wallet → Wait for confirmation<br/>
                  <strong>Step 2: Fetch Attestation</strong> 📝 - Click button → Wait ~1-2 minutes<br/>
                  <strong>Step 3: Claim</strong> 🎉 - Wallet switches to destination EVM chain → Confirm → Done!
                </p>
              </div>
            </div>
          </section>

          {/* Understanding Fees */}
          <section id="understanding-fees" className="mb-12 scroll-mt-8">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">Understanding Fees</h2>

            <div className="space-y-6">
              <div className="p-6 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-3">Fast Transfer Fee</h3>
                <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-2">
                  <li><strong>What it is:</strong> A fee paid to Circle's CCTP Protocol for fast attestation</li>
                  <li><strong>Amount:</strong> Typically 0.1-0.5 USDC (varies by network and amount)</li>
                  <li><strong>Who receives it:</strong> Circle (not us - we don't charge any fees)</li>
                  <li><strong>Why required:</strong> Ensures fast and reliable cross-chain transfers</li>
                </ul>
              </div>

              <div className="p-6 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-3">Gas Fees</h3>
                <div className="space-y-3">
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-50 mb-2">EVM Chains (in native tokens like ETH, MATIC):</p>
                    <ul className="text-sm text-zinc-700 dark:text-zinc-300 space-y-1 ml-4">
                      <li>• Approve: ~$0.10-$2</li>
                      <li>• Deposit: ~$0.20-$5</li>
                      <li>• Claim: ~$0.20-$5</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900 dark:text-zinc-50 mb-2">Solana (in SOL):</p>
                    <ul className="text-sm text-zinc-700 dark:text-zinc-300 space-y-1 ml-4">
                      <li>• Deposit: ~0.001 SOL (~$0.10)</li>
                      <li>• Claim: ~0.001 SOL (~$0.10)</li>
                    </ul>
                  </div>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-4">
                  💡 <strong>Tip:</strong> Gas fees vary by network congestion. Use testnets for practice!
                </p>
              </div>
            </div>
          </section>

          {/* Troubleshooting */}
          <section id="troubleshooting" className="mb-12 scroll-mt-8">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">Troubleshooting</h2>

            <div className="space-y-4">
              <details className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                <summary className="font-semibold text-zinc-900 dark:text-zinc-50 cursor-pointer">❌ "Insufficient balance" Error</summary>
                <div className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
                  <p><strong>Problem:</strong> Not enough USDC or gas tokens</p>
                  <p className="mt-2"><strong>Solution:</strong></p>
                  <ul className="ml-4 space-y-1">
                    <li>• Check your USDC balance</li>
                    <li>• Ensure you have enough native tokens for gas fees</li>
                    <li>• On testnet, get tokens from faucets (see FAQ)</li>
                  </ul>
                </div>
              </details>

              <details className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                <summary className="font-semibold text-zinc-900 dark:text-zinc-50 cursor-pointer">❌ Transaction Stuck on "Processing"</summary>
                <div className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
                  <p><strong>Problem:</strong> Network congestion or RPC issues</p>
                  <p className="mt-2"><strong>Solution:</strong></p>
                  <ul className="ml-4 space-y-1">
                    <li>• Wait 5-10 minutes</li>
                    <li>• Check transaction status on blockchain explorer</li>
                    <li>• If failed, click + New Bridge and try again</li>
                  </ul>
                </div>
              </details>

              <details className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                <summary className="font-semibold text-zinc-900 dark:text-zinc-50 cursor-pointer">❌ Wallet Not Connecting</summary>
                <div className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
                  <p><strong>Problem:</strong> Wallet extension not detected or locked</p>
                  <p className="mt-2"><strong>Solution:</strong></p>
                  <ul className="ml-4 space-y-1">
                    <li>• Refresh the page</li>
                    <li>• Unlock your wallet</li>
                    <li>• Try a different browser</li>
                    <li>• Disable conflicting extensions</li>
                  </ul>
                </div>
              </details>

              <details className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                <summary className="font-semibold text-zinc-900 dark:text-zinc-50 cursor-pointer">❌ Attestation Taking Too Long</summary>
                <div className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
                  <p><strong>Problem:</strong> Circle's attestation service may be delayed</p>
                  <p className="mt-2"><strong>Solution:</strong></p>
                  <ul className="ml-4 space-y-1">
                    <li>• Wait up to 5 minutes</li>
                    <li>• The system retries automatically</li>
                    <li>• If error appears, verify your deposit transaction succeeded first</li>
                  </ul>
                </div>
              </details>
            </div>
          </section>

          {/* FAQ */}
          <section id="faq" className="mb-12 scroll-mt-8">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">Frequently Asked Questions</h2>

            <div className="space-y-4">
              <details className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                <summary className="font-semibold text-zinc-900 dark:text-zinc-50 cursor-pointer">How long does bridging take?</summary>
                <div className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
                  <ul className="space-y-1">
                    <li>• <strong>Total time:</strong> 5 minutes</li>
                    <li>• <strong>Deposit:</strong> 30 seconds - 2 minutes</li>
                    <li>• <strong>Attestation:</strong> 1-3 minutes</li>
                    <li>• <strong>Claim:</strong> 30 seconds - 2 minutes</li>
                  </ul>
                </div>
              </details>

              <details className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                <summary className="font-semibold text-zinc-900 dark:text-zinc-50 cursor-pointer">Is this safe?</summary>
                <div className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
                  <p className="mb-2">Yes! This bridge uses Circle's official CCTP protocol:</p>
                  <ul className="space-y-1">
                    <li>✅ No wrapped tokens</li>
                    <li>✅ Native USDC on both sides</li>
                    <li>✅ Audited smart contracts</li>
                    <li>✅ Used by major protocols</li>
                  </ul>
                </div>
              </details>

              <details className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                <summary className="font-semibold text-zinc-900 dark:text-zinc-50 cursor-pointer">Where can I get testnet tokens?</summary>
                <div className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
                  <p className="font-medium mb-2">Testnet USDC Faucets:</p>
                  <ul className="ml-4 space-y-1 mb-3">
                    <li>• Circle Faucet: <a href="https://faucet.circle.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">https://faucet.circle.com/</a></li>
                    <li>• Use after getting testnet ETH/SOL</li>
                  </ul>
                  <p className="font-medium mb-2">Testnet Native Tokens:</p>
                  <ul className="ml-4 space-y-1">
                    <li>• Sepolia ETH: <a href="https://sepoliafaucet.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">https://sepoliafaucet.com/</a></li>
                    <li>• Polygon Amoy: <a href="https://faucet.polygon.technology/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">https://faucet.polygon.technology/</a></li>
                    <li>• Solana Devnet: Use <code className="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800">solana airdrop 1</code> with Solana CLI</li>
                  </ul>
                </div>
              </details>

              <details className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                <summary className="font-semibold text-zinc-900 dark:text-zinc-50 cursor-pointer">Why do I need both wallets connected?</summary>
                <div className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
                  <ul className="space-y-1">
                    <li>• <strong>EVM to Solana:</strong> Need Solana wallet to receive USDC</li>
                    <li>• <strong>Solana to EVM:</strong> Need EVM wallet to receive USDC</li>
                    <li>• Both must be connected before bridging</li>
                  </ul>
                </div>
              </details>

              <details className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                <summary className="font-semibold text-zinc-900 dark:text-zinc-50 cursor-pointer">Can I bridge to a different wallet address?</summary>
                <div className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
                  <p>Currently, the bridge sends USDC to your connected wallet address on the destination chain. Support for custom recipient addresses may be added in the future.</p>
                </div>
              </details>
            </div>
          </section>

          {/* Tips for Success */}
          <section className="mb-12">
            <div className="p-6 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800">
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">Tips for Success</h3>
              <ul className="text-zinc-700 dark:text-zinc-300 space-y-2">
                <li>✅ <strong>Always test on testnet first</strong> before using mainnet</li>
                <li>✅ <strong>Keep some gas tokens</strong> in your wallet for future transactions</li>
                <li>✅ <strong>Double-check recipient address</strong> before confirming</li>
                <li>✅ <strong>Wait for confirmations</strong> - don't refresh during transactions</li>
                <li>✅ <strong>Use the refresh button</strong> to update balances after bridging</li>
                <li>✅ <strong>Start with small amounts</strong> until you're comfortable with the process</li>
              </ul>
            </div>
          </section>

          {/* Final CTA */}
          <div className="text-center p-8 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <h3 className="text-2xl font-bold mb-3">Happy Bridging! 🌉</h3>
            <p className="mb-4">Need to bridge more USDC? Just click <strong>+ New Bridge</strong> and repeat the process!</p>
            <a
              href="/"
              className="inline-block px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
            >
              Start Bridging Now →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
