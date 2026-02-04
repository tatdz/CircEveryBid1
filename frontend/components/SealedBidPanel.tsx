// components/SealedBidPanel.tsx - FIXED: Real on-chain Poseidon submission
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAccount, usePublicClient, useWalletClient, useChainId, useBalance, useBlockNumber } from 'wagmi'
import { parseUnits, parseEther, type Address, type Hex, formatUnits, encodeFunctionData, keccak256, toHex } from 'viem'
import { sealBid, storeSealedBid, listSealedBids } from '@/lib/bid-sealing'
import { readContract } from '@/lib/wagmi-contract-helpers'
import { CCA_ABI, ERC20_ABI } from '@/lib/abis'
import { CONTRACTS, SUPPORTED_CHAINS, getCCTPDomain, getUSDCAddress } from '@/lib/contracts'
import { useGatewayBalance } from '@/hooks/useGatewayBalance'
import { useAuctionStore } from '@/lib/auctionStore'
import { POSEIDON_BID_COMMITMENT_ABI } from '@/lib/poseidon-commitment'

interface SealedBidPanelProps {
  auctionAddress?: string
  onBidSealed?: (commitment: string, txHash?: string) => void
}

const Q96 = 2n ** 96n

export default function SealedBidPanel({ 
  auctionAddress: propAuctionAddress, 
  onBidSealed 
}: SealedBidPanelProps) {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const chainId = useChainId()
  const { data: blockNumber } = useBlockNumber({ watch: true })
  
  const { getAllAuctions } = useAuctionStore()
  
  const [bidAmount, setBidAmount] = useState('')
  const [bidPrice, setBidPrice] = useState('')
  
  const [useCCTP, setUseCCTP] = useState(false)
  const [sourceChainId, setSourceChainId] = useState<number>(11155111)
  
  const [isSealing, setIsSealing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sealedData, setSealedData] = useState<any | null>(null)
  const [commitmentHash, setCommitmentHash] = useState<Hex | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [storedBids, setStoredBids] = useState<any[]>([])
  const [showStored, setShowStored] = useState(false)
  const [auctionDetails, setAuctionDetails] = useState<{
    address: Address
    floorPrice: string
    tickSpacing: string
    isUSDC: boolean
    isActive: boolean
    isEnded: boolean
    minBidUSDC: string
    maxBidUSDC: string
    currency: Address
    startBlock: number
    endBlock: number
    currentBlock: number
    creator: string
    ensName?: string
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [availableBalance, setAvailableBalance] = useState<string>('0')
  const [selectedAuctionAddress, setSelectedAuctionAddress] = useState<string>(propAuctionAddress || '')
  
  const { balance: gatewayBalance, loading: gatewayLoading } = useGatewayBalance()
  
  const currentChainUSDC = getUSDCAddress(chainId)
  const { data: localUSDCBalance, refetch: refetchLocalUSDC } = useBalance({
    address: address,
    token: currentChainUSDC,
    chainId
  })

  const allAuctions = useMemo(() => {
    return getAllAuctions()
  }, [getAllAuctions])

  const activeAuctions = useMemo(() => {
    if (!blockNumber) return allAuctions
    
    return allAuctions.filter(auction => {
      return auction.endBlock > Number(blockNumber)
    })
  }, [allAuctions, blockNumber])

  useEffect(() => {
    if (!selectedAuctionAddress && activeAuctions.length > 0) {
      setSelectedAuctionAddress(activeAuctions[0].address)
    }
  }, [selectedAuctionAddress, activeAuctions])

  useEffect(() => {
    if (propAuctionAddress) {
      setSelectedAuctionAddress(propAuctionAddress)
    }
  }, [propAuctionAddress])

  useEffect(() => {
    if (selectedAuctionAddress && publicClient) {
      loadAuctionDetails(selectedAuctionAddress)
    }
  }, [selectedAuctionAddress, publicClient])

  useEffect(() => {
    if (useCCTP) {
      const totalBalance = gatewayBalance?.totalUSDC || 0
      setAvailableBalance(totalBalance.toFixed(2))
    } else {
      const balance = localUSDCBalance ? 
        parseFloat(formatUnits(localUSDCBalance.value, localUSDCBalance.decimals)).toFixed(2) : '0'
      setAvailableBalance(balance)
    }
  }, [useCCTP, gatewayBalance, localUSDCBalance])

  const loadAuctionDetails = async (auctionAddress: string) => {
    if (!auctionAddress || !publicClient || !blockNumber) return
    
    try {
      setLoading(true)
      setError(null)
      
      const store = useAuctionStore.getState()
      const storedAuction = store.getAuction(auctionAddress as Address)
      
      const [floorPriceQ96, tickSpacingQ96, currency, startBlock, endBlock, isGraduated] = await Promise.all([
        readContract<bigint>(auctionAddress as Address, CCA_ABI, 'floorPrice'),
        readContract<bigint>(auctionAddress as Address, CCA_ABI, 'tickSpacing'),
        readContract<Address>(auctionAddress as Address, CCA_ABI, 'currency'),
        readContract<bigint>(auctionAddress as Address, CCA_ABI, 'startBlock'),
        readContract<bigint>(auctionAddress as Address, CCA_ABI, 'endBlock'),
        readContract<boolean>(auctionAddress as Address, CCA_ABI, 'isGraduated'),
      ])

      const currentChainUSDC = getUSDCAddress(11155111)
      const isUSDC = currentChainUSDC && currency.toLowerCase() === currentChainUSDC.toLowerCase()

      const formatFromQ96 = (q96: bigint): string => {
        const oneUSDC = 10n ** 6n
        const price = (q96 * oneUSDC) / Q96
        return (Number(price) / 1e6).toFixed(2)
      }

      const floorPrice = formatFromQ96(floorPriceQ96)
      const tickSpacing = formatFromQ96(tickSpacingQ96)

      const currentBlock = Number(blockNumber)
      const isActive = !isGraduated && currentBlock >= Number(startBlock) && currentBlock <= Number(endBlock)
      const isEnded = currentBlock > Number(endBlock)

      const MIN_BID_USDC = 0.01
      const MAX_BID_USDC = 1.0

      setAuctionDetails({
        address: auctionAddress as Address,
        floorPrice,
        tickSpacing,
        isUSDC: true,
        isActive,
        isEnded,
        minBidUSDC: MIN_BID_USDC.toFixed(2),
        maxBidUSDC: MAX_BID_USDC.toFixed(2),
        currency,
        startBlock: Number(startBlock),
        endBlock: Number(endBlock),
        currentBlock,
        creator: storedAuction?.creator || 'unknown',
        ensName: storedAuction?.ensName
      })

    } catch (err: any) {
      console.error('Failed to load auction:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAndSubmitSealedBid = async () => {
    if (!address || !selectedAuctionAddress || !publicClient || !walletClient) {
      setError('Please connect wallet and select an auction')
      return
    }

    if (!bidAmount || !bidPrice) {
      setError('Please enter bid amount and price')
      return
    }

    if (!auctionDetails) {
      setError('Auction details not loaded')
      return
    }

    if (auctionDetails.isEnded) {
      setError('Auction has ended')
      return
    }

    if (!auctionDetails.isActive) {
      setError('Auction is not active yet')
      return
    }

    const bidAmountNum = parseFloat(bidAmount)
    const bidPriceNum = parseFloat(bidPrice)
    const totalUSDC = bidAmountNum * bidPriceNum
    
    if (totalUSDC < 0.01 || totalUSDC > 1.0) {
      setError(`Total bid value must be between 0.01 and 1.0 USDC. Current: ${totalUSDC.toFixed(2)} USDC`)
      return
    }

    const availableBalanceNum = parseFloat(availableBalance)
    if (totalUSDC > availableBalanceNum) {
      setError(`Insufficient balance. Available: ${availableBalance} USDC`)
      return
    }

    try {
      setIsSealing(true)
      setIsSubmitting(true)
      setError(null)
      setSuccess(null)

      console.log('Creating sealed bid with Poseidon commitment...')

      const amountWei = parseEther(bidAmount)
      const priceWei = parseUnits(bidPrice, 6)
      const totalUSDCWei = parseUnits(totalUSDC.toFixed(6), 6)
      const timestamp = BigInt(Math.floor(Date.now() / 1000))

      console.log('Step 1: Getting hash parameters from Poseidon contract...')
      
      const [amountHash, priceHash, timestampHash] = await publicClient.readContract({
        address: CONTRACTS.POSEIDON_COMMITMENT,
        abi: POSEIDON_BID_COMMITMENT_ABI,
        functionName: 'hashParameters',
        args: [amountWei, priceWei, timestamp]
      }) as [Hex, Hex, Hex]

      console.log('Hash parameters:', { amountHash, priceHash, timestampHash })

      console.log('Step 2: Generating commitment hash...')
      
      const generatedCommitmentHash = await publicClient.readContract({
        address: CONTRACTS.POSEIDON_COMMITMENT,
        abi: POSEIDON_BID_COMMITMENT_ABI,
        functionName: 'generateCommitmentHash',
        args: [address, selectedAuctionAddress as Address, amountHash, priceHash, timestampHash]
      }) as Hex

      console.log('Commitment hash:', generatedCommitmentHash)

      console.log('Step 3: Submitting to Poseidon commitment contract (triggers MetaMask)...')
      
      const txHash = await walletClient.writeContract({
        address: CONTRACTS.POSEIDON_COMMITMENT,
        abi: POSEIDON_BID_COMMITMENT_ABI,
        functionName: 'commitBid',
        args: [
          address,
          selectedAuctionAddress as Address,
          amountHash,
          priceHash,
          timestampHash
        ],
        account: walletClient.account!,
        chain: walletClient.chain!,
      })

      console.log('Transaction submitted:', txHash)
      setSuccess(`Transaction submitted! Hash: ${txHash.slice(0, 20)}...`)

      console.log('Step 4: Waiting for confirmation...')
      
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        confirmations: 1
      })

      if (receipt.status === 'success') {
        console.log('Sealed bid committed on-chain!')
        
        const completeData = {
          commitmentHash: generatedCommitmentHash,
          bidder: address,
          auction: selectedAuctionAddress,
          amount: bidAmount,
          price: bidPrice,
          totalUSDC: totalUSDC.toFixed(2),
          amountWei: amountWei.toString(),
          priceWei: priceWei.toString(),
          timestamp: Number(timestamp),
          txHash,
          blockNumber: receipt.blockNumber.toString(),
          amountHash,
          priceHash,
          timestampHash
        }

        setSealedData(completeData)
        setCommitmentHash(generatedCommitmentHash)

        const localSecret = keccak256(
          toHex(`${address}:${selectedAuctionAddress}:${amountWei}:${priceWei}:${timestamp}`)
        )
        
        if (typeof window !== 'undefined') {
          const key = `poseidon-commitment-${selectedAuctionAddress.toLowerCase()}`
          const existing = JSON.parse(localStorage.getItem(key) || '[]')
          existing.push({
            ...completeData,
            secret: localSecret
          })
          localStorage.setItem(key, JSON.stringify(existing))
        }

        onBidSealed?.(generatedCommitmentHash, txHash)
        setSuccess(`Sealed bid committed on-chain! Commitment: ${generatedCommitmentHash.slice(0, 20)}...`)
        
        setBidAmount('')
        setBidPrice('')

      } else {
        throw new Error('Transaction failed')
      }

    } catch (err: any) {
      console.error('Failed to create/submit sealed bid:', err)
      if (err.message?.includes('User rejected')) {
        setError('Transaction cancelled by user')
      } else {
        setError(err.message || 'Failed to submit bid')
      }
    } finally {
      setIsSealing(false)
      setIsSubmitting(false)
    }
  }

  const handleLoadStored = () => {
    if (typeof window === 'undefined') return
    
    const key = `poseidon-commitment-${selectedAuctionAddress.toLowerCase()}`
    const stored = JSON.parse(localStorage.getItem(key) || '[]')
    setStoredBids(stored)
    setShowStored(true)
  }

  if (activeAuctions.length === 0 && !propAuctionAddress) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center shadow-sm">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-gray-400 text-2xl">&#9863;</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Auctions</h3>
        <p className="text-sm text-gray-500 mb-4">
          Create an auction first to start bidding
        </p>
        <button
          onClick={() => window.location.href = '/?tab=create'}
          className="w-full py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-medium transition-colors"
        >
          Create Auction
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Place Sealed Bid</h3>
          {auctionDetails?.ensName && (
            <span className="text-xs px-2 py-1 bg-pink-50 text-pink-600 rounded-full">
              {auctionDetails.ensName}
            </span>
          )}
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Select Auction</label>
              <select
                value={selectedAuctionAddress}
                onChange={(e) => setSelectedAuctionAddress(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                <option value="">Select auction...</option>
                {activeAuctions.map((auction) => (
                  <option key={auction.address} value={auction.address}>
                    {auction.ensName || auction.address.slice(0, 10) + '...'}
                  </option>
                ))}
              </select>
            </div>

            {auctionDetails && (
              <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="text-center">
                  <p className="text-xs text-gray-500">Floor</p>
                  <p className="text-sm font-medium text-gray-900">{auctionDetails.floorPrice} USDC</p>
                </div>
                <div className="text-center border-x border-gray-200">
                  <p className="text-xs text-gray-500">Tick</p>
                  <p className="text-sm font-medium text-gray-900">{auctionDetails.tickSpacing} USDC</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Status</p>
                  <p className={`text-sm font-medium ${auctionDetails.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                    {auctionDetails.isActive ? 'Active' : auctionDetails.isEnded ? 'Ended' : 'Pending'}
                  </p>
                </div>
              </div>
            )}

            <div className="p-3 bg-gray-50 rounded-xl">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-500">Balance</span>
                <span className="text-sm font-medium text-gray-900">{availableBalance} USDC</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Token Amount</label>
              <input
                type="number"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                placeholder="0.0"
                step="0.01"
                min="0"
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent placeholder-gray-400"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Max Price (USDC per token)</label>
              <input
                type="number"
                value={bidPrice}
                onChange={(e) => setBidPrice(e.target.value)}
                placeholder="0.0"
                step="0.01"
                min="0"
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent placeholder-gray-400"
              />
              {auctionDetails && (
                <p className="text-xs text-gray-400 mt-1">
                  Floor: {auctionDetails.floorPrice} USDC | Tick: {auctionDetails.tickSpacing} USDC
                </p>
              )}
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={useCCTP}
                  onChange={(e) => setUseCCTP(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-pink-500 focus:ring-pink-500"
                />
                <span className="text-sm text-gray-700">Use Cross-Chain USDC (CCTP)</span>
              </div>
              {useCCTP && (
                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full">Gateway</span>
              )}
            </div>

            {bidAmount && bidPrice && (
              <div className="p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl border border-pink-100">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Value</span>
                  <span className="text-xl font-bold text-gray-900">
                    {(parseFloat(bidAmount || '0') * parseFloat(bidPrice || '0')).toFixed(4)} USDC
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-50 border border-green-100 rounded-xl">
                <p className="text-sm text-green-600">{success}</p>
              </div>
            )}

            <button
              onClick={handleCreateAndSubmitSealedBid}
              disabled={isSealing || isSubmitting || !bidAmount || !bidPrice || !selectedAuctionAddress || !auctionDetails?.isActive || !isConnected}
              className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 disabled:from-gray-300 disabled:to-gray-300 text-white rounded-xl font-semibold transition-all shadow-lg shadow-pink-500/25 disabled:shadow-none"
            >
              {!isConnected ? (
                'Connect Wallet'
              ) : isSealing || isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {isSealing ? 'Creating Commitment...' : 'Submitting to Chain...'}
                </span>
              ) : (
                'Submit Sealed Bid'
              )}
            </button>
          </div>
        )}
      </div>

      {sealedData && (
        <div className="bg-white rounded-2xl border border-green-200 p-5 shadow-sm">
          <h4 className="text-sm font-semibold text-green-800 mb-3">Bid Committed On-Chain</h4>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Commitment:</span>
              <code className="text-gray-900 font-mono">{sealedData.commitmentHash?.slice(0, 20)}...</code>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Amount:</span>
              <span className="text-gray-900">{sealedData.amount} tokens</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Price:</span>
              <span className="text-gray-900">{sealedData.price} USDC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Transaction:</span>
              <a 
                href={`https://sepolia.etherscan.io/tx/${sealedData.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-pink-600 hover:underline font-mono"
              >
                {sealedData.txHash?.slice(0, 16)}...
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-900">Your Commitments</h4>
          <button
            onClick={handleLoadStored}
            className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
          >
            {showStored ? 'Refresh' : 'Load'}
          </button>
        </div>
        
        {showStored && (
          <div className="space-y-2">
            {storedBids.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No commitments yet</p>
            ) : (
              storedBids.slice(0, 5).map((bid, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-xl text-xs">
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-500">Commitment:</span>
                    <code className="text-gray-900 font-mono">{bid.commitmentHash?.slice(0, 16)}...</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Value:</span>
                    <span className="text-gray-900">{bid.totalUSDC} USDC</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="bg-gray-50 rounded-2xl p-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">How it works</h4>
        <ul className="space-y-1.5 text-xs text-gray-500">
          <li className="flex items-start gap-2">
            <span className="text-pink-500">1.</span>
            <span>Your bid is hashed with Poseidon (ZK-friendly)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-pink-500">2.</span>
            <span>Commitment is submitted directly on-chain</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-pink-500">3.</span>
            <span>Bid details remain private until auction ends</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-pink-500">4.</span>
            <span>Reveal your bid to claim tokens at clearing price</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
