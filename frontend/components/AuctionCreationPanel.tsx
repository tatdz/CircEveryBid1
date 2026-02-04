// components/AuctionCreationPanel.tsx 
'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWalletClient, usePublicClient, useChainId } from 'wagmi'
import { type Address, parseUnits } from 'viem'
import { CONTRACTS, ENS_CONFIG, getChainName } from '@/lib/contracts'
import { createNewAuction } from '@/lib/contract-interactions'
import { 
  checkSubdomainSimple,
  getCreatorInfo,
  checkAdminStatus 
} from '@/lib/ens-service'
import { 
  registerSubdomainWithAuction,
  storeAuctionPerformanceViaNamestone,
  storeCreatorReputationViaNamestone 
} from '@/lib/namestone-service'
import { useAuctionStore } from '@/lib/auctionStore'
import MockTokenMintPanel from './MockTokenMintPanel'

interface AuctionCreationPanelProps {
  onAuctionCreated?: (address: string, auctionAddress?: Address) => void
}

type CreationStep = 'parameters' | 'ens-select' | 'complete'

const panelStyle = { background: '#12121c', borderRadius: '12px', border: '1px solid #1e1e2e', padding: '16px' }
const inputStyle = { padding: '10px', background: '#1e1e2e', border: '1px solid #2d2d44', borderRadius: '8px', color: '#F8FAFC', fontSize: '13px', width: '100%' }
const btnStyle = { padding: '12px', background: 'linear-gradient(135deg, #10B981, #059669)', border: 'none', borderRadius: '10px', color: 'white', fontSize: '14px', fontWeight: 600 as const, cursor: 'pointer', width: '100%' }

function getExplorerUrl(chainId: number, txHash: string): string {
  const explorers: Record<number, string> = {
    11155111: 'https://sepolia.etherscan.io',
    84532: 'https://sepolia.basescan.org',
    421614: 'https://sepolia.arbiscan.io',
    5042002: 'https://explorerl2-arc-testnet-pmlnt-dev-23kkqh.t.conduit.xyz',
  }
  return `${explorers[chainId] || 'https://sepolia.etherscan.io'}/tx/${txHash}`
}

