'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWalletClient, useSwitchChain, useChainId } from 'wagmi'
import { parseUnits, formatUnits, type Address, createPublicClient, http } from 'viem'
import { sepolia, baseSepolia, arbitrumSepolia, optimismSepolia, polygonAmoy, avalancheFuji } from 'viem/chains'
import { USDC_ADDRESSES, TOKEN_MESSENGER_ADDRESSES } from '@/lib/circle-addresses'

const CHAIN_CONFIGS: Record<number, any> = {
  11155111: sepolia,
  84532: baseSepolia,
  421614: arbitrumSepolia,
  11155420: optimismSepolia,
  80002: polygonAmoy,
  43113: avalancheFuji,
}

// Only chains actually supported by Circle CCTP (Arc Testnet domain 26 is NOT supported)
const CCTP_SUPPORTED_CHAINS = [
  { id: 11155111, name: 'Ethereum Sepolia', shortName: 'ETH', domain: 0, attestation: '~15m' },
  { id: 84532, name: 'Base Sepolia', shortName: 'Base', domain: 6, attestation: '~15m' },
  { id: 421614, name: 'Arbitrum Sepolia', shortName: 'Arb', domain: 3, attestation: '~15m' },
  { id: 11155420, name: 'OP Sepolia', shortName: 'OP', domain: 2, attestation: '~15m' },
  { id: 80002, name: 'Polygon Amoy', shortName: 'Polygon', domain: 7, attestation: '~8s' },
  { id: 43113, name: 'Avalanche Fuji', shortName: 'Avax', domain: 1, attestation: '~8s' },
]

