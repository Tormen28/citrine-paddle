"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp } from "lucide-react"
import type { DataRange } from "@/lib/data-range"

interface SnapshotRow {
  time: number
  buyPrice: number
  sellPrice: number
  spread: number
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

export function TrendChart({ range }: { range: DataRange }) {
  const [history, setHistory] = useState<SnapshotRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewStart, setViewStart] = useState(0)
  const [viewEnd, setViewEnd] = useState(0)
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [isDraggingState, setIsDraggingState] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const lastMouseX = useRef(0)
  const zoomStateRef = useRef({ viewStart: 0, viewEnd: 0, total: 0 })

  const fetchData = useCallback(() => {
    const controller = new AbortController()
    const limit = range.limit ?? 50000
    const url = `/api/history?limit=${limit}${range.limit === null || range.limit > 8000 ? "&downsample=2000" : ""}`
    fetch(url, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setHistory((prev) => {
            const z = zoomStateRef.current
            const prevLen = prev.length > 0 ? prev.length : z.total
            if (prevLen > 0) {
              const ratio = z.viewEnd - z.viewStart > 0 ? (z.viewEnd - z.viewStart) / prevLen : 1
              const newLen = data.data.length
              const newViewLen = Math.max(5, Math.round(ratio * newLen))
              const newStart = Math.max(0, Math.round((z.viewStart / prevLen) * newLen))
              setViewStart(newStart)
              setViewEnd(Math.min(newLen, newStart + newViewLen))
            } else {
              setViewEnd(data.data.length)
            }
            return data.data
          })
        } else {
          setError("No data")
        }
        setIsLoading(false)
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError(err.message)
          setIsLoading(false)
        }
      })
    return controller
  }, [range])

  useEffect(() => {
    const controller = fetchData()
    const interval = setInterval(fetchData, 900000)
    return () => { controller.abort(); clearInterval(interval) }
  }, [fetchData])

  const allData = useMemo((): ChartDataPoint[] => {
    return history.map((item: any) => ({
      time: new Date(item.time * 1000).toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" }),
      timestamp: item.time,
      avg: ((item.buyPrice ?? item.buyprice) + (item.sellPrice ?? item.sellprice)) / 2,
      bestBid: item.sellPrice ?? item.sellprice ?? 0,
      bestAsk: item.buyPrice ?? item.buyprice ?? 0,
    }))
  }, [history])

  const chartData = useMemo(() => allData.slice(Math.max(0, viewStart), viewEnd), [allData, viewStart, viewEnd])

  const W = 900, H = 350
  const PAD = { top: 25, right: 20, bottom: 40, left: 65 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  useEffect(() => {
    zoomStateRef.current.viewStart = viewStart
    zoomStateRef.current.viewEnd = viewEnd
    zoomStateRef.current.total = allData.length
  })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const s = zoomStateRef.current
      const current = s.viewEnd - s.viewStart
      if (current < 3) return
      const step = Math.max(1, Math.floor(current * 0.15))
      const center = Math.floor((s.viewStart + s.viewEnd) / 2)
      const newLen = Math.max(5, current + (e.deltaY > 0 ? step : -step))
      const ns = Math.max(0, center - Math.floor(newLen / 2))
      const ne = Math.min(s.total, center + Math.ceil(newLen / 2))
      setViewStart(ns)
      setViewEnd(ne)
    }
    el.addEventListener("wheel", handler, { passive: false })
    return () => el.removeEventListener("wheel", handler)
  }, [allData.length])

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

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true
    setIsDraggingState(true)
    lastMouseX.current = e.clientX
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const relX = e.clientX - rect.left
    setMousePos({ x: relX, y: e.clientY - rect.top })

    const current = viewEnd - viewStart
    if (isDragging.current) {
      const dx = e.clientX - lastMouseX.current
      lastMouseX.current = e.clientX
      const candlePixels = (chartW * (rect.width / W)) / (current || 1)
      const candleDelta = Math.round(-dx / candlePixels)
      if (candleDelta !== 0) {
        const newStart = Math.max(0, Math.min(allData.length - current, viewStart + candleDelta))
        setViewStart(newStart)
        setViewEnd(newStart + current)
      }
      setHoverIdx(null)
      return
    }

    const svgX = (relX / rect.width) * W
    const gap = chartW / (current || 1)
    const idx = Math.floor((svgX - PAD.left) / gap)
    if (idx >= 0 && idx < chartData.length) setHoverIdx(idx)
    else setHoverIdx(null)
  }, [viewStart, viewEnd, chartData.length, allData.length, chartW])

  const handleMouseUp = useCallback(() => {
    isDragging.current = false
    setIsDraggingState(false)
  }, [])

  const handleMouseLeave = useCallback(() => {
    isDragging.current = false
    setIsDraggingState(false)
    setHoverIdx(null)
  }, [])

  const gridLines = 6
  const gridPrices = Array.from({ length: gridLines }, (_, i) => minPrice + (i / (gridLines - 1)) * (maxPrice - minPrice))

  if (isLoading && chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4 text-muted-foreground" />Tendencia USDT/VES</CardTitle></CardHeader>
        <CardContent className="pt-0"><Skeleton className="h-[350px] w-full rounded-xl" /></CardContent>
      </Card>
    )
  }

  if (error && chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4 text-muted-foreground" />Tendencia USDT/VES</CardTitle></CardHeader>
        <CardContent className="pt-0"><div className="h-[350px] flex items-center justify-center text-sm text-red-500">Error: {error}</div></CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4 text-muted-foreground" />Tendencia USDT/VES</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{chartData.length} de {allData.length} lecturas</p>
          </div>
          {latestPrice && (
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold tabular-nums tracking-tight">{latestPrice.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<span className="ml-1.5 text-sm font-medium text-muted-foreground">VES</span></span>
              {priceChange !== null && priceChangePercent !== null && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${priceChange >= 0 ? "bg-green-500/15 text-green-700 dark:text-green-300" : "bg-red-500/15 text-red-700 dark:text-red-300"}`}>
                  {priceChange >= 0 ? "+" : ""}{priceChangePercent.toFixed(2)}%
                </span>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div
          ref={containerRef}
          className="relative rounded-xl border bg-card/50 overflow-hidden shadow-inner"
          style={{ cursor: isDraggingState ? "grabbing" : "crosshair" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove as any}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full select-none" style={{ height: 350 }}>
            <defs>
              <linearGradient id="avgGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
              </linearGradient>
            </defs>
            {gridPrices.map((price, i) => (
              <g key={i}>
                <line x1={PAD.left} y1={scaleY(price)} x2={W - PAD.right} y2={scaleY(price)} stroke="#374151" strokeDasharray="3 3" strokeWidth={0.5} />
                <text x={PAD.left - 8} y={scaleY(price) + 4} fill="#9ca3af" fontSize={10} textAnchor="end">{price.toFixed(0)}</text>
              </g>
            ))}
            {chartData.map((d, i) => {
              const step = Math.max(1, Math.floor(chartData.length / 12))
              if (i % step !== 0) return null
              return <text key={i} x={scaleX(i)} y={H - 10} fill="#9ca3af" fontSize={10} textAnchor="middle">{d.time}</text>
            })}
            {chartData.length > 1 && (
              <>
                <polyline
                  points={chartData.map((d, i) => `${scaleX(i)},${scaleY(d.avg)}`).join(" ")}
                  fill="url(#avgGradient)"
                  stroke="none"
                />
                <polyline points={chartData.map((d, i) => `${scaleX(i)},${scaleY(d.bestBid)}`).join(" ")} fill="none" stroke="#22c55e" strokeWidth={1.5} />
                <polyline points={chartData.map((d, i) => `${scaleX(i)},${scaleY(d.bestAsk)}`).join(" ")} fill="none" stroke="#ef4444" strokeWidth={1.5} />
                <polyline points={chartData.map((d, i) => `${scaleX(i)},${scaleY(d.avg)}`).join(" ")} fill="none" stroke="#6366f1" strokeWidth={2} strokeDasharray="4 2" />
              </>
            )}
            {hoverIdx !== null && hoverIdx < chartData.length && (
              <g>
                <line x1={scaleX(hoverIdx)} y1={PAD.top} x2={scaleX(hoverIdx)} y2={H - PAD.bottom} stroke="#6b7280" strokeWidth={1} strokeDasharray="4 4" />
                <line x1={PAD.left} y1={scaleY(chartData[hoverIdx].avg)} x2={W - PAD.right} y2={scaleY(chartData[hoverIdx].avg)} stroke="#6b7280" strokeWidth={1} strokeDasharray="4 4" />
                <circle cx={scaleX(hoverIdx)} cy={scaleY(chartData[hoverIdx].bestBid)} r={4} fill="#22c55e" stroke="#fff" strokeWidth={1.5} />
                <circle cx={scaleX(hoverIdx)} cy={scaleY(chartData[hoverIdx].bestAsk)} r={4} fill="#ef4444" stroke="#fff" strokeWidth={1.5} />
                <circle cx={scaleX(hoverIdx)} cy={scaleY(chartData[hoverIdx].avg)} r={4} fill="#6366f1" stroke="#fff" strokeWidth={1.5} />
              </g>
            )}
          </svg>
{hoverIdx !== null && hoverIdx < chartData.length && (
              <div
                className="absolute z-50 pointer-events-none bg-popover/95 border rounded-xl p-3 shadow-2xl text-xs backdrop-blur-md"
                style={{ left: Math.min(mousePos.x + 15, (containerRef.current?.clientWidth ?? W) - 180), top: Math.max(mousePos.y - 120, 10) }}
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
                  <span className="font-mono text-right tabular-nums text-indigo-500">{chartData[hoverIdx].avg.toFixed(2)}</span>
                  <span className="text-muted-foreground">Spread</span>
                  <span className="font-mono text-right tabular-nums text-amber-500">{((chartData[hoverIdx].bestAsk - chartData[hoverIdx].bestBid) / chartData[hoverIdx].bestAsk * 100).toFixed(2)}%</span>
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm shadow-green-500/30" /><span>Mejor Compra</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/30" /><span>Mejor Venta</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/30" /><span>Promedio</span></div>
          <span className="text-[10px] text-muted-foreground/60 ml-2">Scroll=zoom · Arrastra</span>
        </div>
      </CardContent>
    </Card>
  )
}
