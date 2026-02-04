// lib/ens-reader.ts
import { createPublicClient, http } from 'viem'
import { normalize } from 'viem/ens'
import { sepolia } from 'viem/chains'

// Create a public client for Sepolia
const publicClient = createPublicClient({
  chain: sepolia,
  transport: http()
})

/**
 * Read a single ENS text record using viem (automatic resolver)
 */
export async function readENSTextRecord(name: string, key: string): Promise<string | null> {
  try {
    const normalizedName = normalize(name)
    
    console.log(`📖 Reading ENS record: ${name} -> ${key}`)
    
    // viem will automatically find and use the correct resolver
    const text = await publicClient.getEnsText({
      name: normalizedName,
      key
    })
    
    console.log(`✅ Read ${key}:`, text)
    return text || null
    
  } catch (error) {
    console.error(`❌ Failed to read ENS text record ${key} for ${name}:`, error)
    return null
  }
}

/**
 * Read all auction records from ENS
 */
export async function readAuctionENSRecords(ensName: string) {
  console.log(`🔍 Reading auction records from: ${ensName}`)
  
  // Try to read basic text records first
  const basicRecords = [
    { key: 'name', label: 'Name' },
    { key: 'description', label: 'Description' },
    { key: 'url', label: 'URL' },
    { key: 'auction.address', label: 'Auction Address' },
    { key: 'auction.creator', label: 'Creator' },
    { key: 'auction.floorPrice', label: 'Floor Price' },
    { key: 'auction.duration', label: 'Duration' },
    { key: 'auction.status', label: 'Status' },
    { key: 'auction.type', label: 'Type' },
    { key: 'protocol', label: 'Protocol' },
    { key: 'version', label: 'Version' },
    { key: 'chain', label: 'Chain' },
    { key: 'created', label: 'Created' },
    { key: 'notice', label: 'Notice' },
    { key: 'keywords', label: 'Keywords' },
    { key: 'com.twitter', label: 'Twitter' },
    { key: 'com.github', label: 'GitHub' }
  ]
  
  const results: Array<{key: string, label: string, value: string | null}> = []
  
  for (const record of basicRecords) {
    const value = await readENSTextRecord(ensName, record.key)
    results.push({ ...record, value })
  }
  
  // Try to read JSON data
  const performanceJSON = await readENSTextRecord(ensName, 'circauction.performance')
  const reputationJSON = await readENSTextRecord(ensName, 'circauction.reputation')
  
  let performanceData = null
  let reputationData = null
  
  if (performanceJSON) {
    try {
      performanceData = JSON.parse(performanceJSON)
      console.log('✅ Parsed performance data')
    } catch (error) {
      console.error('Failed to parse performance JSON:', error)
    }
  }
  
  if (reputationJSON) {
    try {
      reputationData = JSON.parse(reputationJSON)
      console.log('✅ Parsed reputation data')
    } catch (error) {
      console.error('Failed to parse reputation JSON:', error)
    }
  }
  
  return {
    basicRecords: results.filter(r => r.value !== null),
    performanceData,
    reputationData,
    hasData: results.some(r => r.value !== null) || performanceData || reputationData
  }
}

/**
 * Check if ENS name exists
 */
export async function checkENSNameExists(name: string): Promise<boolean> {
  try {
    const normalizedName = normalize(name)
    
    const address = await publicClient.getEnsAddress({
      name: normalizedName
    })
    
    return address !== null && address !== '0x0000000000000000000000000000000000000000'
    
  } catch (error) {
    console.error('Failed to check ENS name:', error)
    return false
  }
}

/**
 * Get ENS address for a name
 */
export async function getENSAddress(name: string): Promise<string | null> {
  try {
    const normalizedName = normalize(name)
    
    const address = await publicClient.getEnsAddress({
      name: normalizedName
    })
    
    return address
    
  } catch (error) {
    console.error('Failed to get ENS address:', error)
    return null
  }
}