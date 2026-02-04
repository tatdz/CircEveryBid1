// lib/abis.ts 

// CCA (Continuous Clearing Auction) ABI - COMPLETE from Uniswap
export const CCA_ABI = [
  // === BID SUBMISSION ===
  {
    type: 'function',
    name: 'submitBid',
    stateMutability: 'payable',
    inputs: [
      { name: '_maxPrice', type: 'uint256' },
      { name: '_amount', type: 'uint128' },
      { name: '_owner', type: 'address' },
      { name: '_prevTickPrice', type: 'uint256' },
      { name: '_hookData', type: 'bytes' }
    ],
    outputs: [{ name: 'bidId', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'submitBid',
    stateMutability: 'payable',
    inputs: [
      { name: '_maxPrice', type: 'uint256' },
      { name: '_amount', type: 'uint128' },
      { name: '_owner', type: 'address' },
      { name: '_hookData', type: 'bytes' }
    ],
    outputs: [{ name: 'bidId', type: 'uint256' }]
  },
  
  // === BID MANAGEMENT ===
  {
    type: 'function',
    name: 'getBid',
    stateMutability: 'view',
    inputs: [{ name: 'bidId', type: 'uint256' }],
    outputs: [
      {
        name: 'bid',
        type: 'tuple',
        components: [
          { name: 'owner', type: 'address' },
          { name: 'amountQ96', type: 'uint256' },
          { name: 'maxPrice', type: 'uint256' },
          { name: 'startBlock', type: 'uint64' },
          { name: 'tokensFilled', type: 'uint256' },
          { name: 'exitedBlock', type: 'uint64' }
        ]
      }
    ]
  },
  {
    type: 'function',
    name: 'exitBid',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_bidId', type: 'uint256' }],
    outputs: []
  },
  {
    type: 'function',
    name: 'exitPartiallyFilledBid',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_bidId', type: 'uint256' },
      { name: '_lastFullyFilledCheckpointBlock', type: 'uint64' },
      { name: '_outbidBlock', type: 'uint64' }
    ],
    outputs: []
  },
  {
    type: 'function',
    name: 'claimTokens',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_bidId', type: 'uint256' }],
    outputs: []
  },
  {
    type: 'function',
    name: 'claimTokensBatch',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_owner', type: 'address' },
      { name: '_bidIds', type: 'uint256[]' }
    ],
    outputs: []
  },
  
  // === CHECKPOINT & STATE ===
  {
    type: 'function',
    name: 'checkpoint',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'cumulativeMps', type: 'uint64' },
          { name: 'cumulativeMpsPerPrice', type: 'uint88' },
          { name: 'clearingPrice', type: 'uint256' },
          { name: 'currencyRaisedAtClearingPriceQ96_X7', type: 'uint256' },
          { name: 'prev', type: 'uint64' },
          { name: 'next', type: 'uint64' }
        ]
      }
    ]
  },
  {
    type: 'function',
    name: 'latestCheckpoint',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'cumulativeMps', type: 'uint64' },
          { name: 'cumulativeMpsPerPrice', type: 'uint88' },
          { name: 'clearingPrice', type: 'uint256' },
          { name: 'currencyRaisedAtClearingPriceQ96_X7', type: 'uint256' },
          { name: 'prev', type: 'uint64' },
          { name: 'next', type: 'uint64' }
        ]
      }
    ]
  },
  
  // === AUCTION STATE ===
  {
    type: 'function',
    name: 'clearingPrice',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'currencyRaised',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'totalSupply',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint128' }]
  },
  {
    type: 'function',
    name: 'totalCleared',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'startBlock',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint64' }]
  },
  {
    type: 'function',
    name: 'endBlock',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint64' }]
  },
  {
    type: 'function',
    name: 'claimBlock',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint64' }]
  },
  {
    type: 'function',
    name: 'isGraduated',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    type: 'function',
    name: 'floorPrice',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'tickSpacing',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'token',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }]
  },
  {
    type: 'function',
    name: 'currency',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }]
  },
  {
    type: 'function',
    name: 'step',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'mps', type: 'uint24' },
          { name: 'startBlock', type: 'uint64' },
          { name: 'endBlock', type: 'uint64' }
        ]
      }
    ]
  },
  {
    type: 'function',
    name: 'sweepCurrency',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: []
  },
  {
    type: 'function',
    name: 'sweepUnsoldTokens',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: []
  },
  {
    type: 'function',
    name: 'onTokensReceived',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: []
  },
  {
    type: 'function',
    name: 'tokensRecipient',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }]
  },
  {
    type: 'function',
    name: 'fundsRecipient',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }]
  },
  
  // === EVENTS ===
  {
    type: 'event',
    name: 'BidSubmitted',
    inputs: [
      { name: 'bidId', type: 'uint256', indexed: true },
      { name: 'owner', type: 'address', indexed: true },
      { name: 'maxPrice', type: 'uint256', indexed: false },
      { name: 'amount', type: 'uint128', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'BidExited',
    inputs: [
      { name: 'bidId', type: 'uint256', indexed: true },
      { name: 'owner', type: 'address', indexed: true },
      { name: 'tokensFilled', type: 'uint256', indexed: false },
      { name: 'refund', type: 'uint256', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'TokensClaimed',
    inputs: [
      { name: 'bidId', type: 'uint256', indexed: true },
      { name: 'owner', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'CheckpointUpdated',
    inputs: [
      { name: 'blockNumber', type: 'uint64', indexed: false },
      { name: 'clearingPrice', type: 'uint256', indexed: false },
      { name: 'cumulativeMps', type: 'uint64', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'ClearingPriceUpdated',
    inputs: [
      { name: 'blockNumber', type: 'uint64', indexed: false },
      { name: 'clearingPrice', type: 'uint256', indexed: false }
    ]
  },
  {
    type: 'event',
    name: 'TokensReceived',
    inputs: [
      { name: 'amount', type: 'uint256', indexed: false }
    ]
  }
] as const

// ENS Auction Registry ABI (CircEveryBidENSPerformanceRegistrar)
export const ENS_AUCTION_REGISTRY_ABI = [
  {
    name: 'registerAuctionCreator',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'creator', type: 'address' },
      { name: 'label', type: 'string' },
      { name: 'auctionsCreated', type: 'uint256' },
      { name: 'totalVolume', type: 'uint256' }
    ],
    outputs: [{ name: 'node', type: 'bytes32' }]
  },
  {
    name: 'createSubdomainForUser',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'label', type: 'string' },
      { name: 'ownerAddress', type: 'address' }
    ],
    outputs: [{ name: 'node', type: 'bytes32' }]
  },
  {
    name: 'registerCreatorWithoutENS',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'creator', type: 'address' },
      { name: 'label', type: 'string' },
      { name: 'auctionsCreated', type: 'uint256' },
      { name: 'totalVolume', type: 'uint256' }
    ],
    outputs: [{ name: 'node', type: 'bytes32' }]
  },
  {
    name: 'updateCreatorENSName',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'creator', type: 'address' },
      { name: 'newLabel', type: 'string' }
    ],
    outputs: []
  },
  {
    name: 'fixCreatorENSRecords',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'creator', type: 'address' },
      { name: 'node', type: 'bytes32' }
    ],
    outputs: []
  },
  {
    name: 'updateAuctionPerformance',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'creator', type: 'address' },
      { name: 'auctionId', type: 'uint256' },
      { name: 'volume', type: 'uint256' },
      { name: 'priceImprovement', type: 'uint256' },
      { name: 'successful', type: 'bool' }
    ],
    outputs: []
  },
  {
    name: 'readCreatorPerformance',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'creator', type: 'address' }],
    outputs: [
      { name: 'totalAuctions', type: 'uint256' },
      { name: 'totalVolume', type: 'uint256' },
      { name: 'successRate', type: 'uint256' },
      { name: 'avgPriceImprovement', type: 'uint256' },
      { name: 'ensName', type: 'string' }
    ]
  },
  {
    name: 'getCreatorInfo',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [
      { name: 'ensName', type: 'string' },
      { name: 'node', type: 'bytes32' },
      { name: 'totalAuctions', type: 'uint256' },
      { name: 'totalVolume', type: 'uint256' }
    ]
  },
  {
    name: 'getOwnerForNode',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }]
  },
  {
    name: 'isCreatorVerified',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'creator', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }]
  },
  // ADMIN FUNCTIONS
  {
    name: 'setENSResolver',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_ensResolver', type: 'address' }],
    outputs: []
  },
  {
    name: 'manuallyVerifyCreator',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'creator', type: 'address' },
      { name: 'verified', type: 'bool' }
    ],
    outputs: []
  },
  // VIEW FUNCTIONS
  {
    name: 'getNodeForOwner',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'bytes32' }]
  },
  {
    name: 'getCreatorForAuction',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'auctionId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }]
  },
  // CONSTANTS
  {
    name: 'ensRegistry',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }]
  },
  {
    name: 'ensResolver',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }]
  },
  {
    name: 'parentNode',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bytes32' }]
  },
  {
    name: 'domain',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }]
  }
] as const


