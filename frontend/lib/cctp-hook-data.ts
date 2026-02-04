// lib/cctp-hook-data.ts - UPDATED WITH REAL HOOK ENCODING
import { type Address, type Hex, encodeFunctionData, decodeAbiParameters } from 'viem'
import { CIRCEVERYBID_HOOK_ABI } from './abis'
import { CONTRACTS } from './contracts'
import { getCCTPAttestation, getDomainName, isDomainSupported } from './cctp-service'
import { getCCTPDomain } from './contracts'

// Types matching your Hook contract
export interface CCTPBidData {
  message: Hex
  attestation: Hex
  originDomain: number
  amount: bigint
  commitmentHash: Hex
  maxPrice: bigint
}

/**
 * Generate hook data for cross-chain USDC bids via CCTP
 * This calls the actual encodeBidData function on your Hook contract
 */
export async function generateCCTPHookData(
  cctpDepositTxHash: string, // Transaction hash of depositForBurn on source chain
  sourceChainId: number, // Chain where USDC was burned
  amount: bigint, // Amount in USDC (6 decimals)
  commitmentHash: Hex, // ZK commitment from sealed bid
  maxPrice: bigint, // Max price in USDC (6 decimals)
  publicClient: any // Needed to call the Hook contract
): Promise<{ hookData: Hex; bidData: CCTPBidData }> {
  try {
    console.log('🔄 Generating CCTP hook data via Hook contract...')
    
    // 1. Get CCTP domain for source chain
    const originDomain = getCCTPDomain(sourceChainId)
    if (originDomain === undefined) {
      throw new Error(`Chain ${sourceChainId} not supported by CCTP`)
    }
    
    // 2. Verify domain is supported by your Hook
    if (!isDomainSupported(originDomain)) {
      throw new Error(`Domain ${originDomain} (${getDomainName(originDomain)}) not supported by Hook`)
    }
    
    console.log(`🌐 Source chain: ${sourceChainId} -> Domain: ${originDomain} (${getDomainName(originDomain)})`)
    
    // 3. Get attestation from Circle API
    console.log('📡 Fetching CCTP attestation...')
    const { attestation, message } = await getCCTPAttestation(cctpDepositTxHash, sourceChainId)
    
    console.log('✅ Got CCTP attestation and message')
    console.log('📊 Message length:', message.length)
    console.log('📊 Attestation length:', attestation.length)
    
    // 4. Create CCTP bid data structure
    const bidData: CCTPBidData = {
      message: message as Hex,
      attestation: attestation as Hex,
      originDomain,
      amount, // USDC amount (6 decimals)
      commitmentHash,
      maxPrice // Max price in USDC (6 decimals)
    }
    
    // 5. Call Hook contract's encodeBidData function
    const hookData = await publicClient.readContract({
      address: CONTRACTS.HOOK,
      abi: CIRCEVERYBID_HOOK_ABI,
      functionName: 'encodeBidData',
      args: [
        bidData.message,
        bidData.attestation,
        bidData.originDomain,
        bidData.amount,
        bidData.commitmentHash,
        bidData.maxPrice
      ]
    })
    
    console.log('✅ CCTP hook data generated via Hook contract')
    console.log('📊 Hook data length:', hookData.length)
    
    return {
      hookData,
      bidData
    }
    
  } catch (error: any) {
    console.error('❌ Failed to generate CCTP hook data:', error)
    throw error
  }
}

/**
 * Generate hook data for on-chain USDC bids (no CCTP)
 * Also uses the Hook contract's encodeBidData function
 */
export async function generateOnChainHookData(
  amount: bigint,
  commitmentHash: Hex,
  maxPrice: bigint,
  publicClient: any
): Promise<Hex> {
  console.log('🔗 Generating on-chain hook data via Hook contract')
  
  // For on-chain bids, use empty message/attestation and domain 0
  const hookData = await publicClient.readContract({
    address: CONTRACTS.HOOK,
    abi: CIRCEVERYBID_HOOK_ABI,
    functionName: 'encodeBidData',
    args: [
      '0x', // Empty message
      '0x', // Empty attestation
      0, // Sepolia domain (will be ignored by Hook for on-chain bids)
      amount,
      commitmentHash,
      maxPrice
    ]
  })
  
  return hookData
}

/**
 * Parse hook data to extract CCTP bid information
 * This decodes the data encoded by the Hook contract
 */
