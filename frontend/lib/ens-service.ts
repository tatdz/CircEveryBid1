// lib/ens-service.ts
import { type Address, type Hex, keccak256, toHex } from 'viem'
import { writeContract, readContract } from './wagmi-contract-helpers'
import { CONTRACTS, ENS_CONFIG } from './contracts'
import { 
  ENS_AUCTION_REGISTRY_ABI, 
  ENS_REGISTRY_ABI, 
  ENS_RESOLVER_ABI,
  CIRCEVERYBID_HOOK_ABI
} from './abis'
import { 
  calculateReputationScore,
  type ReputationScore as ENSReputationScore 
} from './ens-data-reader'

console.log('🔗 ENS Service Configuration:')
console.log('  Domain:', ENS_CONFIG.domain)
console.log('  Registry:', CONTRACTS.ENS_REGISTRY)
console.log('  Auction Registry:', CONTRACTS.ENS_AUCTION_REGISTRY)

// ============ TYPES ============

export interface SubnameCheck {
  available: boolean
  exists: boolean
  owner?: string
  fullName: string
  ownedByRequested?: boolean
  isValid?: boolean
  suggestions?: string[]
}

export interface SubnameRegistration {
  success: boolean
  hash?: Hex
  fullDomain?: string
  ensUrl?: string 
  error?: string
  textRecords?: Record<string, string>  
}

export interface CreatorInfo {
  ensName: string
  node: Hex
  totalAuctions: bigint
  totalVolume: bigint
}

// Alias for compatibility
export type ReputationScore = ENSReputationScore

// ============ HELPER FUNCTIONS ============

export function namehash(name: string): Hex {
  if (!name) {
    return '0x0000000000000000000000000000000000000000000000000000000000000000'
  }
  
  const labels = name.split('.')
  let node: Hex = '0x0000000000000000000000000000000000000000000000000000000000000000'
  
  for (let i = labels.length - 1; i >= 0; i--) {
    const labelHash = keccak256(toHex(labels[i]))
    node = keccak256(Buffer.from(node.slice(2) + labelHash.slice(2), 'hex')) as Hex
  }
  
  return node
}

export function labelhash(label: string): Hex {
  return keccak256(toHex(label))
}

// ============ API FUNCTIONS (NAMESTONE) ============

/**
 * Check subname availability via API route
 */
export async function checkSubdomainAvailability(
  subdomain: string,
  ownerAddress?: Address
): Promise<SubnameCheck> {
  try {
    const params = new URLSearchParams({ subdomain })
    if (ownerAddress) {
      params.append('ownerAddress', ownerAddress)
    }
    
    const response = await fetch(`/api/ens/check-subname?${params}`)
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to check subname')
    }
    
    return await response.json()
    
  } catch (error: any) {
    console.error('Failed to check subname:', error)
    
    return {
      available: false,
      exists: false,
      fullName: `${subdomain}.${ENS_CONFIG.domain}`,
      isValid: false,
      suggestions: ['Service temporarily unavailable']
    }
  }
}

/**
 * Register subdomain via API route
 */
export async function registerSubdomain(
  subdomain: string,
  ownerAddress: Address
): Promise<SubnameRegistration> {
  try {
    console.log('📝 Registering ENS subdomain via Namestone API...')
    
    const response = await fetch('/api/ens/register-subname', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subdomain,
        ownerAddress
      })
    })
    
    if (!response.ok) {
      const error = await response.json()
      return { 
        success: false, 
        error: error.message || 'Registration failed' 
      }
    }
    
    const result = await response.json()
    
    if (result.success) {
      const fullDomain = `${subdomain}.${ENS_CONFIG.domain}`
      const ensUrl = `https://sepolia.app.ens.domains/${fullDomain}`
      
      console.log('✅ Namestone registration successful!')
      console.log('🔗 View ENS record:', ensUrl)
      console.log('📋 Full domain:', fullDomain)
      console.log('👤 Owner:', ownerAddress)
      
      return { 
        success: true, 
        hash: result.data?.hash,
        fullDomain,
        ensUrl // Add this for UI display
      }
    } else {
      return { 
        success: false, 
        error: result.error || 'Registration failed' 
      }
    }
    
  } catch (error: any) {
    console.error('❌ Registration failed:', error)
    return { 
      success: false, 
      error: error.message || 'Registration failed'
    }
  }
}

/**
 * Get user's subnames via API route
 */
export async function getUserENSSubdomains(
  ownerAddress: Address
): Promise<string[]> {
  try {
    const response = await fetch(`/api/ens/get-subnames?ownerAddress=${ownerAddress}`)
    
    if (!response.ok) {
      console.error('Failed to fetch subnames:', response.status)
      return []
    }
    
    const data = await response.json()
    
    if (data.success) {
      return data.data.map((item: any) => item.name)
    }
    
    return []
  } catch (error) {
    console.error('Failed to get user subnames:', error)
    return []
  }
}

