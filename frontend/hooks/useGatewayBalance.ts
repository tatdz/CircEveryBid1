// hooks/useGatewayBalance.ts 
import { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import type { Address } from 'viem'

export interface ChainBalance {
  chainName: string
  domain: number
  chainId: number
  balance: string
  balanceFormatted: number
  usdcAddress: Address
  usdcSymbol: string
  usdcDecimals: number
  lastUpdated: string
}

export interface UnifiedBalance {
  totalUSDC: number
  totalChains: number
  activeChains: number
  chains: ChainBalance[]
  timestamp: string
}

export function useGatewayBalance() {
  const { address, isConnected } = useAccount()
  const [balance, setBalance] = useState<UnifiedBalance | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBalance = useCallback(async () => {
    if (!address || !isConnected) {
      setBalance(null)
      return
    }

    try {
      setLoading(true)
      setError(null)

      console.log('🔄 useGatewayBalance: Fetching for', address)
      
      // Use AbortController for timeout - increased to 30s for slow RPC responses
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      try {
        const response = await fetch(`/api/gateway/balance?address=${address}`, {
          signal: controller.signal,
          cache: 'no-store'
        })
        
        clearTimeout(timeoutId)
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        
        const result = await response.json()

        if (!result.success) {
          throw new Error(result.message || 'Failed to fetch balance')
        }

        console.log('✅ useGatewayBalance: Got data', {
          totalUSDC: result.data.totalUSDC,
          activeChains: result.data.activeChains
        })

        setBalance(result.data)
      } catch (fetchError: any) {
        clearTimeout(timeoutId)
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timeout. The gateway is taking too long to respond.')
        }
        throw fetchError
      }
    } catch (err: any) {
      console.error('❌ useGatewayBalance error:', err)
      setError(err.message || 'Failed to fetch unified balance')
      setBalance(null)
    } finally {
      setLoading(false)
    }
  }, [address, isConnected])

  // Auto-fetch when address changes
  useEffect(() => {
    if (address && isConnected) {
      fetchBalance()
    } else {
      setBalance(null)
    }
  }, [address, isConnected, fetchBalance])

  // Listen for refresh events (triggered after USDC escrow)
  useEffect(() => {
    const handleRefresh = () => {
      console.log('🔄 Gateway balance refresh triggered by event')
      setTimeout(() => fetchBalance(), 2000) // Wait 2s for chain to update
    }
    
    if (typeof window !== 'undefined') {
      window.addEventListener('refresh-gateway-balance', handleRefresh)
      return () => window.removeEventListener('refresh-gateway-balance', handleRefresh)
    }
  }, [fetchBalance])

  return {
    balance,
    loading,
    error,
    refresh: fetchBalance,
    hasBalance: balance ? balance.totalUSDC > 0 : false,
    activeChains: balance ? balance.activeChains : 0,
    totalChains: balance ? balance.totalChains : 0
  }
}