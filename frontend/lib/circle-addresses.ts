// lib/circle-addresses.ts
import { type Address } from 'viem'

export const USDC_ADDRESSES: Record<number, Address> = {
  // Ethereum Sepolia
  11155111: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  
  // Arc Testnet
  5042002: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  
  // Base Sepolia
  84532: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  
  // Arbitrum Sepolia
  421614: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
  
  // OP Sepolia
  11155420: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
  
  // Polygon Amoy
  80002: '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582',
  
  // Avalanche Fuji
  43113: '0x5425890298aed601595a70AB815c96711a31Bc65',
  
  // Unichain Sepolia
  1301: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  
  // Sei Atlantic
  1328: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
}

// NOTE: Arc Testnet (5042002) addresses are PLACEHOLDERS.
// CCTP contracts must be deployed on Arc for real cross-chain transfers.
// See arc-testnet-deployment.ts for deployment instructions.
export const TOKEN_MESSENGER_ADDRESSES: Record<number, Address> = {
  11155111: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
  5042002: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5', // PLACEHOLDER - deploy on Arc
  84532: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
  421614: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
  11155420: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
  80002: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
  43113: '0xeb08f243e5d3fcff26a9e38ae5520a669f4019d0',
  1301: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
  1328: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5',
}

export const MESSAGE_TRANSMITTER_ADDRESSES: Record<number, Address> = {
  11155111: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
  5042002: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
  84532: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
  421614: '0xaCF1ceeF35caAc005e15888dDb8A3515C41B4872',
  11155420: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD',
  80002: '0xe09A679F56207EF33F5b9d8fb4499Ec00792eA73',
  43113: '0xa9fb1b3009dcb79e2fe346c16a316b02f6b31da9',
}

export function getUSDCForChain(chainId: number): Address | undefined {
  return USDC_ADDRESSES[chainId]
}

export function getTokenMessengerForChain(chainId: number): Address | undefined {
  return TOKEN_MESSENGER_ADDRESSES[chainId]
}

export function getMessageTransmitterForChain(chainId: number): Address | undefined {
  return MESSAGE_TRANSMITTER_ADDRESSES[chainId]
}

export function isChainSupported(chainId: number): boolean {
  return chainId in USDC_ADDRESSES
}
