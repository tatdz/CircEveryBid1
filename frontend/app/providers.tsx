// app/providers.tsx 
'use client'

import { WagmiProvider, createConfig, http } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import type { ReactNode } from 'react'
import { sepolia, baseSepolia, arbitrumSepolia, optimismSepolia, polygonAmoy } from 'wagmi/chains'

// Define Arc chain
const arcTestnet = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { 
    name: 'Ether',
    symbol: 'ETH', 
    decimals: 18 
  },
  rpcUrls: {
    default: { 
      http: ['https://rpc-arc-testnet-pmlnt-dev-23kkqh.t.conduit.xyz'] 
    },
    public: { 
      http: ['https://rpc-arc-testnet-pmlnt-dev-23kkqh.t.conduit.xyz'] 
    },
  },
  blockExplorers: {
    default: { 
      name: 'Arc Explorer', 
      url: 'https://explorerl2-arc-testnet-pmlnt-dev-23kkqh.t.conduit.xyz' 
    },
  },
  contracts: {
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11' as `0x${string}`,
      blockCreated: 11907934,
    },
  },
  testnet: true,
}

// Create wagmi config
const config = createConfig({
  chains: [
    sepolia,
    arcTestnet,
    baseSepolia,
    arbitrumSepolia,
    optimismSepolia,
    polygonAmoy,
  ],
  transports: {
    [sepolia.id]: http(),
    [arcTestnet.id]: http('https://rpc-arc-testnet-pmlnt-dev-23kkqh.t.conduit.xyz'),
    [baseSepolia.id]: http(),
    [arbitrumSepolia.id]: http(),
    [optimismSepolia.id]: http(),
    [polygonAmoy.id]: http(),
  },
  ssr: true,
})

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}