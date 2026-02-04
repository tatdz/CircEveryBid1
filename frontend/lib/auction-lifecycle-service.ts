// lib/auction-lifecycle-service.ts
import { type Address, type Hex, parseUnits, formatUnits } from 'viem'
import { loadStoredBids, type StoredBid } from './zk-service'
import { updateAuctionPerformance } from './namestone-updater'

export interface AuctionState {
  address: Address
  status: 'ACTIVE' | 'ENDED' | 'SETTLED' | 'CANCELLED'
  clearingPrice: bigint
  currencyRaised: bigint
  startTime: number
  endTime: number
  totalBids: number
  revealedBids: number
}

export interface Winner {
  bidder: Address
  bidAmount: string
  bidPrice: string
  winningAmount: string
  claimStatus: 'PENDING' | 'CLAIMED' | 'FAILED'
  claimTxHash?: string
  ensUpdated: boolean
}

export interface AuctionResult {
  auctionAddress: Address
  winners: Winner[]
  totalCleared: string
  clearingPrice: string
  settledAt: number
}

const CCA_ABI = [
  {
    name: 'endAuction',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: []
  },
  {
    name: 'settleAuction',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: []
  },
  {
    name: 'revealBid',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'commitment', type: 'bytes32' },
      { name: 'amount', type: 'uint256' },
      { name: 'price', type: 'uint256' },
      { name: 'salt', type: 'bytes32' }
    ],
    outputs: []
  },
  {
    name: 'claimWinnings',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'getAuctionState',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'clearingPrice', type: 'uint256' },
      { name: 'currencyRaised', type: 'uint256' },
      { name: 'isEnded', type: 'bool' },
      { name: 'isSettled', type: 'bool' }
    ]
  },
  {
    name: 'getWinnerInfo',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'bidder', type: 'address' }],
    outputs: [
      { name: 'isWinner', type: 'bool' },
      { name: 'winningAmount', type: 'uint256' },
      { name: 'hasClaimed', type: 'bool' }
    ]
  }
] as const

export async function getAuctionState(
  auctionAddress: Address,
  publicClient: any
): Promise<AuctionState> {
  console.log('📊 Fetching auction state:', auctionAddress)
  
  try {
    const [clearingPrice, currencyRaised, isEnded, isSettled] = await publicClient.readContract({
      address: auctionAddress,
      abi: CCA_ABI,
      functionName: 'getAuctionState'
    }) as [bigint, bigint, boolean, boolean]
    
    let status: AuctionState['status'] = 'ACTIVE'
    if (isSettled) status = 'SETTLED'
    else if (isEnded) status = 'ENDED'
    
    const storedBids = loadStoredBids()
    const auctionBids = storedBids.filter(
      b => b.auction.toLowerCase() === auctionAddress.toLowerCase()
    )
    
    return {
      address: auctionAddress,
      status,
      clearingPrice,
      currencyRaised,
      startTime: 0,
      endTime: 0,
      totalBids: auctionBids.length,
      revealedBids: 0
    }
  } catch (error: any) {
    console.warn('Failed to get auction state:', error.message)
    
    const storedBids = loadStoredBids()
    const auctionBids = storedBids.filter(
      b => b.auction.toLowerCase() === auctionAddress.toLowerCase()
    )
    
    return {
      address: auctionAddress,
      status: 'ACTIVE',
      clearingPrice: 0n,
      currencyRaised: 0n,
      startTime: 0,
      endTime: 0,
      totalBids: auctionBids.length,
      revealedBids: 0
    }
  }
}

export async function revealBid(
  bid: StoredBid,
  walletClient: any,
  publicClient: any
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  console.log('🔓 Revealing bid:', bid.commitmentHash)
  
  try {
    const txHash = await walletClient.writeContract({
      address: bid.auction as Address,
      abi: CCA_ABI,
      functionName: 'revealBid',
      args: [
        bid.commitmentHash as Hex,
        parseUnits(bid.amount, 6),
        parseUnits(bid.price, 18),
        bid.zkProof.hiddenData.salt as Hex
      ],
      gas: 300000n
    })
    
    console.log('  Reveal TX:', txHash)
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
    
    if (receipt.status === 'success') {
      console.log('✅ Bid revealed successfully')
      return { success: true, txHash }
    } else {
      return { success: false, error: 'Reveal transaction reverted' }
    }
  } catch (error: any) {
    console.error('❌ Bid reveal failed:', error)
    return { success: false, error: error.shortMessage || error.message }
  }
}