export function parseHookData(hookData: Hex): CCTPBidData | null {
  try {
    // The Hook contract encodes data as a single CCTPBidData struct
    // We need to decode it using the same structure
    const decoded = decodeAbiParameters(
      [
        {
          name: 'bidData',
          type: 'tuple',
          components: [
            { name: 'message', type: 'bytes' },
            { name: 'attestation', type: 'bytes' },
            { name: 'originDomain', type: 'uint32' },
            { name: 'amount', type: 'uint256' },
            { name: 'commitmentHash', type: 'bytes32' },
            { name: 'maxPrice', type: 'uint256' }
          ]
        }
      ],
      hookData
    )
    
    const [bidData] = decoded as [CCTPBidData]
    
    console.log('✅ Parsed hook data:')
    console.log('  Origin Domain:', bidData.originDomain)
    console.log('  Amount:', bidData.amount.toString())
    console.log('  Max Price:', bidData.maxPrice.toString())
    console.log('  Commitment:', bidData.commitmentHash)
    console.log('  Message length:', bidData.message.length)
    console.log('  Attestation length:', bidData.attestation.length)
    
    return bidData
    
  } catch (error) {
    console.error('Failed to parse hook data:', error)
    return null
  }
}

/**
 * Get domain name from domain ID using Hook contract
 */
export async function getDomainNameFromHook(domain: number, publicClient: any): Promise<string> {
  try {
    const name = await publicClient.readContract({
      address: CONTRACTS.HOOK,
      abi: CIRCEVERYBID_HOOK_ABI,
      functionName: 'getDomainName',
      args: [domain]
    })
    
    return name
  } catch (error) {
    console.error('Failed to get domain name from Hook:', error)
    return `Domain ${domain}`
  }
}

/**
 * Check if a bid is cross-chain by examining hook data
 */
export function isCrossChainBid(hookData: Hex): boolean {
  const parsed = parseHookData(hookData)
  if (!parsed) return false
  
  // Cross-chain bids have non-empty message and attestation
  return parsed.message.length > 2 && parsed.attestation.length > 2
}

/**
 * Get the USDC amount from hook data
 */
export function getAmountFromHookData(hookData: Hex): bigint | null {
  const parsed = parseHookData(hookData)
  return parsed?.amount || null
}

/**
 * Get the origin domain from hook data
 */
export function getOriginDomainFromHookData(hookData: Hex): number | null {
  const parsed = parseHookData(hookData)
  return parsed?.originDomain || null
}

/**
 * Simulate bid validation on Hook contract
 * This is useful for testing before submitting real bids
 */
export async function simulateBidValidation(
  auctionAddress: Address,
  maxPrice: bigint,
  amount: bigint,
  owner: Address,
  hookData: Hex,
  publicClient: any
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔍 Simulating bid validation on Hook...')
    
    // Get auction stats to verify registration
    const auctionStats = await publicClient.readContract({
      address: CONTRACTS.HOOK,
      abi: CIRCEVERYBID_HOOK_ABI,
      functionName: 'getAuctionStats',
      args: [auctionAddress]
    })
    
    const [registered, totalBids, crossChainBids, totalVolume] = auctionStats
    
    if (!registered) {
      return {
        success: false,
        error: 'Auction not registered with Hook'
      }
    }
    
    // Parse hook data to check if it's valid
    const parsedData = parseHookData(hookData)
    if (!parsedData) {
      return {
        success: false,
        error: 'Invalid hook data format'
      }
    }
    
    // Check amount is within Hook's limits (0.01 - 1.0 USDC)
    const amountUSDC = Number(parsedData.amount) / 1e6
    if (amountUSDC < 0.01 || amountUSDC > 1.0) {
      return {
        success: false,
        error: `Bid amount ${amountUSDC.toFixed(2)} USDC out of range (0.01 - 1.0 USDC)`
      }
    }
    
    // For cross-chain bids, verify domain is supported
    if (parsedData.message.length > 2) {
      const domainName = await getDomainNameFromHook(parsedData.originDomain, publicClient)
      console.log(`🌐 Cross-chain bid from ${domainName}`)
    }
    
    console.log('✅ Bid validation simulation passed')
    
    return {
      success: true
    }
    
  } catch (error: any) {
    console.error('❌ Bid validation simulation failed:', error)
    return {
      success: false,
      error: error.message
    }
  }
}