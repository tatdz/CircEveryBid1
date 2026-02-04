// lib/chain-helpers.ts
import { sepolia, baseSepolia } from 'viem/chains'

export type SupportedNetwork = 'sepolia' | 'base-sepolia'

export const CHAINS = {
  sepolia,
  baseSepolia,
} as const

export function getChainName(chainId: number): string {
  if (chainId === sepolia.id) return 'Ethereum Sepolia'
  if (chainId === baseSepolia.id) return 'Base Sepolia'
  return `Chain ${chainId}`
}

export function isSupportedChain(chainId: number): boolean {
  return chainId === sepolia.id || chainId === baseSepolia.id
}