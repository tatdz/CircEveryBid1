// env.d.ts
declare namespace NodeJS {
  interface ProcessEnv {
    // Your environment variables
    NEXT_PUBLIC_STEP_READER_ADDRESS: `0x${string}`
    NEXT_PUBLIC_OPTIMIZER_ADDRESS: `0x${string}`
    NEXT_PUBLIC_MPS_MUTATOR: `0x${string}`
    NEXT_PUBLIC_POSEIDON_COMMITMENT_ADDRESS: `0x${string}`
    NEXT_PUBLIC_ENS_AUCTION_REGISTRY_ADDRESS: `0x${string}`
    NEXT_PUBLIC_HOOK_ADDRESS: `0x${string}`
    NEXT_PUBLIC_FACTORY_ADDRESS: `0x${string}`
    NEXT_PUBLIC_ENS_REGISTRY_ADDRESS: `0x${string}`
    NEXT_PUBLIC_ENS_PUBLIC_RESOLVER: `0x${string}`
    NEXT_PUBLIC_USDC_SEPOLIA: `0x${string}`
    NEXT_PUBLIC_PYTH_ADDRESS: `0x${string}`
  }
}