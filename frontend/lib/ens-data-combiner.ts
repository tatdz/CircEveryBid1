// lib/ens-data-combiner.ts - FIXED
import { type Address } from 'viem'

export interface AuctionData {
  auctionAddress: string
  creatorAddress: string
  totalBids: number
  totalVolume: string
  crossChainBids: number
  lastUpdated: number
  bidders: string[]
  successRate: number
  avgPriceImprovement: number
  createdAt: number
  auctionParams: {
    floorPrice: string
    tickSpacing: string
    durationBlocks: string
    startDelayBlocks: string
    auctionTokenAmount: string
    currency: string
  }
}

export interface ReputationData {
  creatorAddress: string
  totalAuctions: number
  successfulAuctions: number
  volume: string
  completionRate: number
  avgPriceImprovement: number
  score: number
  lastUpdated: number
}

export interface CombinedAuctionInfo {
  // From Namestone
  namestoneData: {
    auctionInfo: AuctionData | null
    reputationInfo: ReputationData | null
    url: string | null
    timestamp: number | null
  }
  // From ENS app
  ensAppData: {
    url: string | null
    location: string | null
    company: string | null
    name: string | null
    email: string | null
    keywords: string | null
    description: string | null
    notice: string | null
  }
  // Combined/parsed data
  combined: {
    auctionAddress: string
    creatorAddress: string
    etherscanUrl: string
    totalBids: number
    totalVolume: string
    reputationScore: number
    successRate: number
    floorPrice: string
    tickSpacing: string
    createdAt: string
    lastUpdated: string
    isActive: boolean
  }
}

/**
 * Fetch data from Namestone API
 */
export async function fetchFromNamestone(subdomain: string): Promise<any> {
  try {
    const response = await fetch(`/api/ens/test-records`)
    if (!response.ok) return null
    
    const data = await response.json()
    if (!data.success) return null
    
    // Find the specific subdomain
    const subdomainData = data.names.find((n: any) => n.name === subdomain)
    return subdomainData || null
  } catch (error) {
    console.error('Failed to fetch from Namestone:', error)
    return null
  }
}

/**
 * Parse text records from Namestone data
 */
function parseNamestoneTextRecords(textRecords: any): {
  auctionInfo: AuctionData | null
  reputationInfo: ReputationData | null
  url: string | null
  timestamp: number | null // Added timestamp
} {
  try {
    let auctionInfo: AuctionData | null = null
    let reputationInfo: ReputationData | null = null
    let url: string | null = null
    let timestamp: number | null = null
    
    // Try to parse from standard fields first
    if (textRecords?.location) {
      try {
        const parsed = JSON.parse(textRecords.location)
        if (parsed.type === 'circauction' || parsed.auctionAddress) {
          auctionInfo = parsed
        }
      } catch (e) {
        console.warn('Could not parse location field:', e)
      }
    }
    
    if (textRecords?.company) {
      try {
        const parsed = JSON.parse(textRecords.company)
        if (parsed.type === 'circauction_reputation' || parsed.creatorAddress) {
          reputationInfo = parsed
        }
      } catch (e) {
        console.warn('Could not parse company field:', e)
      }
    }
    
    // Get URL
    url = textRecords?.url || null
    
    // Get timestamp from created field
    if (textRecords?.created) {
      try {
        timestamp = parseInt(textRecords.created)
      } catch (e) {
        console.warn('Could not parse timestamp:', e)
      }
    }
    
    return { auctionInfo, reputationInfo, url, timestamp }
  } catch (error) {
    console.error('Failed to parse Namestone records:', error)
    return { 
      auctionInfo: null, 
      reputationInfo: null, 
      url: null, 
      timestamp: null 
    }
  }
}

/**
 * Combine data from both sources
 */
