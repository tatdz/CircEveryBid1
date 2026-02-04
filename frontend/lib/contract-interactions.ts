// lib/contract-interactions.ts 
import { 
  type Address, 
  type Hex, 
  parseUnits, 
  keccak256, 
  encodePacked, 
  encodeAbiParameters, 
  parseEther,
  encodeFunctionData,
  decodeEventLog,
  createPublicClient,
  http
} from 'viem'
import { sepolia } from 'viem/chains'
import { CONTRACTS } from './contracts'
import { 
  FACTORY_ABI, 
  CCA_ABI, 
  ERC20_ABI, 
  CIRCEVERYBID_HOOK_ABI,
  ENS_AUCTION_REGISTRY_ABI
} from './abis'

// USDC on Sepolia
export const USDC_SEPOLIA = {
  address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238' as Address,
  decimals: 6
}

// Mock Token for auction
export const MOCK_TOKEN = {
  address: (process.env.NEXT_PUBLIC_MOCK_TOKEN || '0xb5fddd15391354766B869dC9aE5876Df7F849782') as Address,
  decimals: 18
}

// Constants
export const UNISWAP_Q96 = BigInt('79228162514264334008320') // 2^96
const MSG_SENDER = '0x0000000000000000000000000000000000000001' as Address
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address

// Create public client for Sepolia
const createSepoliaPublicClient = () => {
  return createPublicClient({
    chain: sepolia,
    transport: http()
  })
}

// Q96 conversion functions
export function convertETHToQ96(ethValue: string): bigint {
  try {
    const ethNum = parseFloat(ethValue)
    const microETH = ethNum * 1_000_000
    const q96Price = BigInt(Math.floor(microETH)) * UNISWAP_Q96
    return q96Price
  } catch (error) {
    console.error('ETH to Q96 conversion error:', error)
    return UNISWAP_Q96
  }
}

export function convertQ96ToETH(q96Value: bigint): string {
  try {
    const ratio = q96Value / UNISWAP_Q96
    const ethValue = Number(ratio) / 1_000_000
    return ethValue.toFixed(6)
  } catch (error) {
    console.error('Q96 to ETH conversion error:', error)
    return '0.000001'
  }
}

/**
 * Create a new auction via Uniswap Factory
 */
