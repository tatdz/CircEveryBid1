// lib/cctp-deposit-service.ts
import { type Address, type Hex, encodeFunctionData, parseUnits } from 'viem'
import { TOKEN_MESSENGER_ADDRESSES, USDC_ADDRESSES, MESSAGE_TRANSMITTER_ADDRESSES } from './circle-addresses'

export const ARC_TESTNET_CHAIN_ID = 5042002
export const ARC_TESTNET_CCTP_DOMAIN = 26

export const TOKEN_MESSENGER_ABI = [
  {
    name: 'depositForBurn',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'destinationDomain', type: 'uint32' },
      { name: 'mintRecipient', type: 'bytes32' },
      { name: 'burnToken', type: 'address' }
    ],
    outputs: [{ name: 'nonce', type: 'uint64' }]
  },
  {
    name: 'depositForBurnWithCaller',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'destinationDomain', type: 'uint32' },
      { name: 'mintRecipient', type: 'bytes32' },
      { name: 'burnToken', type: 'address' },
      { name: 'destinationCaller', type: 'bytes32' }
    ],
    outputs: [{ name: 'nonce', type: 'uint64' }]
  }
] as const

export const ERC20_APPROVE_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ name: '', type: 'uint256' }]
  }
] as const

export const MESSAGE_TRANSMITTER_ABI = [
  {
    name: 'receiveMessage',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'message', type: 'bytes' },
      { name: 'attestation', type: 'bytes' }
    ],
    outputs: [{ name: 'success', type: 'bool' }]
  },
  {
    name: 'usedNonces',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'nonce', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint256' }]
  }
] as const

export interface CCTPDepositParams {
  sourceChainId: number
  amount: string
  recipientAddress: Address
  walletClient: any
  publicClient: any
}

export interface CCTPDepositResult {
  success: boolean
  burnTxHash?: string
  nonce?: string
  messageHash?: string
  error?: string
}

export function addressToBytes32(address: Address): Hex {
  return `0x000000000000000000000000${address.slice(2)}` as Hex
}

export function getSourceChainConfig(chainId: number) {
  const configs: Record<number, { name: string; domain: number; explorer: string }> = {
    11155111: { name: 'Ethereum Sepolia', domain: 0, explorer: 'https://sepolia.etherscan.io' },
    84532: { name: 'Base Sepolia', domain: 6, explorer: 'https://sepolia.basescan.org' },
    421614: { name: 'Arbitrum Sepolia', domain: 3, explorer: 'https://sepolia.arbiscan.io' },
    11155420: { name: 'OP Sepolia', domain: 2, explorer: 'https://sepolia-optimism.etherscan.io' },
    80002: { name: 'Polygon Amoy', domain: 7, explorer: 'https://amoy.polygonscan.com' },
    43113: { name: 'Avalanche Fuji', domain: 1, explorer: 'https://testnet.snowtrace.io' },
    1301: { name: 'Unichain Sepolia', domain: 10, explorer: 'https://sepolia.uniscan.xyz' },
    1328: { name: 'Sei Atlantic', domain: 16, explorer: 'https://atlantic-2.seistream.app' },
  }
  return configs[chainId]
}

