// lib/wagmi-contract-helpers.ts 
import { type Address, type Hex, createPublicClient, createWalletClient, http, custom } from 'viem'
import { sepolia } from 'viem/chains'
import type { Abi } from 'viem'

/**
 * Get gas estimates for a transaction on Sepolia
 */
export async function getGasEstimate(chainId: number = 11155111) {
  try {
    // Create public client for the chain
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(),
    })

    // Get current block
    const block = await publicClient.getBlock()
    
    // Get fee history for last 5 blocks
    const feeHistory = await publicClient.getFeeHistory({
      blockCount: 5,
      rewardPercentiles: [25, 50, 75],
    })

    // Calculate base fee for next block
    const baseFee = block.baseFeePerGas || BigInt(0)
    
    // Calculate priority fee (median from recent blocks)
    const priorityFees = feeHistory.reward?.map((r: bigint[]) => r[1]) || []
    const medianPriorityFee = priorityFees.length > 0
      ? priorityFees.sort((a: bigint, b: bigint) => Number(a - b))[Math.floor(priorityFees.length / 2)]
      : BigInt(1000000000) // 1 gwei default

    // Calculate max fee (base fee * 2 + priority fee for safety)
    const maxFeePerGas = (baseFee * BigInt(2)) + medianPriorityFee
    const maxPriorityFeePerGas = medianPriorityFee

    console.log('⛽ Gas Estimate:', {
      baseFee: baseFee.toString(),
      maxFeePerGas: maxFeePerGas.toString(),
      maxPriorityFeePerGas: maxPriorityFeePerGas.toString(),
    })

    return {
      maxFeePerGas,
      maxPriorityFeePerGas,
    }
  } catch (error) {
    console.error('Failed to get gas estimate:', error)
    // Return safe defaults
    return {
      maxFeePerGas: BigInt(20000000000), // 20 gwei
      maxPriorityFeePerGas: BigInt(1000000000), // 1 gwei
    }
  }
}

/**
 * Write to a contract with automatic gas estimation
 * @param abi - Accept readonly Abi type
 */
export async function writeContract<T = any>(
  address: Address,
  abi: Abi | readonly unknown[], // Accept readonly arrays
  functionName: string,
  args: any[],
  options?: {
    account?: Address
    value?: bigint
  }
): Promise<{ hash: Hex; receipt: any }> {
  try {
    console.log('📝 Writing to contract:', {
      address,
      functionName,
      args,
    })

    // Get ethereum provider
    if (!window.ethereum) {
      throw new Error('No ethereum provider found')
    }

    // Create wallet client
    const walletClient = createWalletClient({
      chain: sepolia,
      transport: custom(window.ethereum),
    })

    // Get account
    const [account] = await walletClient.getAddresses()
    const targetAccount = options?.account || account

    if (!targetAccount) {
      throw new Error('No account available')
    }

    // Get gas estimates
    const gasEstimate = await getGasEstimate()

    // Create public client
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(),
    })

    // Simulate the transaction first
    const { request } = await publicClient.simulateContract({
      address,
      abi: abi as Abi,
      functionName,
      args,
      account: targetAccount,
      value: options?.value,
      maxFeePerGas: gasEstimate.maxFeePerGas,
      maxPriorityFeePerGas: gasEstimate.maxPriorityFeePerGas,
    })

    // Execute the transaction
    const hash = await walletClient.writeContract(request as any)
    
    console.log('✅ Transaction sent:', hash)

    // Wait for transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    
    console.log('✅ Transaction confirmed:', receipt)

    return { hash, receipt }
  } catch (error: any) {
    console.error('❌ Contract write failed:', error)
    throw error
  }
}

/**
 * Read from a contract
 * @param abi - Accept readonly Abi type
 */
export async function readContract<T = any>(
  address: Address,
  abi: Abi | readonly unknown[], // Accept readonly arrays
  functionName: string,
  args?: any[]
): Promise<T> {
  try {
    console.log('📖 Reading from contract:', {
      address,
      functionName,
      args,
    })

    // Create public client
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(),
    })

    // Read the contract
    const result = await publicClient.readContract({
      address,
      abi: abi as Abi,
      functionName,
      args: args || [],
    })

    console.log('✅ Contract read result:', result)

    return result as T
  } catch (error: any) {
    console.error('❌ Contract read failed:', error)
    throw error
  }
}

/**
 * Estimate gas for a contract write
 * @param abi - Accept readonly Abi type
 */
export async function estimateContractGas(
  address: Address,
  abi: Abi | readonly unknown[], // Accept readonly arrays
  functionName: string,
  args: any[],
  options?: {
    account?: Address
    value?: bigint
  }
): Promise<bigint> {
  try {
    // Get ethereum provider
    if (!window.ethereum) {
      throw new Error('No ethereum provider found')
    }

    // Create wallet client
    const walletClient = createWalletClient({
      chain: sepolia,
      transport: custom(window.ethereum),
    })

    // Get account
    const [account] = await walletClient.getAddresses()
    const targetAccount = options?.account || account

    if (!targetAccount) {
      throw new Error('No account available')
    }

    // Create public client
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(),
    })

    // Estimate gas
    const gasEstimate = await publicClient.estimateContractGas({
      address,
      abi: abi as Abi,
      functionName,
      args,
      account: targetAccount,
      value: options?.value,
    })

    console.log('⛽ Gas estimate:', gasEstimate.toString())

    return gasEstimate
  } catch (error: any) {
    console.error('❌ Gas estimation failed:', error)
    throw error
  }
}

/**
 * Get transaction receipt
 */
export async function getTransactionReceipt(hash: Hex) {
  try {
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(),
    })

    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    
    console.log('✅ Transaction receipt:', receipt)
    
    return receipt
  } catch (error: any) {
    console.error('❌ Failed to get receipt:', error)
    throw error
  }
}

/**
 * Check if a transaction was successful
 */
export async function isTransactionSuccessful(hash: Hex): Promise<boolean> {
  try {
    const receipt = await getTransactionReceipt(hash)
    return receipt.status === 'success'
  } catch (error) {
    console.error('❌ Failed to check transaction status:', error)
    return false
  }
}

/**
 * Get current block number
 */
export async function getCurrentBlock(): Promise<bigint> {
  try {
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(),
    })

    const blockNumber = await publicClient.getBlockNumber()
    
    return blockNumber
  } catch (error: any) {
    console.error('❌ Failed to get block number:', error)
    throw error
  }
}

/**
 * Wait for a specific number of confirmations
 */
export async function waitForConfirmations(
  hash: Hex,
  confirmations: number = 1
): Promise<void> {
  try {
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(),
    })

    const receipt = await publicClient.waitForTransactionReceipt({ 
      hash,
      confirmations,
    })
    
    console.log(`✅ Transaction confirmed with ${confirmations} confirmations`)
  } catch (error: any) {
    console.error('❌ Failed to wait for confirmations:', error)
    throw error
  }
}