export async function createNewAuction(
  walletClient: any,
  params: {
    startDelayBlocks: string
    durationBlocks: string
    tickSpacing: string
    floorPrice: string
    auctionTokenAmount: string
  }
): Promise<{
  auctionAddress: string
  transactionHash: string
  floorPrice: string
  tickSpacing: string
  startBlock: number
  endBlock: number
}> {
  try {
    console.log('🏭 Creating USDC auction via Uniswap factory...')
    console.log('📊 Parameters:', params)
    
    const { startDelayBlocks, durationBlocks, tickSpacing, floorPrice, auctionTokenAmount } = params
    const creator = walletClient.account.address
    const publicClient = createSepoliaPublicClient()
    
    // Current block
    const currentBlock = await publicClient.getBlockNumber()
    const startBlock = Number(currentBlock) + parseInt(startDelayBlocks)
    const endBlock = startBlock + parseInt(durationBlocks)
    const claimBlock = endBlock + 100
    
    console.log('💰 Currency (accepted bids):', USDC_SEPOLIA)
    console.log('💰 Token being auctioned:', MOCK_TOKEN)
    
    // Convert to proper units
    const tickSpacingQ96 = convertETHToQ96(tickSpacing)
    const floorPriceQ96 = convertETHToQ96(floorPrice)
    const tokenAmount = parseUnits(auctionTokenAmount, 18)
    
    console.log('💰 Auction Parameters:', {
      tokenToAuction: MOCK_TOKEN.address,
      tickSpacing: `${tickSpacing} USDC`,
      floorPrice: `${floorPrice} USDC`,
      tickSpacingQ96: tickSpacingQ96.toString(),
      floorPriceQ96: floorPriceQ96.toString(),
      tokenAmount: tokenAmount.toString(),
      startBlock,
      endBlock,
      claimBlock
    })
    
    // Create auction steps data
    function createAuctionStepsData(): Hex {
      const steps = [
        [20000, 50],    // 20,000 MPS over 50 blocks
        [100000, 49],   // 100,000 MPS over 49 blocks  
        [4100000, 1]    // 4,100,000 MPS over 1 block
      ]
      
      let encoded = '0x'
      for (const [mps, duration] of steps) {
        const mpsHex = BigInt(mps).toString(16).padStart(6, '0')
        const durationHex = BigInt(duration).toString(16).padStart(10, '0')
        encoded += mpsHex + durationHex
      }
      return encoded as Hex
    }
    
    const auctionStepsData = createAuctionStepsData()
    
    // Calculate required currency raised (80% of potential at floor price)
    const Q96 = 2n ** 96n
    const potentialAtFloor = (floorPriceQ96 * tokenAmount) / Q96
    const requiredCurrencyRaised = (potentialAtFloor * 80n) / 100n
    
    // Auction parameters
    const auctionParameters = {
      currency: USDC_SEPOLIA.address,
      tokensRecipient: MSG_SENDER,
      fundsRecipient: MSG_SENDER,
      startBlock: BigInt(startBlock),
      endBlock: BigInt(endBlock),
      claimBlock: BigInt(claimBlock),
      tickSpacing: tickSpacingQ96,
      validationHook: ZERO_ADDRESS,
      floorPrice: floorPriceQ96,
      requiredCurrencyRaised: requiredCurrencyRaised,
      auctionStepsData: auctionStepsData
    }
    
    console.log('🔧 Auction Parameters:', auctionParameters)
    
    // Encode config data
    const configData = encodeAbiParameters(
      [
        {
          name: 'parameters',
          type: 'tuple',
          components: [
            { name: 'currency', type: 'address' },
            { name: 'tokensRecipient', type: 'address' },
            { name: 'fundsRecipient', type: 'address' },
            { name: 'startBlock', type: 'uint64' },
            { name: 'endBlock', type: 'uint64' },
            { name: 'claimBlock', type: 'uint64' },
            { name: 'tickSpacing', type: 'uint256' },
            { name: 'validationHook', type: 'address' },
            { name: 'floorPrice', type: 'uint256' },
            { name: 'requiredCurrencyRaised', type: 'uint128' },
            { name: 'auctionStepsData', type: 'bytes' }
          ]
        }
      ],
      [auctionParameters]
    )
    
    console.log('🔧 Prepared config data length:', configData.length)
    
    // Create salt
    const salt = keccak256(
      encodePacked(
        ['string', 'uint256'],
        ['circeverybid-auction', BigInt(Date.now())]
      )
    )
    
    console.log('📝 Factory address:', CONTRACTS.FACTORY)
    console.log('📝 Token to auction:', MOCK_TOKEN.address)
    console.log('📝 Token amount:', tokenAmount.toString())
    console.log('📝 Config data length:', configData.length)
    console.log('📝 Salt:', salt)
    
    // 1. CHECK AND APPROVE TOKENS
    console.log('🔐 Checking token approval...')
    
    try {
      // Check current allowance
      const allowance = await publicClient.readContract({
        address: MOCK_TOKEN.address,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [creator, CONTRACTS.FACTORY]
      }) as bigint
      
      console.log('📊 Current allowance:', allowance.toString())
      
      if (allowance < tokenAmount) {
        console.log('🔐 Approving tokens for factory...')
        
        // Approve factory to spend tokens using direct transaction
        const approveHash = await walletClient.sendTransaction({
          to: MOCK_TOKEN.address,
          data: encodeFunctionData({
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [CONTRACTS.FACTORY, tokenAmount]
          }),
          chainId: sepolia.id,
          gas: 100000n,
        })
        
        console.log('✅ Approval transaction:', approveHash)
        
        // Wait for approval to be mined
        await publicClient.waitForTransactionReceipt({ hash: approveHash })
        console.log('✅ Approval confirmed')
      } else {
        console.log('✅ Already approved')
      }
    } catch (approveError: any) {
      console.warn('⚠️ Approval check failed:', approveError?.message)
      // Try to mint tokens if it's a mock token
      try {
        console.log('🪙 Trying to mint tokens...')
        await walletClient.sendTransaction({
          to: MOCK_TOKEN.address,
          data: encodeFunctionData({
            abi: [
              {
                name: 'mint',
                type: 'function',
                stateMutability: 'nonpayable',
                inputs: [
                  { name: 'to', type: 'address' },
                  { name: 'amount', type: 'uint256' }
                ],
                outputs: []
              }
            ],
            functionName: 'mint',
            args: [creator, tokenAmount]
          }),
          chainId: sepolia.id,
          gas: 100000n,
        })
        
        // Then approve
        await walletClient.sendTransaction({
          to: MOCK_TOKEN.address,
          data: encodeFunctionData({
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [CONTRACTS.FACTORY, tokenAmount]
          }),
          chainId: sepolia.id,
          gas: 100000n,
        })
        
        console.log('✅ Minted and approved tokens')
      } catch (mintError: any) {
        console.warn('⚠️ Mint failed, continuing anyway:', mintError?.message)
      }
    }
    
    // 2. CREATE AUCTION VIA FACTORY
    console.log('🚀 Creating auction via factory...')
    
    const transactionHash = await walletClient.sendTransaction({
      to: CONTRACTS.FACTORY,
      data: encodeFunctionData({
        abi: FACTORY_ABI,
        functionName: 'initializeDistribution',
        args: [
          MOCK_TOKEN.address,
          tokenAmount,
          configData,
          salt
        ]
      }),
      chainId: sepolia.id,
      gas: 5000000n,
    })
    
    console.log('⏳ Transaction submitted:', transactionHash)
    console.log('🔗 Etherscan: https://sepolia.etherscan.io/tx/' + transactionHash)
    
    // Wait for receipt with retries for slow testnets
    let receipt
    let attempts = 0
    const maxAttempts = 3
    while (attempts < maxAttempts) {
      try {
        receipt = await publicClient.waitForTransactionReceipt({ 
          hash: transactionHash,
          confirmations: 1,
          timeout: 180000,
          pollingInterval: 3000
        })
        break
      } catch (waitError: any) {
        attempts++
        console.log(`⏳ Waiting for confirmation (attempt ${attempts}/${maxAttempts})...`)
        if (attempts >= maxAttempts) {
          // Check if tx exists on chain even if receipt failed
          console.log('⚠️ Receipt timeout - transaction may still be pending')
          console.log('🔗 Check status: https://sepolia.etherscan.io/tx/' + transactionHash)
          throw new Error(`Transaction submitted but confirmation timed out. Check Etherscan: ${transactionHash}`)
        }
        await new Promise(r => setTimeout(r, 5000))
      }
    }
    
    if (!receipt) {
      throw new Error('Failed to get transaction receipt')
    }
    
    if (receipt.status !== 'success') {
      throw new Error('Auction creation transaction failed')
    }
    
    // 3. GET AUCTION ADDRESS
    console.log('🔍 Getting auction address...')
    
    // Get auction address from factory
    const auctionAddress = await publicClient.readContract({
      address: CONTRACTS.FACTORY,
      abi: FACTORY_ABI,
      functionName: 'getAuctionAddress',
      args: [
        MOCK_TOKEN.address,
        tokenAmount,
        configData,
        salt,
        creator
      ]
    }) as Address
    
    if (!auctionAddress || auctionAddress === ZERO_ADDRESS) {
      throw new Error('Failed to get auction address from factory')
    }
    
    console.log('✅ Auction created:', auctionAddress)
    
    // 4. FUND AUCTION WITH TOKENS
    console.log('💰 Funding auction with tokens...')
    
    try {
      // Check if tokens were already transferred by factory
      const auctionBalance = await publicClient.readContract({
        address: MOCK_TOKEN.address,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [auctionAddress]
      }) as bigint
      
      console.log('📊 Auction token balance:', auctionBalance.toString())
      
      if (auctionBalance < tokenAmount) {
        console.log('🔄 Transferring tokens to auction...')
        
        // Transfer tokens to auction
        await walletClient.sendTransaction({
          to: MOCK_TOKEN.address,
          data: encodeFunctionData({
            abi: ERC20_ABI,
            functionName: 'transfer',
            args: [auctionAddress, tokenAmount]
          }),
          chainId: sepolia.id,
          gas: 100000n,
        })
        
        console.log('✅ Tokens transferred to auction')
        
        // Activate tokens in auction
        await walletClient.sendTransaction({
          to: auctionAddress as Address,
          data: encodeFunctionData({
            abi: CCA_ABI,
            functionName: 'onTokensReceived'
          }),
          chainId: sepolia.id,
          gas: 200000n,
        })
        
        console.log('✅ Auction funded and activated')
      } else {
        console.log('✅ Auction already has tokens')
      }
      
    } catch (fundingError: any) {
      console.warn('⚠️ Funding failed:', fundingError?.message)
    }
    
    console.log('🎉 Auction creation complete!')
    console.log('📊 Auction details:', {
      auctionAddress,
      token: MOCK_TOKEN.address,
      tokenAmount: auctionTokenAmount,
      floorPrice: `${floorPrice} USDC`,
      tickSpacing: `${tickSpacing} USDC`,
      startBlock,
      endBlock,
      claimBlock,
      acceptsBidsIn: 'USDC'
    })
    
    return {
      auctionAddress,
      transactionHash: transactionHash,
      floorPrice: `${floorPrice} USDC`,
      tickSpacing: `${tickSpacing} USDC`,
      startBlock,
      endBlock
    }
    
  } catch (error: any) {
    console.error('❌ Auction creation failed:', error)
    throw new Error(`Failed to create auction: ${error?.message || error}`)
  }
}

