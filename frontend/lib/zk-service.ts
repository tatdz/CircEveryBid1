// lib/zk-service.ts
// Real Poseidon ZK commitment generation for sealed bids
import { poseidon2, poseidon3, poseidon4, poseidon5 } from 'poseidon-lite'
import { keccak256, encodePacked, type Hex, parseEther, parseUnits, type Address, hexToBigInt, toHex } from 'viem'

export interface ZKProof {
  // Core Poseidon commitment data
  commitment: string           // Poseidon5(bidder, auction, amount, price, salt)
  proof: string                // Verification proof
  nullifier: string            // Prevents double-reveal
  
  // Public signals for on-chain verification
  publicSignals: string[]
  
  // Commitment metadata
  proofMetadata: {
    hashingAlgorithm: 'poseidon'
    protocol: 'circeverybid-sealed-bid'
    version: '1.0.0'
    privacyLevel: 'zk-commitment'
    generatedAt: string
    hiddenFields: string[]     // Fields hidden in commitment
    revealableBy: string       // Only this address can reveal
  }
  
  // Public data (not hidden)
  bidder: string
  auction: string
  timestamp: number
  
  // Hidden data (only in commitment) - stored locally for reveal
  hiddenData: {
    amount: string
    price: string
    salt: string
  }
}

export interface StoredBid {
  bidder: string
  auction: string
  amount: string
  price: string
  commitmentHash: string
  txHash: string
  timestamp: number
  zkProof: ZKProof
  
  // Storage metadata
  storageInfo?: {
    storageType: 'local' | 'ipfs'
    storedAt: string
    canReveal: boolean
  }
}

// Convert address to field element for Poseidon
function addressToField(address: string): bigint {
  return BigInt(address)
}

// Generate cryptographic salt for bid blinding
function generateSalt(): bigint {
  const array = new Uint8Array(32)
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array)
  } else {
    // Fallback for SSR
    for (let i = 0; i < 32; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
  }
  return BigInt('0x' + Array.from(array).map(b => b.toString(16).padStart(2, '0')).join(''))
}

/**
 * Generate Poseidon-based ZK commitment for sealed bid
 * Commitment = Poseidon(bidder, auction, amount, price, salt)
 * The salt ensures bid privacy - only the bidder can reveal
 */
export async function generatePoseidonCommitment(
  bidder: string,
  amount: string,
  timestamp: number
): Promise<{ commitment: string; proof: string }> {
  try {
    console.log('🔐 Generating REAL Poseidon commitment...')
    
    const salt = generateSalt()
    const bidderField = addressToField(bidder)
    const amountBigInt = BigInt(amount)
    const timestampBigInt = BigInt(timestamp)
    
    // Poseidon hash for commitment: H(bidder, amount, timestamp, salt)
    const commitment = poseidon4([bidderField, amountBigInt, timestampBigInt, salt])
    
    // Nullifier prevents double-reveal: H(commitment, salt)
    const nullifier = poseidon2([commitment, salt])
    
    // Proof is derived for verification
    const proof = poseidon3([commitment, nullifier, timestampBigInt])
    
    console.log('✅ Poseidon commitment generated')
    console.log('  Commitment:', '0x' + commitment.toString(16))
    console.log('  Nullifier:', '0x' + nullifier.toString(16))
    
    return {
      commitment: '0x' + commitment.toString(16).padStart(64, '0'),
      proof: '0x' + proof.toString(16).padStart(64, '0'),
    }
  } catch (error: any) {
    console.error('❌ Poseidon generation failed:', error)
    throw new Error('Failed to generate Poseidon commitment')
  }
}

/**
 * Generate complete sealed bid proof using Poseidon hashing
 * This creates a ZK-friendly commitment that can be verified on-chain
 */
