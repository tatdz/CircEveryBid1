// app/api/cctp/route.ts
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const CIRCLE_API_BASE = process.env.CIRCLE_API_BASE || 'https://iris-api-sandbox.circle.com'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const txHash = searchParams.get('txHash')
    
    if (!txHash) {
      return NextResponse.json(
        { error: 'Transaction hash required' },
        { status: 400 }
      )
    }
    
    console.log('📡 Fetching attestation for:', txHash)
    
    // Fetch from Circle API
    const response = await fetch(`${CIRCLE_API_BASE}/attestations/${txHash}`, {
      headers: {
        'Accept': 'application/json',
      },
    })
    
    if (!response.ok) {
      console.error('Circle API error:', response.status)
      return NextResponse.json(
        { error: 'Attestation not found', status: 'pending' },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    
    console.log('✅ Attestation status:', data.status)
    
    return NextResponse.json({
      success: true,
      attestation: data.attestation,
      message: data.message,
      status: data.status,
    })
    
  } catch (error: any) {
    console.error('❌ CCTP API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch attestation' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { txHash, chainId } = body
    
    if (!txHash) {
      return NextResponse.json(
        { error: 'Transaction hash required' },
        { status: 400 }
      )
    }
    
    console.log('📡 Polling attestation for:', txHash)
    
    // Poll until ready
    let attempts = 0
    const maxAttempts = 30
    
    while (attempts < maxAttempts) {
      const response = await fetch(`${CIRCLE_API_BASE}/attestations/${txHash}`, {
        headers: {
          'Accept': 'application/json',
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.status === 'complete') {
          console.log('✅ Attestation ready')
          return NextResponse.json({
            success: true,
            attestation: data.attestation,
            message: data.message,
            status: 'complete',
          })
        }
      }
      
      // Wait 2 seconds before retry
      await new Promise(resolve => setTimeout(resolve, 2000))
      attempts++
    }
    
    return NextResponse.json(
      { error: 'Attestation timeout', status: 'pending' },
      { status: 408 }
    )
    
  } catch (error: any) {
    console.error('❌ CCTP polling error:', error)
    return NextResponse.json(
      { error: error.message || 'Polling failed' },
      { status: 500 }
    )
  }
}