export async function getCombinedAuctionInfo(
  subdomain: string,
  auctionAddress?: string
): Promise<CombinedAuctionInfo> {
  const fullDomain = `${subdomain}.circeverybid.eth`
  
  // 1. Fetch from Namestone
  const namestoneData = await fetchFromNamestone(subdomain)
  
  // 2. Parse Namestone data
  let namestoneParsed = parseNamestoneTextRecords(namestoneData?.textRecords || {})
  
  // If we have namestoneData but no timestamp from text records, use createdAt
  if (namestoneData?.createdAt && !namestoneParsed.timestamp) {
    namestoneParsed.timestamp = new Date(namestoneData.createdAt).getTime()
  }
  
  // 3. Use auctionAddress from Namestone if not provided
  const finalAuctionAddress = auctionAddress || namestoneParsed.auctionInfo?.auctionAddress
  
  // 4. Create combined data
  const combined: CombinedAuctionInfo['combined'] = {
    auctionAddress: finalAuctionAddress || '',
    creatorAddress: namestoneParsed.auctionInfo?.creatorAddress || namestoneData?.address || '',
    etherscanUrl: namestoneParsed.url || `https://sepolia.etherscan.io/address/${finalAuctionAddress}`,
    totalBids: namestoneParsed.auctionInfo?.totalBids || 0,
    totalVolume: namestoneParsed.auctionInfo?.totalVolume || "0",
    reputationScore: namestoneParsed.reputationInfo?.score || 50,
    successRate: namestoneParsed.auctionInfo?.successRate || 0,
    floorPrice: namestoneParsed.auctionInfo?.auctionParams?.floorPrice || '0.01',
    tickSpacing: namestoneParsed.auctionInfo?.auctionParams?.tickSpacing || '0.01',
    createdAt: namestoneParsed.auctionInfo?.createdAt ? 
      new Date(namestoneParsed.auctionInfo.createdAt).toLocaleDateString() : 'Unknown',
    lastUpdated: namestoneParsed.auctionInfo?.lastUpdated ?
      new Date(namestoneParsed.auctionInfo.lastUpdated).toLocaleDateString() : 'Unknown',
    isActive: true // You can add logic to check if auction is active
  }
  
  return {
    namestoneData: namestoneParsed,
    ensAppData: {
      url: namestoneParsed.url,
      location: namestoneData?.textRecords?.location || null,
      company: namestoneData?.textRecords?.company || null,
      name: namestoneData?.textRecords?.name || null,
      email: namestoneData?.textRecords?.email || null,
      keywords: namestoneData?.textRecords?.keywords || null,
      description: namestoneData?.textRecords?.description || null,
      notice: namestoneData?.textRecords?.notice || null,
    },
    combined
  }
}

/**
 * Calculate auction tier based on score
 */
export function getAuctionTier(score: number): {
  tier: string
  color: string
  icon: string
  description: string
} {
  if (score >= 95) return {
    tier: 'Legendary',
    color: 'from-purple-600 to-pink-600',
    icon: '👑',
    description: 'Top 1% of auctions'
  }
  if (score >= 90) return {
    tier: 'Master',
    color: 'from-blue-600 to-cyan-600',
    icon: '🏆',
    description: 'Excellent performance'
  }
  if (score >= 80) return {
    tier: 'Expert',
    color: 'from-green-600 to-emerald-600',
    icon: '⭐',
    description: 'Highly reliable'
  }
  if (score >= 70) return {
    tier: 'Advanced',
    color: 'from-yellow-600 to-orange-600',
    icon: '⚡',
    description: 'Strong performance'
  }
  if (score >= 60) return {
    tier: 'Intermediate',
    color: 'from-orange-500 to-red-500',
    icon: '📈',
    description: 'Growing reputation'
  }
  return {
    tier: 'Beginner',
    color: 'from-gray-500 to-slate-600',
    icon: '🌱',
    description: 'New auction creator'
  }
}

/**
 * Format volume for display
 */
export function formatVolume(volume: string): string {
  try {
    const num = parseFloat(volume)
    if (isNaN(num)) return '$0'
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`
    return `$${num.toFixed(2)}`
  } catch {
    return '$0'
  }
}