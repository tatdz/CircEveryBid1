// components/OptimizationDashboard.tsx
'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { type Address, type Hex, formatEther } from 'viem'
import { readContract } from '@/lib/wagmi-contract-helpers'
import { CONTRACTS, PYTH_FEEDS } from '@/lib/contracts'
import { 
  MPS_MUTATOR_ABI, 
  CIRCEVERYBID_HOOK_ABI,
  STEP_READER_ABI,
  CCA_ABI 
} from '@/lib/abis'

interface AuctionMetrics {
  priceDiscoveryProgress: bigint
  bidConcentration: bigint
  pythDeviation: bigint
  marketEfficiency: bigint
  auctionProgress: bigint
  clearingPrice: bigint
  currencyRaised: bigint
  crossChainBidCount: bigint
}

interface AuctionStats {
  registered: boolean
  totalBids: bigint
  crossChainBids: bigint
  totalVolume: bigint
  creator: Address
  creatorENSNode: Hex
  lastOptimizationTime: bigint
  lastPythPrice: bigint
  lastPythUpdate: bigint
}

interface StepProgress {
  mps: number
  startBlock: bigint
  endBlock: bigint
  blocksRemaining: bigint
  progressBps: bigint
}

export default function OptimizationDashboard() {
  const { address } = useAccount()
  
  const [auctionAddress, setAuctionAddress] = useState('')
  const [metrics, setMetrics] = useState<AuctionMetrics | null>(null)
  const [stats, setStats] = useState<AuctionStats | null>(null)
  const [stepProgress, setStepProgress] = useState<StepProgress | null>(null)
  const [pythPrice, setPythPrice] = useState<bigint | null>(null)
  const [loading, setLoading] = useState(false)
  
  const loadAuctionData = async () => {
    if (!auctionAddress) return
    
    try {
      setLoading(true)
      console.log('📊 Loading REAL auction data from contracts...')
      
      // Load metrics from MPS Mutator
      const metricsData = await readContract<[bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint]>(
        CONTRACTS.MPS_MUTATOR,
        MPS_MUTATOR_ABI,
        'getLastMetrics',
        [auctionAddress as Address]
      )
      
      setMetrics({
        priceDiscoveryProgress: metricsData[0],
        bidConcentration: metricsData[1],
        pythDeviation: metricsData[2],
        marketEfficiency: metricsData[3],
        auctionProgress: metricsData[4],
        clearingPrice: metricsData[5],
        currencyRaised: metricsData[6],
        crossChainBidCount: metricsData[7],
      })
      
      // Load stats from Hook
      const statsData = await readContract<[boolean, bigint, bigint, bigint, Address, Hex, bigint, bigint, bigint]>(
        CONTRACTS.HOOK,
        CIRCEVERYBID_HOOK_ABI,
        'getAuctionStats',
        [auctionAddress as Address]
      )
      
      setStats({
        registered: statsData[0],
        totalBids: statsData[1],
        crossChainBids: statsData[2],
        totalVolume: statsData[3],
        creator: statsData[4],
        creatorENSNode: statsData[5],
        lastOptimizationTime: statsData[6],
        lastPythPrice: statsData[7],
        lastPythUpdate: statsData[8],
      })
      
      // Load step progress
      const progressData = await readContract<[number, bigint, bigint, bigint, bigint]>(
        CONTRACTS.STEP_READER,
        STEP_READER_ABI,
        'getStepProgress',
        [auctionAddress as Address]
      )
      
      setStepProgress({
        mps: progressData[0],
        startBlock: progressData[1],
        endBlock: progressData[2],
        blocksRemaining: progressData[3],
        progressBps: progressData[4],
      })
      
      // Load current Pyth price
      const currentPythPrice = await readContract<bigint>(
        CONTRACTS.MPS_MUTATOR,
        MPS_MUTATOR_ABI,
        'getCurrentPythPrice',
        [PYTH_FEEDS.ETH_USD]
      )
      
      setPythPrice(currentPythPrice)
      
      console.log('✅ All data loaded from chain')
      setLoading(false)
      
    } catch (err: any) {
      console.error('❌ Failed to load data:', err)
      setLoading(false)
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Input */}
      <div className="glass rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">MPS Optimization Dashboard</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Auction Address</label>
            <input
              type="text"
              value={auctionAddress}
              onChange={(e) => setAuctionAddress(e.target.value)}
              placeholder="0x..."
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white font-mono text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          
          <button
            onClick={loadAuctionData}
            disabled={!auctionAddress || loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white py-3 rounded-lg font-medium transition-all"
          >
            {loading ? 'Loading from Chain...' : 'Load Auction Data'}
          </button>
        </div>
      </div>
      
      {/* Pyth Price */}
      {pythPrice && (
        <div className="glass rounded-lg p-4">
          <p className="text-xs text-slate-400 mb-2">Current Pyth ETH/USD Price</p>
          <p className="text-2xl font-bold text-green-400">
            ${(Number(pythPrice) / 1e18).toFixed(2)}
          </p>
        </div>
      )}
      
      {/* Auction Stats */}
      {stats && (
        <div className="glass rounded-lg p-6">
          <h4 className="text-base font-semibold text-white mb-4">Auction Statistics</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="glass rounded-lg p-3">
              <p className="text-xs text-slate-400">Total Bids</p>
              <p className="text-2xl font-bold text-blue-400">{stats.totalBids.toString()}</p>
            </div>
            
            <div className="glass rounded-lg p-3">
              <p className="text-xs text-slate-400">Cross-Chain Bids</p>
              <p className="text-2xl font-bold text-purple-400">{stats.crossChainBids.toString()}</p>
            </div>
            
            <div className="glass rounded-lg p-3">
              <p className="text-xs text-slate-400">Total Volume</p>
              <p className="text-lg font-bold text-green-400">
                {(Number(stats.totalVolume) / 1e6).toFixed(2)} USDC
              </p>
            </div>
            
            <div className="glass rounded-lg p-3">
              <p className="text-xs text-slate-400">Last Pyth Price</p>
              <p className="text-lg font-bold text-orange-400">
                ${(Number(stats.lastPythPrice) / 1e18).toFixed(2)}
              </p>
            </div>
          </div>
          
          <div className="mt-4 glass rounded-lg p-3">
            <p className="text-xs text-slate-400 mb-1">Creator</p>
            <p className="text-xs text-white font-mono break-all">{stats.creator}</p>
          </div>
        </div>
      )}
      
      {/* MPS Metrics */}
      {metrics && (
        <div className="glass rounded-lg p-6">
          <h4 className="text-base font-semibold text-white mb-4">Dynamic MPS Metrics</h4>
          
          <div className="space-y-3">
            {/* Price Discovery */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Price Discovery Progress</span>
                <span className="text-blue-400">{(Number(metrics.priceDiscoveryProgress) / 10).toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
                  style={{ width: `${Math.min(Number(metrics.priceDiscoveryProgress) / 10, 100)}%` }}
                />
              </div>
            </div>
            
            {/* Auction Progress */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Auction Progress</span>
                <span className="text-purple-400">{(Number(metrics.auctionProgress) / 100).toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all"
                  style={{ width: `${Math.min(Number(metrics.auctionProgress) / 100, 100)}%` }}
                />
              </div>
            </div>
            
            {/* Market Efficiency */}
            <div className="grid grid-cols-3 gap-3">
              <div className="glass rounded-lg p-3">
                <p className="text-xs text-slate-400">Bid Concentration (HHI)</p>
                <p className="text-lg font-bold text-yellow-400">
                  {metrics.bidConcentration.toString()}
                </p>
              </div>
              
              <div className="glass rounded-lg p-3">
                <p className="text-xs text-slate-400">Market Efficiency</p>
                <p className="text-lg font-bold text-green-400">
                  {metrics.marketEfficiency.toString()}%
                </p>
              </div>
              
              <div className="glass rounded-lg p-3">
                <p className="text-xs text-slate-400">Pyth Deviation</p>
                <p className="text-lg font-bold text-orange-400">
                  {(Number(metrics.pythDeviation) / 100).toFixed(2)}%
                </p>
              </div>
            </div>
            
            {/* Clearing Price & Currency Raised */}
            <div className="grid grid-cols-2 gap-3">
              <div className="glass rounded-lg p-3">
                <p className="text-xs text-slate-400">Clearing Price</p>
                <p className="text-lg font-bold text-blue-400">
                  {formatEther(metrics.clearingPrice)} ETH
                </p>
              </div>
              
              <div className="glass rounded-lg p-3">
                <p className="text-xs text-slate-400">Currency Raised</p>
                <p className="text-lg font-bold text-green-400">
                  {(Number(metrics.currencyRaised) / 1e6).toFixed(2)} USDC
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Step Progress */}
      {stepProgress && (
        <div className="glass rounded-lg p-6">
          <h4 className="text-base font-semibold text-white mb-4">Current Step Progress</h4>
          
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="glass rounded-lg p-3">
                <p className="text-xs text-slate-400">MPS (Mutation Rate)</p>
                <p className="text-2xl font-bold text-purple-400">{stepProgress.mps}</p>
              </div>
              
              <div className="glass rounded-lg p-3">
                <p className="text-xs text-slate-400">Blocks Remaining</p>
                <p className="text-2xl font-bold text-orange-400">
                  {stepProgress.blocksRemaining.toString()}
                </p>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Step Progress</span>
                <span className="text-green-400">{(Number(stepProgress.progressBps) / 100).toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all"
                  style={{ width: `${Math.min(Number(stepProgress.progressBps) / 100, 100)}%` }}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400">Start Block: </span>
                <span className="text-white font-mono">{stepProgress.startBlock.toString()}</span>
              </div>
              <div>
                <span className="text-slate-400">End Block: </span>
                <span className="text-white font-mono">{stepProgress.endBlock.toString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Info */}
      {!metrics && !loading && (
        <div className="glass rounded-lg p-8 text-center">
          <p className="text-slate-400 text-sm">
            Enter an auction address to view real-time MPS optimization metrics
          </p>
        </div>
      )}
    </div>
  )
}