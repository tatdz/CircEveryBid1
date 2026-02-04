// lib/gateway/gateway-service.ts 
import { createPublicClient, http, type Address, type PublicClient } from 'viem'

const chains = [
  {
    id: 11155111,
    name: 'Ethereum Sepolia',
    rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com', 'https://1rpc.io/sepolia', 'https://rpc.sepolia.org'],
    logo: '🔷',
    cctpDomain: 0,
    usdcAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as Address,
    attestationTime: '~13-19 min',
  },
  {
    id: 5042002,
    name: 'Arc Testnet',
    rpcUrls: ['https://rpc-testnet.arc.network', 'https://testnet-rpc.arc.network'],
    logo: '🌀',
    cctpDomain: 26,
    usdcAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as Address,
    attestationTime: '~0.5s',
  },
  {
    id: 84532,
    name: 'Base Sepolia',
    rpcUrls: ['https://sepolia.base.org'],
    logo: '🔵',
    cctpDomain: 6,
    usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address,
    attestationTime: '~13-19 min',
  },
  {
    id: 421614,
    name: 'Arbitrum Sepolia',
    rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
    logo: '🔶',
    cctpDomain: 3,
    usdcAddress: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d' as Address,
    attestationTime: '~13-19 min',
  },
  {
    id: 11155420,
    name: 'OP Sepolia',
    rpcUrls: ['https://sepolia.optimism.io'],
    logo: '🔴',
    cctpDomain: 2,
    usdcAddress: '0x5fd84259d66Cd46123540766Be93DFE6D43130D7' as Address,
    attestationTime: '~13-19 min',
  },
  {
    id: 80002,
    name: 'Polygon Amoy',
    rpcUrls: ['https://rpc-amoy.polygon.technology'],
    logo: '🟣',
    cctpDomain: 7,
    usdcAddress: '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582' as Address,
    attestationTime: '~8s',
  },
  {
    id: 43113,
    name: 'Avalanche Fuji',
    rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc'],
    logo: '🔺',
    cctpDomain: 1,
    usdcAddress: '0x5425890298aed601595a70AB815c96711a31Bc65' as Address,
    attestationTime: '~8s',
  },
] as const

const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'address', name: 'owner' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
] as const

export interface ChainBalance {
  chainName: string
  domain: number
  chainId: number
  balance: string
  balanceFormatted: number
  usdcAddress: Address
  usdcSymbol: string
  usdcDecimals: number
  attestationTime: string
  lastUpdated: string
}

export interface UnifiedBalance {
  totalUSDC: number
  totalChains: number
  activeChains: number
  chains: ChainBalance[]
  timestamp: string
}

export class CircleGatewayService {
  private clients: Map<number, PublicClient[]> = new Map()

  constructor() {
    chains.forEach(chain => {
      const clientsForChain: PublicClient[] = []
      chain.rpcUrls.forEach(rpcUrl => {
        try {
          const client = createPublicClient({
            chain: {
              id: chain.id,
              name: chain.name,
              nativeCurrency: { decimals: 18, name: 'ETH', symbol: 'ETH' },
              rpcUrls: { default: { http: [rpcUrl] } },
            },
            transport: http(rpcUrl, { timeout: 8000, retryCount: 1 })
          })
          clientsForChain.push(client)
        } catch (error) {
          console.warn(`Failed to create client for ${chain.name} with ${rpcUrl}:`, error)
        }
      })
      if (clientsForChain.length > 0) {
        this.clients.set(chain.id, clientsForChain)
      }
    })
  }

  private async readContract(client: PublicClient, address: Address, functionName: 'balanceOf' | 'decimals' | 'symbol', args?: readonly unknown[]): Promise<any> {
    return client.readContract({ address, abi: ERC20_ABI, functionName, args: args as any })
  }

  async getChainBalance(walletAddress: Address, chainId: number): Promise<ChainBalance | null> {
    const chain = chains.find(c => c.id === chainId)
    if (!chain) return null

    const clients = this.clients.get(chainId)
    if (!clients || clients.length === 0) {
      return {
        chainName: chain.name,
        domain: chain.cctpDomain,
        chainId: chain.id,
        balance: '0',
        balanceFormatted: 0,
        usdcAddress: chain.usdcAddress,
        usdcSymbol: 'USDC',
        usdcDecimals: 6,
        attestationTime: chain.attestationTime,
        lastUpdated: new Date().toISOString()
      }
    }

    // Try each RPC endpoint until one succeeds
    for (const client of clients) {
      try {
        const timeoutMs = 4000
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('RPC timeout')), timeoutMs)
        )

        const balancePromise = this.readContract(client, chain.usdcAddress, 'balanceOf', [walletAddress] as const) as Promise<bigint>
        const balance = await Promise.race([balancePromise, timeoutPromise])
        const formatted = Number(balance) / Math.pow(10, 6)

        return {
          chainName: chain.name,
          domain: chain.cctpDomain,
          chainId: chain.id,
          balance: balance.toString(),
          balanceFormatted: formatted,
          usdcAddress: chain.usdcAddress,
          usdcSymbol: 'USDC',
          usdcDecimals: 6,
          attestationTime: chain.attestationTime,
          lastUpdated: new Date().toISOString()
        }
      } catch (error: any) {
        continue // Try next RPC
      }
    }

    console.warn(`Chain ${chain.name}: all RPCs failed`)
    return {
      chainName: chain.name,
      domain: chain.cctpDomain,
      chainId: chain.id,
      balance: '0',
      balanceFormatted: 0,
      usdcAddress: chain.usdcAddress,
      usdcSymbol: 'USDC',
      usdcDecimals: 6,
      attestationTime: chain.attestationTime,
      lastUpdated: new Date().toISOString()
    }
  }

  async getUnifiedBalance(walletAddress: Address): Promise<UnifiedBalance> {
    console.log('🌐 Fetching unified USDC balance for:', walletAddress)
    
    const balancePromises = chains.map(chain => this.getChainBalance(walletAddress, chain.id))
    const balances = (await Promise.all(balancePromises)).filter((b): b is ChainBalance => b !== null)

    const totalUSDC = balances.reduce((sum, chain) => sum + chain.balanceFormatted, 0)
    const activeChains = balances.filter(chain => chain.balanceFormatted > 0).length

    console.log(`✅ Gateway: ${activeChains}/${chains.length} chains, $${totalUSDC.toFixed(2)} total`)

    return {
      totalUSDC,
      totalChains: chains.length,
      activeChains,
      chains: balances,
      timestamp: new Date().toISOString()
    }
  }
}

export const gatewayService = new CircleGatewayService()
