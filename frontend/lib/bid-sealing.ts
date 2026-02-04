// lib/bid-sealing.ts
'use client'

import type { Hex } from 'viem'
import {
  generateBidCommitment,
  verifyBidCommitment,
  type BidCommitment,
  type CommitmentInputs,
} from './poseidon-lite'

/**
 * Sealed bid structure
 */
export interface SealedBid {
  commitment: Hex
  proof: string
  publicSignals: string[]
  nullifier: Hex
  timestamp: number
}

/**
 * Stored sealed bid with secret
 */
export interface StoredSealedBid {
  sealed: SealedBid
  secret: Hex
  timestamp: number
}

/**
 * Nullifier registry entry
 */
interface NullifierEntry {
  nullifier: string
  auctionAddress: string
  timestamp: number
}

/**
 * Seal a bid with ZK commitment
 */
export async function sealBid(
  bidder: string,
  amount: bigint,
  price: bigint,
  auctionAddress?: string
): Promise<{
  sealed: SealedBid
  secret: Hex
}> {
  const timestamp = Date.now()

  console.log('🔒 Sealing bid...')
  console.log('  Bidder:', bidder.slice(0, 10) + '...')
  console.log('  Amount:', amount.toString())
  console.log('  Price:', price.toString())

  // Generate commitment inputs
  const inputs: CommitmentInputs = {
    bidder,
    amount,
    price,
    timestamp,
  }

  // Generate Poseidon commitment
  const commitment = await generateBidCommitment(inputs)

  console.log('✅ Commitment generated')

  // Create sealed bid structure
  const sealed: SealedBid = {
    commitment: commitment.commitment,
    proof: '', // Will be filled by generateBidProof
    publicSignals: [], // Will be filled by generateBidProof
    nullifier: commitment.nullifier,
    timestamp,
  }

  // Check nullifier registry to prevent double-bidding
  if (!checkNullifierRegistry(commitment.nullifier)) {
    throw new Error('Nullifier already used - double bidding not allowed')
  }

  // Generate ZK proof
  const { proof, publicSignals } = generateBidProof(commitment.commitment, inputs)
  sealed.proof = proof
  sealed.publicSignals = publicSignals

  console.log('✅ Proof generated')

  // Register nullifier if auction address provided
  if (auctionAddress) {
    registerNullifier(commitment.nullifier, auctionAddress)
    console.log('✅ Nullifier registered for auction:', auctionAddress.slice(0, 10) + '...')
  }

  console.log('✅ Bid sealed successfully')
  console.log('  Commitment:', commitment.commitment.slice(0, 20) + '...')
  console.log('  Nullifier:', commitment.nullifier.slice(0, 20) + '...')

  return {
    sealed,
    secret: commitment.secret,
  }
}

/**
 * Generate ZK proof for bid
 * In production, this would call a ZK circuit (e.g., SnarkJS)
 * For now, we generate a mock proof
 */
function generateBidProof(
  commitment: Hex,
  inputs: CommitmentInputs
): {
  proof: string
  publicSignals: string[]
} {
  console.log('🔐 Generating ZK proof...')

  // Mock proof structure (in production, use actual ZK circuit)
  const proof = JSON.stringify({
    pi_a: [
      '0x' + '1'.repeat(64),
      '0x' + '2'.repeat(64),
      '0x' + '3'.repeat(64),
    ],
    pi_b: [
      ['0x' + '4'.repeat(64), '0x' + '5'.repeat(64)],
      ['0x' + '6'.repeat(64), '0x' + '7'.repeat(64)],
      ['0x' + '8'.repeat(64), '0x' + '9'.repeat(64)],
    ],
    pi_c: [
      '0x' + 'a'.repeat(64),
      '0x' + 'b'.repeat(64),
      '0x' + 'c'.repeat(64),
    ],
    protocol: 'groth16',
    curve: 'bn128',
  })

  // Public signals that will be verified on-chain
  const publicSignals = [
    commitment, // The commitment hash
    `0x${inputs.timestamp.toString(16).padStart(64, '0')}`, // Timestamp
  ]

  console.log('✅ Proof generated (mock)')

  return { proof, publicSignals }
}

