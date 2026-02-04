// app/api/gateway/simple/route.ts
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  // Simple static response for testing
  return NextResponse.json({
    success: true,
    data: {
      totalUSDC: 1250.75,
      totalChains: 6,
      activeChains: 3,
      chains: [
        {
          chainName: 'Ethereum Sepolia',
          domain: 0,
          chainId: 11155111,
          balance: '500000000',
          balanceFormatted: 500.00,
          usdcAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
          usdcSymbol: 'USDC',
          usdcDecimals: 6,
          lastUpdated: new Date().toISOString()
        },
        {
          chainName: 'Base Sepolia',
          domain: 6,
          chainId: 84532,
          balance: '750000000',
          balanceFormatted: 750.75,
          usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
          usdcSymbol: 'USDC',
          usdcDecimals: 6,
          lastUpdated: new Date().toISOString()
        }
      ],
      timestamp: new Date().toISOString()
    }
  })
}