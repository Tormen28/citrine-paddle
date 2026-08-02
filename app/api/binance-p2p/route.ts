import { NextResponse } from "next/server"
import { getCloudflareContext } from "@opennextjs/cloudflare"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tradeType = searchParams.get("tradeType") || "SELL"

    const { env } = getCloudflareContext()
    const cfEnv = env as Record<string, string | undefined>
    const SUPABASE_URL = cfEnv.SUPABASE_URL
    const SUPABASE_SECRET_KEY = cfEnv.SUPABASE_SECRET_KEY

    if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Missing env vars" },
        { status: 500 }
      )
    }

    // Proxy a la Edge Function en modo live
    // La Edge Function puede leer Binance (está en AWS), el Worker no
    const projectRef = SUPABASE_URL.replace("https://", "").split(".")[0]
    const edgeFunctionUrl = `https://${projectRef}.supabase.co/functions/v1/scraper?live=true`

    const response = await fetch(edgeFunctionUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(45000),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => "")
      throw new Error(`Edge Function error ${response.status}: ${errorText}`)
    }

    const data = await response.json()

    if (data.error) {
      throw new Error(data.error)
    }

    return NextResponse.json({
      timestamp: data.timestamp,
      tradeType,
      priceStats: data.priceStats,
      sampleSize: data.sampleSize,
      advertisements: data.advertisements,
      filterInfo: data.filterInfo,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("Error en /api/binance-p2p:", msg)
    return NextResponse.json(
      { error: "Error interno", detail: msg },
      { status: 500 }
    )
  }
}
