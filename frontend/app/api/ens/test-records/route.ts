// app/api/ens/test-records/route.ts
import { NextRequest, NextResponse } from 'next/server'
import NameStone from '@namestone/namestone-sdk'

const NAMESTONE_API_BASE = 'https://namestone.com/api/public_v1_sepolia'

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.NAMESTONE_API_KEY
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'NAMESTONE_API_KEY not set' },
        { status: 500 }
      )
    }
    
    const ns = new NameStone(apiKey, { baseUrl: NAMESTONE_API_BASE })
    
    // Get all names for circeverybid.eth
    const names = await ns.getNames({
      domain: 'circeverybid.eth',
      text_records: true,
    })
    
    console.log('🔍 Found', names.length, 'names in Namestone:')
    
    const formattedNames = names.map((name: any) => ({
      name: name.name,
      fullName: `${name.name}.circeverybid.eth`,
      address: name.address,
      textRecords: name.text_records,
      textRecordKeys: Object.keys(name.text_records || {}),
      createdAt: name.created_at
    }))
    
    return NextResponse.json({
      success: true,
      count: names.length,
      names: formattedNames,
      rawNames: names // For debugging
    })
    
  } catch (error: any) {
    console.error('API route error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get names', 
        message: error.message,
        stack: error.stack
      },
      { status: 500 }
    )
  }
}