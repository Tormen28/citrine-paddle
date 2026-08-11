import { NextResponse } from "next/server"
import { supabaseRest } from "@/lib/supabase"

export const dynamic = "force-dynamic"

interface BcvAnalysisRow {
  date: string
  usd_ves: number
  p2p_avg?: number | null
}

interface BcvCandle {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

async function fetchBcvAnalysisPaginated(days: number): Promise<BcvAnalysisRow[]> {
  let allRows: BcvAnalysisRow[] = []
  let offset = 0
  const limit = 1000

  while (true) {
    const page = await supabaseRest<BcvAnalysisRow[]>("rpc/get_bcv_analysis", {
      method: "POST",
      body: { p_days: days },
      query: { limit: String(limit), offset: String(offset) },
    })
    if (!page || page.length === 0) break
    allRows = allRows.concat(page)
    if (page.length < limit) break
    offset += limit
  }

  return allRows
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const parsedDays = parseInt(searchParams.get("days") || "90")
    const days = Number.isFinite(parsedDays) ? Math.min(Math.max(parsedDays, 1), 2000) : 90

    const rows = await fetchBcvAnalysisPaginated(days)

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "No BCV data available for the requested period" },
        { status: 404 }
      )
    }

    const sorted = [...rows].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )

    const candles: BcvCandle[] = sorted.map((row, i) => {
      const close = Number(row.usd_ves)
      const open = i > 0 ? sorted[i - 1]!.usd_ves : close
      const previousClose = Number(open)

      return {
        time: new Date(row.date).toISOString(),
        open: previousClose,
        high: Math.max(previousClose, close),
        low: Math.min(previousClose, close),
        close,
        volume: 0,
      }
    })

    return NextResponse.json({ success: true, candles }, {
      headers: {
        "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10",
      },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("Error en /api/bcv/candles:", msg)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