// Optimizer ABI
export const OPTIMIZER_ABI = [
  {
    name: 'createOptimizationJob',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'auction', type: 'address' }],
    outputs: [{ name: 'jobId', type: 'uint256' }]
  },
  {
    name: 'executeOptimization',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'jobId', type: 'uint256' },
      { name: 'priceUpdateData', type: 'bytes[]' },
      { name: 'priceFeedId', type: 'bytes32' },
      { name: 'bidConcentration', type: 'uint256' },
      { name: 'crossChainBidCount', type: 'uint256' },
      { name: 'clientRef', type: 'string' }
    ],
    outputs: [
      { name: 'proofId', type: 'uint256' },
      { name: 'stepsHash', type: 'bytes32' },
      { name: 'improvementBps', type: 'uint256' }
    ]
  },
  {
    name: 'getOptimizationResult',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'jobId', type: 'uint256' }],
    outputs: [
      { name: 'auction', type: 'address' },
      { name: 'stepsHash', type: 'bytes32' },
      { name: 'improvementBps', type: 'uint256' },
      { name: 'timestamp', type: 'uint256' }
    ]
  },
  {
    name: 'getJobDetails',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'jobId', type: 'uint256' }],
    outputs: [
      { name: 'auction', type: 'address' },
      { name: 'creator', type: 'address' },
      { name: 'createdTime', type: 'uint256' },
      { name: 'completed', type: 'bool' },
      { name: 'stepsHash', type: 'bytes32' },
      { name: 'improvementBps', type: 'uint256' },
      { name: 'completionTime', type: 'uint256' }
    ]
  }
] as const

