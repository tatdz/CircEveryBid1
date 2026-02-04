// app/api/ens/check-subname/route.ts
import { NextRequest, NextResponse } from 'next/server'
import NameStone from '@namestone/namestone-sdk'

const NAMESTONE_API_BASE = 'https://namestone.com/api/public_v1_sepolia'

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.NAMESTONE_API_KEY
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }
    
    const searchParams = request.nextUrl.searchParams
    const subdomain = searchParams.get('subdomain')
    const ownerAddress = searchParams.get('ownerAddress')
    
    if (!subdomain) {
      return NextResponse.json(
        { error: 'Missing subdomain parameter' },
        { status: 400 }
      )
    }
    
    const ns = new NameStone(apiKey, { baseUrl: NAMESTONE_API_BASE })
    
    // Get all names for circeverybid.eth
    const names = await ns.getNames({
      domain: 'circeverybid.eth',
    })
    
    // Check if subname exists
    const existingName = names.find(name => name.name === subdomain)
    
    if (existingName) {
      // Subname exists
      return NextResponse.json({
        available: false,
        exists: true,
        owner: existingName.address,
        fullName: `${subdomain}.circeverybid.eth`,
        data: existingName,
        // Check if owned by requested address
        ownedByRequested: ownerAddress 
          ? existingName.address.toLowerCase() === ownerAddress.toLowerCase()
          : undefined
      })
    }
    
    // Check if subname is valid
    const validPattern = /^[a-z0-9-_]+$/i
    const isValid = validPattern.test(subdomain)
    
    return NextResponse.json({
      available: isValid,
      exists: false,
      fullName: `${subdomain}.circeverybid.eth`,
      isValid,
      suggestions: !isValid ? [
        'Use only letters, numbers, hyphens, and underscores',
        'Minimum 3 characters',
        'Maximum 20 characters'
      ] : []
    })
    
  } catch (error: any) {
    console.error('API route error:', error)
    return NextResponse.json(
      { error: 'Failed to check subname', message: error.message || 'Unknown error' },
      { status: 500 }
    )
  }
}