export default function AuctionCreationPanel({ onAuctionCreated }: AuctionCreationPanelProps) {
  const { address, isConnected } = useAccount()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const chainId = useChainId()
  
  const [params, setParams] = useState({
    startDelayBlocks: '5',
    durationBlocks: '100',
    tickSpacing: '0.01',
    floorPrice: '0.01',
    auctionTokenAmount: '1000000',
  })
  
  const [step, setStep] = useState<CreationStep>('parameters')
  const [status, setStatus] = useState<'idle' | 'creating' | 'ens-registering' | 'complete'>('idle')
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  
  const [createdAuction, setCreatedAuction] = useState<{
    address: string
    transactionHash: string
    ensName?: string
  } | null>(null)
  
  const [ensSubdomain, setEnsSubdomain] = useState('')
  const [availableSubdomains, setAvailableSubdomains] = useState<string[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [registrationTxHash, setRegistrationTxHash] = useState('')
  const [subdomainStatus, setSubdomainStatus] = useState<{
    available: boolean;
    exists: boolean;
    fullName: string;
  } | null>(null)
  const [mintingTokens, setMintingTokens] = useState(false)
  const [mintSuccess, setMintSuccess] = useState('')
  
  const { addAuction } = useAuctionStore()

  useEffect(() => {
    const checkAdminAndSubdomains = async () => {
      if (!address || !publicClient) return
      
      try {
        const adminStatus = await checkAdminStatus(address, publicClient)
        setIsAdmin(adminStatus)
        
        const creatorInfo = await getCreatorInfo(address)
        if (creatorInfo && creatorInfo.ensName) {
          const subdomain = creatorInfo.ensName.replace(`.${ENS_CONFIG.domain}`, '')
          setAvailableSubdomains([subdomain])
        }
      } catch (error) {
        console.error('Failed to check admin/subdomains:', error)
      }
    }
    
    checkAdminAndSubdomains()
  }, [address, publicClient])

  useEffect(() => {
    const checkAvailability = async () => {
      if (!ensSubdomain || ensSubdomain.length < 3) {
        setSubdomainStatus(null)
        return
      }
      
      const status = await checkSubdomainSimple(ensSubdomain)
      setSubdomainStatus(status)
    }
    
    const timeoutId = setTimeout(checkAvailability, 500)
    return () => clearTimeout(timeoutId)
  }, [ensSubdomain])

  const validateParams = (): string | null => {
    const startDelay = parseInt(params.startDelayBlocks)
    const duration = parseInt(params.durationBlocks)
    const tickSpacing = parseFloat(params.tickSpacing)
    const floorPrice = parseFloat(params.floorPrice)
    const tokenAmount = parseInt(params.auctionTokenAmount)
    
    if (startDelay < 1 || startDelay > 1000) return 'Start delay must be between 1 and 1000 blocks'
    if (duration < 10 || duration > 1000) return 'Duration must be between 10 and 1000 blocks'
    if (tickSpacing < 0.01 || tickSpacing > 1) return 'Tick spacing must be between 0.01 and 1 USDC'
    if (floorPrice < 0.01 || floorPrice > 1000) return 'Floor price must be between 0.01 and 1000 USDC'
    if (tokenAmount < 1000 || tokenAmount > 1000000000) return 'Token amount must be between 1,000 and 1,000,000,000'
    
    return null
  }

  const handleCreateAuction = async () => {
    if (!address || !walletClient || !chainId) {
      setError('Please connect wallet')
      return
    }
    
    const validationError = validateParams()
    if (validationError) {
      setError(validationError)
      return
    }
    
    try {
      console.log('🏭 === AUCTION CREATION START ===')
      console.log('  Chain ID:', chainId)
      console.log('  Factory:', CONTRACTS.FACTORY)
      console.log('  Parameters:', params)
      
      if (CONTRACTS.FACTORY === '0x0000000000000000000000000000000000000000') {
        throw new Error('Factory contract address not configured.')
      }
      
      setStatus('creating')
      setError('')
      setSuccess('Creating auction on-chain...')

      const result = await createNewAuction(walletClient, params)
      
      console.log('  ✅ TX submitted:', result.transactionHash)
      console.log('  🔗 Etherscan:', getExplorerUrl(chainId, result.transactionHash))
      console.log('  📍 Auction address:', result.auctionAddress)
      
      const auctionData = {
        address: result.auctionAddress as Address,
        transactionHash: result.transactionHash,
        ensName: ensSubdomain ? `${ensSubdomain}.${ENS_CONFIG.domain}` : undefined
      }
      
      setCreatedAuction(auctionData)
      setSuccess('✅ Auction created on-chain!')
      
      const currentBlock = await publicClient?.getBlockNumber() || 0n
      const startBlock = BigInt(parseInt(params.startDelayBlocks)) + BigInt(currentBlock)
      const endBlock = startBlock + BigInt(parseInt(params.durationBlocks))
      
      addAuction({
        address: result.auctionAddress as Address,
        creator: address,
        floorPrice: parseUnits(params.floorPrice, 6),
        tickSpacing: parseUnits(params.tickSpacing, 6),
        startBlock: Number(startBlock),
        endBlock: Number(endBlock),
        jobId: undefined,
        ensName: ensSubdomain ? `${ensSubdomain}.${ENS_CONFIG.domain}` : undefined
      })
      
      const auctionCacheKey = `usdc-auction-${result.auctionAddress.toLowerCase()}`
      localStorage.setItem(auctionCacheKey, JSON.stringify({
        address: result.auctionAddress,
        txHash: result.transactionHash,
        timestamp: Date.now(),
        chainId: chainId,  // Store chain ID for MPS compatibility check
        currency: 'USDC',
        floorPrice: params.floorPrice + ' USDC',
        tickSpacing: params.tickSpacing + ' USDC',
        ensSubdomain: ensSubdomain,
        creator: address
      }))
      
      onAuctionCreated?.(result.auctionAddress, result.auctionAddress as Address)
      
      setStep('ens-select')
      setStatus('idle')
      
    } catch (err: any) {
      console.error('❌ Auction creation failed:', err)
      setError(err.message || 'Failed to create auction')
      setStatus('idle')
    }
  }

  const handleRegisterSubdomain = async (subdomain: string) => {
    if (!address || !createdAuction) {
      setError('Missing required information')
      return
    }

    try {
      setStatus('ens-registering')
      setError('')

      console.log('📝 === ENS SUBDOMAIN REGISTRATION ===')
      console.log('  Subdomain:', subdomain)
      console.log('  Auction:', createdAuction.address)
      
      const result = await registerSubdomainWithAuction(
        subdomain,
        address,
        {
          auctionAddress: createdAuction.address,
          auctionParams: {
            floorPrice: params.floorPrice,
            tickSpacing: params.tickSpacing,
            durationBlocks: params.durationBlocks,
            startDelayBlocks: params.startDelayBlocks,
            auctionTokenAmount: params.auctionTokenAmount,
            currency: 'USDC'
          }
        }
      )
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create subdomain')
      }
      
      console.log('  ✅ ENS registered:', result.fullDomain)
      
      setRegistrationTxHash(result.hash || '')
      const fullDomain = result.fullDomain || `${subdomain}.${ENS_CONFIG.domain}`
      
      setCreatedAuction(prev => prev ? { ...prev, ensName: fullDomain } : null)
      
      await storeAuctionPerformanceViaNamestone(
        subdomain,
        {
          auctionAddress: createdAuction.address,
          creatorAddress: address,
          totalBids: 0,
          totalVolume: "0",
          crossChainBids: 0,
          lastUpdated: Date.now(),
          bidders: [],
          successRate: 0,
          avgPriceImprovement: 0,
          createdAt: Date.now(),
          auctionParams: {
            floorPrice: params.floorPrice,
            tickSpacing: params.tickSpacing,
            durationBlocks: params.durationBlocks,
            startDelayBlocks: params.startDelayBlocks,
            auctionTokenAmount: params.auctionTokenAmount,
            currency: 'USDC'
          }
        }
      )
      
      await storeCreatorReputationViaNamestone(
        subdomain,
        {
          creatorAddress: address,
          totalAuctions: 1,
          successfulAuctions: 0,
          volume: "0",
          completionRate: 0,
          avgPriceImprovement: 0,
          score: 50,
          lastUpdated: Date.now()
        }
      )
      
      setSuccess(`✅ ENS subdomain registered: ${fullDomain}`)
      
      if (!availableSubdomains.includes(subdomain)) {
        setAvailableSubdomains(prev => [...prev, subdomain])
      }
      
      setTimeout(() => {
        setStep('complete')
        setStatus('complete')
      }, 1500)
      
      const auctionCacheKey = `usdc-auction-${createdAuction.address.toLowerCase()}`
      const cached = localStorage.getItem(auctionCacheKey)
      if (cached) {
        const auctionData = JSON.parse(cached)
        auctionData.ensRegistered = true
        auctionData.ensSubdomain = subdomain
        auctionData.ensFullName = fullDomain
        auctionData.ensTextRecords = result.textRecords
        auctionData.storedOnChain = true
        localStorage.setItem(auctionCacheKey, JSON.stringify(auctionData))
      }
      
    } catch (err: any) {
      console.error('❌ Failed to register subdomain:', err)
      setError(err.message || 'Failed to register subdomain')
      setStatus('idle')
    }
  }

  const handleSkipENS = () => {
    setStep('complete')
    setStatus('complete')
    setSuccess('Auction created without ENS registration')
  }

  const handleReset = () => {
    setStep('parameters')
    setStatus('idle')
    setCreatedAuction(null)
    setEnsSubdomain('')
    setRegistrationTxHash('')
    setError('')
    setSuccess('')
    setSubdomainStatus(null)
    setParams({
      startDelayBlocks: '5',
      durationBlocks: '100',
      tickSpacing: '0.01',
      floorPrice: '0.01',
      auctionTokenAmount: '1000000',
    })
  }

  if (step === 'complete') {
    return (
      <div style={panelStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <span style={{ fontSize: '16px' }}>✅</span>
          <span style={{ fontWeight: 600, color: '#F8FAFC' }}>Auction Created</span>
        </div>
        
        <div style={{ background: '#1e1e2e', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '4px' }}>Auction Address</div>
          <div style={{ fontSize: '12px', fontFamily: 'monospace', color: '#60A5FA', wordBreak: 'break-all' }}>
            {createdAuction?.address}
          </div>
          {createdAuction?.ensName && (
            <>
              <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '4px', marginTop: '8px' }}>ENS Name</div>
              <div style={{ fontSize: '12px', color: '#22C55E' }}>{createdAuction.ensName}</div>
            </>
          )}
        </div>
        
        {createdAuction?.transactionHash && (
          <a href={getExplorerUrl(chainId, createdAuction.transactionHash)} target="_blank" rel="noopener noreferrer" 
             style={{ display: 'block', padding: '6px', background: 'rgba(96,165,250,0.1)', borderRadius: '6px', marginBottom: '12px', fontSize: '11px', color: '#60A5FA', textDecoration: 'none' }}>
            🔗 View on Etherscan ↗
          </a>
        )}
        
        {/* Simplified Token Mint for auction */}
        {createdAuction?.address && (
          <div style={{ background: '#1e1e2e', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '8px' }}>Fund Auction with EBID</div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={async () => {
                  if (!walletClient || !createdAuction?.address) return
                  try {
                    const hash = await walletClient.writeContract({
                      address: '0xb5fddd15391354766B869dC9aE5876Df7F849782' as `0x${string}`,
                      abi: [{ name: 'mint', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] }],
                      functionName: 'mint',
                      args: [createdAuction.address as `0x${string}`, BigInt(1000000) * BigInt(10 ** 18)],
                    })
                    console.log('✅ Minted 1M EBID to auction:', hash)
                  } catch (e) { console.error(e) }
                }}
                style={{ flex: 1, padding: '8px', background: 'linear-gradient(135deg, #F59E0B, #D97706)', border: 'none', borderRadius: '6px', color: 'white', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
              >
                1M EBID
              </button>
              <button
                onClick={async () => {
                  if (!walletClient || !createdAuction?.address) return
                  try {
                    const hash = await walletClient.writeContract({
                      address: '0xb5fddd15391354766B869dC9aE5876Df7F849782' as `0x${string}`,
                      abi: [{ name: 'mint', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] }],
                      functionName: 'mint',
                      args: [createdAuction.address as `0x${string}`, BigInt(2000000) * BigInt(10 ** 18)],
                    })
                    console.log('✅ Minted 2M EBID to auction:', hash)
                  } catch (e) { console.error(e) }
                }}
                style={{ flex: 1, padding: '8px', background: 'linear-gradient(135deg, #F59E0B, #D97706)', border: 'none', borderRadius: '6px', color: 'white', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
              >
                2M EBID
              </button>
            </div>
          </div>
        )}
        
        <button onClick={handleReset} style={{ ...btnStyle, background: 'linear-gradient(135deg, #6366F1, #4F46E5)' }}>
          Create Another Auction
        </button>
      </div>
    )
  }

  if (step === 'ens-select') {
    return (
      <div style={panelStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <span style={{ fontSize: '16px' }}>🌐</span>
          <span style={{ fontWeight: 600, color: '#F8FAFC' }}>Link ENS Subdomain</span>
        </div>
        
        <div style={{ padding: '8px', background: 'rgba(34,197,94,0.1)', borderRadius: '6px', marginBottom: '12px', fontSize: '11px', color: '#4ADE80' }}>
          ✅ Auction created: {createdAuction?.address?.slice(0, 20)}...
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '4px' }}>Create Subdomain</div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <input
              type="text"
              value={ensSubdomain}
              onChange={(e) => setEnsSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="myauction"
              style={{ ...inputStyle, flex: 1 }}
            />
            <div style={{ padding: '10px', background: '#1e1e2e', border: '1px solid #2d2d44', borderRadius: '8px', color: '#64748B', fontSize: '11px' }}>
              .{ENS_CONFIG.domain}
            </div>
          </div>
          
          {subdomainStatus && (
            <div style={{ marginTop: '6px', fontSize: '11px', color: subdomainStatus.available ? '#4ADE80' : '#F87171' }}>
              {subdomainStatus.available ? '✅ Available' : '❌ Taken'}
            </div>
          )}
        </div>
        
        {error && <div style={{ padding: '6px', background: 'rgba(239,68,68,0.1)', borderRadius: '6px', marginBottom: '8px', fontSize: '11px', color: '#F87171' }}>{error}</div>}
        {success && <div style={{ padding: '6px', background: 'rgba(34,197,94,0.1)', borderRadius: '6px', marginBottom: '8px', fontSize: '11px', color: '#4ADE80' }}>{success}</div>}
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => handleRegisterSubdomain(ensSubdomain)}
            disabled={!subdomainStatus?.available || status === 'ens-registering'}
            style={{ ...btnStyle, flex: 1, opacity: (!subdomainStatus?.available || status === 'ens-registering') ? 0.6 : 1 }}
          >
            {status === 'ens-registering' ? 'Registering...' : 'Register ENS'}
          </button>
          <button onClick={handleSkipENS} style={{ ...btnStyle, flex: 1, background: 'linear-gradient(135deg, #64748B, #475569)' }}>
            Skip
          </button>
        </div>
      </div>
    )
  }

  const handleQuickMint = async () => {
    if (!address || !walletClient) return
    try {
      setMintingTokens(true)
      setMintSuccess('')
      const { writeContract: wagmiWrite } = await import('@/lib/wagmi-contract-helpers')
      const amountWei = parseUnits('2000000', 18)
      await wagmiWrite(
        CONTRACTS.MOCK_TOKEN as Address,
        [{name:'mint',type:'function',stateMutability:'nonpayable',inputs:[{name:'to',type:'address'},{name:'amount',type:'uint256'}],outputs:[]}] as const,
        'mint',
        [address, amountWei],
        { account: address }
      )
      setMintSuccess('✅ 2M EBID minted!')
      setTimeout(() => setMintSuccess(''), 3000)
    } catch (err: any) {
      console.error('Mint failed:', err)
      setError(err.message || 'Mint failed')
    } finally {
      setMintingTokens(false)
    }
  }

  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{ fontSize: '16px' }}>🏭</span>
        <span style={{ fontWeight: 600, color: '#F8FAFC' }}>Create USDC Auction</span>
      </div>
      
      {!isConnected && (
        <div style={{ padding: '8px', background: 'rgba(251,191,36,0.1)', borderRadius: '6px', marginBottom: '12px', fontSize: '11px', color: '#FBBF24' }}>
          ⚠️ Connect wallet to create auction
        </div>
      )}

      {/* Quick Mint Button */}
      {isConnected && CONTRACTS.MOCK_TOKEN && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', padding: '8px', background: '#1a1a2e', borderRadius: '8px', border: '1px solid #2d2d44' }}>
          <button
            onClick={handleQuickMint}
            disabled={mintingTokens}
            style={{ padding: '6px 12px', background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', border: 'none', borderRadius: '6px', color: 'white', fontSize: '11px', fontWeight: 600, cursor: 'pointer', opacity: mintingTokens ? 0.6 : 1 }}
          >
            {mintingTokens ? 'Minting...' : '🪙 Mint 2M EBID'}
          </button>
          <span style={{ fontSize: '10px', color: '#64748B' }}>Tokens to fund auction</span>
          {mintSuccess && <span style={{ fontSize: '10px', color: '#4ADE80' }}>{mintSuccess}</span>}
        </div>
      )}
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
        <div>
          <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '4px' }}>Start Delay (blocks)</div>
          <input
            type="number"
            value={params.startDelayBlocks}
            onChange={(e) => setParams({...params, startDelayBlocks: e.target.value})}
            min="1" max="100"
            style={inputStyle}
          />
          <div style={{ fontSize: '9px', color: '#475569', marginTop: '2px' }}>~{(parseInt(params.startDelayBlocks || '5') * 12 / 60).toFixed(1)} min</div>
        </div>
        
        <div>
          <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '4px' }}>Duration (blocks)</div>
          <input
            type="number"
            value={params.durationBlocks}
            onChange={(e) => setParams({...params, durationBlocks: e.target.value})}
            min="10" max="1000"
            style={inputStyle}
          />
          <div style={{ fontSize: '9px', color: '#475569', marginTop: '2px' }}>~{(parseInt(params.durationBlocks || '100') * 12 / 60).toFixed(1)} min</div>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
        <div>
          <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '4px' }}>Tick Spacing</div>
          <input
            type="number"
            value={params.tickSpacing}
            onChange={(e) => setParams({...params, tickSpacing: e.target.value})}
            step="0.01" min="0.01" max="1"
            style={inputStyle}
          />
        </div>
        
        <div>
          <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '4px' }}>Floor Price</div>
          <input
            type="number"
            value={params.floorPrice}
            onChange={(e) => setParams({...params, floorPrice: e.target.value})}
            step="0.01" min="0.01"
            style={inputStyle}
          />
        </div>
        
        <div>
          <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '4px' }}>Token Amount</div>
          <input
            type="number"
            value={params.auctionTokenAmount}
            onChange={(e) => setParams({...params, auctionTokenAmount: e.target.value})}
            min="1000"
            style={inputStyle}
          />
        </div>
      </div>
      
      {error && <div style={{ padding: '6px', background: 'rgba(239,68,68,0.1)', borderRadius: '6px', marginBottom: '8px', fontSize: '11px', color: '#F87171' }}>{error}</div>}
      {success && <div style={{ padding: '6px', background: 'rgba(34,197,94,0.1)', borderRadius: '6px', marginBottom: '8px', fontSize: '11px', color: '#4ADE80' }}>{success}</div>}
      
      <button
        onClick={handleCreateAuction}
        disabled={!isConnected || status === 'creating'}
        style={{ ...btnStyle, opacity: (!isConnected || status === 'creating') ? 0.6 : 1 }}
      >
        {status === 'creating' ? 'Creating...' : 'Create Auction'}
      </button>
    </div>
  )
}
