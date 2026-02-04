// components/ENSRegistrationFlow.tsx
'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWalletClient } from 'wagmi'
import { type Address } from 'viem'
import { 
  registerSubdomainSimple,
  checkSubdomainSimple,
  getUserENSSubdomains 
} from '@/lib/ens-service'
import { CONTRACTS, ENS_CONFIG } from '@/lib/contracts'
import { writeContract } from '@/lib/wagmi-contract-helpers'
import { CIRCEVERYBID_HOOK_ABI } from '@/lib/abis'

interface ENSRegistrationFlowProps {
  auctionAddress: string
  onComplete?: (txHash: string, ensName: string) => void
}

type Step = 'select' | 'create' | 'register' | 'complete'

export default function ENSRegistrationFlow({ 
  auctionAddress, 
  onComplete 
}: ENSRegistrationFlowProps) {
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  
  const [step, setStep] = useState<Step>('select')
  const [ensSubdomain, setEnsSubdomain] = useState('')
  const [availableSubdomains, setAvailableSubdomains] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [txHash, setTxHash] = useState<string>('')
  const [subdomainStatus, setSubdomainStatus] = useState<{
    available: boolean;
    exists: boolean;
    fullName: string;
  } | null>(null)

  // Load existing subdomains
  useEffect(() => {
    const loadData = async () => {
      if (!address) return
      
      try {
        const subdomains = await getUserENSSubdomains(address)
        setAvailableSubdomains(subdomains)
      } catch (error) {
        console.error('Failed to load ENS data:', error)
      }
    }
    
    loadData()
  }, [address])

  // Check subdomain availability when it changes
  useEffect(() => {
    const checkAvailability = async () => {
      if (!ensSubdomain || ensSubdomain.length < 3) {
        setSubdomainStatus(null)
        return
      }
      
      try {
        const status = await checkSubdomainSimple(ensSubdomain)
        setSubdomainStatus(status)
      } catch (error) {
        console.error('Failed to check subdomain:', error)
        setSubdomainStatus({
          available: false,
          exists: false,
          fullName: `${ensSubdomain}.${ENS_CONFIG.domain}`
        })
      }
    }
    
    const timeoutId = setTimeout(checkAvailability, 500)
    return () => clearTimeout(timeoutId)
  }, [ensSubdomain])

  const handleCreateSubdomain = async () => {
    if (!address || !ensSubdomain) {
      setError('Please connect wallet and enter subdomain')
      return
    }

    if (ensSubdomain.length < 3) {
      setError('Subdomain must be at least 3 characters')
      return
    }

    try {
      setIsLoading(true)
      setError('')

      console.log('📝 Creating ENS subdomain...')
      
      // Register subdomain
      const result = await registerSubdomainSimple(ensSubdomain, address)
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create subdomain')
      }
      
      setTxHash(result.hash || '')
      setSuccess(`✅ Subdomain created: ${result.fullDomain}`)
      
      // Refresh available subdomains
      const subdomains = await getUserENSSubdomains(address)
      setAvailableSubdomains(subdomains)
      
      // Move to registration step
      setTimeout(() => {
        setStep('register')
        setError('')
      }, 2000)
      
    } catch (error: any) {
      console.error('❌ Failed to create subdomain:', error)
      setError(error.message || 'Failed to create subdomain')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegisterAuction = async () => {
    if (!walletClient || !ensSubdomain || !address) {
      setError('Please connect wallet and select subdomain')
      return
    }

    try {
      setIsLoading(true)
      setError('')

      console.log('📝 Registering auction with Hook...', {
        auction: auctionAddress,
        subdomain: ensSubdomain
      })

      // Register with Hook contract directly
      const fullDomain = `${ensSubdomain}.${ENS_CONFIG.domain}`
      
      const { hash } = await writeContract(
        CONTRACTS.HOOK,
        CIRCEVERYBID_HOOK_ABI,
        'registerAuction',
        [auctionAddress as Address, fullDomain],
        { account: address }
      )

      setTxHash(hash)
      setSuccess('✅ Auction successfully registered with Hook!')
      
      // Call completion callback
      if (onComplete) {
        onComplete(hash, fullDomain)
      }
      
      // Move to complete step
      setTimeout(() => {
        setStep('complete')
      }, 2000)
      
    } catch (error: any) {
      console.error('❌ Failed to register auction:', error)
      setError(error.message || 'Failed to register auction')
    } finally {
      setIsLoading(false)
    }
  }

  const resetFlow = () => {
    setStep('select')
    setEnsSubdomain('')
    setError('')
    setSuccess('')
    setTxHash('')
    setSubdomainStatus(null)
  }

  // Helper to render transaction links
  const renderTransactionLink = (hash: string, label: string) => (
    <a
      href={`https://sepolia.etherscan.io/tx/${hash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-400 hover:text-blue-300 font-mono break-all text-sm"
    >
      {label}
    </a>
  )

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-between mb-8">
        {['select', 'create', 'register', 'complete'].map((s, index) => (
          <div key={s} className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === s ? 'bg-blue-600 text-white' :
              ['complete', 'register'].includes(step) && index < 3 ? 'bg-green-600 text-white' :
              'bg-slate-700 text-slate-400'
            }`}>
              {index + 1}
            </div>
            <span className="text-xs mt-2 capitalize">{s}</span>
          </div>
        ))}
      </div>

      {/* Step 1: Select or Create Subdomain */}
      {step === 'select' && (
        <div className="glass-panel">
          <h3 className="heading-3 mb-4">Link ENS Subdomain</h3>
          <p className="text-slate-400 mb-6">
            Your auction needs an ENS subdomain to accept cross-chain USDC bids via CCTP.
          </p>

          {/* Existing Subdomains */}
          {availableSubdomains.length > 0 && (
            <div className="mb-6">
              <h4 className="body-text font-medium mb-3">Your Existing Subdomains</h4>
              <div className="space-y-2">
                {availableSubdomains.map(subdomain => (
                  <div 
                    key={subdomain}
                    className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800 cursor-pointer"
                    onClick={() => {
                      setEnsSubdomain(subdomain)
                      setStep('register')
                    }}
                  >
                    <div>
                      <span className="text-white font-medium">{subdomain}</span>
                      <span className="text-slate-400">.{ENS_CONFIG.domain}</span>
                    </div>
                    <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm">
                      Use This
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2 text-center">
                Or create a new subdomain below
              </p>
            </div>
          )}

          {/* Create New Subdomain */}
          <div>
            <h4 className="body-text font-medium mb-3">
              {availableSubdomains.length > 0 ? 'Create New Subdomain' : 'Create Your First Subdomain'}
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block body-small mb-2">Subdomain Name</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={ensSubdomain}
                    onChange={(e) => setEnsSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="myauction"
                    className="flex-1 input-field"
                  />
                  <div className="px-4 py-2 bg-slate-800 border border-slate-700 rounded text-slate-400">
                    .{ENS_CONFIG.domain}
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  3-20 characters, lowercase letters, numbers, and hyphens only
                </p>
                
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
                      {subdomainStatus.exists ? (
                        <>
                          <span className="w-3 h-3 rounded-full bg-red-500" />
                          <span className="text-sm text-red-300">
                            Already registered: {subdomainStatus.fullName}
                          </span>
                        </>
                      ) : subdomainStatus.available ? (
                        <>
                          <span className="w-3 h-3 rounded-full bg-green-500" />
                          <span className="text-sm text-green-300">
                            Available! You can register {subdomainStatus.fullName}
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
                onClick={handleCreateSubdomain}
                disabled={!ensSubdomain || !subdomainStatus?.available || isLoading}
                className="w-full btn-primary py-3"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </span>
                ) : 'Create Subdomain'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Register Auction */}
      {step === 'register' && ensSubdomain && (
        <div className="glass-panel">
          <h3 className="heading-3 mb-4">Register Auction with Hook</h3>
          
          <div className="space-y-4">
            {/* Auction Info */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <p className="text-sm text-blue-300 mb-2">Auction Address</p>
              <p className="font-mono text-sm break-all">{auctionAddress}</p>
            </div>
            
            {/* ENS Info */}
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
              <p className="text-sm text-purple-300 mb-2">ENS Subdomain</p>
              <p className="text-lg font-semibold text-white">
                {ensSubdomain}.{ENS_CONFIG.domain}
              </p>
            </div>
            
            {/* Registration Button */}
            <button
              onClick={handleRegisterAuction}
              disabled={isLoading}
              className="w-full btn-primary py-3"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Registering...
                </span>
              ) : 'Register Auction'}
            </button>
            
            <button
              onClick={() => setStep('select')}
              className="w-full py-2 text-slate-400 hover:text-slate-300"
            >
              ← Back to Subdomain Selection
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Complete */}
      {step === 'complete' && (
        <div className="glass-panel bg-green-500/10 border-green-500/20">
          <div className="flex items-start gap-4">
            <div className="avatar bg-green-500/20 border-green-500/30">
              <span className="text-green-400">✅</span>
            </div>
            <div className="flex-1">
              <h3 className="heading-3 text-green-400 mb-2">Successfully Registered!</h3>
              
              <div className="space-y-4">
                <p className="text-slate-300">
                  Your auction is now registered and ready to accept cross-chain USDC bids!
                </p>
                
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <p className="text-sm text-slate-400 mb-1">ENS Name</p>
                  <p className="text-lg font-semibold text-white">
                    {ensSubdomain}.{ENS_CONFIG.domain}
                  </p>
                </div>
                
                {txHash && (
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Transaction</p>
                    {renderTransactionLink(txHash, 'View on Etherscan')}
                  </div>
                )}
                
                <div className="pt-4 border-t border-green-500/20">
                  <p className="text-green-400 text-sm mb-2">🎉 What's Next?</p>
                  <ul className="text-sm text-slate-300 space-y-1">
                    <li>• Your auction can now accept USDC bids via CCTP</li>
                    <li>• Bidders can deposit from 9 supported chains</li>
                    <li>• The Hook will automatically optimize pricing</li>
                    <li>• You can view auction stats in the dashboard</li>
                  </ul>
                </div>
                
                <button
                  onClick={resetFlow}
                  className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
                >
                  Register Another Auction
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Success Message */}
      {success && step !== 'complete' && (
        <div className="glass-panel bg-green-500/10 border-green-500/20">
          <div className="flex items-start gap-3">
            <div className="avatar bg-green-500/20 border-green-500/30">
              <span className="text-green-400">✅</span>
            </div>
            <div>
              <p className="body-small text-green-400">{success}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}