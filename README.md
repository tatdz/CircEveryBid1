
# CircEveryBid - Private Cross-Chain Auctions with dynamic MPS otimization and cross-chain deposits

## 🎯 Overview

CircEveryBid is a decentralized auction platform combining:
- **🔒 Uniswap v4** - Privacy-preserving CCA auctions with ZK sealed bids, Dynamic MPS optimization
- **🔵 Circle** - Multi-chain wallets, Gateway onboarding
- **🏅 ENS** - Reputation-based auction creation verification - serves as a ledger of initial auction data
- **⚡ Arc** - Gateway wallets on Arc (among other) used for bidding 
- **🔐 ZK Privacy** - Poseidon commitments with nullifier registry

### A key novel aspect of CircEverybid:

- CircEverybid monitors auction metrics every N blocks  
   - MPSMutator calculates optimization factor F based on:  
     - Price discovery progress (D)  
     - Bid concentration (HHI)  
     - Pyth price deviation (Δ)  
     - Market efficiency (E)  
   - Optimal steps are proposed 
   - Future token issuance is adjusted while preserving fairness  

## 🔍 Why Dynamic Market Participation Score (MPS) optimization needed

Uniswap's CCA requires auction creators to commit to a fixed supply schedule Q(t) before the auction starts (as described in the CCA whitepaper). This creates a fundamental trade-off:

- **Underpricing Risk:** If Q(t) releases tokens too quickly, the auction sells early at lower prices  
- **Overpricing Risk:** If Q(t) releases tokens too slowly, the auction may not sell all tokens  
- **Whale Dominance:** Large bidders can disproportionately influence clearing prices  
- **Price Manipulation:** Without external price references, auctions can deviate from fair market value  

The CCA documentation shows that price discovery happens through bid aggregation, but the mechanism has no way to adjust supply in response to revealed demand patterns.

CircEverybid introduces **Dynamic MPS Mutation/optimization** — a function family that maps live auction state into a multiplicative factor applied to future issuance steps, leaving already-cleared history untouched.

```
Clearing Price (from CCA Original whitepaper) = Highest price where: Σ(bid_amount_i) ≥ Q(t) × price
```

**CircEverybid enhancement:**
```
At checkpoint k: qₜⁿᵉʷ = qₜᵒˡᵈ × F(D, H, Δ, E)/100, ∀t > k
```

## 🎯 Price Improvement Potential

In prototype testing on Sepolia, Dynamic MPS Mutation demonstrated improvements in clearing price efficiency. The mechanism works by:

- Accelerating supply when discovery is slow (D < 400)  
- Decelerating supply when discovery is overheated (D > 800)  
- Dampening whale accumulation (H > 2500)  
- Throttling on price manipulation signals (Δ > 1500)  

## 👥 Benefits for Users

- ✅ For Auction Creators: higher expected revenue through better price alignment, reduced risk of underpricing or unsold tokens, external price validation via Pyth oracles  
- ✅ For Auction Participants (bidders): fairer distribution with anti-whale mechanisms  
- ✅ For the Uniswap Ecosystem: enhanced CCA utility without breaking compatibility, better liquidity bootstrapping for v4 pools  

### Architecture
Bid Flow (No v4 Hooks)
User Creates Bid -> Seal with Poseidon Hash -> Submit to PoseidonBidCommitment Contract -> ZK Verification -> Reveal at Auction End 

Dynamic MPS Optimization --> submit at least 2 sealed bids --> StepStorageReader contract reads CCA state for optimization --> Optimizer contract calculates real-time HHI based on bid distribution --> Fetch live ETH/USD prices from Pyth oracles --> Compute optimal tick spacing to maximize participation --> Submit MPS updates to the on-chain MPS Mutator contract

Cross-Chain CCTP Flow
Source Chain USDC -> Circle CCTP depositForBurn -> Attestation (~15 min) -> Destination Chain Mint
Supported: Ethereum Sepolia, Base Sepolia, Arbitrum Sepolia, OP Sepolia, Polygon Amoy

### Key Contracts 
POSEIDON_COMMITMENT: 0xea6C2C78992152e2Df1Df9aDeE962E6e4472cA28 - ZK bid commitments
OPTIMIZER: 0x5c930236D4f60cEC9E18bD1E9c26Da0977EB7F94 - Price optimization
MPS_MUTATOR: 0x7284bf89BB9CE144F9d723C61fb73343CC07c5B9 - MPS mutations
ENS_AUCTION_REGISTRY: 0xc9cb3111942e4cb5cD9550E04ee3901C6E4ce27b - ENS subdomains
FACTORY: 0x0000ccaDF55C911a2FbC0BB9d2942Aa77c6FAa1D - Auction creation

Circle Integration
Gateway: Wallet onboarding, use gateway wallet's USDC balance (Arc testnet, Base Sepolia, Ethereum Sepolia, etc) for bidding
CCTP: Cross-chain USDC transfers (9 supported chains)

ENS Integration
Namestone API for subdomain management 
Creates ENS subdomains for auctions created on circeverybid (subdomainname.circeverybid.eth), the ENS subdomain acts as a ledger for initial data of auction and saved as text record of the auction subdomain