/**
 * Verify a sealed bid without revealing the bid details
 */
export function verifySealedBid(sealed: SealedBid): boolean {
  console.log('🔍 Verifying sealed bid...')

  // Check proof structure
  if (!sealed.commitment || !sealed.proof || !sealed.publicSignals) {
    console.error('❌ Invalid proof structure')
    return false
  }

  // Verify timestamp is reasonable (within 24h window)
  const now = Date.now()
  if (sealed.timestamp > now || sealed.timestamp < now - 86400000) {
    console.error('❌ Timestamp out of valid range')
    return false
  }

  // Check nullifier registry (prevent double-bidding)
  if (!checkNullifierRegistry(sealed.nullifier)) {
    console.error('❌ Nullifier already used - double bidding attempt')
    return false
  }

  console.log('✅ Sealed bid verified')
  return true
}

/**
 * Reveal a sealed bid by providing the secret
 */
export async function revealBid(
  sealed: SealedBid,
  secret: Hex,
  inputs: CommitmentInputs
): Promise<boolean> {
  console.log('🔓 Revealing bid...')

  // Verify the commitment matches the inputs + secret
  const isValid = await verifyBidCommitment(
    sealed.commitment,
    inputs,
    secret
  )

  if (isValid) {
    console.log('✅ Bid revealed successfully')
    console.log('  Amount:', inputs.amount.toString())
    console.log('  Price:', inputs.price.toString())
  } else {
    console.error('❌ Invalid secret or inputs')
  }

  return isValid
}

/**
 * Check nullifier registry to prevent double-bidding
 */
function checkNullifierRegistry(nullifier: Hex): boolean {
  // Only run in browser
  if (typeof window === 'undefined') {
    return true
  }

  const registry = getNullifierRegistry()

  if (registry.has(nullifier.toLowerCase())) {
    console.warn('⚠️ Nullifier already exists:', nullifier.slice(0, 20) + '...')
    return false
  }

  return true
}

/**
 * Register a nullifier after successful bid
 */
export function registerNullifier(nullifier: Hex, auctionAddress: string): void {
  // Only run in browser
  if (typeof window === 'undefined') {
    console.warn('⚠️ Cannot register nullifier in SSR context')
    return
  }

  const registry = getNullifierRegistry()

  const entry: NullifierEntry = {
    nullifier: nullifier.toLowerCase(),
    auctionAddress: auctionAddress.toLowerCase(),
    timestamp: Date.now(),
  }

  registry.set(nullifier.toLowerCase(), entry)

  // Save to localStorage
  saveNullifierRegistry(registry)

  console.log('✅ Nullifier registered:', nullifier.slice(0, 10) + '...')
}

/**
 * Get nullifier registry from localStorage
 */
function getNullifierRegistry(): Map<string, NullifierEntry> {
  if (typeof window === 'undefined') {
    return new Map()
  }

  try {
    const stored = localStorage.getItem('nullifier-registry')
    if (stored) {
      const data = JSON.parse(stored)
      return new Map(Object.entries(data))
    }
  } catch (error) {
    console.error('Failed to load nullifier registry:', error)
  }

  return new Map()
}

/**
 * Save nullifier registry to localStorage
 */
function saveNullifierRegistry(registry: Map<string, NullifierEntry>): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const data = Object.fromEntries(registry)
    localStorage.setItem('nullifier-registry', JSON.stringify(data))
  } catch (error) {
    console.error('Failed to save nullifier registry:', error)
  }
}

/**
 * Clear nullifier registry for a specific auction
 */
export function clearNullifierRegistry(auctionAddress: string): void {
  if (typeof window === 'undefined') {
    console.warn('⚠️ Cannot clear nullifier registry in SSR context')
    return
  }

  const registry = getNullifierRegistry()
  const addressLower = auctionAddress.toLowerCase()

  let removedCount = 0

  for (const [key, value] of registry.entries()) {
    if (value.auctionAddress === addressLower) {
      registry.delete(key)
      removedCount++
    }
  }

  saveNullifierRegistry(registry)

  console.log(`🗑️ Cleared ${removedCount} nullifiers for auction:`, auctionAddress.slice(0, 10) + '...')
}

