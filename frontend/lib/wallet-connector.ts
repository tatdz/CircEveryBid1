// lib/wallet-connector.ts
import { type Address } from 'viem'

export interface WalletConnection {
  address: Address
  chainId: number
  isConnected: boolean
}

export async function connectWallet(): Promise<WalletConnection | null> {
  if (typeof window === 'undefined') {
    console.warn('❌ Not in browser environment')
    return null
  }

  const ethereum = (window as any).ethereum

  if (!ethereum) {
    console.error('❌ No Ethereum provider found (MetaMask, etc.)')
    alert('Please install MetaMask or another Web3 wallet')
    return null
  }

  try {
    console.log('🔐 Requesting wallet connection...')
    
    const accounts = await ethereum.request({
      method: 'eth_requestAccounts',
    })

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts returned')
    }

    const address = accounts[0] as Address
    
    const chainIdHex = await ethereum.request({
      method: 'eth_chainId',
    })
    
    const chainId = parseInt(chainIdHex, 16)

    console.log('✅ Wallet connected:', {
      address: address.slice(0, 10) + '...',
      chainId,
    })

    return {
      address,
      chainId,
      isConnected: true,
    }
  } catch (error: any) {
    console.error('❌ Wallet connection failed:', error)
    
    if (error.code === 4001) {
      console.log('User rejected connection request')
    }
    
    return null
  }
}

export async function switchChain(chainId: number): Promise<boolean> {
  if (typeof window === 'undefined') return false

  const ethereum = (window as any).ethereum
  
  if (!ethereum) {
    console.error('❌ No Ethereum provider')
    return false
  }

  try {
    console.log('🔄 Switching to chain:', chainId)
    
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    })

    console.log('✅ Chain switched successfully')
    return true
  } catch (error: any) {
    console.error('❌ Chain switch failed:', error)
    
    // Chain not added to wallet
    if (error.code === 4902) {
      console.log('Chain not in wallet, attempting to add...')
      return await addChain(chainId)
    }
    
    return false
  }
}

export async function addChain(chainId: number): Promise<boolean> {
  if (typeof window === 'undefined') return false

  const ethereum = (window as any).ethereum
  
  if (!ethereum) return false

  // Chain configs
  const chains: Record<number, any> = {
    11155111: {
      chainId: '0xaa36a7',
      chainName: 'Ethereum Sepolia',
      nativeCurrency: {
        name: 'Sepolia ETH',
        symbol: 'ETH',
        decimals: 18,
      },
      rpcUrls: ['https://rpc.sepolia.org'],
      blockExplorerUrls: ['https://sepolia.etherscan.io'],
    },
    84532: {
      chainId: '0x14a34',
      chainName: 'Base Sepolia',
      nativeCurrency: {
        name: 'ETH',
        symbol: 'ETH',
        decimals: 18,
      },
      rpcUrls: ['https://sepolia.base.org'],
      blockExplorerUrls: ['https://sepolia.basescan.org'],
    },
    421614: {
      chainId: '0x66eee',
      chainName: 'Arbitrum Sepolia',
      nativeCurrency: {
        name: 'ETH',
        symbol: 'ETH',
        decimals: 18,
      },
      rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
      blockExplorerUrls: ['https://sepolia.arbiscan.io'],
    },
  }

  const config = chains[chainId]
  
  if (!config) {
    console.error('❌ Chain config not found for:', chainId)
    return false
  }

  try {
    console.log('➕ Adding chain to wallet:', config.chainName)
    
    await ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [config],
    })

    console.log('✅ Chain added successfully')
    return true
  } catch (error: any) {
    console.error('❌ Add chain failed:', error)
    return false
  }
}

export function onAccountsChanged(callback: (accounts: Address[]) => void): () => void {
  if (typeof window === 'undefined') return () => {}

  const ethereum = (window as any).ethereum
  
  if (!ethereum) return () => {}

  const handler = (accounts: string[]) => {
    console.log('👤 Accounts changed:', accounts)
    callback(accounts as Address[])
  }

  ethereum.on('accountsChanged', handler)

  return () => {
    ethereum.removeListener('accountsChanged', handler)
  }
}

export function onChainChanged(callback: (chainId: number) => void): () => void {
  if (typeof window === 'undefined') return () => {}

  const ethereum = (window as any).ethereum
  
  if (!ethereum) return () => {}

  const handler = (chainIdHex: string) => {
    const chainId = parseInt(chainIdHex, 16)
    console.log('🔄 Chain changed:', chainId)
    callback(chainId)
  }

  ethereum.on('chainChanged', handler)

  return () => {
    ethereum.removeListener('chainChanged', handler)
  }
}

export async function signMessage(message: string): Promise<string | null> {
  if (typeof window === 'undefined') return null

  const ethereum = (window as any).ethereum
  
  if (!ethereum) return null

  try {
    const accounts = await ethereum.request({ method: 'eth_accounts' })
    
    if (!accounts || accounts.length === 0) {
      throw new Error('No account connected')
    }

    console.log('✍️ Signing message...')
    
    const signature = await ethereum.request({
      method: 'personal_sign',
      params: [message, accounts[0]],
    })

    console.log('✅ Message signed')
    return signature
  } catch (error: any) {
    console.error('❌ Sign message failed:', error)
    return null
  }
}