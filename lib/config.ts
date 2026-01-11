/**
 * Application Configuration
 * Centralizes environment-based settings
 */

/**
 * Check if mainnet is enabled
 * Controlled by NEXT_PUBLIC_ENABLE_MAINNET environment variable
 *
 * When false (default): Only testnet networks are available
 * When true: Both mainnet and testnet networks are available
 */
export const isMainnetEnabled = (): boolean => {
  const enableMainnet = process.env.NEXT_PUBLIC_ENABLE_MAINNET;

  // Default to false (testnet only) for safety
  if (!enableMainnet) {
    return false;
  }

  return enableMainnet.toLowerCase() === 'true';
};

/**
 * Get the default network environment based on mainnet availability
 * Returns 'testnet' if mainnet is disabled, otherwise 'testnet' (safer default)
 */
export const getDefaultEnvironment = (): 'mainnet' | 'testnet' => {
  // Always default to testnet for safety, even if mainnet is enabled
  return 'testnet';
};

/**
 * Get available network environments based on configuration
 */
export const getAvailableEnvironments = (): ('mainnet' | 'testnet')[] => {
  return isMainnetEnabled() ? ['mainnet', 'testnet'] : ['testnet'];
};

/**
 * Check if a network environment is available
 */
export const isEnvironmentAvailable = (environment: 'mainnet' | 'testnet'): boolean => {
  return getAvailableEnvironments().includes(environment);
};
