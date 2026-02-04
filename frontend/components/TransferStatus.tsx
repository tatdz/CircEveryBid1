// components/TransferStatus.tsx
'use client'

import { useState, useEffect } from 'react'
import { type Hex } from 'viem'

interface TransferStep {
  id: string
  label: string
  status: 'pending' | 'active' | 'complete' | 'error'
  txHash?: string
  explorerUrl?: string
}

interface TransferStatusProps {
  sourceChain: string
  destinationChain: string
  amount: string
  token: string
  burnTxHash?: Hex
  mintTxHash?: Hex
  attestation?: string
  onComplete?: () => void
}

export default function TransferStatus({
  sourceChain,
  destinationChain,
  amount,
  token,
  burnTxHash,
  mintTxHash,
  attestation,
  onComplete,
}: TransferStatusProps) {
  const [steps, setSteps] = useState<TransferStep[]>([
    { id: 'burn', label: 'Burn on source', status: 'pending' },
    { id: 'attest', label: 'Get attestation', status: 'pending' },
    { id: 'mint', label: 'Mint on destination', status: 'pending' },
  ])
  
  useEffect(() => {
    setSteps(prev => prev.map(step => {
      if (step.id === 'burn' && burnTxHash) {
        return { ...step, status: 'complete', txHash: burnTxHash }
      }
      if (step.id === 'attest' && attestation) {
        return { ...step, status: 'complete' }
      }
      if (step.id === 'mint' && mintTxHash) {
        return { ...step, status: 'complete', txHash: mintTxHash }
      }
      
      // Set active status
      if (step.id === 'burn' && !burnTxHash) {
        return { ...step, status: 'active' }
      }
      if (step.id === 'attest' && burnTxHash && !attestation) {
        return { ...step, status: 'active' }
      }
      if (step.id === 'mint' && attestation && !mintTxHash) {
        return { ...step, status: 'active' }
      }
      
      return step
    }))
    
    // Check if complete
    if (mintTxHash && onComplete) {
      onComplete()
    }
  }, [burnTxHash, attestation, mintTxHash, onComplete])
  
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white">Transfer Progress</h3>
        <div className="text-sm text-slate-400">
          {amount} {token}
        </div>
      </div>
      
      <div className="flex items-center justify-between mb-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">From:</span>
          <span className="text-white font-medium">{sourceChain}</span>
        </div>
        <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
        <div className="flex items-center gap-2">
          <span className="text-slate-400">To:</span>
          <span className="text-white font-medium">{destinationChain}</span>
        </div>
      </div>
      
      <div className="space-y-4">
        {steps.map((step, idx) => (
          <div key={step.id} className="flex items-start gap-3">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              step.status === 'complete' ? 'bg-green-500/20' :
              step.status === 'active' ? 'bg-blue-500/20' :
              step.status === 'error' ? 'bg-red-500/20' :
              'bg-slate-700'
            }`}>
              {step.status === 'complete' && (
                <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {step.status === 'active' && (
                <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full" />
              )}
              {step.status === 'pending' && (
                <span className="text-slate-500 text-sm">{idx + 1}</span>
              )}
              {step.status === 'error' && (
                <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            
            <div className="flex-1">
              <p className={`text-sm font-medium ${
                step.status === 'complete' ? 'text-green-400' :
                step.status === 'active' ? 'text-blue-400' :
                'text-slate-400'
              }`}>
                {step.label}
              </p>
              {step.txHash && (
                <p className="text-xs text-slate-500 mt-1 font-mono">
                  {step.txHash.slice(0, 10)}...{step.txHash.slice(-8)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
