/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Transpile Circle SDK for compatibility
  transpilePackages: ['@circle-fin/w3s-pw-web-sdk'],
  
  // Turbopack configuration (replaces webpack for Next.js 16+)
  turbopack: {},
  
  // Webpack fallback (only used if explicitly running with --webpack flag)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        util: require.resolve('util'),
        buffer: require.resolve('buffer'),
      }
    }
    
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
      'pino-pretty': false,
    }
    
    return config
  },
  
  serverExternalPackages: [
    'libsodium-wrappers',
    'poseidon-lite',
  ],
  
  typescript: {
    ignoreBuildErrors: true,
  },
  // using next lint command instead
}

module.exports = nextConfig
