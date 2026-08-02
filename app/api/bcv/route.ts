import { NextResponse } from "next/server"
import { supabaseRest } from "@/lib/supabase"

export const dynamic = "force-dynamic"

interface BcvRateRow {
  date: string
  usd_ves: number
  updated_at?: string
}

interface MarketSnapshotRow {
  buyprice?: number | null
  sellprice?: number | null
  timestamp: string
}

interface BcvAnalysisRow {
  date: string
  usd_ves: number
  p2p_avg?: number | null
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function computeP2pRef(row: MarketSnapshotRow | null): number {
  if (!row) return 0
  if (typeof row.buyprice === "number") return row.buyprice
  if (typeof row.sellprice === "number") return row.sellprice
  return 0
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const history = searchParams.get("history") === "true"

    if (history) {
      const parsedDays = parseInt(searchParams.get("days") || "90")
      const days = Number.isFinite(parsedDays) ? Math.min(Math.max(parsedDays, 1), 365) : 90

      const rows = await supabaseRest<BcvAnalysisRow[]>("rpc/get_bcv_analysis", {
        method: "POST",
        body: { p_days: days },
      })

      const data = (rows ?? []).map((row) => {
        const usd_ves = Number(row.usd_ves)
        return {
          date: row.date,
          usd_ves,
          p2p: row.p2p_avg != null ? Number(row.p2p_avg) : null,
          brecha:
            row.p2p_avg != null && usd_ves > 0
              ? round2(((Number(row.p2p_avg) - usd_ves) / usd_ves) * 100)
              : null,
        }
      })

      return NextResponse.json({ success: true, data })
    }

    const [rateRows, snapshotRows] = await Promise.all([
      supabaseRest<BcvRateRow[]>("bcv_rates", {
        query: { select: "*", order: "date.desc", limit: "1" },
      }),
      supabaseRest<MarketSnapshotRow[]>("marketsnapshot", {
        query: { select: "buyprice,sellprice,timestamp", order: "timestamp.desc", limit: "1" },
      }),
    ])

    const latest = rateRows?.[0] ?? null
    const snapshot = snapshotRows?.[0] ?? null

    if (!latest) {
      return NextResponse.json({ success: false, error: "No BCV rate available yet" }, { status: 404 })
    }

    const usd_ves = Number(latest.usd_ves)
    const p2pRef = computeP2pRef(snapshot)
    const brecha =
      usd_ves > 0 && p2pRef > 0 ? round2(((p2pRef - usd_ves) / usd_ves) * 100) : 0

    return NextResponse.json({
      success: true,
      data: {
        date: latest.date,
        usd_ves,
        p2pRef,
        brecha,
        updated_at: latest.updated_at,
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("Error en /api/bcv:", msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
