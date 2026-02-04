// components/AuctionBadge.tsx
'use client'

import { useState, useEffect } from 'react'
import { type Address } from 'viem'
import { 
  getCombinedAuctionInfo,
  getAuctionTier,
  formatVolume,
  type CombinedAuctionInfo 
} from '@/lib/ens-data-combiner'

interface AuctionBadgeProps {
  subdomain: string
  auctionAddress?: string
  showDetails?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export default function AuctionBadge({ 
  subdomain, 
  auctionAddress,
  showDetails = false,
  size = 'md'
}: AuctionBadgeProps) {
  const [data, setData] = useState<CombinedAuctionInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  
  useEffect(() => {
    loadAuctionData()
  }, [subdomain, auctionAddress])
  
  const loadAuctionData = async () => {
    try {
      setLoading(true)
      setError('')
      
      console.log(`🎯 Loading auction data for: ${subdomain}`)
      const result = await getCombinedAuctionInfo(subdomain, auctionAddress)
      
      setData(result)
      setLoading(false)
      
    } catch (err: any) {
      console.error('Failed to load auction data:', err)
      setError(err.message || 'Failed to load auction data')
      setLoading(false)
    }
  }
  
  if (loading) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-800 rounded-full animate-pulse">
        <div className="w-4 h-4 bg-slate-700 rounded-full" />
        <span className="text-xs text-slate-400">Loading...</span>
      </div>
    )
  }
  
  if (error || !data?.combined.auctionAddress) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full">
        <span className="text-xs text-red-400">No auction data</span>
      </div>
    )
  }
  
  const { combined } = data
  const tier = getAuctionTier(combined.reputationScore)
  
  // Size classes
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  }
  
  return (
    <div className={`inline-flex flex-col gap-2 ${showDetails ? 'w-full' : 'inline-block'}`}>
      {/* Main Badge */}
      <div className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${tier.color} ${sizeClasses[size]}`}>
        <span className="font-bold text-white">{tier.icon} {tier.tier}</span>
        {!showDetails && (
          <span className="text-white/80 text-xs">{combined.reputationScore}/100</span>
        )}
      </div>
      
      {/* Detailed View */}
      {showDetails && (
        <div className="glass-panel mt-2 p-4">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">{tier.tier} Auction</h3>
                <p className="text-sm text-slate-400">{tier.description}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">{combined.reputationScore}/100</div>
                <div className="text-xs text-slate-400">Reputation Score</div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full bg-gradient-to-r ${tier.color}`}
                style={{ width: `${combined.reputationScore}%` }}
              />
            </div>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatItem 
                label="Total Bids" 
                value={combined.totalBids.toString()} 
                icon="🎯"
              />
              <StatItem 
                label="Volume" 
                value={formatVolume(combined.totalVolume)} 
                icon="💰"
              />
              <StatItem 
                label="Success Rate" 
                value={`${combined.successRate}%`} 
                icon="📊"
              />
              <StatItem 
                label="Floor Price" 
                value={`${combined.floorPrice} USDC`} 
                icon="📈"
              />
            </div>
            
            {/* Auction Info */}
            <div className="pt-3 border-t border-slate-700">
              <div className="flex items-center justify-between text-sm">
                <div>
                  <p className="text-slate-400">Auction Address</p>
                  <p className="font-mono text-white text-xs break-all">
                    {combined.auctionAddress.slice(0, 12)}...{combined.auctionAddress.slice(-8)}
                  </p>
                </div>
                <a 
                  href={combined.etherscanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-sm text-blue-400"
                >
                  View on Etherscan
                </a>
              </div>
            </div>
            
            {/* Timestamps */}
            <div className="text-xs text-slate-500 flex justify-between">
              <span>Created: {combined.createdAt}</span>
              <span>Updated: {combined.lastUpdated}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatItem({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-3 text-center">
      <div className="text-lg mb-1">{icon}</div>
      <div className="text-sm font-bold text-white">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  )
}