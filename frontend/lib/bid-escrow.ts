// lib/bid-escrow.ts - USDC escrow for sealed bids
import { type Address, type Hex, parseUnits } from 'viem'
import { CONTRACTS } from './contracts'

// Standard ERC20 ABI for approve and transfer
const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ type: 'bool' }]
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ type: 'bool' }]
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }]
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ type: 'uint256' }]
  }
] as const

// Escrow contract is the Poseidon commitment contract - bids are locked there
const ESCROW_ADDRESS = CONTRACTS.POSEIDON_COMMITMENT

// USDC on Arc Testnet (same address as Sepolia for now)
const USDC_ADDRESS = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as Address

export interface EscrowResult {
  success: boolean
  txHash?: Hex
  error?: string
  amountEscrowed?: string
}

export async function checkUSDCBalance(
  walletAddress: Address,
  publicClient: any
): Promise<bigint> {
  try {
    const balance = await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [walletAddress]
    })
    return balance as bigint
  } catch (e) {
    console.error('Failed to check USDC balance:', e)
    return 0n
  }
}

export async function escrowUSDCForBid(
  bidderAddress: Address,
  priceUSDC: number,
  publicClient: any,
  walletClient: any
): Promise<EscrowResult> {
  console.log('💰 === USDC ESCROW FOR BID ===')
  console.log('  Bidder:', bidderAddress)
  console.log('  Price:', priceUSDC, 'USDC')
  console.log('  Escrow Address:', ESCROW_ADDRESS)
  
  try {
    // Convert USDC to wei (6 decimals)
    const amountWei = parseUnits(priceUSDC.toString(), 6)
    
    // Check balance first
    const balance = await checkUSDCBalance(bidderAddress, publicClient)
    console.log('  Current Balance:', Number(balance) / 1e6, 'USDC')
    
    if (balance < amountWei) {
      return {
        success: false,
        error: `Insufficient USDC balance. Have ${Number(balance) / 1e6}, need ${priceUSDC}`
      }
    }
    
    // Check current allowance
    const currentAllowance = await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [bidderAddress, ESCROW_ADDRESS]
    }) as bigint
    
    console.log('  Current Allowance:', Number(currentAllowance) / 1e6, 'USDC')
    
    // Approve if needed
    if (currentAllowance < amountWei) {
      console.log('  Approving USDC for escrow...')
      const approveTx = await walletClient.writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [ESCROW_ADDRESS, amountWei]
      })
      
      console.log('  Approve TX:', approveTx)
      await publicClient.waitForTransactionReceipt({ hash: approveTx })
      console.log('  ✅ Approval confirmed')
    }
    
    // Transfer USDC to escrow
    console.log('  Transferring USDC to escrow...')
    const transferTx = await walletClient.writeContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [ESCROW_ADDRESS, amountWei]
    })
    
    console.log('  Transfer TX:', transferTx)
    const receipt = await publicClient.waitForTransactionReceipt({ hash: transferTx })
    
    if (receipt.status === 'success') {
      console.log('✅ USDC ESCROWED:', priceUSDC, 'USDC')
      console.log('  🔗 Etherscan:', `https://sepolia.etherscan.io/tx/${transferTx}`)
      return {
        success: true,
        txHash: transferTx,
        amountEscrowed: priceUSDC.toString()
      }
    } else {
      return {
        success: false,
        error: 'Transfer transaction reverted'
      }
    }
    
  } catch (error: any) {
    console.error('❌ USDC escrow failed:', error.message)
    return {
      success: false,
      error: error.shortMessage || error.message?.slice(0, 100) || 'Escrow failed'
    }
  }
}

export function getEscrowAddress(): Address {
  return ESCROW_ADDRESS
}

export function getUSDCAddress(): Address {
  return USDC_ADDRESS
}
