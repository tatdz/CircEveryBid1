// lib/eip7702-helper.ts
import { type Hex, encodeFunctionData } from 'viem'

export interface EIP7702Transaction {
  to: Hex
  data: Hex
  value?: bigint
  authorizationList?: {
    chainId: bigint
    address: Hex
    nonce: bigint
  }[]
}

export interface GasSponsorConfig {
  sponsorAddress: Hex
  maxGasPrice: bigint
  validUntil: number
}

export async function prepareEIP7702Transaction(
  to: Hex,
  data: Hex,
  value: bigint = 0n,
  sponsorConfig?: GasSponsorConfig
): Promise<EIP7702Transaction> {
  console.log('📝 Preparing EIP-7702 transaction...')
  
  const tx: EIP7702Transaction = {
    to,
    data,
    value,
  }
  
  if (sponsorConfig) {
    console.log('💰 Gas sponsorship enabled')
    tx.authorizationList = [{
      chainId: 11155111n, // Sepolia
      address: sponsorConfig.sponsorAddress,
      nonce: 0n,
    }]
  }
  
  console.log('✅ EIP-7702 transaction prepared')
  return tx
}

export async function signAuthorizationList(
  walletAddress: Hex,
  delegateAddress: Hex,
  chainId: bigint,
  nonce: bigint
): Promise<{
  chainId: bigint
  address: Hex
  nonce: bigint
  signature?: Hex
}> {
  console.log('✍️ Signing authorization...')
  
  // In production, this would sign the authorization
  // For now, return unsigned
  return {
    chainId,
    address: delegateAddress,
    nonce,
  }
}

export function encodeEIP7702CallData(
  targetContract: Hex,
  functionName: string,
  args: any[],
  abi: any
): Hex {
  console.log('🔧 Encoding EIP-7702 call data...')
  
  return encodeFunctionData({
    abi,
    functionName,
    args,
  })
}

export async function estimateGasWithSponsorship(
  transaction: EIP7702Transaction,
  sponsorAddress: Hex
): Promise<bigint> {
  console.log('⛽ Estimating gas with sponsorship...')
  
  // In production, call gas estimation service
  // For now, return fixed estimate
  const baseGas = 200000n
  const sponsorshipDiscount = baseGas * 20n / 100n // 20% discount
  
  const finalGas = baseGas - sponsorshipDiscount
  
  console.log('✅ Estimated gas:', finalGas.toString())
  return finalGas
}

export interface SponsorshipStatus {
  isSponsored: boolean
  sponsor?: Hex
  remainingGas?: bigint
  expiresAt?: number
}

export async function checkSponsorshipStatus(
  userAddress: Hex,
  chainId: number
): Promise<SponsorshipStatus> {
  console.log('🔍 Checking sponsorship status...')
  
  // In production, query sponsorship contract
  // For now, return default
  return {
    isSponsored: false,
  }
}

export async function requestGasSponsorship(
  userAddress: Hex,
  transactionData: EIP7702Transaction,
  chainId: number
): Promise<{
  approved: boolean
  sponsorAddress?: Hex
  maxGas?: bigint
}> {
  console.log('💸 Requesting gas sponsorship...')
  
  // In production, call sponsorship API
  // For now, simulate approval
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  return {
    approved: true,
    sponsorAddress: '0x0000000000000000000000000000000000000000' as Hex,
    maxGas: 500000n,
  }
}

export function isEIP7702Supported(): boolean {
  // Check if browser/wallet supports EIP-7702
  // Currently experimental
  return false
}

export async function detectEIP7702Support(): Promise<{
  walletSupport: boolean
  networkSupport: boolean
  message: string
}> {
  console.log('🔍 Detecting EIP-7702 support...')
  
  // Check wallet
  const walletSupport = typeof window !== 'undefined' && 
                       window.ethereum?.isMetaMask === true
  
  // Check network (Sepolia has experimental support)
  const networkSupport = true // Assume Sepolia supports it
  
  const message = walletSupport && networkSupport
    ? 'EIP-7702 supported'
    : 'EIP-7702 not fully supported yet'
  
  console.log('ℹ️', message)
  
  return {
    walletSupport,
    networkSupport,
    message,
  }
}