/**
 * Check if address is Hook owner/admin
 */
export async function isHookOwner(
  address: Address,
  walletClient: any
): Promise<boolean> {
  try {
    console.log('🔍 Checking Hook owner...')
    const publicClient = createSepoliaPublicClient()
    
    // Try to read owner from Hook contract
    const owner = await publicClient.readContract({
      address: CONTRACTS.HOOK,
      abi: CIRCEVERYBID_HOOK_ABI,
      functionName: 'owner',
      args: []
    }) as Address
    
    console.log('✅ Hook owner:', owner)
    console.log('✅ User address:', address)
    console.log('✅ Is owner?', owner.toLowerCase() === address.toLowerCase())
    
    return owner.toLowerCase() === address.toLowerCase()
  } catch (error: any) {
    console.error('❌ Failed to check Hook owner:', error)
    return false
  }
}

/**
 * Get user's ENS subdomains from Registrar
 */
export async function getUserENSSubdomains(
  ownerAddress: Address
): Promise<string[]> {
  try {
    const publicClient = createSepoliaPublicClient()
    
    const result = await publicClient.readContract({
      address: CONTRACTS.ENS_AUCTION_REGISTRY,
      abi: ENS_AUCTION_REGISTRY_ABI,
      functionName: 'getCreatorInfo',
      args: [ownerAddress]
    }) as [string, Hex, bigint, bigint]
    
    const ensName = result[0]
    if (ensName && ensName.length > 0) {
      // Extract subdomain from full name
      const domain = 'circeverybid.eth'
      if (ensName.endsWith(domain)) {
        const subdomain = ensName.replace(`.${domain}`, '')
        return [subdomain]
      }
      return [ensName]
    }
    
    return []
  } catch (error) {
    console.error('Failed to get user subdomains:', error)
    return []
  }
}

