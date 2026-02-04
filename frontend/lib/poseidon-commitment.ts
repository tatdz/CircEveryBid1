// lib/poseidon-commitment.ts - Direct Poseidon commitment submission (no v4 hooks)
import { type Address, type Hex, encodeFunctionData, keccak256, toHex, parseUnits } from 'viem'
import { CONTRACTS } from './contracts'

export const POSEIDON_BID_COMMITMENT_ABI = [
  {
    type: 'function',
    name: 'commitBid',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'bidder', type: 'address' },
      { name: 'auction', type: 'address' },
      { name: 'amountHash', type: 'bytes32' },
      { name: 'priceHash', type: 'bytes32' },
      { name: 'timestampHash', type: 'bytes32' }
    ],
    outputs: [{ name: 'commitmentHash', type: 'bytes32' }]
  },
  {
    type: 'function',
    name: 'verifyCommitment',
    stateMutability: 'view',
    inputs: [{ name: 'commitmentHash', type: 'bytes32' }],
    outputs: [{ name: 'isValid', type: 'bool' }]
  },
  {
    type: 'function',
    name: 'verifyZKProof',
    stateMutability: 'view',
    inputs: [
      { name: 'inputs', type: 'uint256[]' },
      { name: 'expectedHash', type: 'uint256' }
    ],
    outputs: [{ name: 'isValid', type: 'bool' }]
  },
  {
    type: 'function',
    name: 'revealBid',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'commitmentHash', type: 'bytes32' },
      { name: 'amount', type: 'uint256' },
      { name: 'maxPrice', type: 'uint256' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'getCommitment',
    stateMutability: 'view',
    inputs: [{ name: 'commitmentHash', type: 'bytes32' }],
    outputs: [
      { name: 'bidder', type: 'address' },
      { name: 'auction', type: 'address' },
      { name: 'amountHash', type: 'bytes32' },
      { name: 'priceHash', type: 'bytes32' },
      { name: 'timestampHash', type: 'bytes32' },
      { name: 'timestamp', type: 'uint256' },
      { name: 'revealed', type: 'bool' }
    ]
  },
  {
    type: 'function',
    name: 'generateCommitmentHash',
    stateMutability: 'pure',
    inputs: [
      { name: 'bidder', type: 'address' },
      { name: 'auction', type: 'address' },
      { name: 'amountHash', type: 'bytes32' },
      { name: 'priceHash', type: 'bytes32' },
      { name: 'timestampHash', type: 'bytes32' }
    ],
    outputs: [{ name: 'hash', type: 'bytes32' }]
  },
  {
    type: 'function',
    name: 'hashParameters',
    stateMutability: 'pure',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'maxPrice', type: 'uint256' },
      { name: 'timestamp', type: 'uint256' }
    ],
    outputs: [
      { name: 'amountHash', type: 'bytes32' },
      { name: 'priceHash', type: 'bytes32' },
      { name: 'timestampHash', type: 'bytes32' }
    ]
  },
  {
    type: 'function',
    name: 'createPoseidonHashForInputs',
    stateMutability: 'view',
    inputs: [{ name: 'inputs', type: 'uint256[]' }],
    outputs: [{ name: 'hash', type: 'bytes32' }]
  },
  {
    type: 'function',
    name: 'getUserCommitmentCount',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: 'count', type: 'uint256' }]
  },
  {
    type: 'event',
    name: 'BidCommitted',
    inputs: [
      { indexed: true, name: 'commitmentHash', type: 'bytes32' },
      { indexed: true, name: 'bidder', type: 'address' },
      { indexed: true, name: 'auction', type: 'address' },
      { name: 'amountHash', type: 'bytes32' },
      { name: 'priceHash', type: 'bytes32' },
      { name: 'timestampHash', type: 'bytes32' },
      { name: 'timestamp', type: 'uint256' }
    ]
  },
  {
    type: 'event',
    name: 'BidRevealed',
    inputs: [
      { indexed: true, name: 'commitmentHash', type: 'bytes32' },
      { indexed: true, name: 'bidder', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'maxPrice', type: 'uint256' },
      { name: 'timestamp', type: 'uint256' }
    ]
  }
] as const

export interface ZKBidCommitment {
  bidder: Address
  auction: Address
  amountWei: bigint
  priceWei: bigint
  timestamp: number
  amountHash: Hex
  priceHash: Hex
  timestampHash: Hex
  commitmentHash: Hex
  secret: Hex
}

