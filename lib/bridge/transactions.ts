/**
 * Shared bridge transaction utilities
 * This file will contain helper functions for bridge transactions
 * as we extract them from components
 */

/**
 * Calculate the actual amount after fees
 * @param amount - Original amount in USDC
 * @param fee - Fee amount in USDC
 * @returns Amount that will be received after fees
 */
export function calculateAmountAfterFees(amount: string, fee: string): string {
  const amountNum = parseFloat(amount);
  const feeNum = parseFloat(fee);

  if (isNaN(amountNum) || isNaN(feeNum)) {
    return '0';
  }

  const result = amountNum - feeNum;
  return result > 0 ? result.toFixed(6) : '0';
}

/**
 * Validate bridge amount
 * @param amount - Amount to validate
 * @param balance - Available balance
 * @param minAmount - Minimum allowed amount
 * @returns Validation result with error message if invalid
 */
export function validateBridgeAmount(
  amount: string,
  balance: number,
  minAmount: number = 0.01
): { isValid: boolean; error?: string } {
  const amountNum = parseFloat(amount);

  if (!amount || isNaN(amountNum) || amountNum <= 0) {
    return { isValid: false, error: 'Please enter a valid amount' };
  }

  if (amountNum < minAmount) {
    return { isValid: false, error: `Minimum amount is ${minAmount} USDC` };
  }

  if (amountNum > balance) {
    return { isValid: false, error: 'Insufficient balance' };
  }

  return { isValid: true };
}

// Additional transaction helpers can be added here as we extract more logic
// from the components during the refactoring process
