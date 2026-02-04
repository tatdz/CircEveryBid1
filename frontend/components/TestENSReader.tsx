// components/TestENSReader.tsx
'use client'

import { useState } from 'react'
import { readAuctionENSRecords, checkENSNameExists } from '@/lib/ens-reader'

export default function TestENSReader() {
  const [ensName, setEnsName] = useState('myau.circeverybid.eth')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState('')

  const handleTest = async () => {
    try {
      setLoading(true)
      setError('')
      setResults(null)
      
      console.log(`🧪 Testing ENS reader for: ${ensName}`)
      
      // First check if name exists
      const exists = await checkENSNameExists(ensName)
      console.log(`ENS exists: ${exists}`)
      
      if (!exists) {
        setError(`ENS name ${ensName} does not exist or has no resolver`)
        return
      }
      
      // Read all records
      const data = await readAuctionENSRecords(ensName)
      setResults(data)
      
      console.log('📊 Results:', data)
      
    } catch (err: any) {
      console.error('Test failed:', err)
      setError(err.message || 'Failed to read ENS records')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-panel">
      <h3 className="heading-3 mb-4">🧪 Test ENS Reader</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block body-small mb-2">ENS Name</label>
          <input
            type="text"
            value={ensName}
            onChange={(e) => setEnsName(e.target.value)}
            className="w-full input-field"
            placeholder="myau.circeverybid.eth"
          />
        </div>
        
        <button
          onClick={handleTest}
          disabled={loading || !ensName}
          className="w-full btn-primary py-3"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Reading ENS Records...
            </span>
          ) : 'Test ENS Reader'}
        </button>
        
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
        
        {results && (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <p className="text-emerald-300 text-sm font-medium mb-2">✅ Successfully read ENS records!</p>
              <p className="text-slate-300 text-sm">
                Found {results.basicRecords.length} text records
                {results.performanceData && ' + performance data'}
                {results.reputationData && ' + reputation data'}
              </p>
            </div>
            
            {results.basicRecords.length > 0 && (
              <div>
                <h4 className="body-text font-medium mb-3">Text Records</h4>
                <div className="space-y-2">
                  {results.basicRecords.map((record: any) => (
                    <div key={record.key} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs text-slate-400">{record.label}</p>
                          <p className="text-sm text-white mt-1 break-all">{record.value}</p>
                        </div>
                        <span className="text-xs text-slate-500">{record.key}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {results.performanceData && (
              <div>
                <h4 className="body-text font-medium mb-3">Performance Data</h4>
                <pre className="text-xs text-slate-300 bg-black/30 p-3 rounded overflow-x-auto">
                  {JSON.stringify(results.performanceData, null, 2)}
                </pre>
              </div>
            )}
            
            {results.reputationData && (
              <div>
                <h4 className="body-text font-medium mb-3">Reputation Data</h4>
                <pre className="text-xs text-slate-300 bg-black/30 p-3 rounded overflow-x-auto">
                  {JSON.stringify(results.reputationData, null, 2)}
                </pre>
              </div>
            )}
            
            {!results.hasData && (
              <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-yellow-300">No auction records found for this ENS name</p>
                <p className="text-slate-400 text-sm mt-1">
                  The name exists but no text records are stored.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}