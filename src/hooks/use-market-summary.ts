"use client"

import { useMemo } from "react"
import { useBcv } from "@/hooks/use-bcv"
import type { Change24h } from "@/hooks/use-24h-change"

export type MarketTrend = "up" | "down" | "stable"

export interface MarketSentiment {
  momentum: string
  direction: string
  volLabel: string
}

export interface MarketSummary {
  trend: MarketTrend
  changePct: number
  volatility: number
  sentiment: MarketSentiment | null
  brecha: number | null
  bcv: number | null
  hasData: boolean
}

export function useMarketSummary(
  spark: number[],
  avgPrice: number,
  dbChange?: Change24h | null
): MarketSummary {
  const { latest: bcvLatest } = useBcv()

  const primarySeries = useMemo(() => {
    if (dbChange?.prices && dbChange.prices.length >= 2) return dbChange.prices
    return spark
  }, [dbChange, spark])

  const seriesStats = useMemo((): { changePct: number; trend: MarketTrend } | null => {
    if (primarySeries.length < 2) return null
    const first = primarySeries[0]
    const last = primarySeries[primarySeries.length - 1]
    const changePct = first > 0 ? ((last - first) / first) * 100 : 0
    const trend: MarketTrend = changePct > 0.1 ? "up" : changePct < -0.1 ? "down" : "stable"
    return { changePct, trend }
  }, [primarySeries])

  const trend: MarketTrend = dbChange?.trend ?? seriesStats?.trend ?? "stable"
  const changePct = dbChange?.changePct ?? seriesStats?.changePct ?? 0

  const volatility = useMemo(() => {
    if (primarySeries.length < 3) return 0
    const mean = primarySeries.reduce((a, b) => a + b, 0) / primarySeries.length
    const variance = primarySeries.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / primarySeries.length
    return Math.sqrt(variance) / mean
  }, [primarySeries])

  const seriesSummary = useMemo(() => {
    if (primarySeries.length < 2) return null
    const window = 8
    const recent = primarySeries.slice(-window)
    const prev = primarySeries.slice(-window * 2, -window)
    if (prev.length === 0) return null
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
    const prevAvg = prev.reduce((a, b) => a + b, 0) / prev.length
    const drift = prevAvg > 0 ? ((recentAvg - prevAvg) / prevAvg) * 100 : 0
    return { drift, recentAvg, prevAvg }
  }, [primarySeries])

  const sentiment = useMemo((): MarketSentiment | null => {
    if (!seriesStats || !seriesSummary) return null
    const { drift } = seriesSummary
    const momentum = drift >= 0.05 ? "acelerando" : drift <= -0.05 ? "desacelerando" : "sostenido"
    const direction = trend === "up" ? "al alza" : trend === "down" ? "a la baja" : "lateral"
    const volLabel = volatility > 0.008 ? "volatilidad elevada" : volatility > 0.004 ? "volatilidad moderada" : "baja volatilidad"
    return { momentum, direction, volLabel }
  }, [seriesStats, seriesSummary, trend, volatility])

  const brecha = useMemo(() => {
    if (!bcvLatest || avgPrice <= 0) return null
    return ((avgPrice - bcvLatest.usd_ves) / bcvLatest.usd_ves) * 100
  }, [bcvLatest, avgPrice])

  return {
    trend,
    changePct,
    volatility,
    sentiment,
    brecha,
    bcv: bcvLatest?.usd_ves ?? null,
    hasData: primarySeries.length >= 2,
  }
}
