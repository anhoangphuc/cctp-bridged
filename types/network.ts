export type NetworkEnvironment = 'mainnet' | 'testnet';

export interface NetworkContextType {
  environment: NetworkEnvironment;
  setEnvironment: (env: NetworkEnvironment) => void;
}