// MPS Mutator ABI
export const MPS_MUTATOR_ABI = [
  {
    name: 'optimizeAndProve',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'cca', type: 'address' },
      { name: 'priceUpdateData', type: 'bytes[]' },
      { name: 'priceFeedId', type: 'bytes32' },
      { name: 'bidConcentration', type: 'uint256' },
      { name: 'crossChainBidCount', type: 'uint256' },
      { name: 'clientRef', type: 'string' }
    ],
    outputs: [
      { name: 'proofId', type: 'uint256' },
      { name: 'stepsHash', type: 'bytes32' },
      { name: 'improvementBps', type: 'uint256' },
      { name: 'optimizedSteps', type: 'bytes' }
    ]
  },
  {
    name: 'getCurrentPythPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'feedId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'getLastMetrics',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'cca', type: 'address' }],
    outputs: [
      { name: 'priceDiscoveryProgress', type: 'uint256' },
      { name: 'bidConcentration', type: 'uint256' },
      { name: 'pythDeviation', type: 'uint256' },
      { name: 'marketEfficiency', type: 'uint256' },
      { name: 'auctionProgress', type: 'uint256' },
      { name: 'clearingPrice', type: 'uint256' },
      { name: 'currencyRaised', type: 'uint256' },
      { name: 'crossChainBidCount', type: 'uint256' }
    ]
  },
  {
    name: 'proofCounter',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'event',
    name: 'OptimizationProved',
    inputs: [
      { name: 'proofId', type: 'uint256', indexed: true },
      { name: 'cca', type: 'address', indexed: true },
      { name: 'stepsHash', type: 'bytes32', indexed: false },
      { name: 'improvementBps', type: 'uint256', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false }
    ]
  }
] as const

// Poseidon Commitment ABI
export const POSEIDON_COMMITMENT_ABI = [
  {
    name: 'commitBid',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'bidder', type: 'address' },
      { name: 'auction', type: 'address' },
      { name: 'amountHash', type: 'bytes32' },
      { name: 'priceHash', type: 'bytes32' },
      { name: 'timestampHash', type: 'bytes32' }
    ],
    outputs: [{ name: '', type: 'bytes32' }]
  },
  {
    name: 'hashParameters',
    type: 'function',
    stateMutability: 'pure',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'maxPrice', type: 'uint256' },
      { name: 'timestamp', type: 'uint256' }
    ],
    outputs: [
      { name: '', type: 'bytes32' },
      { name: '', type: 'bytes32' },
      { name: '', type: 'bytes32' }
    ]
  },
  {
    name: 'verifyCommitment',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'commitmentHash', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'getCommitment',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'commitmentHash', type: 'bytes32' }],
    outputs: [
      { name: 'bidder', type: 'address' },
      { name: 'auction', type: 'address' },
      { name: 'amountHash', type: 'bytes32' },
      { name: 'priceHash', type: 'bytes32' },
      { name: 'timestampHash', type: 'bytes32' },
      { name: 'timestamp', type: 'uint256' },
      { name: 'revealed', type: 'bool' }
    ]
  },
  {
    name: 'poseidonHash',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'inputs', type: 'uint256[]' }],
    outputs: [{ name: '', type: 'uint256' }]
  }
] as const

