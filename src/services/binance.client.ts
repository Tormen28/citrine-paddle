import type {
  BinanceAd,
  BinanceResponse,
  FilterInfo,
  P2PData,
  ProcessedAdvertisement,
  SnapshotResult,
  TradeType,
} from "@/types"
import {
  ASSET,
  BINANCE_P2P_URL,
  DEFAULT_MIN_ORDERS,
  DEFAULT_MIN_USDT_LIQUIDITY,
  FIAT,
} from "@/lib/constants"
import { cleanPrices } from "@/lib/price-stats"

interface FetchOptions {
  tradeType: TradeType
  minOrders?: number
  minUSDT?: number
  maxPages?: number
}

export class BinanceService {
  static async fetchP2PData(options: FetchOptions): Promise<P2PData> {
    const {
      tradeType,
      minOrders = DEFAULT_MIN_ORDERS,
      minUSDT = DEFAULT_MIN_USDT_LIQUIDITY,
      maxPages = 1,
    } = options

    const allItems: BinanceAd[] = []
    for (let page = 1; page <= maxPages; page++) {
      const params = new URLSearchParams({
        fiat: FIAT,
        asset: ASSET,
        tradeType,
        limit: "20",
        page: String(page),
      })

      const response = await fetch(`${BINANCE_P2P_URL}?${params}`, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
        cache: "no-store",
        signal: AbortSignal.timeout(30000),
      })

      if (!response.ok) {
        throw new Error(`Binance API returned ${response.status}`)
      }

      const body: BinanceResponse = await response.json()
      const items = body.data?.items ?? []
      if (items.length === 0) break
      allItems.push(...items)
    }

    const processedAds = this.processAds(allItems)
    const uniqueAds = this.removeDuplicates(processedAds)
    const filteredAds = this.filterAds(uniqueAds, minOrders, minUSDT)

    const finalAds =
      filteredAds.length >= 5
        ? filteredAds
        : this.fallbackToAll(uniqueAds)

    const prices = finalAds.map((ad) => ad.price)
    const cleaned = cleanPrices(prices)
    const minPrice = cleaned.min
    const maxPrice = cleaned.max

    const filterInfo: FilterInfo = {
      minOrders,
      totalCount: finalAds.length,
      verifiedCount: finalAds.filter((ad) => ad.advertiser.isVerified).length,
      usingAllAds: filteredAds.length < 5,
      totalAdsFound: uniqueAds.length,
      trimmedCount: cleaned.trimmedCount,
    }

    return {
      timestamp: new Date().toISOString(),
      tradeType,
      priceStats: {
        min: minPrice.toFixed(2),
        max: maxPrice.toFixed(2),
        spread: (maxPrice - minPrice).toFixed(2),
      },
      sampleSize: finalAds.length,
      advertisements: finalAds,
      filterInfo,
    }
  }

  private static processAds(ads: BinanceAd[]): ProcessedAdvertisement[] {
    return ads
      .map((ad) => {
        try {
          const price = ad.price
          const available = ad.tradableAmount
          const minLimit = ad.minTransAmount
          const maxLimit = ad.maxTransAmount
          const orderCount = ad.advertiser.monthOrderCount || 0
          const completionRate = ad.advertiser.monthFinishRate || 0

          return {
            advertiser: {
              nickName: ad.advertiser.nickName,
              monthOrderCount: orderCount,
              monthFinishRate: completionRate,
              positiveRate: ad.advertiser.positiveRate,
              userType: ad.advertiser.userType,
              isVerified:
                ad.advertiser.merchantGroupMember ||
                ad.advertiser.userType === "merchant",
            },
            price,
            available,
            limits: {
              min: minLimit,
              max: maxLimit,
              minInUSDT: minLimit / price,
              maxInUSDT: maxLimit / price,
            },
            payMethods: ad.tradeMethods,
            orderCount,
            completionRate,
            averageTime: ad.payTimeLimit || 0,
          }
        } catch {
          return null
        }
      })
      .filter((ad): ad is ProcessedAdvertisement => ad !== null)
  }

  private static removeDuplicates(
    ads: ProcessedAdvertisement[]
  ): ProcessedAdvertisement[] {
    return ads.filter(
      (ad, index, self) =>
        index ===
        self.findIndex(
          (a) =>
            a.advertiser.nickName === ad.advertiser.nickName &&
            Math.abs(a.price - ad.price) < 0.01
        )
    )
  }

  private static filterAds(
    ads: ProcessedAdvertisement[],
    minOrders: number,
    minUSDT: number
  ): ProcessedAdvertisement[] {
    return ads.filter(
      (ad) => ad.orderCount >= minOrders && ad.limits.maxInUSDT >= minUSDT
    )
  }

  private static fallbackToAll(
    ads: ProcessedAdvertisement[]
  ): ProcessedAdvertisement[] {
    return ads.sort((a, b) => b.orderCount - a.orderCount)
  }

  static async fetchSimpleSnapshot(): Promise<SnapshotResult> {
    const [sellData, buyData] = await Promise.all([
      this.fetchP2PData({ tradeType: "SELL" }),
      this.fetchP2PData({ tradeType: "BUY" }),
    ])

    const sellPrices = sellData.advertisements.map((ad) => ad.price)
    const buyPrices = buyData.advertisements.map((ad) => ad.price)

    const sellStats = cleanPrices(sellPrices)
    const buyStats = cleanPrices(buyPrices)

    const medianSell = sellStats.median
    const medianBuy = buyStats.median
    const spread = medianBuy - medianSell

    return {
      id: 0,
      timestamp: new Date(),
      buyPrice: Math.round(medianBuy * 100) / 100,
      sellPrice: Math.round(medianSell * 100) / 100,
      spread: Math.round(spread * 100) / 100,
      sellCount: sellPrices.length,
      buyCount: buyPrices.length,
    }
  }
}
