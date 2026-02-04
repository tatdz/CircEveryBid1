// app/api/gateway/balance/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { gatewayService } from '@/lib/gateway/gateway-service'
import { isAddress } from 'viem'

export const dynamic = 'force-dynamic'

// Helper to serialize BigInt
function serializeObject(obj: any): any {
  if (typeof obj === 'bigint') {
    return obj.toString()
  }
  if (Array.isArray(obj)) {
    return obj.map(item => serializeObject(item))
  }
  if (obj !== null && typeof obj === 'object') {
    const result: any = {}
    for (const key in obj) {
      result[key] = serializeObject(obj[key])
    }
    return result
  }
  return obj
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')
    
    if (!address) {
      return NextResponse.json(
        { success: false, message: 'Wallet address is required' },
        { status: 400 }
      )
    }

    if (!isAddress(address)) {
      return NextResponse.json(
        { success: false, message: 'Invalid Ethereum address' },
        { status: 400 }
      )
    }

    console.log(`📊 [${new Date().toISOString()}] Gateway API: Fetching balance for ${address}`)
    
    // Get unified balance from service
    const unifiedBalance = await gatewayService.getUnifiedBalance(address as `0x${string}`)
    
    // Serialize to handle BigInt
    const serializedBalance = serializeObject(unifiedBalance)
    
    const duration = Date.now() - startTime
    
    console.log(`✅ [${new Date().toISOString()}] API completed in ${duration}ms`)
    console.log(`   Chains: ${serializedBalance.chains.length}`)
    console.log(`   Total: $${serializedBalance.totalUSDC.toFixed(2)}`)
    
    return NextResponse.json({
      success: true,
      data: serializedBalance,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    const duration = Date.now() - startTime
    console.error(`❌ [${new Date().toISOString()}] API error after ${duration}ms:`, error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: `Failed to fetch unified balance: ${error.message}`,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}