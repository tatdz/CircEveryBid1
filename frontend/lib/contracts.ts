// lib/contracts.ts 
import { type Address } from 'viem'
import { sepolia, baseSepolia, arbitrumSepolia, optimismSepolia, polygonAmoy } from 'viem/chains'

// Hardcoded addresses that always work
const HARDCODED_ADDRESSES = {
  // CircEveryBid Core
  NEXT_PUBLIC_STEP_READER_ADDRESS: '0x4e2E31970ec1c7B5b0309cB9e92EE498Dd9f6a24' as Address,
  NEXT_PUBLIC_OPTIMIZER_ADDRESS: '0x5c930236D4f60cEC9E18bD1E9c26Da0977EB7F94' as Address,
  NEXT_PUBLIC_MPS_MUTATOR: '0x7284bf89BB9CE144F9d723C61fb73343CC07c5B9' as Address,
  NEXT_PUBLIC_POSEIDON_COMMITMENT_ADDRESS: '0xea6C2C78992152e2Df1Df9aDeE962E6e4472cA28' as Address,
  NEXT_PUBLIC_ENS_AUCTION_REGISTRY_ADDRESS: '0xc9cb3111942e4cb5cD9550E04ee3901C6E4ce27b' as Address,
  NEXT_PUBLIC_HOOK_ADDRESS: '0x604C344F2ccb79BC3FBF5697Ad7046F5A8E7Ebf7' as Address,
  NEXT_PUBLIC_FACTORY_ADDRESS: '0x0000ccaDF55C911a2FbC0BB9d2942Aa77c6FAa1D' as Address,
  
  // ENS
  NEXT_PUBLIC_ENS_REGISTRY_ADDRESS: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e' as Address,
  NEXT_PUBLIC_ENS_PUBLIC_RESOLVER: '0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5' as Address,
  
  // Tokens
  NEXT_PUBLIC_USDC_SEPOLIA: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as Address,
  NEXT_PUBLIC_MOCK_TOKEN: '0xb5fddd15391354766B869dC9aE5876Df7F849782' as Address,
  
  // Pyth
  NEXT_PUBLIC_PYTH_ADDRESS: '0xDd24F84d36BF92C65F92307595335bdFab5Bbd21' as Address,
  
  // CCTP
  NEXT_PUBLIC_CCTP_TOKEN_MESSENGER: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5' as Address,
  NEXT_PUBLIC_CCTP_MESSAGE_TRANSMITTER: '0x7865fAfC2db2093669d92c0F33AeEF291086BEFD' as Address,
} as const

// Helper to get value without warnings
function getEnvValue(key: string): string {
  // In SSR, return hardcoded value
  if (typeof window === 'undefined') {
    return HARDCODED_ADDRESSES[key as keyof typeof HARDCODED_ADDRESSES] || ''
  }
  
  // In browser, try process.env first, then hardcoded
  const envValue = process.env[key]
  if (envValue) return envValue
  
  // Fallback to hardcoded
  const hardcodedValue = HARDCODED_ADDRESSES[key as keyof typeof HARDCODED_ADDRESSES]
  if (hardcodedValue) return hardcodedValue
  
  return ''
}

// Safe address getter
function getAddress(key: string): Address {
  const value = getEnvValue(key)
  
  // Validate address format
  if (!value || !/^0x[a-fA-F0-9]{40}$/.test(value)) {
    console.error(`Invalid address for ${key}: ${value}`)
    return '0x0000000000000000000000000000000000000000' as Address
  }
  
  return value as Address
}

// Contract Addresses
export const CONTRACTS = {
  // CircEveryBid Core
  STEP_READER: getAddress('NEXT_PUBLIC_STEP_READER_ADDRESS'),
  OPTIMIZER: getAddress('NEXT_PUBLIC_OPTIMIZER_ADDRESS'),
  MPS_MUTATOR: getAddress('NEXT_PUBLIC_MPS_MUTATOR'),
  POSEIDON_COMMITMENT: getAddress('NEXT_PUBLIC_POSEIDON_COMMITMENT_ADDRESS'),
  ENS_AUCTION_REGISTRY: getAddress('NEXT_PUBLIC_ENS_AUCTION_REGISTRY_ADDRESS'),
  HOOK: getAddress('NEXT_PUBLIC_HOOK_ADDRESS'),
  FACTORY: getAddress('NEXT_PUBLIC_FACTORY_ADDRESS'),
  
  
  // ENS
  ENS_REGISTRY: getAddress('NEXT_PUBLIC_ENS_REGISTRY_ADDRESS'),
  ENS_RESOLVER: getAddress('NEXT_PUBLIC_ENS_PUBLIC_RESOLVER'),
  
  // CCTP
  CCTP_TOKEN_MESSENGER: getAddress('NEXT_PUBLIC_CCTP_TOKEN_MESSENGER'),
  CCTP_MESSAGE_TRANSMITTER: getAddress('NEXT_PUBLIC_CCTP_MESSAGE_TRANSMITTER'),
  
  // Tokens
  USDC_SEPOLIA: getAddress('NEXT_PUBLIC_USDC_SEPOLIA'),
  MOCK_TOKEN: getAddress('NEXT_PUBLIC_MOCK_TOKEN'),
  
  // Pyth
  PYTH: getAddress('NEXT_PUBLIC_PYTH_ADDRESS'),
} as const

