// app/api/ens/simple-update/route.ts
import { NextRequest, NextResponse } from 'next/server'
import NameStone from '@namestone/namestone-sdk'

const NAMESTONE_API_BASE = 'https://namestone.com/api/public_v1_sepolia'

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.NAMESTONE_API_KEY
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'NAMESTONE_API_KEY not set' },
        { status: 500 }
      )
    }
    
    const body = await request.json()
    const { subdomain, textRecords, ownerAddress } = body
    
    if (!subdomain || !textRecords) {
      return NextResponse.json(
        { error: 'Missing required fields: subdomain or textRecords' },
        { status: 400 }
      )
    }
    
    const ns = new NameStone(apiKey, { baseUrl: NAMESTONE_API_BASE })
    
    console.log('📝 Simple update for:', subdomain)
    console.log('📋 Text records:', textRecords)
    
    // First, get existing records
    const names = await ns.getNames({
      domain: 'circeverybid.eth',
      text_records: true,
    })
    
    const existingName = names.find((name: any) => name.name === subdomain)
    
    if (!existingName) {
      return NextResponse.json({
        success: false,
        error: 'Subdomain not found in Namestone'
      })
    }
    
    // Merge with existing records
    const existingRecords = existingName.text_records || {}
    const mergedRecords = {
      ...existingRecords,
      ...textRecords
    }
    
    console.log('🔄 Merged records:', Object.keys(mergedRecords))
    
    // Update the name
    const result = await ns.setName({
      domain: 'circeverybid.eth',
      name: subdomain,
      address: ownerAddress || existingName.address,
      text_records: mergedRecords,
    })
    
    console.log('✅ Update result:', typeof result)
    
    return NextResponse.json({
      success: true,
      data: result,
      message: `Updated text records for ${subdomain}.circeverybid.eth`,
      textRecords: mergedRecords
    })
    
  } catch (error: any) {
    console.error('API route error:', error)
    return NextResponse.json(
      { error: 'Failed to update text records', message: error.message || 'Unknown error' },
      { status: 500 }
    )
  }
}