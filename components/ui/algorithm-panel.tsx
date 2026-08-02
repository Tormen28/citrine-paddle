"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  Zap,
  Activity,
  BarChart3,
  Clock,
  Database,
  Target,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react"
import type { AlgorithmMetrics } from "@/hooks/use-rates"
import type { DataRange } from "@/lib/data-range"

interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
}

interface HistoryStats {
  totalSnapshots: number
  oldestTime: string
  newestTime: string
  avgPrice: number
  minPrice: number
  maxPrice: number
  priceRangePercent: number
}

interface AlgorithmPanelProps {
  metrics: AlgorithmMetrics
  isLoading: boolean
  range: DataRange
}

function formatExchangeName(name: string): string {
  const names: Record<string, string> = {
    binancep2p: "Binance",
    okexp2p: "OKX",
    bybitp2p: "Bybit",
    bitgetp2p: "Bitget",
    bingxp2p: "BingX",
    mexcp2p: "MEXC",
    coinexp2p: "CoinEx",
    saldo: "Saldo",
  }
  return names[name] || name
}

function formatPrice(price: number): string {
  return price.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function AlgorithmPanel({ metrics, isLoading, range }: AlgorithmPanelProps) {
  const [analysis, setAnalysis] = useState({
    rsi: 50,
    ma5: 0,
    ma20: 0,
    scenario: "Lateral",
  })
  const [historyStats, setHistoryStats] = useState<HistoryStats | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [dataError, setDataError] = useState<string | null>(null)

  // Fetch candle data for RSI/MA analysis (auto-refresh every 60s)
  useEffect(() => {
    let controller = new AbortController()

    const fetchData = () => {
      controller.abort()
      controller = new AbortController()

      fetch(`/api/candles?timeframe=1h&limit=${range.limit ?? 50000}`, { signal: controller.signal })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          return res.json()
        })
        .then((data: { candles: Candle[] }) => {
          const closes = data.candles.map((c) => c.close)
          const rsi = calculateRSI(closes, 14)
          const ma5 = calculateMA(closes, 5)
          const ma20 = calculateMA(closes, 20)
          let scenario = "Lateral"
          if (rsi > 70 && ma5 > ma20) scenario = "Posible correccion bajista (Sobrecompra)"
          else if (rsi > 70 && ma5 < ma20) scenario = "Sobrecompra sin impulso (Agotamiento)"
          else if (rsi < 30 && ma5 < ma20) scenario = "Posible rebote alcista (Sobreventa)"
          else if (ma5 > ma20) scenario = "Tendencia Alcista"
          else if (ma5 < ma20) scenario = "Tendencia Bajista"

          setAnalysis({ rsi, ma5, ma20, scenario })
          setAnalysisError(null)
        })
        .catch((err) => {
          if (err.name !== "AbortError") {
            setAnalysisError("No se pudo cargar el analisis tecnico")
          }
        })
    }

    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => { controller.abort(); clearInterval(interval) }
  }, [range])

  // Fetch historical data stats (auto-refresh every 60s)
  useEffect(() => {
    let controller = new AbortController()

    const fetchData = () => {
      controller.abort()
      controller = new AbortController()

      const limit = range.limit ?? 50000
      const url = `/api/history?limit=${limit}${range.limit === null || range.limit > 8000 ? "&downsample=2000" : ""}`
      fetch(url, { signal: controller.signal })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          return res.json()
        })
        .then((data: { success: boolean; data: Array<{ time: number; buyPrice: number; sellPrice: number; spread: number }> }) => {
          if (!data.success || !data.data || data.data.length === 0) {
            setHistoryStats(null)
            return
          }
          const rows = data.data
          const prices = rows.flatMap((r) => [r.buyPrice, r.sellPrice]).filter((p) => p > 0)
          const oldest = new Date(rows[0].time * 1000)
          const newest = new Date(rows[rows.length - 1].time * 1000)
          const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length
          const minPrice = Math.min(...prices)
          const maxPrice = Math.max(...prices)
          const rangeP = minPrice > 0 ? ((maxPrice - minPrice) / minPrice) * 100 : 0

          setHistoryStats({
            totalSnapshots: rows.length,
            oldestTime: oldest.toLocaleString("es-VE", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            }),
            newestTime: newest.toLocaleString("es-VE", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            }),
            avgPrice,
            minPrice,
            maxPrice,
            priceRangePercent: rangeP,
          })
          setDataError(null)
        })
        .catch((err) => {
          if (err.name !== "AbortError") {
            setDataError("Error cargando historial")
          }
        })
    }

    fetchData()
    const interval = setInterval(fetchData, 60000)
    return () => { controller.abort(); clearInterval(interval) }
  }, [range])

  if (isLoading && !metrics) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Analisis Algoritmico
          </CardTitle>
          <CardDescription className="text-xs">Datos calculados en tiempo real</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const TrendIcon = metrics.trend === "up" ? TrendingUp : metrics.trend === "down" ? TrendingDown : Minus
  const trendColor = metrics.trend === "up" ? "text-green-600 dark:text-green-400" : metrics.trend === "down" ? "text-red-600 dark:text-red-400" : "text-yellow-600 dark:text-yellow-400"
  const trendLabel = metrics.trend === "up" ? "Subiendo" : metrics.trend === "down" ? "Bajando" : "Estable"

  let overallSignal = "Neutral"
  let signalColor = "text-yellow-600 dark:text-yellow-400"
  let signalIcon = <Minus className="h-4 w-4" />
  if (analysis.rsi > 70 && analysis.ma5 < analysis.ma20) {
    overallSignal = "Agotamiento"
    signalColor = "text-amber-600 dark:text-amber-400"
    signalIcon = <AlertTriangle className="h-4 w-4" />
  } else if (analysis.rsi > 70) {
    overallSignal = "Sobrecompra"
    signalColor = "text-red-600 dark:text-red-400"
    signalIcon = <AlertTriangle className="h-4 w-4" />
  } else if (analysis.rsi < 30) {
    overallSignal = "Sobreventa"
    signalColor = "text-green-600 dark:text-green-400"
    signalIcon = <Target className="h-4 w-4" />
  } else if (analysis.ma5 > analysis.ma20 && metrics.trend === "up") {
    overallSignal = "Alcista"
    signalColor = "text-green-600 dark:text-green-400"
    signalIcon = <TrendingUp className="h-4 w-4" />
  } else if (analysis.ma5 < analysis.ma20 && metrics.trend === "down") {
    overallSignal = "Bajista"
    signalColor = "text-red-600 dark:text-red-400"
    signalIcon = <TrendingDown className="h-4 w-4" />
  }

  const metricCard = (icon: React.ReactNode, label: string, value: string, color: string, sub: string) => (
    <div className="p-3.5 rounded-xl border bg-gradient-to-b from-card to-muted/20 transition-transform hover:-translate-y-0.5">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-xl font-bold tabular-nums ${color}`}>{value}</div>
      <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>
    </div>
  )

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-muted-foreground" />
          Analisis Algoritmico
        </CardTitle>
        <CardDescription className="text-xs">
          {historyStats
            ? `${historyStats.totalSnapshots} snapshots guardados en Supabase`
            : "Cargando datos historicos..."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* ─── Corto plazo · 5 min ─── */}
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Corto plazo · 5 min</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {metricCard(
              <TrendingUp className="h-3.5 w-3.5" />,
              "Tendencia",
              trendLabel,
              trendColor,
              `${metrics.trendStrength.toFixed(0)}% senales positivas`
            )}
            {metricCard(
              <BarChart3 className="h-3.5 w-3.5" />,
              "Volatilidad",
              `${metrics.volatility.toFixed(2)}%`,
              metrics.volatility > 3 ? "text-red-600 dark:text-red-400" : metrics.volatility > 1 ? "text-yellow-600 dark:text-yellow-400" : "text-green-600 dark:text-green-400",
              metrics.volatility > 3 ? "Alta" : metrics.volatility > 1 ? "Media" : "Baja"
            )}
            {metricCard(
              <Clock className="h-3.5 w-3.5" />,
              "Promedio (MA)",
              metrics.movingAverage > 0 ? formatPrice(metrics.movingAverage) : "--",
              "text-foreground",
              "VES/USDT"
            )}
            {metricCard(
              <Activity className="h-3.5 w-3.5" />,
              "Cambio",
              metrics.priceChange !== 0 ? `${metrics.priceChange > 0 ? "+" : ""}${metrics.priceChangePercent.toFixed(2)}%` : "--",
              metrics.priceChange > 0 ? "text-green-600 dark:text-green-400" : metrics.priceChange < 0 ? "text-red-600 dark:text-red-400" : "text-foreground",
              "vs lectura anterior"
            )}
          </div>
        </div>

        {/* ─── Medio plazo · 1h ─── */}
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Medio plazo · 1h</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {metricCard(
              <Minus className="h-3.5 w-3.5" />,
              "RSI (14)",
              analysis.rsi.toFixed(2),
              analysis.rsi > 70 ? "text-red-600 dark:text-red-400" : analysis.rsi < 30 ? "text-green-600 dark:text-green-400" : "text-foreground",
              analysis.rsi > 70 ? "Sobrecompra" : analysis.rsi < 30 ? "Sobreventa" : "Neutral"
            )}
            {metricCard(
              <ArrowRight className="h-3.5 w-3.5" />,
              "Senal MA",
              analysis.ma5 > analysis.ma20 ? "Alcista" : "Bajista",
              analysis.ma5 > analysis.ma20 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400",
              `MA5: ${formatPrice(analysis.ma5)} vs MA20: ${formatPrice(analysis.ma20)}`
            )}
            {metricCard(
              <BarChart3 className="h-3.5 w-3.5" />,
              "Escenario",
              analysis.scenario,
              "text-foreground",
              "Proximas horas"
            )}
            {metricCard(
              signalIcon,
              "Senal General",
              overallSignal,
              signalColor,
              metrics.volatility < 1 ? "Baja liquidacion — senal atenuada" : ""
            )}
          </div>
        </div>

        {historyStats && (
          <div className="p-4 rounded-xl border bg-gradient-to-b from-card to-muted/20">
            <div className="flex items-center gap-2 mb-3">
              <Database className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Datos Guardados</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5 text-xs">
              <div>
                <span className="text-muted-foreground">Snapshots:</span>
                <span className="ml-2 font-bold tabular-nums">{historyStats.totalSnapshots}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Desde:</span>
                <span className="ml-2">{historyStats.oldestTime}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Hasta:</span>
                <span className="ml-2">{historyStats.newestTime}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Rango:</span>
                <span className="ml-2 tabular-nums">
                  {formatPrice(historyStats.minPrice)} - {formatPrice(historyStats.maxPrice)} VES
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Fluctuacion:</span>
                <span className="ml-2 font-bold tabular-nums">{historyStats.priceRangePercent.toFixed(2)}%</span>
              </div>
            </div>
          </div>
        )}

        {dataError && (
          <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-700 dark:text-yellow-300">
            {dataError}
          </div>
        )}

        {analysisError && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-700 dark:text-red-300">
            {analysisError}
          </div>
        )}

        {metrics.arbitrage && metrics.arbitrage.profitPercent > 0 && (
          <div className="relative overflow-hidden rounded-xl border bg-green-500/10 border-green-500/30 p-4">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-green-500 to-emerald-400" />
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="font-semibold text-sm text-green-800 dark:text-green-200">Oportunidad de Arbitraje</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-green-700 dark:text-green-300">
                Comprar en <strong>{formatExchangeName(metrics.arbitrage.buyExchange)}</strong>
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-green-500" />
              <span className="text-green-700 dark:text-green-300">
                Vender en <strong>{formatExchangeName(metrics.arbitrage.sellExchange)}</strong>
              </span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs tabular-nums text-green-600 dark:text-green-400">
                {formatPrice(metrics.arbitrage.buyPrice)} - {formatPrice(metrics.arbitrage.sellPrice)} VES
              </span>
              <span className="text-lg font-bold tabular-nums text-green-600 dark:text-green-400">
                +{metrics.arbitrage.profitPercent.toFixed(2)}%
              </span>
            </div>
          </div>
        )}

        {(!metrics.arbitrage || metrics.arbitrage.profitPercent <= 0) && (
          <div className="p-4 rounded-xl border bg-muted/30 text-center">
            <p className="text-xs text-muted-foreground">
              No hay oportunidad de arbitraje significativa en este momento
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function calculateRSI(data: number[], period: number): number {
  if (data.length < period + 1) return 50

  // Wilder's smoothed RSI (exponential moving average)
  let avgGain = 0
  let avgLoss = 0

  // Seed with simple average of first `period` changes
  for (let i = 1; i <= period; i++) {
    const change = data[i] - data[i - 1]
    if (change > 0) avgGain += change
    else avgLoss -= change
  }
  avgGain /= period
  avgLoss /= period

  // Smooth with Wilder's EMA for remaining data
  for (let i = period + 1; i < data.length; i++) {
    const change = data[i] - data[i - 1]
    const gain = change > 0 ? change : 0
    const loss = change < 0 ? -change : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
  }

  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

function calculateMA(data: number[], period: number): number {
  if (data.length < period) return 0

  // Exponential Moving Average (EMA) — more responsive than SMA
  const k = 2 / (period + 1)
  let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period
  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k)
  }
  return ema
}