// Step Storage Reader ABI
export const STEP_READER_ABI = [
  {
    name: 'readCurrentSteps',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'cca', type: 'address' }],
    outputs: [{ name: 'stepsData', type: 'bytes' }]
  },
  {
    name: 'getCurrentMPS',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'cca', type: 'address' }],
    outputs: [{ name: '', type: 'uint24' }]
  },
  {
    name: 'getStepProgress',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'cca', type: 'address' }],
    outputs: [
      { name: 'mps', type: 'uint24' },
      { name: 'startBlock', type: 'uint64' },
      { name: 'endBlock', type: 'uint64' },
      { name: 'blocksRemaining', type: 'uint256' },
      { name: 'progressBps', type: 'uint256' }
    ]
  },
  {
    name: 'estimateCurrentStepTokens',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'cca', type: 'address' },
      { name: 'totalSupply', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'uint256' }]
  }
] as const


export const FACTORY_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "token", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }, 
      { "internalType": "bytes", "name": "configData", "type": "bytes" },
      { "internalType": "bytes32", "name": "salt", "type": "bytes32" }
    ],
    "name": "initializeDistribution",
    "outputs": [{ "internalType": "contract IDistributionContract", "name": "distributionContract", "type": "address" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "token", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "bytes", "name": "configData", "type": "bytes" },
      { "internalType": "bytes32", "name": "salt", "type": "bytes32" },
      { "internalType": "address", "name": "sender", "type": "address" }
    ],
    "name": "getAuctionAddress",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "auction", "type": "address" },
      { "indexed": false, "internalType": "address", "name": "token", "type": "address" },
      { "indexed": false, "internalType": "uint128", "name": "amount", "type": "uint128" },
      { "indexed": false, "internalType": "bytes", "name": "configData", "type": "bytes" }
    ],
    "name": "AuctionCreated",
    "type": "event"
  }
] as const

// ERC20 ABI
export const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
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
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  }
] as const

// Pyth ABI
export const PYTH_ABI = [
  {
    name: 'updatePriceFeeds',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: 'updateData', type: 'bytes[]' }],
    outputs: []
  },
  {
    name: 'getUpdateFee',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'updateData', type: 'bytes[]' }],
    outputs: [{ name: 'feeAmount', type: 'uint256' }]
  },
  {
    name: 'getPriceNoOlderThan',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'id', type: 'bytes32' },
      { name: 'age', type: 'uint256' }
    ],
    outputs: [
      { name: 'price', type: 'int64' },
      { name: 'conf', type: 'uint64' },
      { name: 'expo', type: 'int32' },
      { name: 'publishTime', type: 'uint256' }
    ]
  }
] as const

// ENS Registry ABI
export const ENS_REGISTRY_ABI = [
  {
    name: 'owner',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }]
  },
  {
    name: 'setSubnodeRecord',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'label', type: 'bytes32' },
      { name: 'owner', type: 'address' },
      { name: 'resolver', type: 'address' },
      { name: 'ttl', type: 'uint64' }
    ],
    outputs: []
  }
] as const

// ENS Resolver ABI
export const ENS_RESOLVER_ABI = [
  {
    name: 'setText',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'key', type: 'string' },
      { name: 'value', type: 'string' }
    ],
    outputs: []
  },
  {
    name: 'text',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'key', type: 'string' }
    ],
    outputs: [{ name: '', type: 'string' }]
  },
  {
    name: 'setAddr',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'a', type: 'address' }
    ],
    outputs: []
  },
  {
    name: 'addr',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'node', type: 'bytes32' }],
    outputs: [{ name: '', type: 'address' }]
  }
] as const

// CCTP Token Messenger ABI
export const CCTP_TOKEN_MESSENGER_ABI = [
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
  }
] as const

// CCTP Message Transmitter ABI
export const CCTP_MESSAGE_TRANSMITTER_ABI = [
  {
    name: 'receiveMessage',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'message', type: 'bytes' },
      { name: 'attestation', type: 'bytes' }
    ],
    outputs: [{ name: 'success', type: 'bool' }]
  }
] as const