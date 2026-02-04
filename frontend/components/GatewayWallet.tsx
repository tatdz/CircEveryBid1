// components/GatewayWallet.tsx 
'use client'

import { useState, useEffect } from 'react'
import { useAccount, useBalance, useChainId } from 'wagmi'
import { formatUnits, type Address } from 'viem'
import { useGatewayBalance } from '@/hooks/useGatewayBalance'

interface GatewayWalletProps {
  onNavigate?: (role: 'bidder' | 'creator', tab: string) => void;
}

const USDC_ADDRESSES: Record<number, `0x${string}`> = {
  11155111: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  5042002: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  84532: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  421614: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
  11155420: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
  80002: '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582',
}

export default function GatewayWallet({ onNavigate }: GatewayWalletProps) {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  
  const { 
    balance: gatewayBalance, 
    loading: gatewayLoading, 
    error: gatewayError, 
    refresh: refreshGateway,
    activeChains
  } = useGatewayBalance()

  const [showGateway, setShowGateway] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string>('')

  // Get native ETH balance
  const { data: ethBalance } = useBalance({ address, chainId })

  // Get USDC balance for current chain
  const usdcAddress = USDC_ADDRESSES[chainId]
  const { data: usdcBalance, refetch: refetchUSDC } = useBalance({
    address,
    chainId,
    token: usdcAddress,
  })

  // Update timestamp
  useEffect(() => {
    if (gatewayBalance?.timestamp) {
      const date = new Date(gatewayBalance.timestamp)
      setLastUpdated(date.toLocaleTimeString())
    }
  }, [gatewayBalance])

  if (!isConnected || !address) {
    return (
      <div className="glass rounded-xl p-6 text-center">
        <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🔐</span>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Connect Your Wallet</h3>
        <p className="text-slate-400 text-sm">
          Connect your wallet to view real-time USDC balances across all chains
        </p>
      </div>
    )
  }

  const formattedETH = ethBalance ? parseFloat(formatUnits(ethBalance.value, 18)).toFixed(4) : '0'
  const formattedUSDC = usdcBalance ? parseFloat(formatUnits(usdcBalance.value, usdcBalance.decimals)).toFixed(2) : '0'
  const totalUSDC = gatewayBalance?.totalUSDC || 0
  const chainBalances = gatewayBalance?.chains || []

  return (
    <div className="space-y-6">
      {/* Current Chain */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Current Chain</h3>
          <div className="text-xs px-3 py-1 bg-slate-700 rounded-full text-slate-300">
            Chain {chainId}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <span className="text-blue-400">Ξ</span>
                </div>
                <span className="text-sm text-slate-300">Native Balance</span>
              </div>
              <span className="text-xs text-slate-500">Gas & Fees</span>
            </div>
            <p className="text-2xl font-bold text-white">{formattedETH}</p>
            <p className="text-sm text-slate-400">ETH</p>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600/20 rounded-full flex items-center justify-center">
                  <span className="text-blue-400">💵</span>
                </div>
                <span className="text-sm text-slate-300">USDC Balance</span>
              </div>
              <span className="text-xs text-slate-500">For Bidding</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {formattedUSDC}
            </p>
            <p className="text-sm text-slate-400">USDC</p>
          </div>
        </div>

        <div className="mt-4 text-xs text-slate-500">
          Wallet: <span className="font-mono text-slate-300">{address.slice(0, 8)}...{address.slice(-6)}</span>
        </div>
      </div>

      {/* Gateway Section */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-white">Cross-Chain USDC Gateway</h3>
            <p className="text-sm text-slate-400">
              {gatewayLoading ? 'Loading balances...' : `Active on ${activeChains} chains`}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-white">
              ${totalUSDC.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            {lastUpdated && (
              <div className="text-xs text-slate-400">Updated: {lastUpdated}</div>
            )}
          </div>
        </div>

        {/* Gateway Details Toggle */}
        <button
          onClick={() => setShowGateway(!showGateway)}
          className="w-full py-2 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg mb-4 transition-colors"
        >
          <span className="text-sm text-slate-300">
            {showGateway ? '▲ Hide Details' : '▼ Show Details'}
          </span>
        </button>

        {/* Gateway Details */}
        {showGateway && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-white">Chain Breakdown</h4>
              <button
                onClick={() => {
                  refetchUSDC()
                  refreshGateway()
                }}
                disabled={gatewayLoading}
                className="text-xs px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded transition-colors disabled:opacity-50"
              >
                {gatewayLoading ? '🔄 Loading...' : '🔄 Refresh'}
              </button>
            </div>

            {gatewayError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-300">{gatewayError}</p>
              </div>
            )}

            {gatewayLoading ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 bg-slate-700 rounded-lg"></div>
                ))}
              </div>
            ) : chainBalances.length > 0 ? (
              <div className="space-y-2">
                {chainBalances.map(chain => (
                  <div
                    key={chain.chainId}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                        <span className="text-slate-300">⛓️</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{chain.chainName}</p>
                        <p className="text-xs text-slate-400">Domain {chain.domain}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-white">
                        ${chain.balanceFormatted.toFixed(2)}
                      </p>
                      <p className="text-xs text-slate-400">{chain.usdcSymbol}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-slate-400 text-sm">No balances found across chains</p>
              </div>
            )}

            <div className="pt-4 border-t border-slate-700">
              <p className="text-xs text-slate-400 text-center">
                Real-time USDC balances across supported chains
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}