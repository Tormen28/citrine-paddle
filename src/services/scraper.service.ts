import { supabaseRest } from "@/lib/supabase"
import { BinanceService } from "./binance.client"
import { cleanPrices } from "@/lib/price-stats"

const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000

export interface MarketSnapshotRow {
  id: number
  timestamp: string
  buyprice: number
  sellprice: number
  spread: number
  medianbuy: number
  mediansell: number
  q1buy: number
  q3buy: number
  q1sell: number
  q3sell: number
  trimmedads: number
  volume: number | null
}

export class ScraperService {
  static roundTimestampToBucket(date: Date = new Date()): string {
    const bucket = Math.floor(date.getTime() / SNAPSHOT_INTERVAL_MS) * SNAPSHOT_INTERVAL_MS
    return new Date(bucket).toISOString()
  }

  static async saveSnapshot() {
    const [snapshot, sellData, buyData] = await Promise.all([
      BinanceService.fetchSimpleSnapshot(),
      BinanceService.fetchP2PData({ tradeType: "SELL", maxPages: 2 }),
      BinanceService.fetchP2PData({ tradeType: "BUY", maxPages: 2 }),
    ])

    const sellPrices = sellData.advertisements.map((ad) => ad.price)
    const buyPrices = buyData.advertisements.map((ad) => ad.price)
    const sellStats = cleanPrices(sellPrices)
    const buyStats = cleanPrices(buyPrices)

    const timestamp = this.roundTimestampToBucket()

    const payload = {
      timestamp,
      buyPrice: snapshot.buyPrice,
      sellPrice: snapshot.sellPrice,
      spread: snapshot.spread,
      medianBuy: buyStats.median,
      medianSell: sellStats.median,
      q1Buy: buyStats.q1,
      q3Buy: buyStats.q3,
      q1Sell: sellStats.q1,
      q3Sell: sellStats.q3,
      trimmedAds: sellStats.trimmedCount + buyStats.trimmedCount,
      volume: 0,
    }

    await supabaseRest<MarketSnapshotRow[]>("marketsnapshot", {
      method: "POST",
      body: payload,
      query: { on_conflict: "timestamp" },
      prefer: "resolution=merge-duplicates",
    })

    const trimmed = sellStats.trimmedCount + buyStats.trimmedCount
    console.log(
      `[Scraper] Snapshot upserted: Buy=${snapshot.buyPrice}, Sell=${snapshot.sellPrice}, Spread=${snapshot.spread}, trimmedAds=${trimmed}`
    )

    return { success: true, ...snapshot, timestamp }
  }

  static async getHistory(limit: number = 8000): Promise<MarketSnapshotRow[]> {
    const BATCH_SIZE = 1000
    const allRows: MarketSnapshotRow[] = []
    let cursor: string | undefined

    while (allRows.length < limit) {
      const batchSize = Math.min(BATCH_SIZE, limit - allRows.length)
      const query: Record<string, string> = {
        select: "*",
        order: "timestamp.desc",
        limit: String(batchSize),
      }
      if (cursor) {
        query.timestamp = `lt.${cursor}`
      }

      const rows = await supabaseRest<MarketSnapshotRow[]>("marketsnapshot", {
        method: "GET",
        query,
      })
      if (!rows || rows.length === 0) break
      allRows.push(...rows)
      if (rows.length < batchSize) break
      cursor = rows[rows.length - 1].timestamp
    }

    return allRows.reverse()
  }
}