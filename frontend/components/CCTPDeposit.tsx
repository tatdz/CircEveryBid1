// components/CCTPDeposit.tsx - Real CCTP cross-chain deposit
'use client'

import { useState, useEffect } from 'react'
import { useAccount, usePublicClient, useWalletClient, useChainId, useBalance, useSwitchChain } from 'wagmi'
import { parseUnits, formatUnits, type Address, type Hex, encodeFunctionData } from 'viem'
import { CONTRACTS, SUPPORTED_CHAINS, getCCTPDomain, getUSDCAddress } from '@/lib/contracts'
import { ERC20_ABI } from '@/lib/abis'

const CCTP_TOKEN_MESSENGER_ABI = [
  {
    type: 'function',
    name: 'depositForBurn',
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
    type: 'function',
    name: 'depositForBurnWithCaller',
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

const TOKEN_MESSENGER_ADDRESSES: Record<number, Address> = {
  11155111: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5', // Sepolia
  84532: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5', // Base Sepolia
  421614: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5', // Arbitrum Sepolia
  11155420: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5', // OP Sepolia
  80002: '0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5', // Polygon Amoy
}

interface CCTPDepositProps {
  onDepositComplete?: (txHash: string, amount: string, sourceChain: number) => void
}

export default function CCTPDeposit({ onDepositComplete }: CCTPDepositProps) {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

  const [amount, setAmount] = useState('')
  const [destinationChainId, setDestinationChainId] = useState(5042002) // Arc Testnet
  const [isApproving, setIsApproving] = useState(false)
  const [isDepositing, setIsDepositing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [pendingDeposits, setPendingDeposits] = useState<any[]>([])

  const sourceUSDC = getUSDCAddress(chainId)
  const { data: usdcBalance, refetch: refetchBalance } = useBalance({
    address,
    token: sourceUSDC,
    chainId
  })

  const sourceChain = SUPPORTED_CHAINS.find(c => c.id === chainId)
  const destChain = SUPPORTED_CHAINS.find(c => c.id === destinationChainId)

  useEffect(() => {
    loadPendingDeposits()
  }, [address])

  const loadPendingDeposits = () => {
    if (!address || typeof window === 'undefined') return
    
    const key = `cctp-deposits-${address}`
    const stored = localStorage.getItem(key)
    if (stored) {
      setPendingDeposits(JSON.parse(stored))
    }
  }

  const saveDeposit = (deposit: any) => {
    if (!address || typeof window === 'undefined') return
    
    const key = `cctp-deposits-${address}`
    const existing = JSON.parse(localStorage.getItem(key) || '[]')
    existing.push(deposit)
    localStorage.setItem(key, JSON.stringify(existing))
    setPendingDeposits(existing)
  }

  const handleApproveAndDeposit = async () => {
    if (!address || !walletClient || !publicClient || !sourceUSDC) {
      setError('Please connect wallet')
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount')
      return
    }

    const tokenMessenger = TOKEN_MESSENGER_ADDRESSES[chainId]
    if (!tokenMessenger) {
      setError(`CCTP not supported on chain ${chainId}. Switch to a supported chain.`)
      return
    }

    try {
      setIsApproving(true)
      setError(null)
      setSuccess(null)

      const amountWei = parseUnits(amount, 6)

      console.log('Step 1: Checking USDC allowance...')
      
      const allowance = await publicClient.readContract({
        address: sourceUSDC,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address, tokenMessenger]
      }) as bigint

      if (allowance < amountWei) {
        console.log('Step 2: Approving USDC for TokenMessenger...')
        
        const approveTx = await walletClient.writeContract({
          address: sourceUSDC,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [tokenMessenger, amountWei],
          account: walletClient.account!,
          chain: walletClient.chain!,
        })

        console.log('Approval tx:', approveTx)

        await publicClient.waitForTransactionReceipt({
          hash: approveTx,
          confirmations: 1
        })

        console.log('Approval confirmed')
      }

      setIsApproving(false)
      setIsDepositing(true)

      console.log('Step 3: Depositing for burn via CCTP...')

      const destinationDomain = getCCTPDomain(destinationChainId)
      
      const mintRecipient = `0x000000000000000000000000${address.slice(2)}` as Hex

      const depositTx = await walletClient.writeContract({
        address: tokenMessenger,
        abi: CCTP_TOKEN_MESSENGER_ABI,
        functionName: 'depositForBurn',
        args: [
          amountWei,
          destinationDomain,
          mintRecipient,
          sourceUSDC
        ],
        account: walletClient.account!,
        chain: walletClient.chain!,
      })

      console.log('Deposit tx:', depositTx)
      setTxHash(depositTx)

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: depositTx,
        confirmations: 1
      })

      if (receipt.status === 'success') {
        console.log('CCTP deposit successful!')

        const deposit = {
          txHash: depositTx,
          amount,
          sourceChainId: chainId,
          destinationChainId,
          sourceDomain: getCCTPDomain(chainId),
          destinationDomain,
          timestamp: Date.now(),
          status: 'pending_attestation',
          blockNumber: receipt.blockNumber.toString()
        }

        saveDeposit(deposit)

        setSuccess(`Deposit successful! USDC will arrive on ${destChain?.name || 'destination chain'} after attestation (~15-20 mins)`)
        onDepositComplete?.(depositTx, amount, chainId)
        
        setAmount('')
        refetchBalance()

      } else {
        throw new Error('Deposit transaction failed')
      }

    } catch (err: any) {
      console.error('CCTP deposit failed:', err)
      if (err.message?.includes('User rejected')) {
        setError('Transaction cancelled')
      } else {
        setError(err.message || 'Deposit failed')
      }
    } finally {
      setIsApproving(false)
      setIsDepositing(false)
    }
  }

  const checkAttestation = async (depositTxHash: string) => {
    try {
      const response = await fetch(`/api/cctp?txHash=${depositTxHash}`)
      const data = await response.json()
      
      if (data.status === 'complete') {
        const key = `cctp-deposits-${address}`
        const deposits = JSON.parse(localStorage.getItem(key) || '[]')
        const updated = deposits.map((d: any) => 
          d.txHash === depositTxHash ? { ...d, status: 'ready', attestation: data.attestation, message: data.message } : d
        )
        localStorage.setItem(key, JSON.stringify(updated))
        setPendingDeposits(updated)
        return { ready: true, ...data }
      }
      
      return { ready: false, status: data.status }
    } catch (err) {
      console.error('Attestation check failed:', err)
      return { ready: false, error: 'Failed to check attestation' }
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Bridge USDC via CCTP</h3>
        
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">From</span>
              <span className="text-xs text-gray-400">{sourceChain?.name || `Chain ${chainId}`}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-gray-900">
                {usdcBalance ? formatUnits(usdcBalance.value, 6) : '0'} USDC
              </span>
              <span className="text-2xl">{sourceChain?.logo || '⛓️'}</span>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="p-2 bg-gray-100 rounded-full">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-blue-600">To</span>
              <select
                value={destinationChainId}
                onChange={(e) => setDestinationChainId(Number(e.target.value))}
                className="text-xs bg-transparent border-none text-blue-600 focus:outline-none cursor-pointer"
              >
                {SUPPORTED_CHAINS.filter(c => c.id !== chainId).map(chain => (
                  <option key={chain.id} value={chain.id}>{chain.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-gray-900">
                {destChain?.name || 'Select destination'}
              </span>
              <span className="text-2xl">{destChain?.logo || '🎯'}</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Amount (USDC)</label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                step="0.01"
                min="0"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
              <button
                onClick={() => setAmount(usdcBalance ? formatUnits(usdcBalance.value, 6) : '0')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-pink-500 hover:text-pink-600 font-medium"
              >
                MAX
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-100 rounded-xl">
              <p className="text-sm text-green-600">{success}</p>
              {txHash && (
                <a 
                  href={`https://sepolia.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-green-700 hover:underline block mt-1"
                >
                  View transaction
                </a>
              )}
            </div>
          )}

          <button
            onClick={handleApproveAndDeposit}
            disabled={isApproving || isDepositing || !amount || !isConnected}
            className="w-full py-3.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-gray-300 disabled:to-gray-300 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/25 disabled:shadow-none"
          >
            {!isConnected ? (
              'Connect Wallet'
            ) : isApproving ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Approving USDC...
              </span>
            ) : isDepositing ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Bridging via CCTP...
              </span>
            ) : (
              `Bridge ${amount || '0'} USDC`
            )}
          </button>
        </div>
      </div>

      {pendingDeposits.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Pending Deposits</h4>
          <div className="space-y-2">
            {pendingDeposits.slice(-5).reverse().map((deposit, idx) => (
              <div key={idx} className="p-3 bg-gray-50 rounded-xl">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-900">{deposit.amount} USDC</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    deposit.status === 'ready' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                  }`}>
                    {deposit.status === 'ready' ? 'Ready' : 'Pending'}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{new Date(deposit.timestamp).toLocaleString()}</span>
                  <button
                    onClick={() => checkAttestation(deposit.txHash)}
                    className="text-pink-500 hover:text-pink-600"
                  >
                    Check Status
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gray-50 rounded-2xl p-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">About CCTP</h4>
        <ul className="space-y-1.5 text-xs text-gray-500">
          <li>Circle's Cross-Chain Transfer Protocol</li>
          <li>Native USDC burning and minting (no wrapped tokens)</li>
          <li>Attestation takes ~15-20 minutes</li>
          <li>Supported: Sepolia, Base, Arbitrum, OP, Polygon, Arc</li>
        </ul>
      </div>
    </div>
  )
}
