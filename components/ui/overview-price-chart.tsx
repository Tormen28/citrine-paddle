"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp } from "lucide-react"
import { RANGE_OPTIONS, DEFAULT_RANGE } from "@/lib/data-range"
import type { DataRange } from "@/lib/data-range"

interface SnapshotRow {
  time: number
  buyPrice?: number
  sellPrice?: number
}

interface ChartDataPoint {
  time: string
  timestamp: number
  avg: number
  bestBid: number
  bestAsk: number
}

function formatTooltipTime(epoch: number): string {
  const d = new Date(epoch * 1000)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })
  }
  return d.toLocaleDateString("es-VE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
}

export function OverviewPriceChart() {
  const [range, setRange] = useState<DataRange>(DEFAULT_RANGE)
  const [history, setHistory] = useState<SnapshotRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const fetchData = useCallback((signal: AbortSignal, initial: boolean) => {
    const limit = range.limit ?? 50000
    const downsample = range.limit === null || range.limit > 8000 ? 600 : 400
    const url = `/api/history?limit=${limit}&downsample=${downsample}`
    if (initial) {
      setIsLoading(true)
      setError(null)
    }
    fetch(url, { signal })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setHistory(data.data)
        } else if (initial) {
          setError("No data")
        }
        setIsLoading(false)
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          if (initial) setError(err.message)
          setIsLoading(false)
        }
      })
  }, [range])

  useEffect(() => {
    const controller = new AbortController()
    fetchData(controller.signal, true)
    const interval = setInterval(() => {
      fetchData(controller.signal, false)
    }, 900000)
    return () => {
      controller.abort()
      clearInterval(interval)
    }
  }, [fetchData])

  const chartData = useMemo((): ChartDataPoint[] => {
    return history.map((item: any) => ({
      time: new Date(item.time * 1000).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" }),
      timestamp: item.time,
      avg: ((item.buyPrice ?? item.buyprice) + (item.sellPrice ?? item.sellprice)) / 2,
      bestBid: item.sellPrice ?? item.sellprice ?? 0,
      bestAsk: item.buyPrice ?? item.buyprice ?? 0,
    }))
  }, [history])

  const W = 900
  const H = 220
  const PAD = { top: 16, right: 16, bottom: 28, left: 56 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const minPrice = useMemo(() => {
    if (chartData.length === 0) return 0
    const prices = chartData.flatMap((d) => [d.bestBid, d.bestAsk, d.avg]).filter((p) => p > 0)
    if (prices.length === 0) return 0
    return Math.min(...prices) * 0.998
  }, [chartData])

  const maxPrice = useMemo(() => {
    if (chartData.length === 0) return 0
    const prices = chartData.flatMap((d) => [d.bestBid, d.bestAsk, d.avg]).filter((p) => p > 0)
    if (prices.length === 0) return 0
    return Math.max(...prices) * 1.002
  }, [chartData])

  const scaleY = useCallback((price: number) => PAD.top + chartH - ((price - minPrice) / (maxPrice - minPrice || 1)) * chartH, [minPrice, maxPrice, chartH])
  const scaleX = useCallback((idx: number) => PAD.left + (idx / (chartData.length || 1)) * chartW + (chartW / (chartData.length || 1)) / 2, [chartW, chartData.length])

  const latestPrice = chartData.length > 0 ? chartData[chartData.length - 1].avg : null
  const firstPrice = chartData.length > 0 ? chartData[0].avg : null
  const priceChange = latestPrice && firstPrice ? latestPrice - firstPrice : null
  const priceChangePercent = latestPrice && firstPrice && firstPrice > 0 ? ((latestPrice - firstPrice) / firstPrice) * 100 : null

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const svg = svgRef.current
    if (!svg || chartData.length === 0) return
    const rect = svg.getBoundingClientRect()
    const relX = e.clientX - rect.left
    setMousePos({ x: relX, y: e.clientY - rect.top })
    const svgX = (relX / rect.width) * W
    const gap = chartW / chartData.length
    const idx = Math.floor((svgX - PAD.left) / gap)
    if (idx >= 0 && idx < chartData.length) setHoverIdx(idx)
    else setHoverIdx(null)
  }, [chartData.length])

  const handleMouseLeave = useCallback(() => setHoverIdx(null), [])

  const gridLines = 5
  const gridPrices = Array.from({ length: gridLines }, (_, i) => minPrice + (i / (gridLines - 1)) * (maxPrice - minPrice))

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Precio USDT/VES
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Evolución en {chartData.length} lecturas de la base
            </p>
          </div>
          <div className="flex items-center gap-3">
            {latestPrice !== null && (
              <>
                <span className="text-xl font-bold tabular-nums tracking-tight">
                  {latestPrice.toLocaleString("es-VE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  <span className="ml-1.5 text-sm font-medium text-muted-foreground">VES</span>
                </span>
                {priceChange !== null && priceChangePercent !== null && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${priceChange >= 0 ? "bg-green-500/15 text-green-700 dark:text-green-300" : "bg-red-500/15 text-red-700 dark:text-red-300"}`}>
                    {priceChange >= 0 ? "+" : ""}
                    {priceChangePercent.toFixed(2)}%
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex gap-1 p-1 bg-muted rounded-lg overflow-x-auto w-fit mb-3">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => setRange(option)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                range.id === option.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {isLoading && chartData.length === 0 ? (
          <Skeleton className="h-[220px] w-full rounded-xl" />
        ) : error && chartData.length === 0 ? (
          <div className="h-[220px] flex items-center justify-center text-sm text-red-500">
            Error: {error}
          </div>
        ) : (
          <div
            ref={containerRef}
            className="relative rounded-xl border bg-card/50 overflow-hidden shadow-inner"
            style={{ cursor: "crosshair" }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full select-none" style={{ height: 220 }}>
              <defs>
                <linearGradient id="ovAvgGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff6811" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#ff6811" stopOpacity="0" />
                </linearGradient>
              </defs>
              {gridPrices.map((price, i) => (
                <g key={i}>
                  <line x1={PAD.left} y1={scaleY(price)} x2={W - PAD.right} y2={scaleY(price)} stroke="#374151" strokeDasharray="3 3" strokeWidth={0.5} />
                  <text x={PAD.left - 8} y={scaleY(price) + 4} fill="#9ca3af" fontSize={10} textAnchor="end">
                    {price.toFixed(0)}
                  </text>
                </g>
              ))}
              {chartData.map((d, i) => {
                const step = Math.max(1, Math.floor(chartData.length / 8))
                if (i % step !== 0) return null
                return (
                  <text key={i} x={scaleX(i)} y={H - 8} fill="#9ca3af" fontSize={10} textAnchor="middle">
                    {d.time}
                  </text>
                )
              })}
              {chartData.length > 1 && (
                <>
                  <polyline
                    points={chartData.map((d, i) => `${scaleX(i)},${scaleY(d.avg)}`).join(" ")}
                    fill="url(#ovAvgGradient)"
                    stroke="none"
                  />
                  <polyline points={chartData.map((d, i) => `${scaleX(i)},${scaleY(d.avg)}`).join(" ")} fill="none" stroke="#ff6811" strokeWidth={2} />
                </>
              )}
              {hoverIdx !== null && hoverIdx < chartData.length && (
                <g>
                  <line x1={scaleX(hoverIdx)} y1={PAD.top} x2={scaleX(hoverIdx)} y2={H - PAD.bottom} stroke="#6b7280" strokeWidth={1} strokeDasharray="4 4" />
                  <circle cx={scaleX(hoverIdx)} cy={scaleY(chartData[hoverIdx].avg)} r={4} fill="#ff6811" stroke="#fff" strokeWidth={1.5} />
                </g>
              )}
            </svg>
            {hoverIdx !== null && hoverIdx < chartData.length && (
              <div
                className="absolute z-50 pointer-events-none bg-popover/95 border rounded-xl p-3 shadow-2xl text-xs backdrop-blur-md"
                style={{
                  left: Math.min(mousePos.x + 15, (containerRef.current?.clientWidth ?? W) - 170),
                  top: Math.max(mousePos.y - 110, 10),
                }}
              >
                <div className="text-muted-foreground mb-2 text-[10px] font-medium">
                  {formatTooltipTime(chartData[hoverIdx].timestamp)}
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  <span className="text-muted-foreground">Compra</span>
                  <span className="font-mono text-right tabular-nums text-green-500">{chartData[hoverIdx].bestBid.toFixed(2)}</span>
                  <span className="text-muted-foreground">Venta</span>
                  <span className="font-mono text-right tabular-nums text-red-500">{chartData[hoverIdx].bestAsk.toFixed(2)}</span>
                  <span className="text-muted-foreground">Prom</span>
                  <span className="font-mono text-right tabular-nums text-[#ff6811]">{chartData[hoverIdx].avg.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-center gap-x-6 gap-y-2 mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ff6811] shadow-sm shadow-[#ff6811]/30" />
            <span>Promedio</span>
          </div>
          <span className="text-[10px] text-muted-foreground/60">Pasa el cursor para ver el detalle</span>
        </div>
      </CardContent>
    </Card>
  )
}
