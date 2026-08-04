"use client"

import { useState, useEffect, useMemo } from "react"

interface HistoryPoint {
  time: number
  buyPrice?: number
  sellPrice?: number
}

export interface Change24h {
  changePct: number
  trend: "up" | "down" | "stable"
  prices: number[]
}

function avg(p: HistoryPoint): number {
  return ((p.buyPrice ?? 0) + (p.sellPrice ?? 0)) / 2
}

export function use24hChange(): Change24h | null {
  const [history, setHistory] = useState<HistoryPoint[]>([])

  useEffect(() => {
    const controller = new AbortController()
    const fetchData = () => {
      fetch("/api/history?limit=288&downsample=288", { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.data) setHistory(data.data)
        })
        .catch(() => {
          /* ignora errores de polling */
        })
    }
    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => {
      controller.abort()
      clearInterval(interval)
    }
  }, [])

  return useMemo((): Change24h | null => {
    if (history.length < 2) return null
    const prices = history.map(avg)
    const valid = prices.filter((p) => p > 0)
    if (valid.length < 2) return null
    const first = valid[0]
    const last = valid[valid.length - 1]
    const changePct = ((last - first) / first) * 100
    const trend: "up" | "down" | "stable" = changePct > 0.1 ? "up" : changePct < -0.1 ? "down" : "stable"
    return { changePct, trend, prices: valid }
  }, [history])
}
