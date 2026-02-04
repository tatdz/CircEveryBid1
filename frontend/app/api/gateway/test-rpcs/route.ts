// app/api/gateway/test-rpcs/route.ts
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const rpcs = [
    { name: 'Sepolia', url: 'https://rpc.sepolia.org', expected: true },
    { name: 'Arc Testnet', url: 'https://rpc-testnet.arc.network', expected: true },
    { name: 'Base Sepolia', url: 'https://sepolia.base.org', expected: true },
    { name: 'Arbitrum Sepolia', url: 'https://sepolia-rollup.arbitrum.io/rpc', expected: true },
    { name: 'OP Sepolia', url: 'https://sepolia.optimism.io', expected: true },
    { name: 'Polygon Amoy', url: 'https://rpc-amoy.polygon.technology', expected: true },
  ]

  const results = []

  for (const rpc of rpcs) {
    const start = Date.now()
    try {
      // Simple fetch test
      const response = await fetch(rpc.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_chainId',
          params: []
        }),
        signal: AbortSignal.timeout(5000)
      })

      const data = await response.json()
      const latency = Date.now() - start
      
      results.push({
        name: rpc.name,
        url: rpc.url,
        status: response.ok ? 'online' : 'offline',
        latency: `${latency}ms`,
        chainId: data.result ? parseInt(data.result, 16) : 'unknown'
      })
    } catch (error: any) {
      const latency = Date.now() - start
      results.push({
        name: rpc.name,
        url: rpc.url,
        status: 'error',
        latency: `${latency}ms`,
        error: error.message
      })
    }
  }

  return NextResponse.json({
    success: true,
    data: results,
    timestamp: new Date().toISOString()
  })
}