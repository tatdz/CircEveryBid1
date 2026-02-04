// lib/bid-tracker.ts
import { type Address } from 'viem'
import { addBidderToAuctionRecord, getAuctionPerformanceFromENS } from './ens-data-reader'

/**
 * Track a bid and update on-chain records
 */
export async function trackBid(
  auctionAddress: string,
  ensDomain: string,
  bidderAddress: string,
  bidAmount: string,
  bidPrice: string,
  isCrossChain: boolean,
  accountAddress: Address
): Promise<string> {
  try {
    console.log('📝 Tracking bid on-chain...', {
      auction: auctionAddress,
      domain: ensDomain,
      bidder: bidderAddress,
      amount: bidAmount
    })
    
    const txHash = await addBidderToAuctionRecord(
      ensDomain,
      bidderAddress,
      bidAmount,
      bidPrice,
      isCrossChain,
      accountAddress
    )
    
    // Update creator reputation if needed
    const performance = await getAuctionPerformanceFromENS(ensDomain)
    if (performance && performance.creatorAddress) {
      // You could update creator reputation here based on bid success
    }
    
    return txHash
  } catch (error: any) {
    console.error('❌ Failed to track bid:', error)
    throw error
  }
}