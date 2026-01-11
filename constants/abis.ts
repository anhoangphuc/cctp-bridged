
// ERC20 ABI for balanceOf function

export const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: '_owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: 'balance', type: 'uint256' }],
    type: 'function',
  },
] as const;export const APPROVE_EVM_ABI = [
  "function approve(address spender, uint256 amount) public returns (bool)",
];
export const TOKEN_MESSENGER_V2_EVM_ABI = [
  "function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken, bytes32 destinationCaller, uint256 maxFee, uint32 minFinalityThreshold) public",
  "function depositForBurnWithHook(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken, bytes32 destinationCaller, uint256 maxFee, uint32 minFinalityThreshold, bytes hookData) public",
];
export const MESSAGE_TRANSMITTER_V2_EVM_ABI = [
  "function receiveMessage(bytes message, bytes attestation) public returns (bool)",
];