/**
 * Register auction with Hook contract
 */
export async function registerAuctionWithHook(
  walletClient: any,
  auctionAddress: Address,
  ensSubdomain: string,  // Changed from Address to string
  isAdmin = false
): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
  try {
    console.log('📝 Registering auction with Hook...')
    console.log('📊 Details:', { auction: auctionAddress, ensSubdomain, account: walletClient.account.address, isAdmin })
    
    const publicClient = createSepoliaPublicClient()
    const accountAddress = walletClient.account.address

    // Choose function based on admin status
    const functionName = isAdmin ? 'registerAuctionAdmin' : 'registerAuction'
    
    console.log(`🔍 Calling Hook.${functionName}...`)
    
    const transactionHash = await walletClient.sendTransaction({
      to: CONTRACTS.HOOK,
      data: encodeFunctionData({
        abi: CIRCEVERYBID_HOOK_ABI,
        functionName,
        args: [auctionAddress, ensSubdomain]
      }),
      chainId: sepolia.id,
      gas: 300000n,
    })
    
    console.log('✅ Auction registration initiated!')
    console.log('🔗 TX:', transactionHash)
    
    // Wait for confirmation
    await publicClient.waitForTransactionReceipt({
      hash: transactionHash,
      confirmations: 1,
      timeout: 120000
    })
    
    return { 
      success: true, 
      transactionHash 
    }
    
  } catch (error: any) {
    console.error('❌ Failed to register with Hook:', error)
    
    // Extract better error message
    let errorMessage = error?.message || 'Unknown error'
    
    if (errorMessage.includes('reverted')) {
      if (errorMessage.includes('Not ENS owner')) {
        errorMessage = `You don't own the ENS subdomain "${ensSubdomain}.circeverybid.eth".`
      } else if (errorMessage.includes('Auction already registered')) {
        errorMessage = 'Auction already registered'
      } else {
        errorMessage = `Contract reverted. This might mean:\n1. You don't own the ENS subdomain\n2. The subdomain doesn't exist\n3. There's an issue with the contract setup`
      }
    }
    
    return { 
      success: false, 
      error: errorMessage 
    }
  }
}

