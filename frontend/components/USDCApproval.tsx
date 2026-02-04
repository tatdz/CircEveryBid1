// components/USDCApproval.tsx
'use client'

import { useState } from 'react'
import { useAccount, useWalletClient } from 'wagmi'
import { type Address, parseUnits, encodeFunctionData } from 'viem'
import { ERC20_ABI } from '@/lib/abis'
import { getUSDCAddress } from '@/lib/contracts'

interface USDCApprovalProps {
  auctionAddress: Address
  amount: string
  onApproved?: () => void
}

export default function USDCApproval({ auctionAddress, amount, onApproved }: USDCApprovalProps) {
  const { address, chainId } = useAccount()
  const { data: walletClient } = useWalletClient()
  
  const [isApproving, setIsApproving] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')

  const handleApprove = async () => {
    if (!address || !walletClient || !amount) {
      setError('Missing required information')
      return
    }

    // Handle undefined chainId
    if (!chainId) {
      setError('Please connect to a network')
      return
    }

    const usdcAddress = getUSDCAddress(chainId)
    if (!usdcAddress) {
      setError('USDC not supported on this chain')
      return
    }

    try {
      setIsApproving(true)
      setError('')

      const amountWei = parseUnits(amount, 6) // USDC has 6 decimals

      const txHash = await walletClient.sendTransaction({
        to: usdcAddress,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [auctionAddress, amountWei]
        }),
        account: walletClient.account,
        chain: walletClient.chain,
        gas: 100000n
      })

      setSuccess(`Approval submitted: ${txHash.slice(0, 10)}...`)
      console.log('✅ USDC approved:', txHash)

      onApproved?.()

    } catch (err: any) {
      console.error('❌ Approval failed:', err)
      setError(err.message)
    } finally {
      setIsApproving(false)
    }
  }

  if (!address) return null

  return (
    <div className="bg-statusWarning2 border border-statusWarning rounded-lg p-4">
      <h4 className="text-sm font-bold text-statusWarning mb-2">⚠️ USDC Approval Required</h4>
      <p className="text-xs text-neutral2 mb-3">
        Before placing an on-chain bid, you need to approve the auction contract to spend your USDC.
      </p>
      
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-neutral3">Amount to approve:</span>
          <span className="text-neutral1">{amount} USDC</span>
        </div>
        
        {error && (
          <p className="text-xs text-statusCritical">{error}</p>
        )}
        
        {success && (
          <p className="text-xs text-statusSuccess">{success}</p>
        )}
        
        <button
          onClick={handleApprove}
          disabled={isApproving || !amount}
          className="w-full py-2 bg-statusWarning hover:bg-statusWarningHovered text-black text-sm font-medium rounded disabled:opacity-50"
        >
          {isApproving ? 'Approving...' : 'Approve USDC'}
        </button>
      </div>
    </div>
  )
}