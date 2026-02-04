// components/ENSManager.tsx
'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { type Address } from 'viem'
import { 
  registerSubdomainSimple,
  checkSubdomainSimple,
  getUserENSSubdomains,
  getCreatorInfo
} from '@/lib/ens-service'
import { CONTRACTS, ENS_CONFIG } from '@/lib/contracts'

export default function ENSManager() {
  const { address } = useAccount()
  
  const [subdomain, setSubdomain] = useState('')
  const [userSubdomains, setUserSubdomains] = useState<string[]>([])
  const [creatorInfo, setCreatorInfo] = useState<{
    ensName: string
    node: string
    totalAuctions: bigint
    totalVolume: bigint
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [txHash, setTxHash] = useState<string>('')
  const [subdomainStatus, setSubdomainStatus] = useState<{
    available: boolean;
    exists: boolean;
    fullName: string;
  } | null>(null)

  // Load user's subdomains and info
  useEffect(() => {
    const loadData = async () => {
      if (!address) return
      
      try {
        // Load subdomains
        const subdomains = await getUserENSSubdomains(address)
        setUserSubdomains(subdomains)
        
        // Load creator info
        const info = await getCreatorInfo(address)
        if (info) {
          setCreatorInfo({
            ensName: info.ensName,
            node: info.node,
            totalAuctions: info.totalAuctions,
            totalVolume: info.totalVolume
          })
        }
      } catch (error) {
        console.error('Failed to load user data:', error)
      }
    }
    
    loadData()
  }, [address])

  // Check subdomain availability
  useEffect(() => {
    const checkAvailability = async () => {
      if (!subdomain || subdomain.length < 3) {
        setSubdomainStatus(null)
        return
      }
      
      setIsChecking(true)
      const status = await checkSubdomainSimple(subdomain)
      setSubdomainStatus(status)
      setIsChecking(false)
    }
    
    const timeoutId = setTimeout(checkAvailability, 500)
    return () => clearTimeout(timeoutId)
  }, [subdomain])

  const handleRegisterSubdomain = async () => {
    if (!address || !subdomain) {
      setError('Please connect wallet and enter subdomain')
      return
    }

    if (subdomain.length < 3) {
      setError('Subdomain must be at least 3 characters')
      return
    }

    try {
      setIsLoading(true)
      setError('')

      console.log('📝 Registering subdomain...')
      
      const result = await registerSubdomainSimple(subdomain, address)
      
      if (!result.success) {
        throw new Error(result.error || 'Registration failed')
      }
      
      setTxHash(result.hash || '')
      setSuccess(`✅ Subdomain registered: ${result.fullDomain}`)
      
      // Refresh data
      const subdomains = await getUserENSSubdomains(address)
      setUserSubdomains(subdomains)
      
      const info = await getCreatorInfo(address)
      if (info) {
        setCreatorInfo({
          ensName: info.ensName,
          node: info.node,
          totalAuctions: info.totalAuctions,
          totalVolume: info.totalVolume
        })
      }
      
      // Clear form
      setSubdomain('')
      setSubdomainStatus(null)
      
    } catch (err: any) {
      console.error('❌ Failed to register subdomain:', err)
      setError(err.message || 'Failed to register subdomain')
    } finally {
      setIsLoading(false)
    }
  }

  const formatVolume = (volume: bigint) => {
    return Number(volume) / 1e18
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel">
        <h3 className="heading-3 mb-6">ENS Subdomain Manager</h3>
        
        {/* Creator Info */}
        {creatorInfo && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <h4 className="body-text font-medium text-emerald-400 mb-2">Your Creator Profile</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">ENS Name:</span>
                <span className="text-white font-medium">{creatorInfo.ensName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Auctions:</span>
                <span className="text-white">{creatorInfo.totalAuctions.toString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Volume:</span>
                <span className="text-white">{formatVolume(creatorInfo.totalVolume)} ETH</span>
              </div>
            </div>
          </div>
        )}

        {/* Existing Subdomains */}
        {userSubdomains.length > 0 && (
          <div className="mb-6">
            <h4 className="body-text font-medium mb-3">Your Subdomains</h4>
            <div className="grid gap-2">
              {userSubdomains.map(sub => (
                <div 
                  key={sub}
                  className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-white font-medium">{sub}</span>
                      <span className="text-slate-400">.{ENS_CONFIG.domain}</span>
                    </div>
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                      Registered
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    Use this subdomain for your auctions
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Register New Subdomain */}
        <div>
          <h4 className="body-text font-medium mb-4">
            {userSubdomains.length > 0 ? 'Register Another Subdomain' : 'Register Your First Subdomain'}
          </h4>
          
          <div className="space-y-4">
            <div>
              <label className="block body-small mb-2">Subdomain Name</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="myauction"
                  className="flex-1 input-field"
                  disabled={isLoading}
                />
                <div className="px-4 py-2 bg-slate-800 border border-slate-700 rounded text-slate-400">
                  .{ENS_CONFIG.domain}
                </div>
              </div>
              
              {/* Availability status */}
              {subdomainStatus && (
                <div className={`mt-2 p-3 rounded-lg ${
                  subdomainStatus.exists 
                    ? 'bg-red-500/10 border-red-500/20' 
                    : subdomainStatus.available
                    ? 'bg-green-500/10 border-green-500/20'
                    : 'bg-yellow-500/10 border-yellow-500/20'
                }`}>
                  <div className="flex items-center gap-2">
                    {isChecking ? (
                      <>
                        <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-blue-300">Checking availability...</span>
                      </>
                    ) : subdomainStatus.exists ? (
                      <>
                        <span className="w-3 h-3 rounded-full bg-red-500" />
                        <span className="text-sm text-red-300">
                          {subdomainStatus.fullName} is already registered
                        </span>
                      </>
                    ) : subdomainStatus.available ? (
                      <>
                        <span className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="text-sm text-green-300">
                          {subdomainStatus.fullName} is available!
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="w-3 h-3 rounded-full bg-yellow-500" />
                        <span className="text-sm text-yellow-300">
                          Invalid format or length
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleRegisterSubdomain}
              disabled={!subdomain || !subdomainStatus?.available || isLoading}
              className="w-full btn-primary py-3"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Registering...
                </span>
              ) : 'Register Subdomain'}
            </button>
            
            <div className="text-xs text-slate-500 text-center">
              Registration includes:
              <ul className="mt-1 space-y-1">
                <li>• ENS subdomain record</li>
                <li>• Creator profile in CircEveryBid registry</li>
                <li>• Ability to create auctions with this subdomain</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="glass-panel bg-red-500/10 border-red-500/20">
          <div className="flex items-start gap-3">
            <div className="avatar bg-red-500/20 border-red-500/30">
              <span className="text-red-400">⚠️</span>
            </div>
            <div>
              <h4 className="body-text font-medium text-red-400 mb-1">Error</h4>
              <p className="body-small whitespace-pre-line">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Display */}
      {success && (
        <div className="glass-panel bg-green-500/10 border-green-500/20">
          <div className="flex items-start gap-3">
            <div className="avatar bg-green-500/20 border-green-500/30">
              <span className="text-green-400">✅</span>
            </div>
            <div>
              <p className="body-small text-green-400">{success}</p>
              {txHash && (
                <div className="mt-2">
                  <a
                    href={`https://sepolia.etherscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 font-mono break-all"
                  >
                    View transaction
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Contract Info */}
      <div className="glass-panel bg-blue-500/10 border-blue-500/20">
        <h4 className="body-text font-medium text-blue-400 mb-3">Contract Configuration</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">ENS Domain:</span>
            <span className="text-white">{ENS_CONFIG.domain}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Auction Registry:</span>
            <span className="text-white font-mono text-xs">
              {CONTRACTS.ENS_AUCTION_REGISTRY.slice(0, 12)}...{CONTRACTS.ENS_AUCTION_REGISTRY.slice(-10)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Hook Contract:</span>
            <span className="text-white font-mono text-xs">
              {CONTRACTS.HOOK.slice(0, 12)}...{CONTRACTS.HOOK.slice(-10)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Connected Wallet:</span>
            <span className="text-white font-mono text-xs">
              {address?.slice(0, 10)}...{address?.slice(-8)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}