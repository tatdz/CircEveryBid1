// components/ENSTextRecordViewer.tsx
'use client'

import { useState, useEffect } from 'react'
import { getAllAuctionDataFromENS } from '@/lib/ens-data-reader'

interface ENSTextRecordViewerProps {
  ensName: string
}

type Tab = 'overview' | 'performance' | 'reputation' | 'records'

export default function ENSTextRecordViewer({ ensName }: ENSTextRecordViewerProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError('')
        
        console.log(`📖 Loading ENS data for: ${ensName}`)
        const result = await getAllAuctionDataFromENS(ensName)
        setData(result)
        
        console.log('✅ Loaded data:', result)
        
      } catch (err: any) {
        console.error('Failed to load ENS data:', err)
        setError(err.message || 'Failed to load ENS data')
      } finally {
        setLoading(false)
      }
    }
    
    if (ensName) {
      loadData()
    }
  }, [ensName])

  if (loading) {
    return (
      <div className="glass-panel">
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="ml-3 text-slate-400">Loading ENS data...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="glass-panel bg-red-500/10 border-red-500/20">
        <div className="flex items-start gap-3">
          <div className="avatar bg-red-500/20 border-red-500/30">
            <span className="text-red-400">⚠️</span>
          </div>
          <div>
            <h4 className="body-text font-medium text-red-400 mb-1">Error</h4>
            <p className="body-small">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!data?.hasData) {
    return (
      <div className="glass-panel">
        <div className="text-center py-8">
          <p className="text-slate-400">No auction data found for this ENS name</p>
          <p className="text-slate-500 text-sm mt-2">
            {ensName} exists but has no auction records stored.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel">
        <h3 className="heading-3 mb-4">Auction ENS Data</h3>
        <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
          <p className="text-slate-300">
            Domain: <span className="font-mono text-white">{ensName}</span>
          </p>
          <p className="text-slate-400 text-sm mt-1">
            All data is stored on-chain in ENS text records
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 border-b-2 ${activeTab === 'overview' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
        >
          Overview
        </button>
        {data.performance && (
          <button
            onClick={() => setActiveTab('performance')}
            className={`px-4 py-2 border-b-2 ${activeTab === 'performance' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
          >
            Performance
          </button>
        )}
        {data.reputation && (
          <button
            onClick={() => setActiveTab('reputation')}
            className={`px-4 py-2 border-b-2 ${activeTab === 'reputation' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
          >
            Reputation
          </button>
        )}
        <button
          onClick={() => setActiveTab('records')}
          className={`px-4 py-2 border-b-2 ${activeTab === 'records' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
        >
          Text Records
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="glass-panel">
          <h4 className="body-text font-medium mb-4">Auction Overview</h4>
          
          <div className="space-y-4">
            {/* Basic Info */}
            {data.performance?.auctionAddress && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <p className="text-sm text-blue-300 mb-2">Auction Address</p>
                <p className="font-mono text-sm break-all">{data.performance.auctionAddress}</p>
              </div>
            )}
            
            {data.performance?.creatorAddress && (
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                <p className="text-sm text-purple-300 mb-2">Creator</p>
                <p className="font-mono text-sm break-all">{data.performance.creatorAddress}</p>
              </div>
            )}
            
            {/* Auction Params */}
            {data.performance?.auctionParams && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                <p className="text-sm text-emerald-300 mb-3">Auction Parameters</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-slate-400">Floor Price</p>
                    <p className="text-sm text-white">{data.performance.auctionParams.floorPrice} {data.performance.auctionParams.currency}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Duration</p>
                    <p className="text-sm text-white">{data.performance.auctionParams.durationBlocks} blocks</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Token Amount</p>
                    <p className="text-sm text-white">{parseInt(data.performance.auctionParams.tokenAmount).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Tick Spacing</p>
                    <p className="text-sm text-white">{data.performance.auctionParams.tickSpacing}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Start Delay</p>
                    <p className="text-sm text-white">{data.performance.auctionParams.startDelayBlocks} blocks</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {data.performance?.totalBids !== undefined && (
                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-white">{data.performance.totalBids}</p>
                  <p className="text-xs text-slate-400 mt-1">Total Bids</p>
                </div>
              )}
              
              {data.performance?.crossChainBids !== undefined && (
                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-white">{data.performance.crossChainBids}</p>
                  <p className="text-xs text-slate-400 mt-1">Cross-Chain</p>
                </div>
              )}
              
              {data.performance?.totalVolume && (
                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-white">{data.performance.totalVolume}</p>
                  <p className="text-xs text-slate-400 mt-1">Volume (USDC)</p>
                </div>
              )}
              
              {data.reputation && (
                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-white">{data.reputation.score}/100</p>
                  <p className="text-xs text-slate-400 mt-1">Reputation</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && data.performance && (
        <div className="glass-panel">
          <h4 className="body-text font-medium mb-4">Performance Details</h4>
          
          <pre className="text-xs text-slate-300 bg-black/30 p-4 rounded-lg overflow-x-auto">
            {JSON.stringify(data.performance, null, 2)}
          </pre>
        </div>
      )}

      {/* Reputation Tab */}
      {activeTab === 'reputation' && data.reputation && (
        <div className="glass-panel">
          <h4 className="body-text font-medium mb-4">Creator Reputation</h4>
          
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-lg p-6 text-center">
              <p className="text-sm text-slate-300 mb-2">Reputation Score</p>
              <div className="text-5xl font-bold text-white mb-2">{data.reputation.score}/100</div>
              <div className="w-full bg-slate-700 rounded-full h-2.5">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2.5 rounded-full" 
                  style={{ width: `${data.reputation.score}%` }}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/50 rounded-lg p-4">
                <p className="text-sm text-slate-400 mb-1">Total Auctions</p>
                <p className="text-2xl font-semibold text-white">{data.reputation.totalAuctions}</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <p className="text-sm text-slate-400 mb-1">Successful</p>
                <p className="text-2xl font-semibold text-white">{data.reputation.successfulAuctions}</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <p className="text-sm text-slate-400 mb-1">Success Rate</p>
                <p className="text-2xl font-semibold text-white">{data.reputation.completionRate.toFixed(1)}%</p>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <p className="text-sm text-slate-400 mb-1">Total Volume</p>
                <p className="text-2xl font-semibold text-white">{data.reputation.volume} USDC</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Text Records Tab */}
      {activeTab === 'records' && data.basicRecords && data.basicRecords.length > 0 && (
        <div className="glass-panel">
          <h4 className="body-text font-medium mb-4">ENS Text Records</h4>
          <div className="space-y-3">
            {data.basicRecords.map((record: any) => (
              <div key={record.key} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-sm font-medium text-slate-300">{record.label}</p>
                    <p className="text-xs text-slate-500 font-mono">{record.key}</p>
                  </div>
                  <span className="text-xs text-slate-500 px-2 py-1 bg-slate-800 rounded">text</span>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-white break-all">{record.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}