'use client';

import { useState, useEffect } from 'react';
import { useAccount, useBalance, useReadContract, useWriteContract, usePublicClient, useSwitchChain } from 'wagmi';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { useNetwork } from '@/lib/context/NetworkContext';
import { USDC_ADDRESSES, USDC_DECIMALS, ERC20_ABI, TOKEN_MESSENGER_ADDRESSES, APPROVE_EVM_ABI, TOKEN_MESSENGER_V2_EVM_ABI, MESSAGE_TRANSMITTER_V2_EVM_ABI, MESSAGE_TRANSMITTER_ADDRESS, CHAIN_DOMAINS } from '@/constants/tokens';
import { formatUnits, parseUnits, parseAbi, pad } from 'viem';
import { type Chain } from 'wagmi/chains';
import { fetchCCTPFee, fetchCCTPAttestation } from '@/lib/cctp/api';
import { evmAddressToBytes32, getDepositForBurnPdas, getProgramsV2, getUSDCBalance as getSolanaUSDCBalance, getReceiveMessagePdas, hexToBytes, decodeEventNonceFromMessageV2 } from '@/lib/solana/cctp';
import { useCustomConnection } from '@/lib/solana/SolanaWalletProvider';
import { getSolanaUSDCMint } from '@/constants/solana';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { BridgeStepButton } from './BridgeStepButton';

type StepStatus = 'pending' | 'processing' | 'success' | 'error';

interface StepState {
  status: StepStatus;
  txHash?: string;
  error?: string;
  attestation?: string;
  messageHash?: string;
}

interface EVMBridgeCardProps {
  chain: Chain;
  address: `0x${string}`;
  availableChains: readonly Chain[];
}

/**
 * EVM Bridge Card Component
 * Handles bridging from EVM chains to EVM or Solana
 */
