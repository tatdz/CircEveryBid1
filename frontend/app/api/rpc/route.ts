// app/api/rpc/route.ts
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Server-side only - these keys are never exposed to client
const RPC_URLS: Record<string, string> = {
  'sepolia': process.env.ALCHEMY_ETHEREUM_SEPOLIA_URL || '',
  'arc-testnet': process.env.ALCHEMY_ARC_SEPOLIA_URL || '',
  'arbitrum-sepolia': `https://arb-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
  'op-sepolia': `https://opt-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
  'base-sepolia': `https://base-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
  'polygon-amoy': `https://polygon-amoy.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const network = searchParams.get('network') || 'sepolia'
    
    const rpcUrl = RPC_URLS[network]
    
    if (!rpcUrl) {
      return NextResponse.json(
        { error: 'Invalid network' },
        { status: 400 }
      )
    }
    
    const body = await request.json()
    
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    
    const data = await response.json()
    
    return NextResponse.json(data, {
      status: response.status,
    })
    
  } catch (error: any) {
    console.error('RPC proxy error:', error)
    return NextResponse.json(
      { error: 'RPC request failed' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'RPC proxy endpoint',
    networks: Object.keys(RPC_URLS)
  })
}