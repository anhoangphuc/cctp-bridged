/**
 * CCTP API utilities for interacting with Circle's Iris API
 */

interface FeeData {
  finalityThreshold: number;
  minimumFee: string;
  maxFee?: string;
}

interface AttestationMessage {
  attestation: string;
  message: string;
}

interface AttestationResponse {
  messages?: AttestationMessage[];
  error?: string;
}

/**
 * Get the Iris API URL based on environment
 */
function getIrisApiUrl(environment: 'mainnet' | 'testnet'): string {
  return environment === 'mainnet'
    ? 'https://iris-api.circle.com'
    : 'https://iris-api-sandbox.circle.com';
}

/**
 * Fetch fee data from Circle's Iris API
 * @param environment - Network environment (mainnet or testnet)
 * @param sourceDomain - Source chain domain ID
 * @param destinationDomain - Destination chain domain ID
 * @param targetFinalityThreshold - Target finality threshold (default: 1000)
 * @returns Fee in wei and finality threshold
 */
export async function fetchCCTPFee(
  environment: 'mainnet' | 'testnet',
  sourceDomain: number,
  destinationDomain: number,
  amount: bigint,
  targetFinalityThreshold: number = 1000
): Promise<{ fee: bigint; finalityThreshold: number }> {
  const apiUrl = getIrisApiUrl(environment);
  const defaultFee = BigInt(1000);

  try {
    const response = await fetch(
      `${apiUrl}/v2/burn/USDC/fees/${sourceDomain}/${destinationDomain}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    const feeData = await response.json();

    if (!Array.isArray(feeData)) {
      console.warn('Fee data is not an array, using default fee');
      return { fee: defaultFee, finalityThreshold: 0 };
    }

    // Find the fee with the target finality threshold
    const selectedFee = feeData.find(
      (f: FeeData) => f.finalityThreshold === targetFinalityThreshold
    );

    if (!selectedFee) {
      console.warn(`No fee found for finality threshold ${targetFinalityThreshold}, using default`);
      return { fee: defaultFee, finalityThreshold: 0 };
    }

    // Parse minimumFee (can be integer or float)
    const bps = parseFloat(selectedFee.minimumFee);

    // Calculate expected fee: (amount * bps / 10000)
    // For float bps, multiply by 1000 to preserve precision
    const bpsInteger = Math.floor(bps * 1000);
    const calculatedFee = (amount * BigInt(bpsInteger)) / BigInt(10000000) + BigInt(1);

    // Use the higher of default fee or calculated fee
    const fee = calculatedFee > defaultFee ? calculatedFee : defaultFee;

    return {
      fee,
      finalityThreshold: selectedFee.finalityThreshold,
    };
  } catch (error) {
    console.error('Failed to fetch CCTP fee:', error);
    return { fee: defaultFee, finalityThreshold: 0 };
  }
}

/**
 * Poll Circle's Iris API for attestation
 * @param environment - Network environment (mainnet or testnet)
 * @param sourceDomain - Source chain domain ID
 * @param txHash - Transaction hash from the deposit
 * @param maxAttempts - Maximum number of polling attempts (default: 60)
 * @param pollInterval - Interval between polls in milliseconds (default: 2000)
 * @returns Attestation and message bytes
 */
export async function fetchCCTPAttestation(
  environment: 'mainnet' | 'testnet',
  sourceDomain: number,
  txHash: string,
  maxAttempts: number = 60,
  pollInterval: number = 2000
): Promise<{ attestation: string; messageBytes: string }> {
  const apiUrl = getIrisApiUrl(environment);
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;

    try {
      const response = await fetch(
        `${apiUrl}/v2/messages/${sourceDomain}?transactionHash=${txHash}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        }
      );

      const attestationResponse: AttestationResponse = await response.json();

      // Check if we have a valid attestation
      if (
        !attestationResponse.error &&
        attestationResponse.messages &&
        attestationResponse.messages.length > 0 &&
        attestationResponse.messages[0].attestation !== 'PENDING'
      ) {
        const message = attestationResponse.messages[0];
        return {
          attestation: message.attestation,
          messageBytes: message.message,
        };
      }

      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    } catch (fetchError) {
      console.error(`Attestation fetch attempt ${attempts} failed:`, fetchError);
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
  }

  throw new Error('Attestation not received within timeout period');
}
