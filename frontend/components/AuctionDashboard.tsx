// components/AuctionDashboard.tsx 
'use client'

import { useState, useEffect } from 'react'
import { type Address, formatEther } from 'viem'
import { readContract } from '@/lib/wagmi-contract-helpers'
import { CCA_ABI, STEP_READER_ABI } from '@/lib/abis'
import { CONTRACTS } from '@/lib/contracts'
import AuctionBadge from './AuctionBadge'
import { getCombinedAuctionInfo, type CombinedAuctionInfo } from '@/lib/ens-data-combiner'

interface AuctionDetails {
  clearingPrice: bigint
  currencyRaised: bigint
  totalSupply: bigint
  totalCleared: bigint
  startBlock: bigint
  endBlock: bigint
  claimBlock: bigint
  isGraduated: boolean
  floorPrice: bigint
  tickSpacing: bigint
  currentMPS: number
  token: Address
  currency: Address
}

interface CombinedData {
  chainData: AuctionDetails | null
  namestoneData: CombinedAuctionInfo | null
}

export default function AuctionDashboard() {
  const [auctionAddress, setAuctionAddress] = useState('')
  const [data, setData] = useState<CombinedData | null>(null)
  const [loading, setLoading] = useState(false)
  const [ensSubdomain, setEnsSubdomain] = useState<string>('')
  
  const loadAuction = async () => {
    if (!auctionAddress) return
    
    try {
      setLoading(true)
      console.log('📊 Loading auction data from chain and Namestone...')
      
      const addr = auctionAddress as Address
      
      // 1. Load REAL auction data from chain
      const [
        clearingPrice,
        currencyRaised,
        totalSupply,
        totalCleared,
        startBlock,
        endBlock,
        claimBlock,
        isGraduated,
        floorPrice,
        tickSpacing,
        token,
        currency,
      ] = await Promise.all([
        readContract<bigint>(addr, CCA_ABI, 'clearingPrice'),
        readContract<bigint>(addr, CCA_ABI, 'currencyRaised'),
        readContract<bigint>(addr, CCA_ABI, 'totalSupply'),
        readContract<bigint>(addr, CCA_ABI, 'totalCleared'),
        readContract<bigint>(addr, CCA_ABI, 'startBlock'),
        readContract<bigint>(addr, CCA_ABI, 'endBlock'),
        readContract<bigint>(addr, CCA_ABI, 'claimBlock'),
        readContract<boolean>(addr, CCA_ABI, 'isGraduated'),
        readContract<bigint>(addr, CCA_ABI, 'floorPrice'),
        readContract<bigint>(addr, CCA_ABI, 'tickSpacing'),
        readContract<Address>(addr, CCA_ABI, 'token'),
        readContract<Address>(addr, CCA_ABI, 'currency'),
      ])
      
      // Load current MPS
      const currentMPS = await readContract<number>(
        CONTRACTS.STEP_READER,
        STEP_READER_ABI,
        'getCurrentMPS',
        [addr]
      )
      
      const chainData: AuctionDetails = {
        clearingPrice,
        currencyRaised,
        totalSupply,
        totalCleared,
        startBlock,
        endBlock,
        claimBlock,
        isGraduated,
        floorPrice,
        tickSpacing,
        currentMPS,
        token,
        currency,
      }
      
      // 2. Try to find ENS subdomain for this auction
      // This is a simplified approach - in reality you'd have a mapping
      let namestoneData: CombinedAuctionInfo | null = null
      try {
        // Try to fetch all Namestone records and find which one has this auction address
        const response = await fetch('/api/ens/test-records')
        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            const auctionSubdomain = result.names.find((n: any) => 
              n.textRecords?.['url']?.includes(auctionAddress.toLowerCase()) ||
              n.textRecords?.['location']?.includes(auctionAddress.toLowerCase())
            )
            
            if (auctionSubdomain) {
              setEnsSubdomain(auctionSubdomain.name)
              namestoneData = await getCombinedAuctionInfo(auctionSubdomain.name, auctionAddress)
            }
          }
        }
      } catch (namestoneError) {
        console.warn('Could not load Namestone data:', namestoneError)
      }
      
      setData({ chainData, namestoneData })
      console.log('✅ Auction data loaded from both sources')
      setLoading(false)
      
    } catch (err: any) {
      console.error('❌ Failed to load auction:', err)
      alert(err.message)
      setLoading(false)
    }
  }
  
  // Auto-load if auction address is provided in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const address = urlParams.get('auction')
    if (address) {
      setAuctionAddress(address)
      setTimeout(() => loadAuction(), 100) // Small delay to ensure state is set
    }
  }, [])
  
  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="glass rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">View Auction</h3>
        
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
            onClick={loadAuction}
            disabled={!auctionAddress || loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 disabled:bg-slate-700 text-white py-3 rounded-lg font-medium transition-all"
          >
            {loading ? 'Loading from Chain...' : 'Load Auction'}
          </button>
        </div>
      </div>
      
      {/* Details Section */}
      {data && (
        <div className="space-y-6">
          {/* Header with Reputation Badge */}
          {ensSubdomain && data.namestoneData && (
            <div className="glass rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">
                    {ensSubdomain}.circeverybid.eth
                  </h2>
                  <p className="text-slate-400 text-sm">
                    Auction with ENS reputation tracking
                  </p>
                </div>
                <AuctionBadge subdomain={ensSubdomain} showDetails={false} />
              </div>
              
              {/* Quick Stats from Namestone */}
              {data.namestoneData.combined && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-white">
                      {data.namestoneData.combined.totalBids}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Total Bids</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-white">
                      {data.namestoneData.combined.reputationScore}/100
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Reputation</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-white">
                      {data.namestoneData.combined.successRate}%
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Success Rate</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-white">
                      {data.namestoneData.combined.totalVolume} USDC
                    </div>
                    <div className="text-xs text-slate-400 mt-1">Volume</div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Status */}
          {data.chainData && (
            <div className="glass rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Chain Status</span>
                {data.chainData.isGraduated ? (
                  <span className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded text-sm text-green-400">
                    ✅ Graduated
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded text-sm text-yellow-400">
                    ⏳ In Progress
                  </span>
                )}
              </div>
            </div>
          )}
          
          {/* Core Metrics from Chain */}
          {data.chainData && (
            <div className="glass rounded-lg p-6">
              <h4 className="text-base font-semibold text-white mb-4">📊 Chain Metrics</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="glass rounded-lg p-3">
                  <p className="text-xs text-slate-400">Clearing Price</p>
                  <p className="text-xl font-bold text-blue-400">
                    {formatEther(data.chainData.clearingPrice)} ETH
                  </p>
                </div>
                
                <div className="glass rounded-lg p-3">
                  <p className="text-xs text-slate-400">Currency Raised</p>
                  <p className="text-xl font-bold text-green-400">
                    {(Number(data.chainData.currencyRaised) / 1e6).toFixed(2)} USDC
                  </p>
                </div>
                
                <div className="glass rounded-lg p-3">
                  <p className="text-xs text-slate-400">Floor Price</p>
                  <p className="text-lg font-bold text-purple-400">
                    {formatEther(data.chainData.floorPrice)} ETH
                  </p>
                </div>
                
                <div className="glass rounded-lg p-3">
                  <p className="text-xs text-slate-400">Current MPS</p>
                  <p className="text-lg font-bold text-orange-400">
                    {data.chainData.currentMPS}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Combined View */}
          {data.chainData && data.namestoneData && (
            <div className="glass rounded-lg p-6 bg-gradient-to-br from-blue-500/5 to-purple-500/5 border border-blue-500/10">
              <h4 className="text-base font-semibold text-white mb-4">✨ Combined Performance</h4>
              
              <div className="space-y-4">
                {/* Supply Progress */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400">Token Supply Progress</span>
                    <span className="text-blue-400">
                      {((Number(data.chainData.totalCleared) / Number(data.chainData.totalSupply)) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                      style={{ 
                        width: `${Math.min((Number(data.chainData.totalCleared) / Number(data.chainData.totalSupply)) * 100, 100)}%` 
                      }}
                    />
                  </div>
                </div>
                
                {/* Combined Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard 
                    label="Chain Bids" 
                    value={data.chainData.totalCleared.toString()} 
                    color="blue"
                  />
                  <StatCard 
                    label="Namestone Bids" 
                    value={data.namestoneData.combined?.totalBids?.toString() || "0"} 
                    color="purple"
                  />
                  <StatCard 
                    label="Chain Volume" 
                    value={`${(Number(data.chainData.currencyRaised) / 1e6).toFixed(0)} USDC`} 
                    color="green"
                  />
                  <StatCard 
                    label="Reputation" 
                    value={`${data.namestoneData.combined?.reputationScore || 50}/100`} 
                    color="orange"
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Block Info */}
          {data.chainData && (
            <div className="glass rounded-lg p-6">
              <h4 className="text-base font-semibold text-white mb-4">⏰ Block Timeline</h4>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Start Block</span>
                  <span className="text-white font-mono">{data.chainData.startBlock.toString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">End Block</span>
                  <span className="text-white font-mono">{data.chainData.endBlock.toString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Claim Block</span>
                  <span className="text-white font-mono">{data.chainData.claimBlock.toString()}</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Contracts */}
          {data.chainData && (
            <div className="glass rounded-lg p-6">
              <h4 className="text-base font-semibold text-white mb-4">📜 Contracts</h4>
              
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Token Address</p>
                  <p className="text-xs text-white font-mono break-all">{data.chainData.token}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Currency Address</p>
                  <p className="text-xs text-white font-mono break-all">{data.chainData.currency}</p>
                </div>
                {ensSubdomain && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">ENS Subdomain</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-white font-mono break-all">
                        {ensSubdomain}.circeverybid.eth
                      </p>
                      <a
                        href={`https://sepolia.app.ens.domains/${ensSubdomain}.circeverybid.eth`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-blue-400"
                      >
                        View ENS
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Data Sources Info */}
          <div className="glass rounded-lg p-4 bg-blue-500/5 border border-blue-500/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white font-medium">📡 Data Sources</p>
                <p className="text-xs text-slate-400">
                  Combined from blockchain and Namestone database
                </p>
              </div>
              <div className="flex gap-2">
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                  Chain Data
                </span>
                <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">
                  Namestone
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {!data && !loading && (
        <div className="glass rounded-lg p-12 text-center">
          <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔍</span>
          </div>
          <p className="text-slate-400 text-sm mb-2">
            Enter an auction address to view details
          </p>
          <p className="text-slate-500 text-xs">
            Data will be loaded from both blockchain and Namestone
          </p>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colorClasses = {
    blue: 'border-blue-500/20 bg-blue-500/5',
    purple: 'border-purple-500/20 bg-purple-500/5',
    green: 'border-green-500/20 bg-green-500/5',
    orange: 'border-orange-500/20 bg-orange-500/5',
  }
  
  return (
    <div className={`border rounded-lg p-3 ${colorClasses[color as keyof typeof colorClasses]}`}>
      <div className="text-sm font-bold text-white">{value}</div>
      <div className="text-xs text-slate-400 mt-1">{label}</div>
    </div>
  )
}