/**
 * Direct auction registration (bypassing ENS checks)
 */
export async function directAuctionRegistration(
  walletClient: any,
  auctionAddress: Address,
  ensSubdomain: string
): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
  try {
    console.log('🚀 Direct auction registration (bypassing ENS checks)...')
    
    const publicClient = createSepoliaPublicClient()
    const accountAddress = walletClient.account.address
    
    // 1. First ensure creator is registered in ENS Registrar
    try {
      console.log('📝 Registering creator in ENS Registrar...')
      
      const ensHash = await walletClient.sendTransaction({
        to: CONTRACTS.ENS_AUCTION_REGISTRY,
        data: encodeFunctionData({
          abi: ENS_AUCTION_REGISTRY_ABI,
          functionName: 'registerCreatorWithoutENS',
          args: [
            accountAddress,
            ensSubdomain,
            BigInt(0),
            BigInt(0)
          ]
        }),
        chainId: sepolia.id,
        gas: 300000n,
      })
      
      console.log('✅ Creator registered in ENS Registrar:', ensHash)
      
      // Wait for confirmation
      await publicClient.waitForTransactionReceipt({
        hash: ensHash,
        confirmations: 1,
        timeout: 30000
      })
    } catch (error: any) {
      console.warn('⚠️ Creator registration failed, trying to continue...', error?.message || error)
    }
    
    // 2. Register auction with Hook (admin mode)
    console.log('📝 Registering auction with Hook (admin mode)...')
    
    const hookHash = await walletClient.sendTransaction({
      to: CONTRACTS.HOOK,
      data: encodeFunctionData({
        abi: CIRCEVERYBID_HOOK_ABI,
        functionName: 'registerAuctionAdmin',
        args: [auctionAddress, ensSubdomain]
      }),
      chainId: sepolia.id,
      gas: 300000n,
    })
    
    console.log('✅ Auction registered with Hook:', hookHash)
    
    // Wait for confirmation
    await publicClient.waitForTransactionReceipt({
      hash: hookHash,
      confirmations: 1,
      timeout: 30000
    })
    
    return { 
      success: true, 
      transactionHash: hookHash 
    }
    
  } catch (error: any) {
    console.error('❌ Direct registration failed:', error)
    
    return { 
      success: false, 
      error: error?.message || 'Direct registration failed'
    }
  }
}

/**
 * Create ENS subdomain for a user (admin only)
 */