## 🎯 Demo Flow

1. **Connect Wallet** → MetaMask on Sepolia
2. **Create Circle Wallet** → Tab 1: Circle Wallet
3. **Create Auction** → Tab 2: Set parameters & deploy
4. **Deposit USDC** → Tab 6: Cross-chain via CCTP
5. **Seal Bid** → Tab 5: Generate ZK commitment
6. **Submit Bid** → Tab 7: Submit sealed bid
7. **Monitor** → Tab 4: View auction progress

## 📊 Tech Stack

- **Frontend:** Next.js 15, React 18, TypeScript
- **Styling:** Tailwind CSS
- **Web3:** Viem 2.43, Wagmi 2.19
- **Uniswap:** continuous-clearing-auction
- **Circle:** @circle-fin/w3s-pw-web-sdk 1.1.11
- **Crypto:** poseidon-lite, libsodium
- **ENS** namestone API
- **Oracle:** Pyth Network

## 🔐 Security Features

### Nullifier Registry
- **File:** `lib/bid-sealing.ts`
- Prevents double-bidding
- localStorage-based tracking
- Per-auction nullifier sets

### ZK Commitments
- **File:** `lib/poseidon-lite.ts`
- Poseidon hash function
- Private bid amounts
- Verifiable proofs

## 🌐 Supported Chains

- Ethereum Sepolia (11155111)
- Arc Testnet (5042002) - Hub
- Base Sepolia (84532)
- Arbitrum Sepolia (421614)
- Optimism Sepolia (11155420)
- Polygon Amoy (80002)


## 🐛 Troubleshooting

### Transaction fails
- Check wallet has ETH for gas
- Verify contract addresses are correct
- Check network is Sepolia

### CCTP attestation timeout
- Wait 10-20 minutes for attestation
- Check Circle attestation service status

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- MetaMask or Web3 wallet
- Circle API credentials 
- save variables from .env.example:
//env.example
- CIRCLE_API_BASE_URL = "https://api.circle.com/v1/w3s"
- NEXT_PUBLIC_CIRCLE_APP_ID = "yourappid"
- CIRCLE_API_KEY="yourapikey"
- CIRCLE_ENTITY_SECRET="yoursecret"

- USDC_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
- EURC_ADDRESS = "0xE4920cDcC1a3417B6A1C9Ee37e5A83ef920cb0a9"
- NEXT_PUBLIC_CCTP_TOKEN_MESSENGER = "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5"
- NEXT_PUBLIC_CCTP_MESSAGE_TRANSMITTER = "0x7865fAfC2db2093669d92c0F33AeEF291086BEFD"
- NEXT_PUBLIC_STEP_READER_ADDRESS = "0x4e2E31970ec1c7B5b0309cB9e92EE498Dd9f6a24"
- NEXT_PUBLIC_OPTIMIZER_ADDRESS = "0x5c930236D4f60cEC9E18bD1E9c26Da0977EB7F94"
- NEXT_PUBLIC_MPS_MUTATOR = "0x7284bf89BB9CE144F9d723C61fb73343CC07c5B9"
- NEXT_PUBLIC_POSEIDON_COMMITMENT_ADDRESS = "0xea6C2C78992152e2Df1Df9aDeE962E6e4472cA28"
- NEXT_PUBLIC_PYTH_ADDRESS = "0xDd24F84d36BF92C65F92307595335bdFab5Bbd21"
- NEXT_PUBLIC_PYTH_ETH_USD = "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace"
- NEXT_PUBLIC_PYTH_USDC_USD = "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a"
- NEXT_PUBLIC_ENS_DOMAIN = "circeverybid.eth" or your domain 
- NEXT_PUBLIC_ENS_REGISTRY_ADDRESS = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e"
- NEXT_PUBLIC_ENS_PUBLIC_RESOLVER = "0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5"
- NEXT_PUBLIC_ENS_PARENT_NODE = "0x565770904a8958c98b502a492796a3c0286ef5341c4c8670a794368ab351ede"
- ARC_USDC = "0x3600000000000000000000000000000000000000"
- ARC_EURC = "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a"
- NEXT_PUBLIC_POSEIDON_T3 = "0x3333333C0A88F9BE4fd23ed0536F9B6c427e3B93"
- NEXT_PUBLIC_POSEIDON_T4 = "0x4443338EF595F44e0121df4C21102677B142ECF0"
- NEXT_PUBLIC_POSEIDON_T5 = "0x555333f3f677Ca3930Bf7c56ffc75144c51D9767"
- NEXT_PUBLIC_POSEIDON_T6 = "0x666333F371685334CdD69bdDdaFBABc87CE7c7Db"

- PRIVATE_KEY=yourkey

- ALCHEMY_ARC_SEPOLIA_URL=https://arc-testnet.g.alchemy.com/v2/-yourkey
- ALCHEMY_ETHEREUM_SEPOLIA_URL=https://eth-sepolia.g.alchemy.com/v2/-yourkey

### Installation

```bash
# Clone repository
git clone https://github.com/tatdz/CircEveryBid1
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.local.template .env.local
# Edit .env.local with your keys

# Run development server
npm run dev
```


## 📄 License

MIT
