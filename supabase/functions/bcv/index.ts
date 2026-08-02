// Supabase Edge Function — BCV Official Rate
// Deployed via: supabase functions deploy bcv --no-verify-jwt
// Triggered by cron webhook (no JWT required), writes with service role key

import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const BCV_API = "https://bcv.today/api/v1/rate.json"

// In-memory cache (BCV updates ~once/day, 30 min TTL is plenty)
let lastFetchTime = 0
const CACHE_TTL_MS = 30 * 60 * 1000
let cachedResult: Record<string, unknown> | null = null

interface BcvRate {
  USD?: number
  effective_date?: string
  date?: string
}

async function fetchBcv(): Promise<BcvRate> {
  const res = await fetch(BCV_API, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`BCV API returned ${res.status}`)
  return await res.json()
}

async function upsertRate(payload: Record<string, unknown>) {
  const url = `${SUPABASE_URL}/rest/v1/bcv_rates`
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify([payload]),
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`upsert bcv_rates failed ${res.status}: ${text}`)
  }
}

serve(async () => {
  try {
    const now = Date.now()

    // Use cache if fresh enough (avoid hammering the BCV API)
    if (cachedResult && (now - lastFetchTime) < CACHE_TTL_MS) {
      return new Response(
        JSON.stringify({ ...cachedResult, cached: true }),
        { headers: { "Content-Type": "application/json", "X-Cache": "HIT" } }
      )
    }

    const body = await fetchBcv()

    const usd = body.USD
    const effectiveDate = body.effective_date || body.date

    if (typeof usd !== "number" || !effectiveDate) {
      return new Response(
        JSON.stringify({ error: "BCV API response missing USD or effective_date" }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      )
    }

    const payload = {
      date: effectiveDate,
      usd_ves: usd,
      updated_at: new Date().toISOString(),
    }

    await upsertRate(payload)

    cachedResult = { ok: true, date: effectiveDate, usd_ves: usd, updated_at: payload.updated_at }
    lastFetchTime = now

    return new Response(
      JSON.stringify(cachedResult),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