export async function createENSSubdomain(
  walletClient: any,
  subdomain: string,
  userAddress: Address
): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
  try {
    console.log('👑 Creating ENS subdomain for user...')
    console.log('  Subdomain:', subdomain)
    console.log('  User:', userAddress)
    console.log('  Admin:', walletClient.account.address)
    
    const publicClient = createSepoliaPublicClient()
    
    const transactionHash = await walletClient.sendTransaction({
      to: CONTRACTS.ENS_AUCTION_REGISTRY,
      data: encodeFunctionData({
        abi: ENS_AUCTION_REGISTRY_ABI,
        functionName: 'createSubdomainForUser',
        args: [subdomain, userAddress]
      }),
      chainId: sepolia.id,
      gas: 300000n,
    })
    
    console.log('✅ ENS subdomain created!')
    console.log('🔗 TX:', transactionHash)
    
    // Wait for confirmation
    await publicClient.waitForTransactionReceipt({
      hash: transactionHash,
      confirmations: 1,
      timeout: 120000
    })
    
    return { 
      success: true, 
      transactionHash 
    }
    
  } catch (error: any) {
    console.error('❌ Failed to create ENS subdomain:', error)
    return { 
      success: false, 
      error: error?.message || 'Failed to create ENS subdomain' 
    }
  }
}

/**
 * Emergency registration without ENS verification
 */
export async function emergencyRegisterAuction(
  walletClient: any,
  auctionAddress: Address,
  subdomain: string
): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
  try {
    console.log('🚨 Emergency registration without ENS...')
    
    const publicClient = createSepoliaPublicClient()
    const accountAddress = walletClient.account.address
    
    const ensHash = await walletClient.sendTransaction({
      to: CONTRACTS.ENS_AUCTION_REGISTRY,
      data: encodeFunctionData({
        abi: ENS_AUCTION_REGISTRY_ABI,
        functionName: 'registerCreatorWithoutENS',
        args: [accountAddress, subdomain, BigInt(0), BigInt(0)]
      }),
      chainId: sepolia.id,
      gas: 300000n,
    })
    
    console.log('✅ Emergency registration completed')
    console.log('🔗 TX:', ensHash)
    
    // Wait for confirmation
    await publicClient.waitForTransactionReceipt({
      hash: ensHash,
      confirmations: 1,
      timeout: 120000
    })
    
    // Now register the auction with Hook
    const hookResult = await registerAuctionWithHook(
      walletClient,
      auctionAddress,
      subdomain,
      true // use admin mode
    )
    
    return hookResult
    
  } catch (error: any) {
    console.error('❌ Emergency registration failed:', error)
    return { 
      success: false, 
      error: error?.message || 'Emergency registration failed' 
    }
  }
}

/**
 * Get auction stats from Hook
 */
export async function getAuctionStats(auctionAddress: Address): Promise<{
  registered: boolean
  totalBids: bigint
  crossChainBids: bigint
  totalVolume: bigint
  creator: Address
  creatorENSNode: Hex
  lastOptimizationTime: bigint
  lastPythPrice: bigint
  lastPythUpdate: bigint
} | null> {
  try {
    const publicClient = createSepoliaPublicClient()
    
    const stats = await publicClient.readContract({
      address: CONTRACTS.HOOK,
      abi: CIRCEVERYBID_HOOK_ABI,
      functionName: 'getAuctionStats',
      args: [auctionAddress]
    }) as [boolean, bigint, bigint, bigint, Address, Hex, bigint, bigint, bigint]
    
    return {
      registered: stats[0],
      totalBids: stats[1],
      crossChainBids: stats[2],
      totalVolume: stats[3],
      creator: stats[4],
      creatorENSNode: stats[5],
      lastOptimizationTime: stats[6],
      lastPythPrice: stats[7],
      lastPythUpdate: stats[8]
    }
  } catch (error) {
    console.error('Failed to get auction stats:', error)
    return null
  }
}

/**
 * Get user stats from Hook
 */
export async function getUserStats(userAddress: Address): Promise<{
  totalBids: bigint
  totalVolume: bigint
  depositDomains: bigint[]
  depositAmounts: bigint[]
} | null> {
  try {
    const publicClient = createSepoliaPublicClient()
    
    const stats = await publicClient.readContract({
      address: CONTRACTS.HOOK,
      abi: CIRCEVERYBID_HOOK_ABI,
      functionName: 'getUserStats',
      args: [userAddress]
    }) as [bigint, bigint, bigint[], bigint[]]
    
    return {
      totalBids: stats[0],
      totalVolume: stats[1],
      depositDomains: stats[2],
      depositAmounts: stats[3]
    }
  } catch (error) {
    console.error('Failed to get user stats:', error)
    return null
  }
}

