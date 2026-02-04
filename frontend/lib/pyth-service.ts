// lib/pyth-service.ts
import { type Hex } from 'viem'

// Pyth feed IDs
export const PYTH_FEED_IDS = {
  ETH_USD: '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  USDC_USD: '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
  EURC_USD: '0x76fa85158bf14ede77087fe3ae472f66213f6ea2f5b411cb2de472794990fa5c',
} as const

export type PythFeedId = typeof PYTH_FEED_IDS[keyof typeof PYTH_FEED_IDS]

class PythService {
  private baseUrl = 'https://hermes.pyth.network'

  private base64ToHex(base64: string): Hex {
    try {
      const cleanBase64 = base64.replace(/\s/g, '')
      const raw = atob(cleanBase64)
      let hex = ''
      for (let i = 0; i < raw.length; i++) {
        const hexChar = raw.charCodeAt(i).toString(16).padStart(2, '0')
        hex += hexChar
      }
      return `0x${hex}` as Hex
    } catch (error) {
      console.error('Base64 to hex conversion failed:', error)
      return '0x01' as Hex
    }
  }

  async getPriceUpdateData(feedIds: string[]): Promise<Hex[]> {
    try {
      const params = new URLSearchParams()
      feedIds.forEach(id => params.append('ids[]', id))
      
      console.log('📡 Fetching Pyth price update data...', feedIds)
      
      const response = await fetch(`${this.baseUrl}/api/latest_vaas?${params}`, {
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-cache'
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const vaaData = await response.json() as string[]
      
      if (!Array.isArray(vaaData) || vaaData.length === 0) {
        throw new Error('No VAA data received')
      }
      
      const hexVaas = vaaData
        .filter(vaa => vaa && vaa.length > 0)
        .map(vaa => this.base64ToHex(vaa))
        .filter(hex => hex.length > 10)
      
      console.log('✅ Pyth data fetched:', hexVaas.length, 'VAAs')
      
      return hexVaas
    } catch (error: any) {
      console.error('❌ Pyth VAA fetch failed:', error)
      throw new Error(`Failed to fetch Pyth data: ${error.message}`)
    }
  }

  async getLatestPrice(feedId: string): Promise<{
    price: number
    confidence: number
    timestamp: number
  }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/latest_price_feeds?ids[]=${feedId}`,
        { cache: 'no-cache' }
      )
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data = await response.json()
      
      if (!data || data.length === 0) {
        throw new Error('No price data')
      }
      
      const feed = data[0]
      const price = Number(feed.price.price) * Math.pow(10, feed.price.expo)
      const confidence = Number(feed.price.conf) * Math.pow(10, feed.price.expo)
      
      return {
        price,
        confidence,
        timestamp: feed.price.publish_time
      }
    } catch (error: any) {
      console.error('Failed to fetch price:', error)
      // Return fallback price
      return {
        price: feedId === PYTH_FEED_IDS.ETH_USD ? 2500 : 1,
        confidence: 1,
        timestamp: Math.floor(Date.now() / 1000)
      }
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'HEAD',
        cache: 'no-cache'
      })
      return response.ok
    } catch {
      return false
    }
  }
}

export const pythService = new PythService()