export async function determineWinners(
  auctionAddress: Address,
  publicClient: any
): Promise<Winner[]> {
  console.log('🏆 Determining winners for auction:', auctionAddress)
  
  const storedBids = loadStoredBids()
  const auctionBids = storedBids.filter(
    b => b.auction.toLowerCase() === auctionAddress.toLowerCase()
  )
  
  if (auctionBids.length === 0) {
    console.log('  No bids found for this auction')
    return []
  }
  
  const sortedBids = [...auctionBids].sort((a, b) => {
    const priceA = parseFloat(a.price)
    const priceB = parseFloat(b.price)
    if (priceB !== priceA) return priceB - priceA
    return parseFloat(b.amount) - parseFloat(a.amount)
  })
  
  const winners: Winner[] = []
  
  for (const bid of sortedBids) {
    try {
      const [isWinner, winningAmount, hasClaimed] = await publicClient.readContract({
        address: auctionAddress,
        abi: CCA_ABI,
        functionName: 'getWinnerInfo',
        args: [bid.bidder as Address]
      }) as [boolean, bigint, boolean]
      
      if (isWinner) {
        winners.push({
          bidder: bid.bidder as Address,
          bidAmount: bid.amount,
          bidPrice: bid.price,
          winningAmount: formatUnits(winningAmount, 6),
          claimStatus: hasClaimed ? 'CLAIMED' : 'PENDING',
          ensUpdated: false
        })
      }
    } catch (error) {
      winners.push({
        bidder: bid.bidder as Address,
        bidAmount: bid.amount,
        bidPrice: bid.price,
        winningAmount: bid.amount,
        claimStatus: 'PENDING',
        ensUpdated: false
      })
    }
  }
  
  console.log(`  Found ${winners.length} winners`)
  return winners
}

export async function claimWinnings(
  auctionAddress: Address,
  walletClient: any,
  publicClient: any
): Promise<{ success: boolean; txHash?: string; amount?: string; error?: string }> {
  console.log('💰 Claiming winnings from auction:', auctionAddress)
  
  try {
    const txHash = await walletClient.writeContract({
      address: auctionAddress,
      abi: CCA_ABI,
      functionName: 'claimWinnings',
      gas: 300000n
    })
    
    console.log('  Claim TX:', txHash)
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
    
    if (receipt.status === 'success') {
      console.log('✅ Winnings claimed successfully')
      return { success: true, txHash, amount: '0' }
    } else {
      return { success: false, error: 'Claim transaction reverted' }
    }
  } catch (error: any) {
    console.error('❌ Claim failed:', error)
    return { success: false, error: error.shortMessage || error.message }
  }
}

export async function settleAuctionComplete(
  auctionAddress: Address,
  ensSubdomain: string,
  walletClient: any,
  publicClient: any
): Promise<AuctionResult> {
  console.log('🔨 === SETTLING AUCTION ===')
  console.log('  Auction:', auctionAddress)
  console.log('  ENS Subdomain:', ensSubdomain)
  
  const state = await getAuctionState(auctionAddress, publicClient)
  const winners = await determineWinners(auctionAddress, publicClient)
  
  for (const winner of winners) {
    const storedBids = loadStoredBids()
    const bidderBids = storedBids.filter(
      b => b.bidder.toLowerCase() === winner.bidder.toLowerCase() &&
           b.auction.toLowerCase() === auctionAddress.toLowerCase()
    )
    
    const totalVolume = bidderBids.reduce((sum, b) => sum + parseFloat(b.amount), 0)
    
    try {
      await updateAuctionPerformance(
        ensSubdomain,
        bidderBids.length,
        totalVolume.toString(),
        0,
        winner.bidder
      )
      winner.ensUpdated = true
      console.log(`  ✅ ENS updated for winner: ${winner.bidder.slice(0,10)}...`)
    } catch (error) {
      console.warn(`  ⚠️ ENS update failed for ${winner.bidder.slice(0,10)}...`)
    }
  }
  
  return {
    auctionAddress,
    winners,
    totalCleared: formatUnits(state.currencyRaised, 6),
    clearingPrice: formatUnits(state.clearingPrice, 18),
    settledAt: Date.now()
  }
}