/**
 * Helper function to check admin status by trial
 */
async function checkAdminByTrial(
  walletClient: any,
  ensSubdomain: string = 'test'
): Promise<boolean> {
  try {
    console.log('🔍 Checking admin status by trial call...')
    
    const publicClient = createSepoliaPublicClient()
    const fakeAuction = '0x0000000000000000000000000000000000000001' as Address
    
    try {
      // Try to simulate an admin call with low gas
      await walletClient.sendTransaction({
        to: CONTRACTS.HOOK,
        data: encodeFunctionData({
          abi: CIRCEVERYBID_HOOK_ABI,
          functionName: 'registerAuctionAdmin',
          args: [fakeAuction, ensSubdomain]
        }),
        chainId: sepolia.id,
        gas: 100000n,
      })
      // If we get here without error, user might be admin
      return true
    } catch (error: any) {
      // Check error message for admin/revert reasons
      const errorMsg = error?.message || ''
      if (errorMsg.includes('Unauthorized') || 
          errorMsg.includes('Only owner') || 
          errorMsg.includes('not admin') ||
          errorMsg.includes('reverted')) {
        return false
      }
      // Other errors might mean contract issue, not necessarily not admin
      return false
    }
  } catch (error: any) {
    console.error('❌ Admin check by trial failed:', error)
    return false
  }
}

/**
 * Get auction state information
 */
export async function getAuctionState(auctionAddress: Address) {
  try {
    const publicClient = createSepoliaPublicClient()
    
    const [clearingPrice, currencyRaised, totalSupply, floorPrice, tickSpacing] = await Promise.all([
      publicClient.readContract({
        address: auctionAddress,
        abi: CCA_ABI,
        functionName: 'clearingPrice',
        args: []
      }) as Promise<bigint>,
      publicClient.readContract({
        address: auctionAddress,
        abi: CCA_ABI,
        functionName: 'currencyRaised',
        args: []
      }) as Promise<bigint>,
      publicClient.readContract({
        address: auctionAddress,
        abi: CCA_ABI,
        functionName: 'totalSupply',
        args: []
      }) as Promise<bigint>,
      publicClient.readContract({
        address: auctionAddress,
        abi: CCA_ABI,
        functionName: 'floorPrice',
        args: []
      }) as Promise<bigint>,
      publicClient.readContract({
        address: auctionAddress,
        abi: CCA_ABI,
        functionName: 'tickSpacing',
        args: []
      }) as Promise<bigint>
    ])
    
    return {
      clearingPrice,
      currencyRaised,
      totalSupply,
      floorPrice,
      tickSpacing
    }
  } catch (error) {
    console.error('Failed to get auction state:', error)
    return null
  }
}

/**
 * Place a bid on an auction
 */
export async function placeBid(
  walletClient: any,
  auctionAddress: Address,
  maxPrice: string,
  amount: string,
  owner?: Address
): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
  try {
    console.log('📝 Placing bid on auction...')
    
    const publicClient = createSepoliaPublicClient()
    const bidder = walletClient.account.address
    
    const maxPriceQ96 = convertETHToQ96(maxPrice)
    const amountWei = parseUnits(amount, 18)
    
    const transactionHash = await walletClient.sendTransaction({
      to: auctionAddress,
      data: encodeFunctionData({
        abi: CCA_ABI,
        functionName: 'submitBid',
        args: [
          maxPriceQ96, 
          amountWei, 
          owner || bidder, 
          '0x'
        ]
      }),
      value: amountWei,
      chainId: sepolia.id,
      gas: 500000n,
    })
    
    console.log('✅ Bid placed! Transaction:', transactionHash)
    
    // Wait for confirmation and extract bid ID
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: transactionHash,
      confirmations: 1,
      timeout: 120000
    })
    
    if (receipt.status !== 'success') {
      return {
        success: false,
        transactionHash,
        error: 'Transaction failed'
      }
    }
    
    return {
      success: true,
      transactionHash
    }
    
  } catch (error: any) {
    console.error('❌ Failed to place bid:', error)
    
    let errorMessage = error?.message || 'Unknown error'
    
    if (errorMessage.includes('TickPriceNotAtBoundary')) {
      errorMessage = 'Price must be at tick boundary'
    } else if (errorMessage.includes('BidMustBeAboveClearingPrice')) {
      errorMessage = 'Bid price must be above current clearing price'
    } else if (errorMessage.includes('AuctionHasEnded')) {
      errorMessage = 'Auction has ended'
    } else if (errorMessage.includes('AuctionHasNotStarted')) {
      errorMessage = 'Auction has not started yet'
    } else if (errorMessage.includes('insufficient funds')) {
      errorMessage = 'Insufficient funds for this bid'
    }
    
    return {
      success: false,
      error: errorMessage
    }
  }
}

