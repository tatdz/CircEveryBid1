// lib/ens-data-read.ts
import { type Address, type Hex } from 'viem'
import { writeContract, readContract } from './wagmi-contract-helpers'
import { CONTRACTS, ENS_CONFIG } from './contracts'
import { ENS_RESOLVER_ABI } from './abis'
import { namehash } from './ens-service'

export interface ReputationScore {
  score: number
  totalAuctions: number
  successfulAuctions: number
  volume: string
  completionRate: number
  lastUpdated: number
}

export interface AuctionPerformanceData {
  auctionAddress: string
  creatorAddress: string
  totalBids: number
  totalVolume: string
  crossChainBids: number
  lastUpdated: number
  bidders: string[]
  bidDetails?: Array<{
    bidder: string
    amount: string
    price: string
    isCrossChain: boolean
    timestamp: number
  }>
  successRate?: number
  avgPriceImprovement?: number
  createdAt?: number
  auctionParams?: {
    startDelayBlocks: string
    durationBlocks: string
    tickSpacing: string
    floorPrice: string
    tokenAmount: string
    currency: string
  }
  metadata?: {
    name: string
    description: string
    website: string
    twitter: string
    github: string
    avatar: string
  }
  status?: string
  auctionEndTime?: number
  claimable?: boolean
}

/**
 * Calculate reputation score from performance metrics
 */
export function calculateReputationScore(metrics: {
  totalAuctions: number
  successRate: number
  totalVolume: bigint
  avgPriceImprovement: number
}): number {
  let score = 0
  
  // Weight: Total auctions (max 30 points)
  score += Math.min(metrics.totalAuctions * 5, 30)
  
  // Weight: Success rate (max 40 points)
  score += Math.min(metrics.successRate * 0.4, 40)
  
  // Weight: Volume (max 20 points)
  // Assuming 1 ETH = 1 point, max 20 ETH
  const volumeETH = Number(metrics.totalVolume) / 1e18
  score += Math.min(volumeETH, 20)
  
  // Weight: Price improvement (max 10 points)
  // 1% improvement = 1 point, max 10%
  score += Math.min(metrics.avgPriceImprovement, 10)
  
  return Math.min(Math.round(score), 100)
}

/**
 * Store auction performance data in ENS text records
 */
export async function storeAuctionPerformanceOnENS(
  ensDomain: string,  // e.g., "myauction.circeverybid.eth"
  auctionAddress: string,
  creatorAddress: string,
  totalBids: number = 0,
  totalVolume: string = '0',
  crossChainBids: number = 0,
  accountAddress: Address
): Promise<Hex> {
  const node = namehash(ensDomain)
  
  const performanceData: AuctionPerformanceData = {
    auctionAddress,
    creatorAddress: creatorAddress.toLowerCase(),
    totalBids,
    totalVolume,
    crossChainBids,
    lastUpdated: Date.now(),
    bidders: [],
    successRate: 0,
    avgPriceImprovement: 0,
    createdAt: Date.now()
  }
  
  const { hash } = await writeContract(
    CONTRACTS.ENS_RESOLVER,
    ENS_RESOLVER_ABI,
    'setText',
    [node, 'circauction.performance', JSON.stringify(performanceData)],
    { account: accountAddress }
  )
  
  console.log('📝 Auction performance stored on ENS:', {
    domain: ensDomain,
    node,
    txHash: hash
  })
  
  return hash
}

/**
 * Read auction performance data from ENS text records
 */
export async function getAuctionPerformanceFromENS(
  ensDomain: string
): Promise<AuctionPerformanceData | null> {
  try {
    const node = namehash(ensDomain)
    
    const performanceJSON = await readContract<string>(
      CONTRACTS.ENS_RESOLVER,
      ENS_RESOLVER_ABI,
      'text',
      [node, 'circauction.performance']
    )
    
    if (!performanceJSON) return null
    
    return JSON.parse(performanceJSON) as AuctionPerformanceData
  } catch (error) {
    console.error('Failed to read auction performance:', error)
    return null
  }
}

/**
 * Update bidder information in ENS record
 */
