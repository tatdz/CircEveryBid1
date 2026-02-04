// lib/namestone-service.ts
import { type Address } from 'viem'

/**
 * Register subdomain with auction data via Namestone API
 */
export async function registerSubdomainWithAuction(
  subdomain: string,
  ownerAddress: Address,
  auctionData: {
    auctionAddress: string
    auctionParams?: any
  }
): Promise<{
  success: boolean
  hash?: string
  fullDomain?: string
  ensUrl?: string
  error?: string
  textRecords?: Record<string, string>
}> {
  try {
    console.log('📝 Registering ENS subdomain with auction data via Namestone...')
    
    const response = await fetch('/api/ens/register-subname', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subdomain,
        ownerAddress,
        auctionData
      })
    })
    
    if (!response.ok) {
      const error = await response.json()
      return { 
        success: false, 
        error: error.message || 'Registration failed' 
      }
    }
    
    const result = await response.json()
    
    if (result.success) {
      const fullDomain = `${subdomain}.circeverybid.eth`
      const ensUrl = `https://sepolia.app.ens.domains/${fullDomain}`
      
      console.log('✅ Namestone registration successful with auction data!')
      console.log('🔗 View ENS record:', ensUrl)
      console.log('📋 Full domain:', fullDomain)
      console.log('👤 Owner:', ownerAddress)
      console.log('📊 Auction data stored:', auctionData)
      
      return { 
        success: true, 
        hash: result.data?.hash,
        fullDomain,
        ensUrl,
        textRecords: result.textRecords
      }
    } else {
      return { 
        success: false, 
        error: result.error || 'Registration failed' 
      }
    }
    
  } catch (error: any) {
    console.error('❌ Registration failed:', error)
    return { 
      success: false, 
      error: error.message || 'Registration failed'
    }
  }
}

/**
 * Update text records for existing subdomain via Namestone
 */
export async function updateENSRecordsViaNamestone(
  subdomain: string,
  textRecords: Record<string, string>,
  ownerAddress?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('📝 Updating ENS text records via Namestone for:', subdomain)
    
    const response = await fetch('/api/ens/simple-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subdomain,
        textRecords,
        ownerAddress
      })
    })
    
    if (!response.ok) {
      const error = await response.json()
      return { 
        success: false, 
        error: error.message || 'Failed to update text records' 
      }
    }
    
    const result = await response.json()
    
    if (result.success) {
      console.log('✅ ENS text records updated via Namestone!')
      console.log('📋 Updated records:', textRecords)
      return { success: true }
    } else {
      return { 
        success: false, 
        error: result.error || 'Failed to update text records' 
      }
    }
    
  } catch (error: any) {
    console.error('❌ Failed to update text records via Namestone:', error)
    return { 
      success: false, 
      error: error.message || 'Failed to update text records'
    }
  }
}

/**
 * Store auction performance data on ENS via Namestone
 */
export async function storeAuctionPerformanceViaNamestone(
  subdomain: string,
  performanceData: {
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
    auctionParams?: any
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const textRecords = {
      'circauction.performance': JSON.stringify(performanceData)
    }
    
    return await updateENSRecordsViaNamestone(subdomain, textRecords)
  } catch (error: any) {
    console.error('Failed to store performance data via Namestone:', error)
    return { 
      success: false, 
      error: error.message || 'Failed to store performance data' 
    }
  }
}

/**
 * Store creator reputation data on ENS via Namestone
 */
export async function storeCreatorReputationViaNamestone(
  subdomain: string,
  reputationData: {
    creatorAddress: string
    totalAuctions: number
    successfulAuctions: number
    volume: string
    completionRate: number
    avgPriceImprovement: number
    score: number
    lastUpdated: number
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const textRecords = {
      'circauction.reputation': JSON.stringify(reputationData)
    }
    
    return await updateENSRecordsViaNamestone(subdomain, textRecords)
  } catch (error: any) {
    console.error('Failed to store reputation data via Namestone:', error)
    return { 
      success: false, 
      error: error.message || 'Failed to store reputation data' 
    }
  }
}

/**
 * Update auction bid counts via Namestone
 */
export async function updateAuctionBidCountViaNamestone(
  subdomain: string,
  auctionAddress: string,
  newBidCount: number,
  newVolume: string,
  crossChainBidCount: number = 0,
  bidderAddress?: string,
  ownerAddress?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // First get existing performance data
    const response = await fetch(`/api/ens/get-text-records?subdomain=${encodeURIComponent(subdomain)}`)
    let existingData = {
      auctionAddress,
      creatorAddress: '',
      totalBids: 0,
      totalVolume: "0",
      crossChainBids: 0,
      bidders: [] as string[],
      lastUpdated: Date.now(),
      successRate: 0,
      avgPriceImprovement: 0,
      createdAt: Date.now(),
      auctionParams: {}
    }
    
    if (response.ok) {
      const data = await response.json()
      if (data.performance) {
        try {
          existingData = JSON.parse(data.performance)
        } catch (parseError) {
          console.warn('Could not parse existing performance data:', parseError)
        }
      }
    }
    
    // Update the data
    const updatedData = {
      ...existingData,
      totalBids: newBidCount,
      totalVolume: newVolume,
      crossChainBids: crossChainBidCount,
      bidders: bidderAddress && !existingData.bidders.includes(bidderAddress.toLowerCase())
        ? [...existingData.bidders, bidderAddress.toLowerCase()]
        : existingData.bidders,
      lastUpdated: Date.now()
    }
    
    // Update via Namestone
    return await updateENSRecordsViaNamestone(
      subdomain, 
      {
        'circauction.performance': JSON.stringify(updatedData)
      },
      ownerAddress
    )
    
  } catch (error: any) {
    console.error('Failed to update auction bid count via Namestone:', error)
    return { 
      success: false, 
      error: error.message || 'Failed to update auction bid count' 
    }
  }
}