// lib/bid-escrow.ts - USDC escrow for sealed bids
import { type Address, type Hex, parseUnits } from 'viem'
import { CONTRACTS, getUSDCAddress as getChainUSDCAddress } from './contracts' // Rename import

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

export interface EscrowResult {
  success: boolean
  txHash?: Hex
  error?: string
  amountEscrowed?: string
}

export async function checkUSDCBalance(
  walletAddress: Address,
  publicClient: any,
  chainId?: number
): Promise<bigint> {
  try {
    // Get USDC address for the current chain
    const usdcAddress = chainId ? getChainUSDCAddress(chainId) : CONTRACTS.USDC_SEPOLIA // Use renamed import
    
    if (!usdcAddress) {
      console.error('No USDC address found for chain:', chainId)
      return 0n
    }
    
    console.log('  USDC Address for chain', chainId, ':', usdcAddress)
    
    const balance = await publicClient.readContract({
      address: usdcAddress,
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
  walletClient: any,
  chainId?: number
): Promise<EscrowResult> {
  console.log('💰 === USDC ESCROW FOR BID ===')
  console.log('  Bidder:', bidderAddress)
  console.log('  Price:', priceUSDC, 'USDC')
  console.log('  Chain ID:', chainId)
  console.log('  Escrow Address:', ESCROW_ADDRESS)
  
  try {
    // Convert USDC to wei (6 decimals)
    const amountWei = parseUnits(priceUSDC.toString(), 6)
    
    // Get USDC address for the current chain
    const USDC_ADDRESS = chainId ? getChainUSDCAddress(chainId) : CONTRACTS.USDC_SEPOLIA
    
    if (!USDC_ADDRESS) {
      console.error('❌ No USDC contract found on chain:', chainId)
      return {
        success: false,
        error: `No USDC contract found on chain ${chainId}. Please switch to a supported chain like Sepolia (11155111).`
      }
    }
    
    console.log('  USDC Contract Address:', USDC_ADDRESS)
    
    // Check balance first
    const balance = await checkUSDCBalance(bidderAddress, publicClient, chainId)
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
    
    // Get current gas prices
    const feeData = await publicClient.estimateFeesPerGas();
    console.log('  Current fee data:', feeData);
    
    // Approve if needed
    if (currentAllowance < amountWei) {
      console.log('  Approving USDC for escrow...')
      const approveTx = await walletClient.writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [ESCROW_ADDRESS, amountWei],
        // Use automatic gas pricing
        gas: undefined, // Let viem/wallet calculate
        maxFeePerGas: undefined,
        maxPriorityFeePerGas: undefined
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
      args: [ESCROW_ADDRESS, amountWei],
      // Use automatic gas pricing for the transfer too
      gas: undefined, // Let viem/wallet calculate
      maxFeePerGas: undefined,
      maxPriorityFeePerGas: undefined
    })
    
    console.log('  Transfer TX:', transferTx)
    const receipt = await publicClient.waitForTransactionReceipt({ hash: transferTx })
    
    if (receipt.status === 'success') {
      console.log('✅ USDC ESCROWED:', priceUSDC, 'USDC')
      console.log('  🔗 Explorer:', getExplorerUrl(chainId, transferTx))
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
    console.error('Full error:', error)
    return {
      success: false,
      error: error.shortMessage || error.message?.slice(0, 100) || 'Escrow failed'
    }
  }
}

// Helper function to get explorer URL based on chain
function getExplorerUrl(chainId?: number, txHash?: Hex): string {
  if (!txHash) return ''
  
  const explorers: Record<number, string> = {
    11155111: 'https://sepolia.etherscan.io',
    84532: 'https://sepolia.basescan.org',
    421614: 'https://sepolia.arbiscan.io',
    5042002: 'https://explorerl2-arc-testnet-pmlnt-dev-23kkqh.t.conduit.xyz',
    11155420: 'https://sepolia-optimism.etherscan.io',
    80002: 'https://www.oklink.com/amoy',
  }
  
  const baseUrl = explorers[chainId || 11155111] || 'https://sepolia.etherscan.io'
  return `${baseUrl}/tx/${txHash}`
}

export function getEscrowAddress(): Address {
  return ESCROW_ADDRESS
}

export function getUSDCAddressForChain(chainId?: number): Address | undefined {
  return chainId ? getChainUSDCAddress(chainId) : CONTRACTS.USDC_SEPOLIA // Use renamed import
}

// Legacy function for backward compatibility
export function getUSDCAddress(): Address {
  console.warn('⚠️ getUSDCAddress() without chainId is deprecated. Use getUSDCAddressForChain() instead.')
  return CONTRACTS.USDC_SEPOLIA
}