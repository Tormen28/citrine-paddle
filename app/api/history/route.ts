import { NextResponse } from "next/server"
import { ScraperService } from "@/services/scraper.service"
import type { MarketSnapshotRow } from "@/services/scraper.service"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "8000") || 8000, 1), 50000)
    const parsedDownsample = parseInt(searchParams.get("downsample") || "")
    const downsample = Number.isFinite(parsedDownsample) ? parsedDownsample : undefined

    const snapshots = await ScraperService.getHistory(limit)

    let data = snapshots
    if (downsample && data.length > downsample) {
      const step = Math.ceil(data.length / downsample)
      const sampled: MarketSnapshotRow[] = []
      for (let i = 0; i < data.length; i += step) {
        sampled.push(data[i])
      }
      const last = data[data.length - 1]
      if (sampled[sampled.length - 1] !== last) {
        sampled.push(last)
      }
      data = sampled
    }

    const chartData = data.map((snap) => ({
      time: Math.floor(new Date(snap.timestamp).getTime() / 1000),
      buyPrice: snap.buyprice,
      sellPrice: snap.sellprice,
      spread: snap.spread,
      volume: snap.volume,
    }))

    return NextResponse.json({ success: true, data: chartData }, {
      headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10" },
    })
  } catch (error: unknown) {
    console.error("Error en /api/history:", error)
    const message = error instanceof Error ? error.message : "Error obteniendo el historial"
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
