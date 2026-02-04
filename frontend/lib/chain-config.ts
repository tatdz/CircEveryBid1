// lib/chain-configs.ts 
import { type Chain, type Address } from 'viem'
import { sepolia, baseSepolia, arbitrumSepolia, optimismSepolia, polygonAmoy } from 'viem/chains'

// Custom Arc chain definition
export const arcChain = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Ethereum',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc-arc-testnet-pmlnt-dev-23kkqh.t.conduit.xyz'],
    },
    public: {
      http: ['https://rpc-arc-testnet-pmlnt-dev-23kkqh.t.conduit.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Arc Explorer',
      url: 'https://explorerl2-arc-testnet-pmlnt-dev-23kkqh.t.conduit.xyz',
    },
  },
  contracts: {
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11' as Address,
      blockCreated: 0,
    },
  },
  testnet: true,
} as const

export interface ExtendedChain extends Chain {
  logo: string
  cctpDomain?: number
  usdcAddress?: Address
  tokenMessenger?: Address
  messageTransmitter?: Address
}

// Create extended chains with proper typing
export const sepoliaChain: ExtendedChain = {
  ...sepolia,
  logo: '🔷',
  cctpDomain: 0,
  usdcAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as Address,
  tokenMessenger: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5' as Address,
  messageTransmitter: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD' as Address,
}

export const baseSepoliaChain: ExtendedChain = {
  ...baseSepolia,
  logo: '🔵',
  cctpDomain: 6,
  usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address,
  tokenMessenger: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5' as Address,
}

export const arbSepoliaChain: ExtendedChain = {
  ...arbitrumSepolia,
  logo: '🔶',
  cctpDomain: 3,
  usdcAddress: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d' as Address,
  tokenMessenger: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5' as Address,
}

export const opSepoliaChain: ExtendedChain = {
  ...optimismSepolia,
  logo: '🔴',
  cctpDomain: 2,
  usdcAddress: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7' as Address,
  tokenMessenger: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5' as Address,
}

export const polygonAmoyChain: ExtendedChain = {
  ...polygonAmoy,
  logo: '🟣',
  cctpDomain: 7,
  usdcAddress: '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582' as Address,
  tokenMessenger: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5' as Address,
}

export const ALL_CHAINS: ExtendedChain[] = [
  sepoliaChain,
  { ...arcChain, logo: '🌀', cctpDomain: 26, usdcAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as Address, tokenMessenger: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5' as Address } as ExtendedChain,
  baseSepoliaChain,
  arbSepoliaChain,
  opSepoliaChain,
  polygonAmoyChain,
]

export function getChainConfig(chainId: number): ExtendedChain | undefined {
  return ALL_CHAINS.find(c => c.id === chainId)
}

export function getUSDCAddress(chainId: number): Address | undefined {
  return getChainConfig(chainId)?.usdcAddress
}

export function getCCTPDomain(chainId: number): number | undefined {
  return getChainConfig(chainId)?.cctpDomain
}

export function getTokenMessenger(chainId: number): Address | undefined {
  return getChainConfig(chainId)?.tokenMessenger
}