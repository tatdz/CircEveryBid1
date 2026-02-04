// lib/namestone-updater.ts
// Note: Direct ENS resolver updates removed - Namestone manages subdomain records
// Users don't have on-chain permission to call setText() on Namestone-managed subdomains

/**
 * Update auction performance data in Namestone after each bid
 */
export async function updateAuctionPerformance(
  subdomain: string,
  newBidCount: number,
  newVolume: string,
  crossChainBidCount: number = 0,
  bidderAddress?: string
): Promise<{ success: boolean; error?: string }> {
  console.log('📝 Namestone update starting for:', subdomain)
  
  try {
    // First, get existing subdomain data from Namestone
    const response = await fetch(`/api/ens/get-subnames?domain=circeverybid.eth`)
    if (!response.ok) {
      console.error('Failed to fetch subnames, status:', response.status)
      throw new Error('Failed to fetch current data from Namestone')
    }
    
    const data = await response.json()
    const subnames = data.data || data.names || []
    console.log('📋 Got subnames response:', data.success, 'count:', subnames.length)
    
    if (!data.success || subnames.length === 0) {
      return { success: false, error: 'Could not fetch subnames' }
    }
    
    const subdomainData = subnames.find((n: any) => n.name === subdomain)
    
    if (!subdomainData) {
      console.warn('Subdomain not found in Namestone:', subdomain)
      return { success: false, error: `Subdomain "${subdomain}" not found` }
    }
    
    console.log('📋 Found subdomain:', subdomainData.name)
    
    // Parse existing auction info from location text record
    const existingTextRecords = subdomainData.text_records || {}
    let auctionInfo = {
      auctionAddress: '',
      creatorAddress: '',
      totalBids: 0,
      totalVolume: "0",
      crossChainBids: 0,
      lastUpdated: Date.now(),
      bidders: [] as string[],
      successRate: 0,
      avgPriceImprovement: 0,
      createdAt: Date.now(),
      auctionParams: {}
    }
    
    if (existingTextRecords.location) {
      try {
        const parsed = JSON.parse(existingTextRecords.location)
        if (parsed.auctionAddress) {
          auctionInfo = { ...auctionInfo, ...parsed }
        }
        console.log('📋 Existing auction info parsed, bids:', auctionInfo.totalBids)
      } catch (e) {
        console.warn('Could not parse existing location:', e)
      }
    }
    
    // Update the data with new bid info
    const updatedAuctionInfo = {
      ...auctionInfo,
      totalBids: newBidCount,
      totalVolume: newVolume,
      crossChainBids: crossChainBidCount,
      bidders: bidderAddress && !auctionInfo.bidders.includes(bidderAddress.toLowerCase())
        ? [...auctionInfo.bidders, bidderAddress.toLowerCase()]
        : auctionInfo.bidders,
      lastUpdated: Date.now()
    }
    
    console.log('📝 Updated auction info:', {
      totalBids: updatedAuctionInfo.totalBids,
      totalVolume: updatedAuctionInfo.totalVolume,
      bidders: updatedAuctionInfo.bidders.length
    })
    
    // Prepare update payload
    const updateData = {
      location: JSON.stringify(updatedAuctionInfo)
    }
    
    // Call the simple-update API
    const updateResponse = await fetch('/api/ens/simple-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subdomain,
        textRecords: updateData,
        ownerAddress: auctionInfo.creatorAddress || subdomainData.address
      })
    })
    
    const result = await updateResponse.json()
    console.log('📝 Update response:', result.success, result.message || result.error)
    
    if (!updateResponse.ok) {
      return { success: false, error: result.error || result.message || 'Update failed' }
    }
    
    if (result.success) {
      console.log('✅ Auction performance updated in Namestone:', subdomain)
      // Note: On-chain ENS text records are managed by Namestone's resolver
      // Text records are visible via Namestone API but not on sepolia.app.ens.domains
      // This is expected behavior for Namestone-managed subdomains
      return { success: true }
    } else {
      return { success: false, error: result.error || 'Unknown error' }
    }
    
  } catch (error: any) {
    console.error('❌ Failed to update auction performance:', error.message)
    return { success: false, error: error.message }
  }
}
