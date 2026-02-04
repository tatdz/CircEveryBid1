// components/MockTokenMintPanel.tsx 
'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWalletClient } from 'wagmi'
import { type Address, parseUnits } from 'viem'
import { writeContract, readContract } from '@/lib/wagmi-contract-helpers'
import { ERC20_ABI } from '@/lib/abis'
import { CONTRACTS } from '@/lib/contracts'

interface MockTokenMintPanelProps {
  auctionAddress?: string
  onMinted?: (amount: bigint) => void
  className?: string
}

// Custom ABI for the MockERC20 with mint functions
const MOCK_ERC20_ABI = [
  ...ERC20_ABI,
  {
    name: 'mint',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: []
  },
  {
    name: 'mintToAuction',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'auction', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: []
  }
] as const

export default function MockTokenMintPanel({ 
  auctionAddress, 
  onMinted, 
  className = '' 
}: MockTokenMintPanelProps) {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  
  const [balance, setBalance] = useState<bigint>(0n)
  const [minting, setMinting] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')

  // Load balance on mount
  useEffect(() => {
    if (address) {
      loadBalance()
    }
  }, [address])

  const loadBalance = async () => {
    if (!address || !CONTRACTS.MOCK_TOKEN) return
    
    try {
      // Use readContract instead of writeContract.read
      const balance = await readContract<bigint>(
        CONTRACTS.MOCK_TOKEN,
        ERC20_ABI,
        'balanceOf',
        [address]
      )
      setBalance(balance)
    } catch (err) {
      console.error('Failed to load mock token balance:', err)
    }
  }

  const handleMint = async (amount: number) => {
    if (!address || !walletClient || !CONTRACTS.MOCK_TOKEN) {
      setError('Please connect wallet')
      return
    }

    try {
      setMinting(true)
      setError('')
      setSuccess('')

      const amountWei = parseUnits(amount.toString(), 18) // Mock token has 18 decimals
      
      console.log(`🪙 Minting ${amount} mock tokens to ${address}...`)
      
      // Call the mint function on the MockERC20 contract
      await writeContract(
        CONTRACTS.MOCK_TOKEN,
        MOCK_ERC20_ABI,
        'mint',
        [address, amountWei],
        { account: address }
      )

      console.log('✅ Mint transaction submitted')
      setSuccess(`✅ Successfully minted ${amount.toLocaleString()} mock tokens!`)
      
      // Wait a bit then refresh balance
      setTimeout(() => {
        loadBalance()
        onMinted?.(amountWei)
      }, 2000)

    } catch (err: any) {
      console.error('❌ Mint failed:', err)
      setError(err.message || 'Failed to mint tokens')
    } finally {
      setMinting(false)
    }
  }

  const handleMintToAuction = async (amount: number) => {
    if (!address || !walletClient || !CONTRACTS.MOCK_TOKEN || !auctionAddress) {
      setError('Missing required information')
      return
    }

    try {
      setMinting(true)
      setError('')
      setSuccess('')

      const amountWei = parseUnits(amount.toString(), 18)
      
      console.log(`🪙 Minting ${amount} mock tokens directly to auction ${auctionAddress}...`)
      
      // Call the mintToAuction function on the MockERC20 contract
      await writeContract(
        CONTRACTS.MOCK_TOKEN,
        MOCK_ERC20_ABI,
        'mintToAuction',
        [auctionAddress as Address, amountWei],
        { account: address }
      )

      console.log('✅ Mint to auction submitted')
      setSuccess(`✅ Successfully minted ${amount.toLocaleString()} mock tokens directly to auction!`)

    } catch (err: any) {
      console.error('❌ Mint to auction failed:', err)
      setError(err.message || 'Failed to mint tokens to auction')
    } finally {
      setMinting(false)
    }
  }

  const formatBalance = (balance: bigint): string => {
    return (Number(balance) / 1e18).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })
  }

  if (!CONTRACTS.MOCK_TOKEN || CONTRACTS.MOCK_TOKEN === '0x0000000000000000000000000000000000000000') {
    return (
      <div className={`card-surface p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-surface3 rounded-full flex items-center justify-center">
            <span className="text-neutral2">🪙</span>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-neutral1">Mock Token</h4>
            <p className="text-xs text-neutral3">Not configured</p>
          </div>
        </div>
        <div className="text-center py-4">
          <p className="text-sm text-neutral3">Mock token address not configured</p>
          <p className="text-xs text-neutral3 mt-1">Check your .env.local file</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`card-surface p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-accent2 rounded-full flex items-center justify-center">
          <span className="text-accent1">🪙</span>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-neutral1">Mock Token Balance</h4>
          <p className="text-xs text-neutral3">Mint test tokens for auctions</p>
        </div>
      </div>

      {/* Current Balance */}
      <div className="mb-4 p-3 bg-surface2 rounded-lg">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs text-neutral3">Your Balance</p>
            <p className="text-lg font-bold text-neutral1">
              {formatBalance(balance)} EBID
            </p>
          </div>
          <button
            onClick={loadBalance}
            className="px-2 py-1 bg-surface3 hover:bg-surface3Hovered rounded text-xs text-neutral2"
          >
            Refresh
          </button>
        </div>
        <p className="text-xs text-neutral3 mt-1 break-all">
          Token: {CONTRACTS.MOCK_TOKEN.slice(0, 10)}...
        </p>
      </div>

      {/* Quick Mint Buttons */}
      <div className="space-y-2 mb-4">
        <p className="text-xs font-medium text-neutral3 mb-1">Quick Mint to Wallet:</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleMint(1000000)}
            disabled={!isConnected || minting}
            className="py-2 bg-accent1 hover:bg-accent1Hovered disabled:bg-surface3 text-white text-sm rounded"
          >
            {minting ? 'Minting...' : '1M EBID'}
          </button>
          <button
            onClick={() => handleMint(2000000)}
            disabled={!isConnected || minting}
            className="py-2 bg-accent1 hover:bg-accent1Hovered disabled:bg-surface3 text-white text-sm rounded"
          >
            {minting ? 'Minting...' : '2M EBID'}
          </button>
        </div>
      </div>

      {/* Mint to Auction (if auction address is provided) */}
      {auctionAddress && (
        <div className="space-y-2 mb-4">
          <p className="text-xs font-medium text-neutral3 mb-1">Mint directly to Auction:</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleMintToAuction(1000000)}
              disabled={!isConnected || minting}
              className="py-2 bg-statusSuccess hover:bg-statusSuccessHovered disabled:bg-surface3 text-white text-sm rounded"
            >
              {minting ? 'Minting...' : '1M to Auction'}
            </button>
            <button
              onClick={() => handleMintToAuction(2000000)}
              disabled={!isConnected || minting}
              className="py-2 bg-statusSuccess hover:bg-statusSuccessHovered disabled:bg-surface3 text-white text-sm rounded"
            >
              {minting ? 'Minting...' : '2M to Auction'}
            </button>
          </div>
          <p className="text-xs text-neutral3 mt-1 break-all">
            Auction: {auctionAddress.slice(0, 10)}...
          </p>
        </div>
      )}

      {/* Status Messages */}
      {error && (
        <div className="mt-3 p-2 bg-statusCritical2 border border-statusCritical rounded">
          <p className="text-xs text-statusCritical">{error}</p>
        </div>
      )}

      {success && (
        <div className="mt-3 p-2 bg-statusSuccess2 border border-statusSuccess rounded">
          <p className="text-xs text-statusSuccess">{success}</p>
        </div>
      )}

      {/* Info */}
      <div className="mt-3 pt-3 border-t border-surface3">
        <p className="text-xs text-neutral3">
          <span className="text-accent1">💡</span> Mint EBID tokens to create auctions
        </p>
        <ul className="text-xs text-neutral3 mt-1 space-y-1">
          <li>• 1 EBID = 1 auction token</li>
          <li>• Standard 18 decimals</li>
          <li>• Only works on testnet</li>
          <li>• Contract has mint functions</li>
        </ul>
      </div>
    </div>
  )
}