// ============ CONTRACT FUNCTIONS ============

/**
 * Get ENS owner from registry
 */
async function getENSOwner(domain: string): Promise<Address> {
  const node = namehash(domain)
  
  try {
    const owner = await readContract<Address>(
      CONTRACTS.ENS_REGISTRY,
      ENS_REGISTRY_ABI,
      'owner',
      [node]
    )
    return owner
  } catch (error) {
    console.error('Failed to get ENS owner:', error)
    throw error
  }
}

/**
 * Get ENS text record
 */
async function getENSText(domain: string, key: string): Promise<string> {
  const node = namehash(domain)
  
  try {
    const value = await readContract<string>(
      CONTRACTS.ENS_RESOLVER,
      ENS_RESOLVER_ABI,
      'text',
      [node, key]
    )
    return value
  } catch (error) {
    console.error('Failed to get ENS text:', error)
    throw error
  }
}

/**
 * Check if ENS subdomain exists and is owned by address
 */
export async function checkSubdomainOwnership(
  subdomain: string,
  expectedOwner: Address
): Promise<{ exists: boolean; ownedByExpected: boolean; owner: Address }> {
  const fullDomain = `${subdomain}.${ENS_CONFIG.domain}`
  
  try {
    const owner = await getENSOwner(fullDomain)
    return {
      exists: owner !== '0x0000000000000000000000000000000000000000',
      ownedByExpected: owner.toLowerCase() === expectedOwner.toLowerCase(),
      owner
    }
  } catch (error: any) {
    return {
      exists: false,
      ownedByExpected: false,
      owner: '0x0000000000000000000000000000000000000000' as Address
    }
  }
}

// ============ PUBLIC API FUNCTIONS ============

/**
 * Simple subdomain check
 */
export async function checkSubdomainSimple(subdomain: string): Promise<{
  available: boolean;
  exists: boolean;
  fullName: string;
}> {
  try {
    const check = await checkSubdomainAvailability(subdomain)
    return {
      available: check.available,
      exists: check.exists,
      fullName: check.fullName
    }
  } catch (error) {
    return {
      available: false,
      exists: false,
      fullName: `${subdomain}.${ENS_CONFIG.domain}`
    }
  }
}

/**
 * Simple subdomain registration
 */
export async function registerSubdomainSimple(
  subdomain: string,
  ownerAddress: Address
): Promise<SubnameRegistration> {
  return registerSubdomain(subdomain, ownerAddress)
}

// ============ REPUTATION FUNCTIONS ============

async function getReputationFromENS(domain: string): Promise<ReputationScore | null> {
  try {
    const reputationJSON = await getENSText(domain, 'circauction.reputation')
    
    if (!reputationJSON) {
      return null
    }
    
    return JSON.parse(reputationJSON) as ReputationScore
  } catch (error) {
    console.error('❌ Failed to read reputation:', error)
    return null
  }
}

/**
 * Get ENS reputation
 */
export async function getENSReputation(domain: string): Promise<ReputationScore | null> {
  return getReputationFromENS(domain)
}

/**
 * Format reputation for display
 */
export function formatReputation(reputation: ReputationScore | null): string {
  if (!reputation) {
    return 'No reputation data'
  }
  
  const score = reputation.score
  const rate = reputation.completionRate
  
  if (score >= 90) {
    return `Excellent (${score}/100, ${rate}% success)`
  } else if (score >= 75) {
    return `Great (${score}/100, ${rate}% success)`
  } else if (score >= 60) {
    return `Good (${score}/100, ${rate}% success)`
  } else if (score >= 40) {
    return `Fair (${score}/100, ${rate}% success)`
  } else {
    return `New (${score}/100, ${rate}% success)`
  }
}

/**
 * Get reputation badge color
 */
export function getReputationBadgeColor(reputation: ReputationScore | null): string {
  if (!reputation) return 'slate'
  
  const score = reputation.score
  
  if (score >= 90) return 'green'
  if (score >= 75) return 'blue'
  if (score >= 60) return 'purple'
  if (score >= 40) return 'yellow'
  return 'orange'
}

/**
 * Get reputation tier
 */
export function getReputationTier(reputation: ReputationScore | null): string {
  if (!reputation) return 'Unranked'
  
  const score = reputation.score
  
  if (score >= 95) return 'Legendary'
  if (score >= 90) return 'Master'
  if (score >= 80) return 'Expert'
  if (score >= 70) return 'Advanced'
  if (score >= 60) return 'Intermediate'
  if (score >= 50) return 'Novice'
  return 'Beginner'
}

/**
 * Get creator info from contract
 */