/**
 * Exit a bid from an auction
 */
export async function exitBid(
  walletClient: any,
  auctionAddress: Address,
  bidId: bigint
): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
  try {
    console.log('📝 Exiting bid...')
    
    const publicClient = createSepoliaPublicClient()
    
    const transactionHash = await walletClient.sendTransaction({
      to: auctionAddress,
      data: encodeFunctionData({
        abi: CCA_ABI,
        functionName: 'exitBid',
        args: [bidId]
      }),
      chainId: sepolia.id,
      gas: 300000n,
    })
    
    console.log('✅ Bid exited! Transaction:', transactionHash)
    
    // Wait for confirmation
    await publicClient.waitForTransactionReceipt({
      hash: transactionHash,
      confirmations: 1,
      timeout: 120000
    })
    
    return {
      success: true,
      transactionHash
    }
    
  } catch (error: any) {
    console.error('❌ Failed to exit bid:', error)
    
    return {
      success: false,
      error: error?.message || 'Failed to exit bid'
    }
  }
}

/**
 * Claim tokens from a bid
 */
export async function claimTokens(
  walletClient: any,
  auctionAddress: Address,
  bidId: bigint
): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
  try {
    console.log('📝 Claiming tokens...')
    
    const publicClient = createSepoliaPublicClient()
    
    const transactionHash = await walletClient.sendTransaction({
      to: auctionAddress,
      data: encodeFunctionData({
        abi: CCA_ABI,
        functionName: 'claimTokens',
        args: [bidId]
      }),
      chainId: sepolia.id,
      gas: 300000n,
    })
    
    console.log('✅ Tokens claimed! Transaction:', transactionHash)
    
    // Wait for confirmation
    await publicClient.waitForTransactionReceipt({
      hash: transactionHash,
      confirmations: 1,
      timeout: 120000
    })
    
    return {
      success: true,
      transactionHash
    }
    
  } catch (error: any) {
    console.error('❌ Failed to claim tokens:', error)
    
    return {
      success: false,
      error: error?.message || 'Failed to claim tokens'
    }
  }
}

/**
 * Get bid information
 */
export async function getBidInfo(
  auctionAddress: Address,
  bidId: bigint
): Promise<any> {
  try {
    const publicClient = createSepoliaPublicClient()
    
    const bidInfo = await publicClient.readContract({
      address: auctionAddress,
      abi: CCA_ABI,
      functionName: 'getBid',
      args: [bidId]
    })
    
    return bidInfo
  } catch (error) {
    console.error('Failed to get bid info:', error)
    return null
  }
}

/**
 * Check if auction has ended
 */
export async function hasAuctionEnded(auctionAddress: Address): Promise<boolean> {
  try {
    const publicClient = createSepoliaPublicClient()
    
    const endBlock = await publicClient.readContract({
      address: auctionAddress,
      abi: CCA_ABI,
      functionName: 'endBlock',
      args: []
    }) as bigint
    
    const step = await publicClient.readContract({
      address: auctionAddress,
      abi: CCA_ABI,
      functionName: 'step',
      args: []
    }) as any
    
    const currentBlock = step?.[1] || 0n
    
    return currentBlock >= endBlock
  } catch (error) {
    console.error('Failed to check auction end:', error)
    return false
  }
}