export async function addBidderToAuctionRecord(
  ensDomain: string,
  bidderAddress: string,
  bidAmount: string,
  bidPrice: string,
  isCrossChain: boolean,
  accountAddress: Address
): Promise<Hex> {
  try {
    // First, get existing data
    const existingData = await getAuctionPerformanceFromENS(ensDomain)
    
    if (!existingData) {
      throw new Error('Auction performance data not found')
    }
    
    // Update the data
    existingData.totalBids = (existingData.totalBids || 0) + 1
    existingData.totalVolume = (BigInt(existingData.totalVolume || 0) + BigInt(bidAmount)).toString()
    existingData.crossChainBids = (existingData.crossChainBids || 0) + (isCrossChain ? 1 : 0)
    existingData.lastUpdated = Date.now()
    
    // Add bidder to list if not already there
    if (!existingData.bidders) existingData.bidders = []
    const normalizedBidder = bidderAddress.toLowerCase()
    if (!existingData.bidders.includes(normalizedBidder)) {
      existingData.bidders.push(normalizedBidder)
    }
    
    // Store detailed bid info
    if (!existingData.bidDetails) existingData.bidDetails = []
    existingData.bidDetails.push({
      bidder: normalizedBidder,
      amount: bidAmount,
      price: bidPrice,
      isCrossChain,
      timestamp: Date.now()
    })
    
    // Write back to ENS
    const node = namehash(ensDomain)
    const { hash } = await writeContract(
      CONTRACTS.ENS_RESOLVER,
      ENS_RESOLVER_ABI,
      'setText',
      [node, 'circauction.performance', JSON.stringify(existingData)],
      { account: accountAddress }
    )
    
    console.log('📝 Bidder added to auction record:', {
      domain: ensDomain,
      bidder: bidderAddress,
      txHash: hash
    })
    
    return hash
  } catch (error: any) {
    console.error('Failed to add bidder:', error)
    throw error
  }
}

/**
 * Store creator reputation in ENS text records
 */
export async function storeCreatorReputationOnENS(
  ensDomain: string,  // Creator's ENS name
  creatorAddress: string,
  totalAuctions: number = 1,
  successfulAuctions: number = 0,
  totalVolume: string = '0',
  avgPriceImprovement: string = '0',
  accountAddress: Address
): Promise<Hex> {
  const node = namehash(ensDomain)
  
  // Calculate reputation score
  const successRate = totalAuctions > 0 ? (successfulAuctions / totalAuctions) * 100 : 0
  const score = calculateReputationScore({
    totalAuctions,
    successRate,
    totalVolume: BigInt(totalVolume),
    avgPriceImprovement: parseFloat(avgPriceImprovement)
  })
  
  const reputationData: ReputationScore = {
    score,
    totalAuctions,
    successfulAuctions,
    volume: totalVolume,
    completionRate: successRate,
    lastUpdated: Date.now()
  }
  
  const { hash } = await writeContract(
    CONTRACTS.ENS_RESOLVER,
    ENS_RESOLVER_ABI,
    'setText',
    [node, 'circauction.reputation', JSON.stringify(reputationData)],
    { account: accountAddress }
  )
  
  console.log('📝 Creator reputation stored on ENS:', {
    domain: ensDomain,
    creator: creatorAddress,
    score,
    txHash: hash
  })
  
  return hash
}

/**
 * Get creator reputation from ENS text records
 */
export async function getCreatorReputationFromENS(
  ensDomain: string
): Promise<ReputationScore | null> {
  try {
    const node = namehash(ensDomain)
    
    const reputationJSON = await readContract<string>(
      CONTRACTS.ENS_RESOLVER,
      ENS_RESOLVER_ABI,
      'text',
      [node, 'circauction.reputation']
    )
    
    if (!reputationJSON) return null
    
    return JSON.parse(reputationJSON) as ReputationScore
  } catch (error) {
    console.error('Failed to read creator reputation:', error)
    return null
  }
}

/**
 * Get all auction data from ENS
 */
export async function getAllAuctionDataFromENS(ensDomain: string) {
  const [performance, reputation] = await Promise.all([
    getAuctionPerformanceFromENS(ensDomain),
    getCreatorReputationFromENS(ensDomain)
  ])
  
  return {
    performance,
    reputation,
    hasData: !!performance || !!reputation
  }
}