export async function getCreatorInfo(
  ownerAddress: Address
): Promise<CreatorInfo | null> {
  try {
    console.log('📖 Reading creator info from contract...')
    
    const result = await readContract<[string, Hex, bigint, bigint]>(
      CONTRACTS.ENS_AUCTION_REGISTRY,
      ENS_AUCTION_REGISTRY_ABI,
      'getCreatorInfo',
      [ownerAddress]
    )
    
    if (!result[0]) {
      console.log('⚠️ No creator info found')
      return null
    }
    
    const info: CreatorInfo = {
      ensName: result[0],
      node: result[1],
      totalAuctions: result[2],
      totalVolume: result[3]
    }
    
    console.log('✅ Creator info loaded:', info)
    
    return info
    
  } catch (error) {
    console.error('Failed to get creator info:', error)
    return null
  }
}

/**
 * Check if user is admin (Hook owner)
 */
export async function checkAdminStatus(
  address: Address,
  publicClient: any
): Promise<boolean> {
  try {
    const owner = await readContract<Address>(
      CONTRACTS.HOOK,
      CIRCEVERYBID_HOOK_ABI,
      'owner',
      []
    )
    return owner.toLowerCase() === address.toLowerCase()
  } catch (error) {
    console.error('Failed to check admin status:', error)
    return false
  }
}

/**
 * Wait for ENS to be owned by address
 */
export async function waitForENSOwnership(
  subdomain: string,
  expectedOwner: Address,
  timeoutMs: number = 30000,
  intervalMs: number = 2000
): Promise<boolean> {
  const fullDomain = `${subdomain}.${ENS_CONFIG.domain}`
  const startTime = Date.now()
  
  console.log(`⏳ Waiting for ENS ownership: ${fullDomain} → ${expectedOwner}`)
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      const owner = await getENSOwner(fullDomain)
      console.log(`📋 Ownership check: ${owner} (expected: ${expectedOwner})`)
      
      if (owner.toLowerCase() === expectedOwner.toLowerCase()) {
        console.log(`✅ ENS ownership confirmed!`)
        return true
      }
      
      if (owner !== '0x0000000000000000000000000000000000000000') {
        console.warn(`⚠️ ENS owned by someone else: ${owner}`)
        return false
      }
      
      // Not yet owned, wait and retry
      console.log(`⏳ Not yet owned, waiting ${intervalMs}ms...`)
      await new Promise(resolve => setTimeout(resolve, intervalMs))
      
    } catch (error) {
      console.error('Error checking ENS ownership:', error)
      await new Promise(resolve => setTimeout(resolve, intervalMs))
    }
  }
  
  console.warn(`⏰ Timeout waiting for ENS ownership`)
  return false
}



/**
 * Update text records for existing subdomain
 */
export async function updateENSRecords(
  subdomain: string,
  textRecords: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('📝 Updating ENS text records for:', subdomain)
    
    const response = await fetch('/api/ens/update-text-records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subdomain,
        textRecords
      })
    })
    
    if (!response.ok) {
      const error = await response.json()
      return { 
        success: false, 
        error: error.message || 'Failed to update text records' 
      }
    }
    
    const result = await response.json()
    
    if (result.success) {
      console.log('✅ ENS text records updated!')
      console.log('📋 Updated records:', textRecords)
      return { success: true }
    } else {
      return { 
        success: false, 
        error: result.error || 'Failed to update text records' 
      }
    }
    
  } catch (error: any) {
    console.error('❌ Failed to update text records:', error)
    return { 
      success: false, 
      error: error.message || 'Failed to update text records'
    }
  }
}




/**
 * Register subdomain under circeverybid.eth using REAL contract
 */
export async function registerSubdomainContract(
  subdomain: string,
  ownerAddress: Address,
  accountAddress: Address
): Promise<{ hash: Hex; fullDomain: string; node: Hex }> {
  console.log('📝 Registering subdomain on ENS Auction Registry...')
  
  const fullDomain = `${subdomain}.${ENS_CONFIG.domain}`
  
  // First, wait for ENS to be owned by the user
  const ownershipConfirmed = await waitForENSOwnership(subdomain, ownerAddress)
  
  if (!ownershipConfirmed) {
    throw new Error(`ENS ownership not confirmed for ${fullDomain}`)
  }
  
  // Use registerAuctionCreator
  const { hash } = await writeContract(
    CONTRACTS.ENS_AUCTION_REGISTRY,
    ENS_AUCTION_REGISTRY_ABI,
    'registerAuctionCreator',
    [
      ownerAddress,
      subdomain,
      BigInt(0),
      BigInt(0)
    ],
    { account: accountAddress }
  )
  
  const node = namehash(fullDomain)
  
  console.log('✅ Subdomain registration initiated!')
  console.log('🔗 TX:', `https://sepolia.etherscan.io/tx/${hash}`)
  console.log('🌐 Domain:', fullDomain)
  
  return { hash, fullDomain, node }
}