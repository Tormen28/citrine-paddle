"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ChartCandlestick } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DataRange } from "@/lib/data-range"

const GREEN = "#22c55e"
const RED = "#ef4444"

interface Candle {
  time: string
  open: number
  high: number
  low: number
  close: number
}

const TIMEFRAMES = [
  { label: "5m", value: "5m", group: "short" as const },
  { label: "10m", value: "10m", group: "short" as const },
  { label: "15m", value: "15m", group: "short" as const },
  { label: "30m", value: "30m", group: "short" as const },
  { label: "1h", value: "1h", group: "medium" as const },
  { label: "4h", value: "4h", group: "medium" as const },
  { label: "8h", value: "8h", group: "long" as const },
  { label: "24h", value: "24h", group: "long" as const },
]

function formatTime(timestamp: string, tf: string): string {
  const d = new Date(timestamp)
  if (["24h", "8h", "4h"].includes(tf)) {
    return d.toLocaleDateString("es-VE", { day: "2-digit", month: "short" })
  }
  return d.toLocaleTimeString("es-VE", { hour: "2-digit", minute: "2-digit" })
}

function formatDate(timestamp: string): string {
  const d = new Date(timestamp)
  return d.toLocaleDateString("es-VE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
}

export function CandleChart({ className, range }: { className?: string; range: DataRange }) {
  const [timeframe, setTimeframe] = useState("1h")
  const [candles, setCandles] = useState<Candle[]>([])
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

  useEffect(() => {
    zoomStateRef.current.viewStart = viewStart
    zoomStateRef.current.viewEnd = viewEnd
    zoomStateRef.current.total = candles.length
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
  }, [candles.length])

  const fetchCandles = useCallback(() => {
    const controller = new AbortController()
    const limit = range.limit ?? 50000
    fetch(`/api/candles?timeframe=${timeframe}&limit=${limit}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Error cargando velas")
        return res.json()
      })
      .then((data) => {
        const c = data.candles || []
        setError(null)
        setCandles((prev) => {
          const z = zoomStateRef.current
          const prevLen = prev.length > 0 ? prev.length : z.total
          if (prevLen > 0) {
            const ratio = z.viewEnd - z.viewStart > 0 ? (z.viewEnd - z.viewStart) / prevLen : 1
            const newViewLen = Math.max(5, Math.round(ratio * c.length))
            const newStart = Math.max(0, Math.round((z.viewStart / prevLen) * c.length))
            setViewStart(newStart)
            setViewEnd(Math.min(c.length, newStart + newViewLen))
          } else {
            setViewStart(0)
            setViewEnd(c.length)
          }
          return c
        })
        setIsLoading(false)
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError(err.message)
          setIsLoading(false)
        }
      })
    return controller
  }, [timeframe, range])

  useEffect(() => {
    setIsLoading(true)
    setError(null)
    const controller = fetchCandles()
    const interval = setInterval(fetchCandles, 60000)
    return () => { controller.abort(); clearInterval(interval) }
  }, [fetchCandles])

  const visibleCandles = useMemo(() => {
    return candles.slice(Math.max(0, viewStart), viewEnd)
  }, [candles, viewStart, viewEnd])

  const latest = visibleCandles.length > 0 ? visibleCandles[visibleCandles.length - 1] : null
  const first = visibleCandles.length > 0 ? visibleCandles[0] : null
  const change = latest && first && first.open > 0
    ? ((latest.close - first.open) / first.open) * 100
    : null

  const W = 900
  const H = 350
  const PAD = { top: 25, right: 65, bottom: 40, left: 10 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const minPrice = useMemo(() => {
    if (visibleCandles.length === 0) return 0
    return Math.min(...visibleCandles.map((c) => c.low)) * 0.998
  }, [visibleCandles])

  const maxPrice = useMemo(() => {
    if (visibleCandles.length === 0) return 0
    return Math.max(...visibleCandles.map((c) => c.high)) * 1.002
  }, [visibleCandles])

  const scaleY = useCallback((price: number) => {
    const range = maxPrice - minPrice || 1
    return PAD.top + chartH - ((price - minPrice) / range) * chartH
  }, [minPrice, maxPrice, chartH])

  const gap = chartW / (visibleCandles.length || 1)
  const candleW = Math.max(Math.floor(gap * 0.6), 3)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true
    setIsDraggingState(true)
    lastMouseX.current = e.clientX
    e.preventDefault()
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
        const newStart = Math.max(0, Math.min(candles.length - current, viewStart + candleDelta))
        setViewStart(newStart)
        setViewEnd(newStart + current)
      }
      setHoverIdx(null)
      return
    }

    const svgX = (relX / rect.width) * W
    const idx = Math.floor((svgX - PAD.left) / gap)
    if (idx >= 0 && idx < visibleCandles.length) {
      setHoverIdx(idx)
    } else {
      setHoverIdx(null)
    }
  }, [viewStart, viewEnd, gap, visibleCandles.length, candles.length, chartW])

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
  const gridPrices = Array.from({ length: gridLines }, (_, i) =>
    minPrice + (i / (gridLines - 1)) * (maxPrice - minPrice)
  )

  if (isLoading && visibleCandles.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ChartCandlestick className="h-4 w-4 text-muted-foreground" />
            Velas Japonesas
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0"><Skeleton className="h-[350px] w-full rounded-xl" /></CardContent>
      </Card>
    )
  }

  if (error && visibleCandles.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ChartCandlestick className="h-4 w-4 text-muted-foreground" />
            Velas Japonesas
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[350px] flex items-center justify-center text-sm text-red-500">Error: {error}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ChartCandlestick className="h-4 w-4 text-muted-foreground" />
              Velas Japonesas
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {visibleCandles.length} de {candles.length} velas · {timeframe}
            </p>
          </div>
          {latest && (
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold tabular-nums tracking-tight">
                {latest.close.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="ml-1.5 text-sm font-medium text-muted-foreground">VES</span>
              </span>
              {change !== null && (
                <span className={cn(
                  "text-xs font-semibold px-2 py-0.5 rounded-full",
                  change >= 0
                    ? "bg-green-500/15 text-green-700 dark:text-green-300"
                    : "bg-red-500/15 text-red-700 dark:text-red-300"
                )}>
                  {change >= 0 ? "+" : ""}{change.toFixed(2)}%
                </span>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-0.5 p-1 bg-muted/50 rounded-lg w-fit mb-4">
          {TIMEFRAMES.map((tf, i) => {
            const isActive = timeframe === tf.value
            const showDivider =
              (i > 0 && tf.group !== TIMEFRAMES[i - 1].group)
            return (
              <span key={tf.value} className="flex items-center">
                {showDivider && <span className="w-px h-4 bg-border mx-1" />}
                <button
                  onClick={() => setTimeframe(tf.value)}
                  className={cn(
                    "relative px-2.5 py-1.5 text-xs font-medium rounded-md transition-all duration-200",
                    isActive
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {tf.label}
                </button>
              </span>
            )
          })}
        </div>

        {visibleCandles.length === 0 ? (
          <div className="h-[350px] flex items-center justify-center text-muted-foreground">
            Sin datos para esta temporalidad
          </div>
        ) : (
          <div
            ref={containerRef}
            className="relative rounded-xl border bg-card/50 overflow-hidden shadow-inner"
            style={{ cursor: isDraggingState ? "grabbing" : "crosshair" }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
            <svg
              ref={svgRef}
              viewBox={`0 0 ${W} ${H}`}
              className="w-full select-none"
              style={{ height: 350 }}
            >
              {gridPrices.map((price, i) => (
                <g key={i}>
                  <line x1={PAD.left} y1={scaleY(price)} x2={W - PAD.right} y2={scaleY(price)} stroke="#374151" strokeDasharray="3 3" strokeWidth={0.5} />
                  <text x={W - PAD.right + 5} y={scaleY(price) + 4} fill="#9ca3af" fontSize={10}>{price.toFixed(0)}</text>
                </g>
              ))}

              {visibleCandles.map((c, i) => {
                const step = Math.max(1, Math.floor(visibleCandles.length / 12))
                if (i % step !== 0) return null
                const x = PAD.left + i * gap + gap / 2
                return (
                  <text key={i} x={x} y={H - 10} fill="#9ca3af" fontSize={10} textAnchor="middle">
                    {formatTime(c.time, timeframe)}
                  </text>
                )
              })}

              {visibleCandles.map((candle, i) => {
                const x = PAD.left + i * gap + gap / 2
                const isGreen = candle.close >= candle.open
                const color = isGreen ? GREEN : RED

                const highY = scaleY(candle.high)
                const lowY = scaleY(candle.low)
                const openY = scaleY(candle.open)
                const closeY = scaleY(candle.close)
                const bodyTop = Math.min(openY, closeY)
                const bodyH = Math.max(Math.abs(closeY - openY), 1.5)

                return (
                  <g key={i}>
                    <line x1={x} y1={highY} x2={x} y2={lowY} stroke={color} strokeWidth={1.5} />
                    <rect x={x - candleW / 2} y={bodyTop} width={candleW} height={bodyH} fill={color} stroke={color} strokeWidth={0.5} rx={1} />
                  </g>
                )
              })}

              {hoverIdx !== null && hoverIdx < visibleCandles.length && (
                <g>
                  <line x1={PAD.left} y1={scaleY(visibleCandles[hoverIdx].close)} x2={W - PAD.right} y2={scaleY(visibleCandles[hoverIdx].close)} stroke="#6b7280" strokeWidth={0.5} strokeDasharray="4 4" />
                  <line x1={PAD.left + hoverIdx * gap + gap / 2} y1={PAD.top} x2={PAD.left + hoverIdx * gap + gap / 2} y2={H - PAD.bottom} stroke="#6b7280" strokeWidth={1} strokeDasharray="4 4" />
                </g>
              )}
            </svg>

            {hoverIdx !== null && hoverIdx < visibleCandles.length && (
              <div
                className="absolute z-50 pointer-events-none bg-popover/95 border rounded-xl p-3 shadow-2xl text-xs backdrop-blur-md"
                style={{
                  left: Math.min(mousePos.x + 15, (containerRef.current?.clientWidth ?? W) - 180),
                  top: Math.max(mousePos.y - 120, 10),
                }}
              >
                <div className="text-muted-foreground mb-2 text-[10px] font-medium">
                  {formatDate(visibleCandles[hoverIdx].time)}
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  <span className="text-muted-foreground">Open</span>
                  <span className="font-mono text-right tabular-nums">{visibleCandles[hoverIdx].open.toFixed(2)}</span>
                  <span className="text-muted-foreground">High</span>
                  <span className="font-mono text-right tabular-nums text-green-500 font-medium">{visibleCandles[hoverIdx].high.toFixed(2)}</span>
                  <span className="text-muted-foreground">Low</span>
                  <span className="font-mono text-right tabular-nums text-red-500 font-medium">{visibleCandles[hoverIdx].low.toFixed(2)}</span>
                  <span className="text-muted-foreground">Close</span>
                  <span className={cn("font-mono text-right tabular-nums font-bold", visibleCandles[hoverIdx].close >= visibleCandles[hoverIdx].open ? "text-green-500" : "text-red-500")}>
                    {visibleCandles[hoverIdx].close.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 mt-3 text-xs text-muted-foreground px-1">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-green-500 shadow-sm shadow-green-500/30" />
              <span>Alcista</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-red-500 shadow-sm shadow-red-500/30" />
              <span>Bajista</span>
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground/60">
            Rueda para zoom · Arrastra para navegar
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
