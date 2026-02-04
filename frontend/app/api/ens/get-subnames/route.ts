// app/api/ens/get-subnames/route.ts
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
    const ownerAddress = searchParams.get('ownerAddress')
    
    const ns = new NameStone(apiKey, { baseUrl: NAMESTONE_API_BASE })
    
    const params: any = {
      domain: 'circeverybid.eth',
      text_records: true,
    }
    
    if (ownerAddress) {
      params.address = ownerAddress
    }
    
    const names = await ns.getNames(params)
    
    return NextResponse.json({
      success: true,
      data: names.map((name: any) => ({
        name: name.name,
        fullName: `${name.name}.circeverybid.eth`,
        address: name.address,
        textRecords: name.text_records,
        created: name.created_at,
      })),
      count: names.length,
    })
    
  } catch (error: any) {
    console.error('API route error:', error)
    return NextResponse.json(
      { error: 'Failed to get subnames', message: error.message || 'Unknown error' },
      { status: 500 }
    )
  }
}