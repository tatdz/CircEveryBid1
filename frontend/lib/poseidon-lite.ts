// lib/poseidon-lite.ts
'use client'

import type { Hex } from 'viem'

/**
 * Poseidon hash function wrapper with dynamic import for client-side only usage
 */

// Cache the loaded poseidon functions
let poseidonFunctions: any = null
let loadingPromise: Promise<any> | null = null

/**
 * Dynamically load poseidon-lite only in browser context
 */
async function loadPoseidon(): Promise<any> {
  // Return cached version if available
  if (poseidonFunctions) {
    return poseidonFunctions
  }

  // Return existing loading promise if already loading
  if (loadingPromise) {
    return loadingPromise
  }

  // Only load in browser
  if (typeof window === 'undefined') {
    throw new Error('Poseidon can only be used in browser context')
  }

  loadingPromise = (async () => {
    try {
      console.log('[Poseidon] 🔐 Loading poseidon-lite...')
      const mod = await import('poseidon-lite')
      poseidonFunctions = mod
      console.log('[Poseidon] ✅ Loaded successfully')
      return poseidonFunctions
    } catch (error) {
      console.error('[Poseidon] ❌ Failed to load:', error)
      loadingPromise = null
      throw error
    }
  })()

  return loadingPromise
}

/**
 * Hash with Poseidon based on input count
 */
async function poseidonHash(inputs: bigint[]): Promise<bigint> {
  const poseidon = await loadPoseidon()
  
  // Use the appropriate poseidonN function based on input count
  const count = inputs.length
  
  if (count < 1 || count > 16) {
    throw new Error(`Poseidon supports 1-16 inputs, got ${count}`)
  }
  
  // Call poseidon1, poseidon2, ..., poseidon16
  const funcName = `poseidon${count}`
  const hashFunc = poseidon[funcName as keyof typeof poseidon]
  
  if (!hashFunc || typeof hashFunc !== 'function') {
    throw new Error(`Poseidon function not found: ${funcName}`)
  }
  
  return hashFunc(inputs)
}

/**
 * Commitment inputs for bid sealing
 */
export interface CommitmentInputs {
  bidder: string
  amount: bigint
  price: bigint
  timestamp: number
}

/**
 * Bid commitment structure
 */
export interface BidCommitment {
  commitment: Hex
  nullifier: Hex
  secret: Hex
}

/**
 * Generate a bid commitment using Poseidon hash
 */
export async function generateBidCommitment(
  inputs: CommitmentInputs
): Promise<BidCommitment> {
  console.log('[Poseidon] 🔒 Generating bid commitment...')

  // Convert bidder address to BigInt
  const bidderBigInt = BigInt(inputs.bidder)

  // Generate random secret
  const secret = BigInt(
    '0x' + 
    Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  )

  console.log('[Poseidon] 📊 Inputs:', {
    bidder: inputs.bidder.slice(0, 10) + '...',
    amount: inputs.amount.toString(),
    price: inputs.price.toString(),
    timestamp: inputs.timestamp,
  })

  // Generate commitment hash
  // commitment = poseidon5(bidder, amount, price, timestamp, secret)
  const commitment = await poseidonHash([
    bidderBigInt,
    inputs.amount,
    inputs.price,
    BigInt(inputs.timestamp),
    secret,
  ])

  // Generate nullifier
  // nullifier = poseidon3(bidder, timestamp, secret)
  const nullifier = await poseidonHash([
    bidderBigInt,
    BigInt(inputs.timestamp),
    secret,
  ])

  const result = {
    commitment: `0x${commitment.toString(16).padStart(64, '0')}` as Hex,
    nullifier: `0x${nullifier.toString(16).padStart(64, '0')}` as Hex,
    secret: `0x${secret.toString(16).padStart(64, '0')}` as Hex,
  }

  console.log('[Poseidon] ✅ Commitment generated:', {
    commitment: result.commitment.slice(0, 20) + '...',
    nullifier: result.nullifier.slice(0, 20) + '...',
  })

  return result
}

/**
 * Verify a bid commitment
 */