// Legacy alias
export const CONTRACT_ADDRESSES = CONTRACTS

// ENS Configuration
export const ENS_CONFIG = {
  domain: process.env.NEXT_PUBLIC_ENS_DOMAIN || 'circeverybid.eth',
  parentNode: '0x565770904a8958c98b502a492796a3c0286ef5341c4c8670a794368ab351ede6' as `0x${string}`,
} as const

// Pyth Price Feed IDs
export const PYTH_FEEDS = {
  ETH_USD: (process.env.NEXT_PUBLIC_PYTH_ETH_USD || '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace') as `0x${string}`,
  USDC_USD: (process.env.NEXT_PUBLIC_PYTH_USDC_USD || '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a') as `0x${string}`,
} as const

export const CCTP_DOMAINS = {
  SEPOLIA: 0,
  AVALANCHE_FUJI: 1,
  OP_SEPOLIA: 2,
  ARBITRUM_SEPOLIA: 3,
  BASE_SEPOLIA: 6,
  POLYGON_AMOY: 7,
  UNICHAIN_SEPOLIA: 10,
  ARC_TESTNET: 26,
  SEI_ATLANTIC: 16,
} as const

// Arc chain definition
export const arcTestnet = {
  id: 5042002,
  name: 'Arc Testnet',
  cctpDomain: CCTP_DOMAINS.ARC_TESTNET,
} as const

// Supported chains configuration
export const SUPPORTED_CHAINS = [
  {
    id: 11155111,
    name: 'Ethereum Sepolia',
    chain: sepolia,
    cctpDomain: CCTP_DOMAINS.SEPOLIA,
    logo: '🔷',
    usdcAddress: CONTRACTS.USDC_SEPOLIA,
  },
  {
    id: 5042002,
    name: 'Arc Testnet',
    chain: arcTestnet,
    cctpDomain: CCTP_DOMAINS.ARC_TESTNET,
    logo: '🌀',
    usdcAddress: CONTRACTS.USDC_SEPOLIA,
  },
  {
    id: 84532,
    name: 'Base Sepolia',
    chain: baseSepolia,
    cctpDomain: CCTP_DOMAINS.BASE_SEPOLIA,
    logo: '🔵',
    usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address,
  },
  {
    id: 421614,
    name: 'Arbitrum Sepolia',
    chain: arbitrumSepolia,
    cctpDomain: CCTP_DOMAINS.ARBITRUM_SEPOLIA,
    logo: '🔶',
    usdcAddress: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d' as Address,
  },
  {
    id: 11155420,
    name: 'Optimism Sepolia',
    chain: optimismSepolia,
    cctpDomain: CCTP_DOMAINS.OP_SEPOLIA,
    logo: '🔴',
    usdcAddress: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7' as Address,
  },
  {
    id: 80002,
    name: 'Polygon Amoy',
    chain: polygonAmoy,
    cctpDomain: CCTP_DOMAINS.POLYGON_AMOY,
    logo: '🟣',
    usdcAddress: '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582' as Address,
  },
] as const

// Helper function to get chain name
export function getChainName(chainId: number): string {
  const chain = SUPPORTED_CHAINS.find(c => c.id === chainId)
  return chain?.name || `Chain ${chainId}`
}

// Helper function to get CCTP domain for a chain ID
export function getCCTPDomain(chainId: number): number {
  const chain = SUPPORTED_CHAINS.find(c => c.id === chainId)
  return chain?.cctpDomain ?? CCTP_DOMAINS.SEPOLIA
}

// Helper function to get USDC address for a chain
export function getUSDCAddress(chainId?: number): Address | undefined {
  if (!chainId) return undefined
  const chain = SUPPORTED_CHAINS.find(c => c.id === chainId)
  return chain?.usdcAddress
}

// Helper function to get chain by CCTP domain
export function getChainByCCTPDomain(domain: number): typeof SUPPORTED_CHAINS[number] | undefined {
  return SUPPORTED_CHAINS.find(c => c.cctpDomain === domain)
}

// Safe environment variable getter
export function getEnvVar(key: string, defaultValue: string = ''): string {
  if (key.includes('CIRCLE') && !process.env[key]) {
    return defaultValue
  }
  
  return process.env[key] || defaultValue
}

// Circle API Configuration
export const CIRCLE_API = {
  API_KEY: getEnvVar('CIRCLE_API_KEY', ''),
  ENTITY_SECRET: getEnvVar('CIRCLE_ENTITY_SECRET', ''),
  APP_ID: getEnvVar('NEXT_PUBLIC_CIRCLE_APP_ID', ''),
} as const

// Type exports
export type SupportedChain = typeof SUPPORTED_CHAINS[number]
export type ContractAddresses = typeof CONTRACTS
export type CCTPDomain = typeof CCTP_DOMAINS[keyof typeof CCTP_DOMAINS]

// Log contract addresses in development
if (process.env.NODE_ENV === 'development') {
  console.log('🔗 Contract Addresses Loaded:')
  Object.entries(CONTRACTS).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`)
  })
}