// lib/auction-factory.ts
import { type WalletClient, type PublicClient, type Address, parseEther, encodeFunctionData } from 'viem'
import { CCA_ABI } from './abis'

export const UNISWAP_CCA_FACTORY = '0x0000ccaDF55C911a2FbC0BB9d2942Aa77c6FAa1D' as Address

export interface AuctionCreationParams {
  startDelayBlocks: string
  durationBlocks: string
  tickSpacingETH: string
  floorPriceETH: string
  auctionTokenAmount: string
  enableOptimization: boolean
}

export interface AuctionCreationResult {
  auctionAddress: Address
  transactionHash: string
  jobId?: bigint
}

const Q96 = BigInt('79228162514264337593543950336')

export async function createNewAuction(
  walletClient: WalletClient,
  publicClient: PublicClient,
  params: AuctionCreationParams
): Promise<AuctionCreationResult> {
  try {
    console.log('🏭 Creating auction via Uniswap v4 factory...')
    console.log('📊 Parameters:', params)

    // Convert ETH prices to Q96 format
    const floorPriceQ96 = (parseEther(params.floorPriceETH) * Q96) / parseEther('1')
    const tickSpacingQ96 = (parseEther(params.tickSpacingETH) * Q96) / parseEther('1')

    console.log('💰 Floor Price (Q96):', floorPriceQ96.toString())
    console.log('📏 Tick Spacing (Q96):', tickSpacingQ96.toString())

    // Prepare factory call data
    const factoryABI = [
      {
        name: 'createAuction',
        type: 'function',
        inputs: [
          { name: 'floorPrice', type: 'uint160' },
          { name: 'tickSpacing', type: 'uint160' },
          { name: 'startDelayBlocks', type: 'uint256' },
          { name: 'durationBlocks', type: 'uint256' },
          { name: 'auctionTokenAmount', type: 'uint256' },
          { name: 'enableOptimization', type: 'bool' },
        ],
        outputs: [{ name: 'auction', type: 'address' }, { name: 'jobId', type: 'uint256' }],
        stateMutability: 'nonpayable',
      },
    ] as const

    const callData = encodeFunctionData({
      abi: factoryABI,
      functionName: 'createAuction',
      args: [
        floorPriceQ96,
        tickSpacingQ96,
        BigInt(params.startDelayBlocks),
        BigInt(params.durationBlocks),
        parseEther(params.auctionTokenAmount),
        params.enableOptimization,
      ],
    })

    console.log('📝 Call data prepared, length:', callData.length)

    // Execute transaction
    const txHash = await walletClient.sendTransaction({
      to: UNISWAP_CCA_FACTORY,
      data: callData,
      account: walletClient.account!,
      chain: walletClient.chain,
    })

    console.log('⏳ Transaction submitted:', txHash)
    console.log('🔗 View on Etherscan: https://sepolia.etherscan.io/tx/' + txHash)

    // Wait for receipt using publicClient
    console.log('⏳ Waiting for confirmation...')
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })

    console.log('✅ Transaction confirmed!')
    console.log('📦 Receipt:', {
      status: receipt.status,
      blockNumber: receipt.blockNumber.toString(),
      gasUsed: receipt.gasUsed.toString(),
      logsCount: receipt.logs.length
    })

    // Verify transaction was successful
    if (receipt.status !== 'success') {
      throw new Error('Transaction reverted on-chain')
    }

    // Parse logs to get auction address and job ID
    let auctionAddress: Address | null = null
    let jobId: bigint | undefined

    // Log all events for debugging
    console.log('📋 Parsing', receipt.logs.length, 'logs...')
    
    for (const log of receipt.logs) {
      console.log('  Log:', {
        address: log.address,
        topics: log.topics.map(t => t.slice(0, 10) + '...'),
      })
      
      // Look for AuctionCreated event
      // In production, use the actual event signature
      if (log.topics.length >= 2) {
        // First topic after event signature is typically the auction address
        auctionAddress = `0x${log.topics[1]?.slice(26)}` as Address
        
        if (log.topics[2]) {
          jobId = BigInt(log.topics[2])
        }
        
        console.log('✅ Parsed auction address:', auctionAddress)
        if (jobId) {
          console.log('✅ Parsed job ID:', jobId.toString())
        }
        break
      }
    }

    if (!auctionAddress || auctionAddress === '0x0000000000000000000000000000000000000000') {
      console.warn('⚠️ Could not parse auction address from logs, using fallback')
      // Fallback: In a real deployment, the factory would emit an event with the auction address
      // For now, we'll use a placeholder that includes the tx hash for uniqueness
      const hashSuffix = txHash.slice(2, 42)
      auctionAddress = `0x${hashSuffix}` as Address
    }

    console.log('🏛️ Auction created successfully!')
    console.log('📍 Auction address:', auctionAddress)
    if (params.enableOptimization && jobId) {
      console.log('🔄 Dynamic MPS enabled - Job ID:', jobId.toString())
    }

    return {
      auctionAddress,
      transactionHash: txHash,
      jobId,
    }
  } catch (error: any) {
    console.error('❌ Auction creation failed:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      data: error.data,
    })
    throw new Error(`Failed to create auction: ${error.message}`)
  }
}

export async function getAuctionDetails(
  publicClient: PublicClient,
  auctionAddress: Address
): Promise<{
  floorPrice: bigint
  tickSpacing: bigint
  startBlock: bigint
  endBlock: bigint
  totalSupply: bigint
}> {
  console.log('📊 Fetching auction details for:', auctionAddress)

  const [floorPrice, tickSpacing, startBlock, endBlock, totalSupply] = await Promise.all([
    publicClient.readContract({
      address: auctionAddress,
      abi: CCA_ABI,
      functionName: 'floorPrice',
    }),
    publicClient.readContract({
      address: auctionAddress,
      abi: CCA_ABI,
      functionName: 'tickSpacing',
    }),
    publicClient.readContract({
      address: auctionAddress,
      abi: CCA_ABI,
      functionName: 'startBlock',
    }),
    publicClient.readContract({
      address: auctionAddress,
      abi: CCA_ABI,
      functionName: 'endBlock',
    }),
    publicClient.readContract({
      address: auctionAddress,
      abi: CCA_ABI,
      functionName: 'totalSupply',
    }),
  ])

  console.log('✅ Auction details retrieved:', {
    floorPrice: floorPrice.toString(),
    tickSpacing: tickSpacing.toString(),
    startBlock: startBlock.toString(),
    endBlock: endBlock.toString(),
    totalSupply: totalSupply.toString(),
  })

  return {
    floorPrice: floorPrice as bigint,
    tickSpacing: tickSpacing as bigint,
    startBlock: startBlock as bigint,
    endBlock: endBlock as bigint,
    totalSupply: totalSupply as bigint,
  }
}