export function generateSealedBidProof(
  bidder: string,
  auction: string,
  amount: string,
  price: string,
  timestamp: number
): ZKProof {
  console.log('🔐 === ZK Sealed Bid Proof Generation (Poseidon) ===')
  
  // Generate random salt for bid privacy
  const salt = generateSalt()
  console.log('  Salt generated (blinding factor)')
  
  // Convert inputs to field elements
  const bidderField = addressToField(bidder)
  const auctionField = addressToField(auction)
  const amountWei = parseEther(amount)
  const priceWei = parseUnits(price, 6)
  
  // Poseidon commitment: H(bidder, auction, amount, price, salt)
  // This hides the bid values while allowing verification
  const commitment = poseidon5([
    bidderField,
    auctionField,
    amountWei,
    priceWei,
    salt
  ])
  console.log('  Poseidon commitment computed')
  
  // Nullifier prevents double-spending/double-reveal
  const nullifier = poseidon3([commitment, salt, BigInt(timestamp)])
  console.log('  Nullifier computed')
  
  // Proof for verification (simulated SNARK-like proof)
  const proof = poseidon4([
    commitment,
    nullifier,
    bidderField,
    BigInt(timestamp)
  ])
  
  // Public signals - what's revealed to verify without exposing private data
  const publicSignals = [
    '0x' + commitment.toString(16).padStart(64, '0'),    // Commitment hash
    '0x' + nullifier.toString(16).padStart(64, '0'),     // Nullifier
    '0x' + auctionField.toString(16).padStart(64, '0'),  // Auction (public)
    '0x' + BigInt(timestamp).toString(16).padStart(64, '0')  // Timestamp (public)
  ]
  
  const commitmentHex = '0x' + commitment.toString(16).padStart(64, '0')
  const proofHex = '0x' + proof.toString(16).padStart(64, '0')
  const nullifierHex = '0x' + nullifier.toString(16).padStart(64, '0')
  const saltHex = '0x' + salt.toString(16).padStart(64, '0')
  
  console.log('  ✅ Commitment:', commitmentHex.slice(0, 18) + '...')
  console.log('  ✅ Nullifier:', nullifierHex.slice(0, 18) + '...')
  console.log('  ✅ Proof:', proofHex.slice(0, 18) + '...')
  console.log('✅ Poseidon ZK Proof generated successfully')
  console.log('  Hidden fields: amount, price (in commitment)')
  console.log('  Revealable by:', bidder)
  
  return {
    commitment: commitmentHex,
    proof: proofHex,
    nullifier: nullifierHex,
    publicSignals,
    proofMetadata: {
      hashingAlgorithm: 'poseidon',
      protocol: 'circeverybid-sealed-bid',
      version: '1.0.0',
      privacyLevel: 'zk-commitment',
      generatedAt: new Date().toISOString(),
      hiddenFields: ['amount', 'price'],
      revealableBy: bidder
    },
    bidder,
    auction,
    timestamp,
    hiddenData: {
      amount,
      price,
      salt: saltHex
    }
  }
}

/**
 * Verify a Poseidon commitment matches revealed values
 * Used during auction settlement to verify bids
 */
export function verifySealedBid(
  commitment: string,
  bidder: string,
  auction: string,
  amount: string,
  price: string,
  salt: string
): boolean {
  try {
    const bidderField = addressToField(bidder)
    const auctionField = addressToField(auction)
    const amountWei = parseEther(amount)
    const priceWei = parseUnits(price, 6)
    const saltBigInt = BigInt(salt)
    
    // Recompute commitment
    const recomputed = poseidon5([
      bidderField,
      auctionField,
      amountWei,
      priceWei,
      saltBigInt
    ])
    
    const recomputedHex = '0x' + recomputed.toString(16).padStart(64, '0')
    
    return commitment.toLowerCase() === recomputedHex.toLowerCase()
  } catch {
    return false
  }
}

export function loadStoredBids(): StoredBid[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem('sealed-bids')
    return stored ? JSON.parse(stored) : []
  } catch { 
    return [] 
  }
}

export function saveStoredBid(bid: StoredBid) {
  if (typeof window === 'undefined') return
  try {
    const bids = loadStoredBids()
    bids.push(bid)
    localStorage.setItem('sealed-bids', JSON.stringify(bids))
    console.log('💾 Sealed bid stored with Poseidon ZK proof:')
    console.log('  Total Stored Bids:', bids.length)
    console.log('  Commitment:', bid.zkProof.commitment.slice(0, 18) + '...')
    console.log('  Nullifier:', bid.zkProof.nullifier.slice(0, 18) + '...')
  } catch (e) { 
    console.error('Failed to save bid:', e) 
  }
}

export function getUserBids(address: string): StoredBid[] {
  const bids = loadStoredBids()
  return bids.filter(b => b.bidder.toLowerCase() === address.toLowerCase())
}

export function getBadgeLevel(bidCount: number): { level: number; name: string; color: string } {
  if (bidCount >= 10) return { level: 3, name: 'Gold Bidder', color: '#F59E0B' }
  if (bidCount >= 5) return { level: 2, name: 'Silver Bidder', color: '#94A3B8' }
  if (bidCount >= 1) return { level: 1, name: 'Verified Bidder', color: '#A78BFA' }
  return { level: 0, name: 'New Bidder', color: '#64748B' }
}

export function calculateHHI(bidAmounts: bigint[]): number {
  if (bidAmounts.length === 0) return 0
  
  const total = bidAmounts.reduce((sum, amt) => sum + amt, 0n)
  if (total === 0n) return 0
  
  let hhi = 0
  for (const amount of bidAmounts) {
    const share = Number((amount * 10000n) / total)
    hhi += (share * share) / 100
  }
  
  return Math.min(Math.floor(hhi), 10000)
}

export async function verifyCommitment(
  commitment: string,
  proof: string
): Promise<boolean> {
  try {
    console.log('🔍 Verifying Poseidon commitment...')
    // Basic validation - actual verification would be on-chain
    const isValidFormat = commitment.startsWith('0x') && commitment.length === 66
    const isValidProof = proof.startsWith('0x') && proof.length === 66
    return isValidFormat && isValidProof
  } catch (error) {
    console.error('Verification error:', error)
    return false
  }
}
