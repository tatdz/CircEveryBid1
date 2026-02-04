// app/api/pyth/route.ts
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const PYTH_HERMES_API = 'https://hermes.pyth.network'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const feedId = searchParams.get('feedId')
    
    if (!feedId) {
      return NextResponse.json(
        { error: 'Feed ID required' },
        { status: 400 }
      )
    }
    
    console.log('📡 Fetching Pyth price for:', feedId)
    
    // Fetch latest price
    const response = await fetch(
      `${PYTH_HERMES_API}/api/latest_price_feeds?ids[]=${feedId}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    )
    
    if (!response.ok) {
      console.error('Pyth API error:', response.status)
      return NextResponse.json(
        { error: 'Failed to fetch price' },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    
    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'No price data found' },
        { status: 404 }
      )
    }
    
    const priceData = data[0]
    const price = Number(priceData.price.price) * Math.pow(10, priceData.price.expo)
    
    console.log('✅ Pyth price:', price)
    
    return NextResponse.json({
      success: true,
      feedId,
      price,
      conf: priceData.price.conf,
      expo: priceData.price.expo,
      publishTime: priceData.price.publish_time,
    })
    
  } catch (error: any) {
    console.error('❌ Pyth API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch price' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { feedIds } = body
    
    if (!feedIds || !Array.isArray(feedIds)) {
      return NextResponse.json(
        { error: 'Feed IDs array required' },
        { status: 400 }
      )
    }
    
    console.log('📡 Fetching Pyth VAA for feeds:', feedIds.length)
    
    // Fetch price update data (VAA)
    const idsQuery = feedIds.map(id => `ids[]=${id}`).join('&')
    const response = await fetch(
      `${PYTH_HERMES_API}/api/latest_vaas?${idsQuery}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    )
    
    if (!response.ok) {
      console.error('Pyth VAA API error:', response.status)
      return NextResponse.json(
        { error: 'Failed to fetch VAA' },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    
    console.log('✅ Pyth VAA received')
    
    return NextResponse.json({
      success: true,
      updateData: data,
    })
    
  } catch (error: any) {
    console.error('❌ Pyth VAA error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch VAA' },
      { status: 500 }
    )
  }
}