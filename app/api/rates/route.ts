import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const CRIPTOYA_URL = "https://evaxjsxrhmxoiqvmxxma.supabase.co/functions/v1/rates"

interface ExchangeRate {
  name: string
  ask: number
  bid: number
  spread: number
  spreadAbs: number
}

interface RatesResponse {
  timestamp: number
  rates: ExchangeRate[]
  bestBid: { exchange: string; price: number } | null
  bestAsk: { exchange: string; price: number } | null
  globalSpread: number
  avgPrice: number
  source: string
  error?: string
}

function calculateSpread(ask: number, bid: number): { spread: number; spreadAbs: number } {
  const spreadAbs = ask - bid
  const spread = (spreadAbs / ask) * 100
  return { spread: Math.round(spread * 100) / 100, spreadAbs: Math.round(spreadAbs * 1000) / 1000 }
}

export async function GET(): Promise<NextResponse<RatesResponse>> {
  try {
    const response = await fetch(CRIPTOYA_URL, {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const rawData = await response.json()

    const rates: ExchangeRate[] = []
    let bestBid: { exchange: string; price: number } | null = null
    let bestAsk: { exchange: string; price: number } | null = null
    let totalBid = 0
    let totalAsk = 0
    let count = 0

    for (const [exchange, data] of Object.entries(rawData)) {
      if (typeof data !== "object" || data === null) continue

      const exchangeData = data as { ask?: number; bid?: number }
      const ask = exchangeData.ask
      const bid = exchangeData.bid

      if (typeof ask !== "number" || typeof bid !== "number") continue
      if (ask <= 0 || bid <= 0) continue

      const { spread, spreadAbs } = calculateSpread(ask, bid)

      rates.push({
        name: exchange,
        ask,
        bid,
        spread,
        spreadAbs,
      })

      if (!bestBid || bid > bestBid.price) {
        bestBid = { exchange, price: bid }
      }
      if (!bestAsk || ask < bestAsk.price) {
        bestAsk = { exchange, price: ask }
      }

      totalBid += bid
      totalAsk += ask
      count++
    }

    const avgPrice = count > 0 ? (totalBid + totalAsk) / (count * 2) : 0
    const globalSpread = bestBid && bestAsk
      ? ((bestAsk.price - bestBid.price) / bestAsk.price) * 100
      : 0

    rates.sort((a, b) => b.bid - a.bid)

    return NextResponse.json({
      timestamp: Date.now(),
      rates,
      bestBid,
      bestAsk,
      globalSpread: Math.round(globalSpread * 100) / 100,
      avgPrice: Math.round(avgPrice * 1000) / 1000,
      source: "criptoya",
    }, {
      headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10" },
    })
  } catch (error) {
    console.error("Error fetching rates:", error)
    return NextResponse.json({
      timestamp: Date.now(),
      rates: [],
      bestBid: null,
      bestAsk: null,
      globalSpread: 0,
      avgPrice: 0,
      source: "criptoya",
      error: error instanceof Error ? error.message : "Unknown error",
    }, {
      headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10" },
    })
  }
}
