// app/api/ens/register-subname/route.ts 
import { NextRequest, NextResponse } from 'next/server'
import NameStone from '@namestone/namestone-sdk'

const NAMESTONE_API_BASE = 'https://namestone.com/api/public_v1_sepolia'

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.NAMESTONE_API_KEY
    
    if (!apiKey) {
      console.error('NAMESTONE_API_KEY is not set')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }
    
    const body = await request.json()
    const { subdomain, ownerAddress, auctionData } = body
    
    if (!subdomain || !ownerAddress || !auctionData?.auctionAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: subdomain, ownerAddress, or auctionData' },
        { status: 400 }
      )
    }
    
    // Validate subdomain format
    const validPattern = /^[a-z0-9-_]+$/i
    if (!validPattern.test(subdomain)) {
      return NextResponse.json(
        { error: 'Invalid subdomain format. Only alphanumeric characters, hyphens, and underscores allowed.' },
        { status: 400 }
      )
    }
    
    // Validate length
    if (subdomain.length < 3 || subdomain.length > 20) {
      return NextResponse.json(
        { error: 'Subdomain must be between 3 and 20 characters' },
        { status: 400 }
      )
    }
    
    const ns = new NameStone(apiKey, { baseUrl: NAMESTONE_API_BASE })
    
    const timestamp = Date.now()
    const fullDomain = `${subdomain}.circeverybid.eth`
    
    // 1. Store auction info in STANDARD 'location' field (JSON encoded)
    const auctionInfo = JSON.stringify({
      auctionAddress: auctionData.auctionAddress,
      creatorAddress: ownerAddress,
      totalBids: 0,
      totalVolume: "0",
      crossChainBids: 0,
      lastUpdated: timestamp,
      bidders: [],
      successRate: 0,
      avgPriceImprovement: 0,
      createdAt: timestamp,
      auctionParams: auctionData.auctionParams || {}
    })
    
    // 2. Store reputation info in STANDARD 'company' field (JSON encoded)
    const reputationInfo = JSON.stringify({
      creatorAddress: ownerAddress,
      totalAuctions: 1,
      successfulAuctions: 0,
      volume: "0",
      completionRate: 0,
      avgPriceImprovement: 0,
      score: 50,
      lastUpdated: timestamp
    })
    
    // 3. Build text records using ONLY standard ENS fields
    const textRecords: Record<string, string> = {
      // URL: Etherscan link (will appear on ENS app)
      'url': `https://sepolia.etherscan.io/address/${auctionData.auctionAddress}`,
      
      // Location: Auction data JSON (standard field, will sync)
      'location': auctionInfo,
      
      // Company: Reputation data JSON (standard field, will sync)
      'company': reputationInfo,
      
      // Name: Short auction identifier
      'name': `Auction-${auctionData.auctionAddress.slice(2, 10)}`,
      
      // Email: Encoded auction info
      'email': `auction+${auctionData.auctionAddress.slice(2, 10)}@circeverybid.xyz`,
      
      // Keywords: Searchable auction tags
      'keywords': `auction,${auctionData.auctionAddress},${ownerAddress.slice(2, 10)}`,
      
      // Description: Human readable auction info
      'description': `USDC Auction - Floor: ${auctionData.auctionParams?.floorPrice || '0.01'} - Creator: ${ownerAddress.slice(0, 8)}...`,
      
      // Store additional metadata in notice field
      'notice': `CircEveryBid Auction - Created: ${new Date(timestamp).toISOString()}`
    }
    
    console.log('📝 Registering with standard text records:', {
      subdomain,
      ownerAddress,
      auctionAddress: auctionData.auctionAddress,
      textRecordKeys: Object.keys(textRecords)
    })
    
    // Register the subname
    const result = await ns.setName({
      domain: 'circeverybid.eth',
      name: subdomain,
      address: ownerAddress,
      text_records: textRecords,
    })
    
    console.log('✅ Registration successful with standard fields')
    
    return NextResponse.json({
      success: true,
      data: result,
      message: `Successfully registered ${fullDomain}`,
      fullDomain,
      textRecords,
      timestamp
    })
    
  } catch (error: any) {
    console.error('API route error:', error)
    
    // Try to get the body for error message
    let errorSubdomain = 'unknown'
    try {
      const errorBody = await request.json()
      errorSubdomain = errorBody.subdomain || 'unknown'
    } catch (e) {
      // Ignore parsing error
    }
    
    if (error.message?.includes('already exists') || error.message?.includes('Name claimed')) {
      return NextResponse.json(
        { 
          error: 'Subname already exists',
          code: 'SUBDOMAIN_EXISTS',
          message: `"${errorSubdomain}.circeverybid.eth" is already registered`
        },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to register subname', message: error.message || 'Unknown error' },
      { status: 500 }
    )
  }
}