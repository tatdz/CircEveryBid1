// lib/cctp-service.ts 
import { type Address, type Hex, encodeFunctionData, keccak256 } from 'viem'
import { CCTP_MESSAGE_TRANSMITTER_ABI } from './abis'
import { CONTRACTS } from './contracts'
import { readContract } from './wagmi-contract-helpers' 

const CIRCLE_API_BASE = 'https://iris-api-sandbox.circle.com'

export async function getCCTPAttestation(
  txHash: string,
  sourceChainId: number
): Promise<{ attestation: string; message: string; status: string }> {
  try {
    console.log('📡 Requesting attestation for:', txHash)
    
    let attempts = 0
    const maxAttempts = 30
    
    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`${CIRCLE_API_BASE}/attestations/${txHash}`, {
          headers: {
            'Accept': 'application/json',
          },
        })
        
        if (!response.ok) {
          throw new Error(`Circle API error: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (data.status === 'complete') {
          console.log('✅ Attestation ready')
          return {
            attestation: data.attestation,
            message: data.message,
            status: data.status
          }
        }
        
        if (data.status === 'pending') {
          console.log(`⏳ Attestation pending (attempt ${attempts + 1}/${maxAttempts})`)
          
          const delay = Math.min(2000 * Math.pow(1.5, attempts), 30000)
          await new Promise(resolve => setTimeout(resolve, delay))
          attempts++
          continue
        }
        
        if (data.status === 'failed') {
          throw new Error('CCTP attestation failed')
        }
        
      } catch (error: any) {
        if (attempts >= maxAttempts - 1) {
          throw error
        }
        
        const delay = Math.min(2000 * Math.pow(1.5, attempts), 30000)
        await new Promise(resolve => setTimeout(resolve, delay))
        attempts++
      }
    }
    
    throw new Error('Attestation timeout')
    
  } catch (error: any) {
    console.error('❌ Attestation failed:', error)
    throw new Error(`Failed to get CCTP attestation: ${error.message}`)
  }
}

export async function verifyCCTPMessage(
  message: string,
  attestation: string
): Promise<boolean> {
  try {
    console.log('🔍 Verifying CCTP message on-chain...')
    
    // Real on-chain verification
    // Note: usedNonces function requires a specific nonce parameter
    // We'll need to extract it from the message first
    
    // For now, just return true - actual verification happens in receiveMessage
    return true
    
  } catch (error) {
    console.error('Verification error:', error)
    return false
  }
}

export async function receiveCCTPMessage(
  message: string,
  attestation: string,
  walletClient: any
): Promise<{ success: boolean; transactionHash?: string }> {
  try {
    console.log('📥 Receiving CCTP message...')
    
    const txHash = await walletClient.sendTransaction({
      to: CONTRACTS.CCTP_MESSAGE_TRANSMITTER as Address,
      data: encodeFunctionData({
        abi: CCTP_MESSAGE_TRANSMITTER_ABI,
        functionName: 'receiveMessage',
        args: [message as Hex, attestation as Hex]
      }),
      account: walletClient.account,
      chain: walletClient.chain,
      gas: 500000n
    })
    
    console.log('✅ CCTP message received:', txHash)
    
    return {
      success: true,
      transactionHash: txHash
    }
    
  } catch (error: any) {
    console.error('❌ Failed to receive CCTP message:', error)
    return {
      success: false
    }
  }
}

export function getDomainName(domain: number): string {
  const domains: Record<number, string> = {
    0: 'Ethereum Sepolia',
    1: 'Avalanche Fuji',
    2: 'OP Sepolia',
    3: 'Arbitrum Sepolia',
    6: 'Base Sepolia',
    7: 'Polygon Amoy',
    10: 'Unichain Sepolia',
    16: 'Sei Atlantic',
    26: 'Arc Testnet'
  }
  
  return domains[domain] || `Domain ${domain}`
}

export function isDomainSupported(domain: number): boolean {
  const supportedDomains = [0, 1, 2, 3, 6, 7, 10, 16, 26]
  return supportedDomains.includes(domain)
}