export function EVMBridgeCard({
  chain,
  address,
  availableChains,
}: EVMBridgeCardProps) {
  const { environment } = useNetwork();
  const connection = useCustomConnection();
  const { publicKey: solanaPublicKey, sendTransaction: solanaSendTransaction } = useWallet();
  const [destinationChainId, setDestinationChainId] = useState<number | 'solana' | null>(null);
  const [amount, setAmount] = useState('');
  const [minimumFee, setMinimumFee] = useState<string>('0');
  const [steps, setSteps] = useState<Record<string, StepState>>({
    approve: { status: 'pending' },
    deposit: { status: 'pending' },
    fetchAttestation: { status: 'pending' },
    claim: { status: 'pending' },
  });

  // Wagmi hooks for transactions
  const { writeContractAsync: writeApprove } = useWriteContract();
  const { writeContractAsync: writeDeposit } = useWriteContract();
  const { writeContractAsync: writeClaim } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  const { chain: currentChain } = useAccount();

  // Get public client for source chain (this one)
  const sourcePublicClient = usePublicClient({ chainId: chain.id });

  // Get public client for destination chain (only for EVM destinations)
  const destinationPublicClient = usePublicClient({
    chainId: typeof destinationChainId === 'number' ? destinationChainId : undefined
  });

  // Fetch ETH balance
  const { data: ethBalance, refetch: refetchEth } = useBalance({
    address,
    chainId: chain.id,
    query: {
      enabled: true,
      refetchInterval: false,
    }
  });

  // Fetch USDC balance
  const { data: usdcBalance, refetch: refetchUsdc } = useReadContract({
    address: USDC_ADDRESSES[chain.id as keyof typeof USDC_ADDRESSES] as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
    chainId: chain.id,
    query: {
      enabled: true,
      refetchInterval: false,
    }
  });

  // Refetch balances when environment changes (mainnet/testnet switch)
  useEffect(() => {
    const timer = setTimeout(() => {
      refetchEth();
      refetchUsdc();
    }, 100);
    return () => clearTimeout(timer);
  }, [environment, refetchEth, refetchUsdc]);

  const formattedEth = ethBalance ? parseFloat(formatUnits(ethBalance.value, 18)).toFixed(4) : '0.0000';
  const formattedUsdc = usdcBalance ? parseFloat(formatUnits(usdcBalance as bigint, USDC_DECIMALS)).toFixed(2) : '0.00';
  const usdcBalanceNumber = usdcBalance ? parseFloat(formatUnits(usdcBalance as bigint, USDC_DECIMALS)) : 0;

  const handleMaxClick = () => {
    setAmount(usdcBalanceNumber.toString());
  };

  const handleNewBridge = () => {
    // Reset all states
    setDestinationChainId(null);
    setAmount('');
    setMinimumFee('0');
    setSteps({
      approve: { status: 'pending' },
      deposit: { status: 'pending' },
      fetchAttestation: { status: 'pending' },
      claim: { status: 'pending' },
    });
  };

  const destinationChain = availableChains.find(c => c.id === destinationChainId);
  const isSolanaDestination = destinationChainId === 'solana';

  // Fetch minimum fee when destination chain or amount changes
  useEffect(() => {
    const fetchFee = async () => {
      if (!destinationChainId || !amount || parseFloat(amount) <= 0) {
        setMinimumFee('0');
        return;
      }

      try {
        const amountInWei = parseUnits(amount, USDC_DECIMALS);
        const sourceDomain = CHAIN_DOMAINS[chain.id as keyof typeof CHAIN_DOMAINS];
        // Solana domain is 5
        const destinationDomain = isSolanaDestination
          ? 5
          : CHAIN_DOMAINS[destinationChainId as keyof typeof CHAIN_DOMAINS];

        const { fee } = await fetchCCTPFee(
          environment,
          sourceDomain,
          destinationDomain,
          amountInWei,
          1000 // Target finality threshold for fast transfer
        );

        // Convert fee to USDC display format
        const feeInUsdc = formatUnits(fee, USDC_DECIMALS);
        setMinimumFee(parseFloat(feeInUsdc).toFixed(6));
      } catch (error) {
        console.error('Failed to fetch fee:', error);
        setMinimumFee('0');
      }
    };

    fetchFee();
  }, [destinationChainId, amount, chain.id, environment, isSolanaDestination]);

  // Handler for Approve step
  const handleApprove = async () => {
    if (!destinationChainId || !amount) return;

    try {
      // Check if wallet is on the correct network (source chain)
      if (currentChain?.id !== chain.id) {
        console.log('Switching network to source chain:', chain.id);

        // Prompt user to switch to source network
        await switchChainAsync({ chainId: chain.id });

        // Wait longer for the network switch to complete and wagmi to update
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      const tokenMessengerAddress = TOKEN_MESSENGER_ADDRESSES[chain.id as keyof typeof TOKEN_MESSENGER_ADDRESSES] as `0x${string}`;
      const usdcAddress = USDC_ADDRESSES[chain.id as keyof typeof USDC_ADDRESSES] as `0x${string}`;
      const amountInWei = parseUnits(amount, USDC_DECIMALS);

      // Set to processing state
      setSteps(prev => ({ ...prev, approve: { status: 'processing' } }));

      // Submit transaction with explicit chainId
      const hash = await writeApprove({
        address: usdcAddress,
        abi: parseAbi(APPROVE_EVM_ABI),
        functionName: 'approve',
        args: [tokenMessengerAddress, amountInWei],
        chainId: chain.id,
      });

      // Store hash and continue processing
      setSteps(prev => ({ ...prev, approve: { status: 'processing', txHash: hash } }));

      // Wait for transaction confirmation on source chain
      if (!sourcePublicClient) {
        throw new Error('Source chain public client not available');
      }

      const receipt = await sourcePublicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === 'success') {
        setSteps(prev => ({ ...prev, approve: { status: 'success', txHash: hash } }));
      } else {
        setSteps(prev => ({
          ...prev,
          approve: {
            status: 'error',
            txHash: hash,
            error: 'Transaction reverted',
          },
        }));
      }
    } catch (error) {
      console.error('Approve error:', error);
      setSteps(prev => ({
        ...prev,
        approve: {
          status: 'error',
          error: error instanceof Error ? error.message : 'Approval failed',
        },
      }));
    }
  };

  // Handler for Deposit step
  const handleDeposit = async () => {
    if (!destinationChainId || !amount) return;

    // Check if Solana wallet is connected when bridging to Solana
    if (isSolanaDestination && !solanaPublicKey) {
      setSteps(prev => ({
        ...prev,
        deposit: {
          status: 'error',
          error: 'Please connect Solana wallet to bridge to Solana',
        },
      }));
      return;
    }

    try {
      // Check if wallet is on the correct network (source chain)
      if (currentChain?.id !== chain.id) {
        console.log('Switching network to source chain:', chain.id);

        // Prompt user to switch to source network
        await switchChainAsync({ chainId: chain.id });

        // Wait longer for the network switch to complete and wagmi to update
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      const tokenMessengerAddress = TOKEN_MESSENGER_ADDRESSES[chain.id as keyof typeof TOKEN_MESSENGER_ADDRESSES] as `0x${string}`;
      const usdcAddress = USDC_ADDRESSES[chain.id as keyof typeof USDC_ADDRESSES] as `0x${string}`;
      const amountInWei = parseUnits(amount, USDC_DECIMALS);
      const sourceDomain = CHAIN_DOMAINS[chain.id as keyof typeof CHAIN_DOMAINS];
      // Solana domain is 5
      const destinationDomain = isSolanaDestination
        ? 5
        : CHAIN_DOMAINS[destinationChainId as keyof typeof CHAIN_DOMAINS];

      // Convert recipient address to bytes32 (pad to 32 bytes)
      // For Solana, convert Solana public key to bytes32
      let mintRecipient: `0x${string}`;
      if (isSolanaDestination && solanaPublicKey) {
        // Convert Solana PublicKey to bytes32
        const solanaUsdcMint = getSolanaUSDCMint(environment);
        const recipientTokenAccount = await getAssociatedTokenAddress(solanaUsdcMint, solanaPublicKey, false, TOKEN_PROGRAM_ID);
        const solanaBytes = recipientTokenAccount.toBytes();
        mintRecipient = `0x${Buffer.from(solanaBytes).toString('hex')}` as `0x${string}`;
      } else {
        mintRecipient = pad(address as `0x${string}`, { size: 32 });
      }

      // Set to processing state
      setSteps(prev => ({ ...prev, deposit: { status: 'processing' } }));

      // Fetch fee from Iris API
      const { fee, finalityThreshold } = await fetchCCTPFee(
        environment,
        sourceDomain,
        destinationDomain,
        amountInWei,
        1000 // Target finality threshold
      );

      // Submit depositForBurn transaction with explicit chainId
      const hash = await writeDeposit({
        address: tokenMessengerAddress,
        abi: parseAbi(TOKEN_MESSENGER_V2_EVM_ABI),
        functionName: 'depositForBurn',
        args: [
          amountInWei,                    // amount
          destinationDomain,              // destinationDomain
          mintRecipient,                  // mintRecipient (bytes32)
          usdcAddress,                    // burnToken
          pad('0x0', { size: 32 }),       // destinationCaller (0x0 for any caller)
          fee,                            // maxFee
          finalityThreshold,              // minFinalityThreshold
        ],
        chainId: chain.id,
      });

      // Store hash and continue processing
      setSteps(prev => ({ ...prev, deposit: { status: 'processing', txHash: hash } }));

      // Wait for transaction confirmation on source chain
      if (!sourcePublicClient) {
        throw new Error('Source chain public client not available');
      }

      const receipt = await sourcePublicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === 'success') {
        setSteps(prev => ({ ...prev, deposit: { status: 'success', txHash: hash } }));
      } else {
        setSteps(prev => ({
          ...prev,
          deposit: {
            status: 'error',
            txHash: hash,
            error: 'Transaction reverted',
          },
        }));
      }
    } catch (error) {
      console.error('Deposit error:', error);
      setSteps(prev => ({
        ...prev,
        deposit: {
          status: 'error',
          error: error instanceof Error ? error.message : 'Deposit failed',
        },
      }));
    }
  };

  // Handler for Fetch Attestation step
  const handleFetchAttestation = async () => {
    if (!steps.deposit.txHash) return;

    try {
      setSteps(prev => ({ ...prev, fetchAttestation: { status: 'processing' } }));

      // Get source chain domain
      const sourceDomain = CHAIN_DOMAINS[chain.id as keyof typeof CHAIN_DOMAINS];
      const txHash = steps.deposit.txHash;

      // Fetch attestation from Circle's Iris API
      const { attestation, messageBytes } = await fetchCCTPAttestation(
        environment,
        sourceDomain,
        txHash,
        60,    // maxAttempts: Try for up to 2 minutes (60 * 2 seconds)
        2000   // pollInterval: 2 seconds
      );

      setSteps(prev => ({
        ...prev,
        fetchAttestation: {
          status: 'success',
          attestation,
          messageHash: messageBytes,
        },
      }));
    } catch (error) {
      console.error('Fetch attestation error:', error);
      setSteps(prev => ({
        ...prev,
        fetchAttestation: {
          status: 'error',
          error: error instanceof Error ? error.message : 'Fetch attestation failed',
        },
      }));
    }
  };

  // Handler for Claim step
  const handleClaim = async () => {
    if (!destinationChainId || !steps.fetchAttestation.attestation || !steps.fetchAttestation.messageHash) {
      console.error('Missing required data for claim');
      return;
    }

    // Handle Solana destination separately
    if (isSolanaDestination) {
      try {
        setSteps(prev => ({ ...prev, claim: { status: 'processing' } }));

        if (!solanaPublicKey) {
          throw new Error('Solana wallet not connected');
        }

        if (!solanaSendTransaction) {
          throw new Error('Wallet does not support sending transactions');
        }

        // Get the message bytes and attestation from fetchAttestation step
        const messageBytes = steps.fetchAttestation.messageHash as string;
        const attestation = steps.fetchAttestation.attestation as string;

        // Parse message to extract source domain and nonce
        const messageBuffer = hexToBytes(messageBytes);

        // CCTP Message format:
        // version (4 bytes) + sourceDomain (4 bytes) + destinationDomain (4 bytes) + nonce (8 bytes) + ...
        const sourceDomain = messageBuffer.readUInt32BE(4);
        const nonce = decodeEventNonceFromMessageV2(messageBytes);

        console.log('Claiming on Solana...', {
          messageBytes,
          attestation,
          recipient: solanaPublicKey.toBase58(),
          sourceDomain,
        });

        // Get programs
        const { messageTransmitterProgram, tokenMessengerMinterProgram } = await getProgramsV2(connection);

        // Get Solana USDC mint
        const solUsdcAddress = getSolanaUSDCMint(environment);

        // Get source chain USDC address (the token being burned on source chain)
        const sourceChainUsdcAddress = USDC_ADDRESSES[chain.id as keyof typeof USDC_ADDRESSES];

        // Get all required PDAs for receiveMessage
        const pdas = await getReceiveMessagePdas(
          { messageTransmitterProgram, tokenMessengerMinterProgram },
          solUsdcAddress,
          sourceChainUsdcAddress,
          sourceDomain.toString(),
          nonce
        );

        // Get or create recipient's USDC token account
        const recipientUsdcAccount = await getAssociatedTokenAddress(
          solUsdcAddress,
          solanaPublicKey,
          false,
          TOKEN_PROGRAM_ID
        );

        // Build remainingAccounts list in the correct order
        const remainingAccounts = [
          { pubkey: pdas.tokenMessengerAccount.publicKey, isSigner: false, isWritable: false },
          { pubkey: pdas.remoteTokenMessengerKey.publicKey, isSigner: false, isWritable: false },
          { pubkey: pdas.tokenMinterAccount.publicKey, isSigner: false, isWritable: true },
          { pubkey: pdas.localToken.publicKey, isSigner: false, isWritable: true },
          { pubkey: pdas.tokenPair.publicKey, isSigner: false, isWritable: false },
          { pubkey: pdas.feeRecipientTokenAccount, isSigner: false, isWritable: true },
          { pubkey: recipientUsdcAccount, isSigner: false, isWritable: true },
          { pubkey: pdas.custodyTokenAccount.publicKey, isSigner: false, isWritable: true },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: pdas.tokenMessengerEventAuthority.publicKey, isSigner: false, isWritable: false },
          { pubkey: tokenMessengerMinterProgram.programId, isSigner: false, isWritable: false },
        ];

        // Build receiveMessage instruction
        const receiveMessageInstruction = await messageTransmitterProgram.methods
          .receiveMessage({
            message: Buffer.from(messageBytes.replace("0x", ""), "hex"),
            attestation: Buffer.from(attestation.replace("0x", ""), "hex"),
          })
          .accounts({
            payer: solanaPublicKey,
            caller: solanaPublicKey,
            messageTransmitter: pdas.messageTransmitterAccount.publicKey,
            usedNonce: pdas.usedNonce,
            receiver: tokenMessengerMinterProgram.programId,
            program: messageTransmitterProgram.programId,
          })
          .remainingAccounts(remainingAccounts)
          .instruction();

        // Create and send transaction
        const transaction = new Transaction();
        transaction.add(receiveMessageInstruction);

        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = solanaPublicKey;

        const signature = await solanaSendTransaction(transaction, connection, { skipPreflight: true });

        console.log('Claim transaction submitted:', signature);

        // Store signature and continue processing
        setSteps(prev => ({ ...prev, claim: { status: 'processing', txHash: signature } }));

        // Wait for confirmation
        const startTime = Date.now();
        const timeout = 60000; // 60 seconds timeout

        while (true) {
          if (Date.now() - startTime > timeout) {
            throw new Error('Transaction confirmation timeout - please check the transaction status on Solana Explorer');
          }

          const { value: txStatus } = await connection.getSignatureStatus(signature);

          if (txStatus && (txStatus.confirmationStatus === 'confirmed' || txStatus.confirmationStatus === 'finalized')) {
            if (txStatus.err) {
              throw new Error('Transaction failed: ' + JSON.stringify(txStatus.err));
            }
            break;
          }

          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Transaction successful
        setSteps(prev => ({ ...prev, claim: { status: 'success', txHash: signature } }));

      } catch (error) {
        console.error('Claim error:', error);
        setSteps(prev => ({
          ...prev,
          claim: {
            status: 'error',
            error: error instanceof Error ? error.message : 'Claim failed',
          },
        }));
      }
      return;
    }

    // Handle EVM destination
    if (!destinationPublicClient) {
      console.error('Missing destination public client for EVM claim');
      return;
    }

    try {
      setSteps(prev => ({ ...prev, claim: { status: 'processing' } }));

      // Check if wallet is on the correct network (destination chain)
      if (typeof destinationChainId === 'number' && currentChain?.id !== destinationChainId) {
        console.log('Switching network to destination chain:', destinationChainId);

        // Prompt user to switch to destination network
        await switchChainAsync({ chainId: destinationChainId });

        // Wait a bit for the network switch to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Get MessageTransmitter address on destination chain
      const messageTransmitterAddress = MESSAGE_TRANSMITTER_ADDRESS[destinationChainId as keyof typeof MESSAGE_TRANSMITTER_ADDRESS] as `0x${string}`;

      // Get the message bytes and attestation from fetchAttestation step
      const messageBytes = steps.fetchAttestation.messageHash as `0x${string}`;
      const attestation = steps.fetchAttestation.attestation as `0x${string}`;

      console.log('Claiming on destination chain:', {
        destinationChainId,
        messageTransmitterAddress,
        messageBytes,
        attestation,
      });

      // Submit receiveMessage transaction on destination chain
      const hash = await writeClaim({
        address: messageTransmitterAddress,
        abi: parseAbi(MESSAGE_TRANSMITTER_V2_EVM_ABI),
        functionName: 'receiveMessage',
        args: [messageBytes, attestation],
        chainId: destinationChainId,
      });

      // Store hash and continue processing
      setSteps(prev => ({ ...prev, claim: { status: 'processing', txHash: hash } }));

      // Wait for transaction confirmation on destination chain
      const receipt = await destinationPublicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === 'success') {
        setSteps(prev => ({ ...prev, claim: { status: 'success', txHash: hash } }));
      } else {
        setSteps(prev => ({
          ...prev,
          claim: {
            status: 'error',
            txHash: hash,
            error: 'Transaction reverted',
          },
        }));
      }
    } catch (error) {
      console.error('Claim error:', error);
      setSteps(prev => ({
        ...prev,
        claim: {
          status: 'error',
          error: error instanceof Error ? error.message : 'Claim failed',
        },
      }));
    }
  };

  const getExplorerUrl = (chainId: number, txHash: string) => {
    const explorers: Record<number, string> = {
      // Mainnet
      1: 'https://etherscan.io/tx/',
      137: 'https://polygonscan.com/tx/',
      42161: 'https://arbiscan.io/tx/',
      10: 'https://optimistic.etherscan.io/tx/',
      8453: 'https://basescan.org/tx/',
      // Testnet
      11155111: 'https://sepolia.etherscan.io/tx/',
      80002: 'https://amoy.polygonscan.com/tx/',
      421614: 'https://sepolia.arbiscan.io/tx/',
      11155420: 'https://sepolia-optimism.etherscan.io/tx/',
      84532: 'https://sepolia.basescan.org/tx/',
    };
    return `${explorers[chainId] || 'https://etherscan.io/tx/'}${txHash}`;
  };

  const getSolanaExplorerUrl = (signature: string) => {
    const cluster = environment === 'mainnet' ? '' : '?cluster=devnet';
    return `https://solscan.io/tx/${signature}${cluster}`;
  };

  return (
    <div className="p-8 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 relative">
      {/* New Bridge button - shown only after successful claim */}
      {steps.claim.status === 'success' && (
        <button
          onClick={handleNewBridge}
          className="absolute top-4 right-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Bridge
        </button>
      )}

      {/* Three column layout */}
      <div className="grid grid-cols-3 gap-8">
        {/* Column 1: Source Network Info */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase mb-4">
            Source
          </h4>
          <div>
            <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
              {chain.name}
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-600 dark:text-zinc-400">ETH</span>
                <span className="font-mono text-zinc-900 dark:text-zinc-50 text-base">
                  {formattedEth}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-600 dark:text-zinc-400">USDC</span>
                <span className="font-mono text-zinc-900 dark:text-zinc-50 text-base">
                  {formattedUsdc}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Bridge Details */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase mb-4">
            Destination
          </h4>
          <div>
            <select
              value={destinationChainId || ''}
              onChange={(e) => {
                const value = e.target.value;
                if (value === 'solana') {
                  setDestinationChainId('solana');
                } else {
                  setDestinationChainId(Number(value) || null);
                }
              }}
              className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select network</option>
              {availableChains.map((destChain) => (
                <option key={destChain.id} value={destChain.id}>
                  {destChain.name}
                </option>
              ))}
              <option value="solana">Solana {environment === 'testnet' ? 'Devnet' : ''}</option>
            </select>
          </div>
          <div className="space-y-3">
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="USDC Amount"
                className="w-full px-4 py-2 pr-16 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 text-base font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                onClick={handleMaxClick}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
              >
                MAX
              </button>
            </div>
            {destinationChainId && amount && parseFloat(amount) > 0 && (
              <div className="flex justify-between items-center text-sm px-1">
                <div className="flex items-center gap-1 group relative">
                  <span className="text-zinc-600 dark:text-zinc-400">Fast Transfer Fee</span>
                  <svg
                    className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 cursor-help"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2.5 bg-zinc-900 dark:bg-zinc-800 text-white text-xs rounded-lg shadow-lg z-10">
                    <div className="relative">
                      This fee is required and paid to the CCTP Protocol. We don't receive any fee.
                      <div className="absolute -bottom-1 left-4 w-2 h-2 bg-zinc-900 dark:bg-zinc-800 rotate-45"></div>
                    </div>
                  </div>
                </div>
                <span className="font-mono text-zinc-900 dark:text-zinc-50">
                  {minimumFee} USDC
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Bridge Status/Action */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase mb-4">
            Action
          </h4>

          <div className="space-y-3">
            {/* Step 1: Approve */}
            <BridgeStepButton
              step="Approve"
              status={steps.approve.status}
              txHash={steps.approve.txHash}
              chainId={chain.id}
              getExplorerUrl={getExplorerUrl}
              error={steps.approve.error}
              onClick={handleApprove}
              disabled={!destinationChainId || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > usdcBalanceNumber}
            />

            {/* Step 2: Deposit */}
            <BridgeStepButton
              step="Deposit"
              status={steps.deposit.status}
              txHash={steps.deposit.txHash}
              chainId={chain.id}
              getExplorerUrl={getExplorerUrl}
              error={steps.deposit.error}
              onClick={handleDeposit}
              disabled={steps.approve.status !== 'success'}
            />

            {/* Step 3: Fetch Attestation */}
            <BridgeStepButton
              step="Fetch Attestation"
              status={steps.fetchAttestation.status}
              error={steps.fetchAttestation.error}
              onClick={handleFetchAttestation}
              disabled={steps.deposit.status !== 'success'}
            />

            {/* Step 4: Claim */}
            <BridgeStepButton
              step="Claim"
              status={steps.claim.status}
              txHash={steps.claim.txHash}
              chainId={typeof destinationChainId === 'number' ? destinationChainId : undefined}
              getExplorerUrl={isSolanaDestination && steps.claim.txHash ? () => getSolanaExplorerUrl(steps.claim.txHash!) : getExplorerUrl}
              error={steps.claim.error}
              onClick={handleClaim}
              disabled={steps.fetchAttestation.status !== 'success'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