export async function verifyBidCommitment(
  commitment: Hex,
  inputs: CommitmentInputs,
  secret: Hex
): Promise<boolean> {
  console.log('[Poseidon] 🔍 Verifying commitment...')

  try {
    const bidderBigInt = BigInt(inputs.bidder)
    const secretBigInt = BigInt(secret)

    const recomputed = await poseidonHash([
      bidderBigInt,
      inputs.amount,
      inputs.price,
      BigInt(inputs.timestamp),
      secretBigInt,
    ])

    const recomputedHex = `0x${recomputed.toString(16).padStart(64, '0')}` as Hex

    const isValid = recomputedHex.toLowerCase() === commitment.toLowerCase()

    console.log('[Poseidon]', isValid ? '✅ Valid' : '❌ Invalid')

    return isValid
  } catch (error) {
    console.error('[Poseidon] ❌ Verification failed:', error)
    return false
  }
}

/**
 * Calculate Herfindahl-Hirschman Index (HHI) for concentration measurement
 * Used to measure bid concentration in auctions
 */
export function calculateHHI(bids: bigint[]): number {
  if (bids.length === 0) {
    return 0
  }

  // Calculate total
  const total = bids.reduce((sum, bid) => sum + bid, 0n)

  if (total === 0n) {
    return 0
  }

  // Calculate HHI: sum of squared market shares
  let hhi = 0

  for (const bid of bids) {
    // Calculate share as percentage (with precision)
    const share = Number((bid * 10000n) / total) / 100
    hhi += share * share
  }

  console.log('[Poseidon] 📊 HHI calculated:', Math.round(hhi))

  return Math.round(hhi)
}

/**
 * Generate a Merkle root from bid commitments
 */
export async function generateMerkleRoot(commitments: Hex[]): Promise<Hex> {
  if (commitments.length === 0) {
    return '0x0000000000000000000000000000000000000000000000000000000000000000'
  }

  // Convert all commitments to BigInt
  const leaves = commitments.map(c => BigInt(c))

  // Build Merkle tree bottom-up
  let currentLevel = leaves

  while (currentLevel.length > 1) {
    const nextLevel: bigint[] = []

    for (let i = 0; i < currentLevel.length; i += 2) {
      if (i + 1 < currentLevel.length) {
        // Hash pair using poseidon2
        const hash = await poseidonHash([currentLevel[i], currentLevel[i + 1]])
        nextLevel.push(hash)
      } else {
        // Odd one out, carry forward
        nextLevel.push(currentLevel[i])
      }
    }

    currentLevel = nextLevel
  }

  const root = `0x${currentLevel[0].toString(16).padStart(64, '0')}` as Hex

  console.log('[Poseidon] 🌳 Merkle root:', root.slice(0, 20) + '...')

  return root
}

/**
 * Hash two values together (useful for Merkle trees)
 */
export async function hashPair(left: Hex, right: Hex): Promise<Hex> {
  const leftBigInt = BigInt(left)
  const rightBigInt = BigInt(right)

  const hash = await poseidonHash([leftBigInt, rightBigInt])

  return `0x${hash.toString(16).padStart(64, '0')}` as Hex
}

/**
 * Hash a single value (useful for nullifiers)
 */
export async function hashSingle(value: bigint): Promise<Hex> {
  const hash = await poseidonHash([value])

  return `0x${hash.toString(16).padStart(64, '0')}` as Hex
}

/**
 * Check if Poseidon is loaded (useful for conditional logic)
 */
export function isPoseidonLoaded(): boolean {
  return poseidonFunctions !== null
}

/**
 * Preload Poseidon (call this early in app lifecycle)
 */
export async function preloadPoseidon(): Promise<void> {
  if (typeof window === 'undefined') {
    console.warn('[Poseidon] ⚠️ Cannot preload in SSR context')
    return
  }

  try {
    await loadPoseidon()
    console.log('[Poseidon] ✅ Preloaded')
  } catch (error) {
    console.error('[Poseidon] ❌ Preload failed:', error)
  }
}