export async function executeCCTPDeposit(params: CCTPDepositParams): Promise<CCTPDepositResult> {
  const { sourceChainId, amount, recipientAddress, walletClient, publicClient } = params
  
  console.log('🌉 === CCTP DEPOSIT TO ARC TESTNET ===')
  console.log('  Source Chain:', sourceChainId)
  console.log('  Amount:', amount, 'USDC')
  console.log('  Recipient:', recipientAddress)
  
  const sourceConfig = getSourceChainConfig(sourceChainId)
  if (!sourceConfig) {
    return { success: false, error: `Unsupported source chain: ${sourceChainId}` }
  }
  
  const usdcAddress = USDC_ADDRESSES[sourceChainId]
  const tokenMessengerAddress = TOKEN_MESSENGER_ADDRESSES[sourceChainId]
  
  if (!usdcAddress || !tokenMessengerAddress) {
    return { success: false, error: 'USDC or TokenMessenger not configured for this chain' }
  }
  
  console.log('  USDC:', usdcAddress)
  console.log('  TokenMessenger:', tokenMessengerAddress)
  
  try {
    const amountInUnits = parseUnits(amount, 6)
    const mintRecipient = addressToBytes32(recipientAddress)
    
    console.log('Step 1: Checking allowance...')
    const currentAllowance = await publicClient.readContract({
      address: usdcAddress,
      abi: ERC20_APPROVE_ABI,
      functionName: 'allowance',
      args: [recipientAddress, tokenMessengerAddress]
    })
    
    console.log('  Current allowance:', currentAllowance.toString())
    
    if (currentAllowance < amountInUnits) {
      console.log('Step 2: Approving USDC...')
      const approveTx = await walletClient.writeContract({
        address: usdcAddress,
        abi: ERC20_APPROVE_ABI,
        functionName: 'approve',
        args: [tokenMessengerAddress, amountInUnits],
        gas: 100000n
      })
      
      console.log('  Approve TX:', approveTx)
      console.log('  🔗 Explorer:', `${sourceConfig.explorer}/tx/${approveTx}`)
      
      await publicClient.waitForTransactionReceipt({ hash: approveTx })
      console.log('  ✅ Approval confirmed')
    } else {
      console.log('  ✅ Sufficient allowance')
    }
    
    console.log('Step 3: Calling depositForBurn...')
    console.log('  Destination Domain:', ARC_TESTNET_CCTP_DOMAIN)
    console.log('  Mint Recipient:', mintRecipient)
    
    const burnTx = await walletClient.writeContract({
      address: tokenMessengerAddress,
      abi: TOKEN_MESSENGER_ABI,
      functionName: 'depositForBurn',
      args: [amountInUnits, ARC_TESTNET_CCTP_DOMAIN, mintRecipient, usdcAddress],
      gas: 300000n
    })
    
    console.log('  Burn TX:', burnTx)
    console.log('  🔗 Explorer:', `${sourceConfig.explorer}/tx/${burnTx}`)
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash: burnTx })
    
    if (receipt.status === 'success') {
      console.log('✅ === CCTP DEPOSIT SUCCESSFUL ===')
      console.log('  TX Hash:', burnTx)
      console.log('  Now wait for Circle attestation (~5-15 min)')
      
      return {
        success: true,
        burnTxHash: burnTx,
        nonce: receipt.logs[0]?.topics?.[1] || undefined,
        messageHash: receipt.logs[0]?.data || undefined
      }
    } else {
      return { success: false, error: 'Transaction reverted' }
    }
    
  } catch (error: any) {
    console.error('❌ CCTP deposit failed:', error)
    return { success: false, error: error.shortMessage || error.message }
  }
}

export async function claimCCTPOnArc(
  message: Hex,
  attestation: Hex,
  walletClient: any,
  publicClient: any
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  console.log('📥 === CLAIMING CCTP ON ARC TESTNET ===')
  
  const messageTransmitter = MESSAGE_TRANSMITTER_ADDRESSES[ARC_TESTNET_CHAIN_ID]
  if (!messageTransmitter) {
    return { success: false, error: 'MessageTransmitter not configured for Arc Testnet' }
  }
  
  console.log('  MessageTransmitter:', messageTransmitter)
  
  try {
    const txHash = await walletClient.writeContract({
      address: messageTransmitter,
      abi: MESSAGE_TRANSMITTER_ABI,
      functionName: 'receiveMessage',
      args: [message, attestation],
      gas: 500000n
    })
    
    console.log('  Claim TX:', txHash)
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
    
    if (receipt.status === 'success') {
      console.log('✅ === CCTP CLAIM SUCCESSFUL ===')
      return { success: true, txHash }
    } else {
      return { success: false, error: 'Claim transaction reverted' }
    }
    
  } catch (error: any) {
    console.error('❌ CCTP claim failed:', error)
    return { success: false, error: error.shortMessage || error.message }
  }
}