/**
 * Get all nullifiers for an auction
 */
export function getAuctionNullifiers(auctionAddress: string): NullifierEntry[] {
  if (typeof window === 'undefined') {
    return []
  }

  const registry = getNullifierRegistry()
  const addressLower = auctionAddress.toLowerCase()

  const nullifiers: NullifierEntry[] = []

  for (const [_, entry] of registry.entries()) {
    if (entry.auctionAddress === addressLower) {
      nullifiers.push(entry)
    }
  }

  return nullifiers
}

/**
 * Store a sealed bid locally
 */
export function storeSealedBid(
  sealed: SealedBid,
  secret: Hex,
  auctionAddress: string
): void {
  if (typeof window === 'undefined') {
    console.warn('⚠️ Cannot store sealed bid in SSR context')
    return
  }

  const key = `sealed-bid-${auctionAddress.toLowerCase()}`

  try {
    const stored = localStorage.getItem(key)
    const bids: StoredSealedBid[] = stored ? JSON.parse(stored) : []

    bids.push({
      sealed,
      secret,
      timestamp: Date.now(),
    })

    localStorage.setItem(key, JSON.stringify(bids))

    console.log('💾 Sealed bid stored for auction:', auctionAddress.slice(0, 10) + '...')
    console.log('  Total bids for this auction:', bids.length)
  } catch (error) {
    console.error('Failed to store sealed bid:', error)
  }
}

/**
 * List all sealed bids for an auction
 */
export function listSealedBids(auctionAddress: string): StoredSealedBid[] {
  if (typeof window === 'undefined') {
    return []
  }

  const key = `sealed-bid-${auctionAddress.toLowerCase()}`

  try {
    const stored = localStorage.getItem(key)
    if (!stored) {
      return []
    }

    const bids = JSON.parse(stored)
    console.log(`📂 Loaded ${bids.length} sealed bids for auction:`, auctionAddress.slice(0, 10) + '...')
    return bids
  } catch (error) {
    console.error('Failed to load sealed bids:', error)
    return []
  }
}

/**
 * Retrieve a specific sealed bid by commitment
 */
export function retrieveSealedBid(
  commitment: Hex,
  auctionAddress: string
): StoredSealedBid | null {
  const bids = listSealedBids(auctionAddress)

  const found = bids.find(
    (b) => b.sealed.commitment.toLowerCase() === commitment.toLowerCase()
  )

  if (found) {
    console.log('✅ Found sealed bid for commitment:', commitment.slice(0, 20) + '...')
  } else {
    console.log('❌ No sealed bid found for commitment:', commitment.slice(0, 20) + '...')
  }

  return found || null
}

/**
 * Delete all sealed bids for an auction
 */
export function deleteSealedBids(auctionAddress: string): void {
  if (typeof window === 'undefined') {
    console.warn('⚠️ Cannot delete sealed bids in SSR context')
    return
  }

  const key = `sealed-bid-${auctionAddress.toLowerCase()}`

  try {
    localStorage.removeItem(key)
    console.log('🗑️ Deleted all sealed bids for auction:', auctionAddress.slice(0, 10) + '...')
  } catch (error) {
    console.error('Failed to delete sealed bids:', error)
  }
}

/**
 * Export sealed bid to JSON for backup
 */
export function exportSealedBid(sealed: SealedBid, secret: Hex): string {
  const data = {
    sealed,
    secret,
    exportedAt: new Date().toISOString(),
    version: '1.0',
  }

  return JSON.stringify(data, null, 2)
}

/**
 * Import sealed bid from JSON backup
 */
export function importSealedBid(json: string): {
  sealed: SealedBid
  secret: Hex
} | null {
  try {
    const data = JSON.parse(json)

    if (!data.sealed || !data.secret) {
      throw new Error('Invalid sealed bid format')
    }

    console.log('✅ Sealed bid imported from backup')

    return {
      sealed: data.sealed,
      secret: data.secret,
    }
  } catch (error) {
    console.error('Failed to import sealed bid:', error)
    return null
  }
}