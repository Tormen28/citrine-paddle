import { NextResponse } from "next/server"
import { getCloudflareContext } from "@opennextjs/cloudflare"

export const dynamic = "force-dynamic"

interface MarketSnapshotRow {
  timestamp: string
  buyprice: number
}

interface RpcCandle {
  bucket: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface Candle {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

const TIMEFRAME_MS: Record<string, number> = {
  "5m": 5 * 60 * 1000,
  "10m": 10 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "30m": 30 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "4h": 4 * 60 * 60 * 1000,
  "8h": 8 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
}

function aggregateCandles(rows: MarketSnapshotRow[], timeframe: string) {
  const intervalMs = TIMEFRAME_MS[timeframe]
  if (!intervalMs) return []

  const sorted = [...rows].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  const buckets = new Map<number, MarketSnapshotRow[]>()

  for (const row of sorted) {
    const ts = new Date(row.timestamp).getTime()
    const bucketKey = Math.floor(ts / intervalMs) * intervalMs
    const bucket = buckets.get(bucketKey)
    if (bucket) {
      bucket.push(row)
    } else {
      buckets.set(bucketKey, [row])
    }
  }

  const candles: Candle[] = []

  for (const [bucketKey, bucketRows] of Array.from(buckets.entries())) {
    const open = bucketRows[0].buyprice
    const close = bucketRows[bucketRows.length - 1].buyprice
    let high = -Infinity
    let low = Infinity

    for (const r of bucketRows) {
      if (r.buyprice > high) high = r.buyprice
      if (r.buyprice < low) low = r.buyprice
    }

    candles.push({
      time: new Date(bucketKey).toISOString(),
      open,
      high,
      low,
      close,
      volume: 0,
    })
  }

  return candles
}

async function fetchRawRows(
  SUPABASE_URL: string,
  SUPABASE_SECRET_KEY: string,
  limit: number
): Promise<MarketSnapshotRow[]> {
  const BATCH_SIZE = 1000
  const allRows: MarketSnapshotRow[] = []
  let cursor: string | undefined

  while (allRows.length < limit) {
    const batchSize = Math.min(BATCH_SIZE, limit - allRows.length)
    const url = new URL(`${SUPABASE_URL}/rest/v1/marketsnapshot`)
    url.searchParams.set("select", "timestamp,buyprice")
    url.searchParams.set("order", "timestamp.desc")
    url.searchParams.set("limit", String(batchSize))
    if (cursor) {
      url.searchParams.set("timestamp", `lt.${cursor}`)
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        apikey: SUPABASE_SECRET_KEY,
        Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => "")
      throw new Error(`Supabase REST error ${response.status}: ${errorText}`)
    }

    const rows: MarketSnapshotRow[] = await response.json()
    if (!rows || rows.length === 0) break
    allRows.push(...rows)
    if (rows.length < batchSize) break
    cursor = rows[rows.length - 1].timestamp
  }

  return allRows.reverse()
}

async function fetchCandlesRPC(
  SUPABASE_URL: string,
  SUPABASE_SECRET_KEY: string,
  timeframe: string,
  limit: number
): Promise<Candle[]> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_candles`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SECRET_KEY,
      Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_timeframe: timeframe, p_limit: limit }),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => "")
    throw new Error(`get_candles RPC error ${response.status}: ${errorText}`)
  }

  const rows: RpcCandle[] = await response.json()
  return rows.map((row) => ({
    time: row.bucket,
    open: row.open,
    high: row.high,
    low: row.low,
    close: row.close,
    volume: row.volume,
  }))
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get("timeframe") || "1h"
    const parsedLimit = parseInt(searchParams.get("limit") || "8000")
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 50000) : 8000

    if (!TIMEFRAME_MS[timeframe]) {
      return NextResponse.json(
        { error: `Invalid timeframe "${timeframe}". Supported: ${Object.keys(TIMEFRAME_MS).join(", ")}` },
        { status: 400 }
      )
    }

    let SUPABASE_URL: string | undefined
    let SUPABASE_SECRET_KEY: string | undefined
    try {
      const { env } = getCloudflareContext()
      SUPABASE_URL = (env as Record<string, string>).SUPABASE_URL
      SUPABASE_SECRET_KEY = (env as Record<string, string>).SUPABASE_SECRET_KEY
    } catch {
      // Not in Cloudflare context
    }
    SUPABASE_URL = SUPABASE_URL || process.env.SUPABASE_URL
    SUPABASE_SECRET_KEY = SUPABASE_SECRET_KEY || process.env.SUPABASE_SECRET_KEY

    if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Missing SUPABASE_URL or SUPABASE_SECRET_KEY env vars" },
        { status: 500 }
      )
    }

    let candles: Candle[]

    try {
      candles = await fetchCandlesRPC(SUPABASE_URL, SUPABASE_SECRET_KEY, timeframe, limit)
    } catch (rpcErr) {
      console.error("Error en get_candles RPC, usando fallback:", rpcErr)
      const rows = await fetchRawRows(SUPABASE_URL, SUPABASE_SECRET_KEY, limit)
      candles = aggregateCandles(rows, timeframe)
    }

    return NextResponse.json(
      { candles, timeframe, limit },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10",
        },
      }
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("Error en /api/candles:", msg)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
