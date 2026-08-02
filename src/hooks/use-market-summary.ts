"use client"

import { useMemo } from "react"
import { useBcv } from "@/hooks/use-bcv"

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

export function useMarketSummary(spark: number[], avgPrice: number): MarketSummary {
  const { latest: bcvLatest } = useBcv()

  const sparkStats = useMemo((): { changePct: number; trend: MarketTrend } | null => {
    if (spark.length < 2) return null
    const first = spark[0]
    const last = spark[spark.length - 1]
    const changePct = first > 0 ? ((last - first) / first) * 100 : 0
    const trend: MarketTrend = changePct > 0.1 ? "up" : changePct < -0.1 ? "down" : "stable"
    return { changePct, trend }
  }, [spark])

  const trend: MarketTrend = sparkStats?.trend ?? "stable"
  const changePct = sparkStats?.changePct ?? 0

  const volatility = useMemo(() => {
    if (spark.length < 3) return 0
    const mean = spark.reduce((a, b) => a + b, 0) / spark.length
    const variance = spark.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / spark.length
    return Math.sqrt(variance) / mean
  }, [spark])

  const sparkSummary = useMemo(() => {
    if (spark.length < 2) return null
    const window = 8
    const recent = spark.slice(-window)
    const prev = spark.slice(-window * 2, -window)
    if (prev.length === 0) return null
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
    const prevAvg = prev.reduce((a, b) => a + b, 0) / prev.length
    const drift = prevAvg > 0 ? ((recentAvg - prevAvg) / prevAvg) * 100 : 0
    return { drift, recentAvg, prevAvg }
  }, [spark])

  const sentiment = useMemo((): MarketSentiment | null => {
    if (!sparkStats || !sparkSummary) return null
    const { drift } = sparkSummary
    const momentum = drift >= 0.05 ? "acelerando" : drift <= -0.05 ? "desacelerando" : "sostenido"
    const direction = trend === "up" ? "al alza" : trend === "down" ? "a la baja" : "lateral"
    const volLabel = volatility > 0.008 ? "volatilidad elevada" : volatility > 0.004 ? "volatilidad moderada" : "baja volatilidad"
    return { momentum, direction, volLabel }
  }, [sparkStats, sparkSummary, trend, volatility])

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
    hasData: spark.length >= 2,
  }
}