const selectStyle = { 
  width: '100%', 
  padding: '10px', 
  borderRadius: '8px', 
  border: '1px solid #2a2a3a', 
  background: '#1e1e2e', 
  color: '#F8FAFC', 
  fontSize: '13px',
  cursor: 'pointer',
  appearance: 'none' as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394A3B8' d='M3 4l3 4 3-4z'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
  paddingRight: '30px',
}
const btnStyle = { width: '100%', padding: '10px', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', border: 'none', color: 'white', transition: 'all 0.2s' }

interface CCTPDepositPanelProps {
  onDepositComplete?: (amount: string, txHash: string) => void
  gatewayBalance?: number
  onRefreshGateway?: () => void
}

export default function CCTPDepositPanel({ onDepositComplete, gatewayBalance, onRefreshGateway }: CCTPDepositPanelProps) {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { data: walletClient } = useWalletClient()
  const { switchChainAsync } = useSwitchChain()
  
  const [selectedChain, setSelectedChain] = useState(11155111)
  const [destinationChain, setDestinationChain] = useState(84532)
  const [amount, setAmount] = useState('')
  const [balance, setBalance] = useState('0')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [depositTx, setDepositTx] = useState('')

  useEffect(() => {
    // Only set to current chain if it's CCTP supported
    if (chainId && CCTP_SUPPORTED_CHAINS.find(c => c.id === chainId)) {
      setSelectedChain(chainId)
    }
  }, [chainId])

  useEffect(() => {
    if (address) fetchBalance()
  }, [address, selectedChain])

  const fetchBalance = async () => {
    if (!address) return
    const usdcAddress = USDC_ADDRESSES[selectedChain]
    if (!usdcAddress) return
    
    try {
      const chainConfig = CHAIN_CONFIGS[selectedChain]
      if (!chainConfig) return
      const client = createPublicClient({ chain: chainConfig, transport: http() })
      
      const bal = await client.readContract({
        address: usdcAddress,
        abi: [{ name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] }],
        functionName: 'balanceOf',
        args: [address]
      }) as bigint
      
      setBalance(formatUnits(bal, 6))
    } catch (e) {
      console.warn('Failed to fetch balance:', e)
    }
  }

  const handleDeposit = async () => {
    if (!address || !walletClient) return
    if (!amount || parseFloat(amount) <= 0) { setError('Enter valid amount'); return }
    if (selectedChain === destinationChain) { setError('Chains must differ'); return }
    
    setLoading(true)
    setError('')
    setStatus('Preparing...')
    setDepositTx('')
    
    try {
      if (chainId !== selectedChain) {
        setStatus('Switching chain...')
        await switchChainAsync({ chainId: selectedChain })
        await new Promise(r => setTimeout(r, 2000))
      }
      
      const usdcAddress = USDC_ADDRESSES[selectedChain] as Address
      const tokenMessenger = TOKEN_MESSENGER_ADDRESSES[selectedChain] as Address
      const destChain = CCTP_SUPPORTED_CHAINS.find(c => c.id === destinationChain)
      
      if (!usdcAddress || !tokenMessenger || !destChain) {
        throw new Error('Chain not supported by CCTP')
      }

      const amountInUnits = parseUnits(amount, 6)
      const mintRecipient = ('0x' + address.slice(2).padStart(64, '0')) as `0x${string}`
      
      setStatus('Approving USDC...')
      console.log('CCTP:', getChainName(selectedChain), '->', getChainName(destinationChain), amount, 'USDC')
      
      const approveHash = await walletClient.writeContract({
        chain: CHAIN_CONFIGS[selectedChain],
        address: usdcAddress,
        abi: [{ name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] }],
        functionName: 'approve',
        args: [tokenMessenger, amountInUnits]
      })
      
      console.log('Approve TX:', approveHash)
      
      const chainConfig = CHAIN_CONFIGS[selectedChain]
      const client = createPublicClient({ chain: chainConfig, transport: http() })
      await client.waitForTransactionReceipt({ hash: approveHash })
      
      setStatus('Burning via CCTP...')
      
      const depositHash = await walletClient.writeContract({
        chain: CHAIN_CONFIGS[selectedChain],
        address: tokenMessenger,
        abi: [{ name: 'depositForBurn', type: 'function', stateMutability: 'nonpayable',
          inputs: [{ name: 'amount', type: 'uint256' }, { name: 'destinationDomain', type: 'uint32' }, { name: 'mintRecipient', type: 'bytes32' }, { name: 'burnToken', type: 'address' }],
          outputs: [{ type: 'uint64' }]
        }],
        functionName: 'depositForBurn',
        args: [amountInUnits, destChain.domain, mintRecipient, usdcAddress]
      })
      
      console.log('Burn TX:', depositHash)
      await client.waitForTransactionReceipt({ hash: depositHash })
      
      setStatus(`Done! Attestation ${destChain.attestation}`)
      setDepositTx(depositHash)
      onDepositComplete?.(amount, depositHash)
      fetchBalance()
      setTimeout(() => onRefreshGateway?.(), 5000)
      
    } catch (e: any) {
      console.error('CCTP failed:', e)
      setError(e.shortMessage || e.message?.slice(0, 80) || 'Transfer failed')
    }
    setLoading(false)
  }

  const getChainName = (id: number) => CCTP_SUPPORTED_CHAINS.find(c => c.id === id)?.name || 'Unknown'
  const getShortName = (id: number) => CCTP_SUPPORTED_CHAINS.find(c => c.id === id)?.shortName || '?'
  const getAttestation = (id: number) => CCTP_SUPPORTED_CHAINS.find(c => c.id === id)?.attestation || '~15m'
  const getExplorerUrl = (cId: number, txHash: string) => {
    const explorers: Record<number, string> = {
      11155111: 'https://sepolia.etherscan.io/tx/',
      84532: 'https://sepolia.basescan.org/tx/',
      421614: 'https://sepolia.arbiscan.io/tx/',
      11155420: 'https://sepolia-optimism.etherscan.io/tx/',
      80002: 'https://amoy.polygonscan.com/tx/',
      43113: 'https://testnet.snowtrace.io/tx/',
    }
    return `${explorers[cId] || 'https://sepolia.etherscan.io/tx/'}${txHash}`
  }

  if (!isConnected) return <div style={{ color: '#64748B', textAlign: 'center', padding: '16px' }}>Connect wallet</div>

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <span style={{ fontSize: '16px' }}>💳</span>
        <span style={{ fontWeight: 600, color: '#F8FAFC' }}>Cross-Chain USDC (CCTP)</span>
      </div>
      
      <div style={{ background: '#1e1e2e', borderRadius: '8px', padding: '10px', marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '9px', color: '#64748B' }}>{getShortName(selectedChain)} Balance</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#60A5FA' }}>${parseFloat(balance).toFixed(2)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '9px', color: '#64748B' }}>Unified (All Chains)</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#22C55E' }}>${(gatewayBalance || 0).toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '4px' }}>From</div>
        <select 
          value={selectedChain}
          onChange={(e) => setSelectedChain(Number(e.target.value))}
          style={selectStyle}
        >
          {CCTP_SUPPORTED_CHAINS.map(chain => (
            <option key={chain.id} value={chain.id}>
              {chain.name}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '4px' }}>To</div>
        <select 
          value={destinationChain}
          onChange={(e) => setDestinationChain(Number(e.target.value))}
          style={selectStyle}
        >
          {CCTP_SUPPORTED_CHAINS.filter(c => c.id !== selectedChain).map(chain => (
            <option key={chain.id} value={chain.id}>
              {chain.name} ({chain.attestation})
            </option>
          ))}
        </select>
        <div style={{ fontSize: '9px', color: '#64748B', marginTop: '4px' }}>
          Fast: Polygon/Avax (~8s). Others: ~15 min. Arc not CCTP-supported.
        </div>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontSize: '11px', color: '#64748B' }}>Amount (USDC)</span>
          <button onClick={() => setAmount(balance)} style={{ fontSize: '10px', color: '#60A5FA', background: 'none', border: 'none', cursor: 'pointer' }}>MAX</button>
        </div>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #2a2a3a', background: '#1e1e2e', color: '#F8FAFC', fontSize: '13px' }}
        />
      </div>

      {error && <div style={{ padding: '8px', background: 'rgba(239,68,68,0.1)', borderRadius: '6px', marginBottom: '8px', fontSize: '11px', color: '#F87171' }}>{error}</div>}
      {status && <div style={{ padding: '8px', background: 'rgba(96,165,250,0.1)', borderRadius: '6px', marginBottom: '8px', fontSize: '11px', color: '#60A5FA' }}>{status}</div>}
      {depositTx && (
        <div style={{ padding: '8px', background: 'rgba(34,197,94,0.1)', borderRadius: '6px', marginBottom: '8px', fontSize: '11px', color: '#4ADE80' }}>
          <a href={getExplorerUrl(selectedChain, depositTx)} target="_blank" rel="noopener noreferrer" style={{ color: '#4ADE80' }}>View Transaction</a>
        </div>
      )}

      <button
        onClick={handleDeposit}
        disabled={loading || !amount}
        style={{ ...btnStyle, background: loading ? '#4a4a5a' : 'linear-gradient(135deg, #60A5FA, #3B82F6)', opacity: loading || !amount ? 0.6 : 1 }}
      >
        {loading ? 'Processing...' : `Bridge ${amount || '0'} USDC to ${getShortName(destinationChain)}`}
      </button>
      
      <button
        onClick={onRefreshGateway}
        style={{ width: '100%', marginTop: '8px', padding: '8px', background: 'transparent', border: '1px solid #2a2a3a', borderRadius: '8px', color: '#64748B', fontSize: '11px', cursor: 'pointer' }}
      >
        Refresh Unified Balance
      </button>
    </>
  )
}
