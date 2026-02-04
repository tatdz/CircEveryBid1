// components/BidFlow.tsx 
'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import { parseEther, parseUnits, type Hex, type Address } from 'viem'
import { sealBid, storeSealedBid, listSealedBids } from '@/lib/bid-sealing'
import { readContract } from '@/lib/wagmi-contract-helpers'
import { CCA_ABI } from '@/lib/abis'

export default function BidFlow() {
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  
  const [amount, setAmount] = useState('1.0')
  const [price, setPrice] = useState('0.1')
  const [auctionAddress, setAuctionAddress] = useState('')
  const [status, setStatus] = useState<'idle' | 'sealing' | 'submitting' | 'success'>('idle')
  const [commitment, setCommitment] = useState<Hex | null>(null)
  const [nullifier, setNullifier] = useState<Hex | null>(null)
  const [auctionCurrency, setAuctionCurrency] = useState<'ETH' | 'USDC'>('USDC')
  const [auctionDecimals, setAuctionDecimals] = useState(6)

  useEffect(() => {
    if (auctionAddress) {
      loadAuctionDetails()
    }
  }, [auctionAddress])

  const loadAuctionDetails = async () => {
    if (!auctionAddress || !publicClient) return
    
    try {
      const currency = await readContract<Address>(
        auctionAddress as Address,
        CCA_ABI,
        'currency'
      )
      
      const zeroAddress = '0x0000000000000000000000000000000000000000' as Address
      const isUSDC = currency !== zeroAddress
      
      setAuctionCurrency(isUSDC ? 'USDC' : 'ETH')
      setAuctionDecimals(isUSDC ? 6 : 18)
      
      console.log('💰 Auction currency:', isUSDC ? 'USDC' : 'ETH')
    } catch (err) {
      console.error('Failed to load auction currency:', err)
    }
  }
  
  const handleSealBid = async () => {
    if (!address || !auctionAddress) return
    
    try {
      console.log('🔒 Creating sealed bid...')
      setStatus('sealing')
      
      const amountWei = parseEther(amount)
      const priceWei = parseUnits(price, auctionDecimals)
      
      // Generate ZK sealed bid
      const { sealed, secret } = await sealBid(address, amountWei, priceWei, auctionAddress)
      
      console.log('✅ Sealed bid created')
      console.log('  Commitment:', sealed.commitment)
      console.log('  Nullifier:', sealed.nullifier)
      console.log('  Currency:', auctionCurrency)
      
      setCommitment(sealed.commitment)
      setNullifier(sealed.nullifier)
      
      // Store locally
      storeSealedBid(sealed, secret, auctionAddress)
      
      setStatus('success')
    } catch (err: any) {
      console.error('❌ Failed to seal bid:', err)
      alert(err.message)
      setStatus('idle')
    }
  }
  
  const storedBids = auctionAddress ? listSealedBids(auctionAddress) : []
  
  return (
    <div className="space-y-4">
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
        <h3 className="text-white font-semibold mb-3 text-sm">Create Sealed Bid</h3>
        
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Auction Address</label>
            <input
              type="text"
              value={auctionAddress}
              onChange={(e) => setAuctionAddress(e.target.value)}
              placeholder="0x..."
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Amount (Tokens)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.1"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Price ({auctionCurrency}/token)</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                step={auctionDecimals === 6 ? "0.01" : "0.000001"}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm"
              />
            </div>
          </div>
          
          <button
            onClick={handleSealBid}
            disabled={!address || !auctionAddress || status !== 'idle'}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 text-white py-2 rounded-lg text-sm transition-colors"
          >
            {status === 'sealing' && '🔒 Sealing...'}
            {status === 'success' && `✅ Sealed (${auctionCurrency})`}
            {status === 'idle' && 'Create Sealed Bid'}
          </button>
        </div>
      </div>
      
      {commitment && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <p className="text-xs text-green-400 mb-2">✅ Sealed Bid Created</p>
          <div className="space-y-1 text-xs">
            <div>
              <span className="text-slate-400">Commitment: </span>
              <span className="text-green-300 font-mono">{commitment.slice(0, 20)}...</span>
            </div>
            <div>
              <span className="text-slate-400">Nullifier: </span>
              <span className="text-purple-300 font-mono">{nullifier?.slice(0, 20)}...</span>
            </div>
            <div>
              <span className="text-slate-400">Currency: </span>
              <span className="text-blue-300">{auctionCurrency}</span>
            </div>
          </div>
        </div>
      )}
      
      {storedBids.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
          <p className="text-xs text-slate-400 mb-2">Stored Bids: {storedBids.length}</p>
          <div className="space-y-2">
            {storedBids.slice(0, 3).map((bid, i) => (
              <div key={i} className="bg-slate-800/50 rounded p-2 text-xs">
                <span className="text-slate-400">#{i + 1}: </span>
                <span className="text-slate-300 font-mono">{bid.sealed.commitment.slice(0, 16)}...</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}