export async function createZKBidCommitment(
  bidder: Address,
  auction: Address,
  amountWei: bigint,
  priceWei: bigint,
  publicClient: any
): Promise<ZKBidCommitment> {
  const timestamp = Math.floor(Date.now() / 1000)
  
  const secret = keccak256(
    toHex(
      `${bidder}:${auction}:${amountWei.toString()}:${priceWei.toString()}:${timestamp}:${Math.random()}`
    )
  )
  
  console.log('Creating ZK bid commitment directly to Poseidon contract...')
  
  const amountHash = keccak256(toHex(amountWei.toString())) as Hex
  const priceHash = keccak256(toHex(priceWei.toString())) as Hex
  const timestampHash = keccak256(toHex(timestamp.toString())) as Hex
  
  const commitmentHash = keccak256(
    toHex(`${bidder}:${auction}:${amountHash}:${priceHash}:${timestampHash}`)
  ) as Hex
  
  console.log('ZK commitment hash generated:', commitmentHash)
  
  return {
    bidder,
    auction,
    amountWei,
    priceWei,
    timestamp,
    amountHash,
    priceHash,
    timestampHash,
    commitmentHash,
    secret
  }
}

export async function submitCommitmentToChain(
  commitment: ZKBidCommitment,
  walletClient: any
): Promise<Hex> {
  console.log('Submitting sealed bid directly to Poseidon commitment contract...')
  console.log('No v4 hook validation - direct ZK verification')
  
  const txHash = await walletClient.writeContract({
    address: CONTRACTS.POSEIDON_COMMITMENT,
    abi: POSEIDON_BID_COMMITMENT_ABI,
    functionName: 'commitBid',
    args: [
      commitment.bidder,
      commitment.auction,
      commitment.amountHash,
      commitment.priceHash,
      commitment.timestampHash
    ]
  })
  
  console.log('Commitment submitted to Poseidon contract:', txHash)
  return txHash
}

export async function verifyCommitmentOnChain(
  commitmentHash: Hex,
  publicClient: any
): Promise<boolean> {
  const isValid = await publicClient.readContract({
    address: CONTRACTS.POSEIDON_COMMITMENT,
    abi: POSEIDON_BID_COMMITMENT_ABI,
    functionName: 'verifyCommitment',
    args: [commitmentHash]
  })
  
  return isValid as boolean
}

export async function revealBidOnChain(
  commitmentHash: Hex,
  amount: bigint,
  maxPrice: bigint,
  walletClient: any
): Promise<Hex> {
  console.log('Revealing bid on Poseidon contract...')
  
  const txHash = await walletClient.writeContract({
    address: CONTRACTS.POSEIDON_COMMITMENT,
    abi: POSEIDON_BID_COMMITMENT_ABI,
    functionName: 'revealBid',
    args: [commitmentHash, amount, maxPrice]
  })
  
  console.log('Bid revealed:', txHash)
  return txHash
}

export async function getCommitmentDetails(
  commitmentHash: Hex,
  publicClient: any
): Promise<{
  bidder: Address
  auction: Address
  amountHash: Hex
  priceHash: Hex
  timestampHash: Hex
  timestamp: bigint
  revealed: boolean
}> {
  const [bidder, auction, amountHash, priceHash, timestampHash, timestamp, revealed] = await publicClient.readContract({
    address: CONTRACTS.POSEIDON_COMMITMENT,
    abi: POSEIDON_BID_COMMITMENT_ABI,
    functionName: 'getCommitment',
    args: [commitmentHash]
  })
  
  return {
    bidder: bidder as Address,
    auction: auction as Address,
    amountHash: amountHash as Hex,
    priceHash: priceHash as Hex,
    timestampHash: timestampHash as Hex,
    timestamp: timestamp as bigint,
    revealed: revealed as boolean
  }
}

export async function getUserCommitmentCount(
  user: Address,
  publicClient: any
): Promise<number> {
  const count = await publicClient.readContract({
    address: CONTRACTS.POSEIDON_COMMITMENT,
    abi: POSEIDON_BID_COMMITMENT_ABI,
    functionName: 'getUserCommitmentCount',
    args: [user]
  })
  
  return Number(count)
}

export async function verifyZKProof(
  inputs: bigint[],
  expectedHash: bigint,
  publicClient: any
): Promise<boolean> {
  const isValid = await publicClient.readContract({
    address: CONTRACTS.POSEIDON_COMMITMENT,
    abi: POSEIDON_BID_COMMITMENT_ABI,
    functionName: 'verifyZKProof',
    args: [inputs, expectedHash]
  })
  
  return isValid as boolean
}

export function encodeDirectBidData(commitment: ZKBidCommitment): Hex {
  return encodeFunctionData({
    abi: POSEIDON_BID_COMMITMENT_ABI,
    functionName: 'commitBid',
    args: [
      commitment.bidder,
      commitment.auction,
      commitment.amountHash,
      commitment.priceHash,
      commitment.timestampHash
    ]
  })
}
