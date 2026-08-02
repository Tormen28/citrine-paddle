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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Analisis Algoritmico
          </CardTitle>
          <CardDescription>Datos calculados en tiempo real</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const TrendIcon = metrics.trend === "up" ? TrendingUp : metrics.trend === "down" ? TrendingDown : Minus
  const trendColor = metrics.trend === "up" ? "text-green-500" : metrics.trend === "down" ? "text-red-500" : "text-yellow-500"
  const trendLabel = metrics.trend === "up" ? "Subiendo" : metrics.trend === "down" ? "Bajando" : "Estable"

  // Determine overall market signal
  let overallSignal = "Neutral"
  let signalColor = "text-yellow-500"
  let signalIcon = <Minus className="h-5 w-5" />
  if (analysis.rsi > 70) {
    overallSignal = "Sobrecompra - Precaucion"
    signalColor = "text-red-500"
    signalIcon = <AlertTriangle className="h-5 w-5" />
  } else if (analysis.rsi < 30) {
    overallSignal = "Sobreventa - Oportunidad"
    signalColor = "text-green-500"
    signalIcon = <Target className="h-5 w-5" />
  } else if (analysis.ma5 > analysis.ma20 && metrics.trend === "up") {
    overallSignal = "Alcista - Continua subiendo"
    signalColor = "text-green-500"
    signalIcon = <TrendingUp className="h-5 w-5" />
  } else if (analysis.ma5 < analysis.ma20 && metrics.trend === "down") {
    overallSignal = "Bajista - Continua bajando"
    signalColor = "text-red-500"
    signalIcon = <TrendingDown className="h-5 w-5" />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Analisis Algoritmico
        </CardTitle>
        <CardDescription>
          {historyStats
            ? `${historyStats.totalSnapshots} snapshots guardados en Supabase`
            : "Cargando datos historicos..."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Row 1: Market State */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <TrendingUp className="h-4 w-4" />
              <span>Tendencia</span>
            </div>
            <div className={`flex items-center gap-2 text-2xl font-bold ${trendColor}`}>
              <TrendIcon className="h-5 w-5" />
              <span>{trendLabel}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.trendStrength.toFixed(0)}% senales positivas
            </p>
          </div>

          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <BarChart3 className="h-4 w-4" />
              <span>Volatilidad</span>
            </div>
            <div className={`text-2xl font-bold ${
              metrics.volatility > 3 ? "text-red-500" :
              metrics.volatility > 1 ? "text-yellow-500" : "text-green-500"
            }`}>
              {metrics.volatility.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.volatility > 3 ? "Alta" : metrics.volatility > 1 ? "Media" : "Baja"}
            </p>
          </div>

          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Clock className="h-4 w-4" />
              <span>Promedio (MA5)</span>
            </div>
            <div className="text-2xl font-bold">
              {metrics.movingAverage > 0 ? formatPrice(metrics.movingAverage) : "--"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">VES/USDT</p>
          </div>

          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Activity className="h-4 w-4" />
              <span>Cambio</span>
            </div>
            <div className={`text-2xl font-bold ${
              metrics.priceChange > 0 ? "text-green-500" :
              metrics.priceChange < 0 ? "text-red-500" : ""
            }`}>
              {metrics.priceChange !== 0 ? (
                <>
                  {metrics.priceChange > 0 ? "+" : ""}
                  {metrics.priceChangePercent.toFixed(2)}%
                </>
              ) : "--"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              vs lectura anterior
            </p>
          </div>
        </div>

        {/* Row 2: Technical Analysis */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-sm text-muted-foreground mb-2">RSI (14)</div>
            <div className={`text-2xl font-bold ${analysis.rsi > 70 ? "text-red-500" : analysis.rsi < 30 ? "text-green-500" : ""}`}>
              {analysis.rsi.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analysis.rsi > 70 ? "Sobrecompra" : analysis.rsi < 30 ? "Sobreventa" : "Neutral"}
            </p>
          </div>

          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-sm text-muted-foreground mb-2">Señal MA</div>
            <div className={`text-2xl font-bold ${analysis.ma5 > analysis.ma20 ? "text-green-500" : "text-red-500"}`}>
              {analysis.ma5 > analysis.ma20 ? "Alcista" : "Bajista"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              MA5: {formatPrice(analysis.ma5)} vs MA20: {formatPrice(analysis.ma20)}
            </p>
          </div>

          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-sm text-muted-foreground mb-2">Escenario Probable</div>
            <div className="text-lg font-bold">{analysis.scenario}</div>
            <p className="text-xs text-muted-foreground mt-1">Proximas horas</p>
          </div>

          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <ShieldCheck className="h-4 w-4" />
              <span>Senal General</span>
            </div>
            <div className={`text-lg font-bold ${signalColor} flex items-center gap-2`}>
              {signalIcon}
              <span>{overallSignal}</span>
            </div>
          </div>
        </div>

        {/* Row 3: Historical Data Summary */}
        {historyStats && (
          <div className="p-4 rounded-lg bg-muted/30 border">
            <div className="flex items-center gap-2 mb-3">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Datos Guardados en Supabase</span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5 text-sm">
              <div>
                <span className="text-muted-foreground">Snapshots:</span>
                <span className="ml-2 font-bold">{historyStats.totalSnapshots}</span>
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
                <span className="ml-2">
                  {formatPrice(historyStats.minPrice)} - {formatPrice(historyStats.maxPrice)} VES
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Fluctuacion:</span>
                <span className="ml-2 font-bold">{historyStats.priceRangePercent.toFixed(2)}%</span>
              </div>
            </div>
          </div>
        )}

        {dataError && (
          <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
            <p className="text-sm text-yellow-800">{dataError}</p>
          </div>
        )}

        {analysisError && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200">
            <p className="text-sm text-red-800">{analysisError}</p>
          </div>
        )}

        {/* Arbitrage */}
        {metrics.arbitrage && metrics.arbitrage.profitPercent > 0 && (
          <div className="p-4 rounded-lg bg-green-50 border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-green-600" />
              <span className="font-semibold text-green-800">Oportunidad de Arbitraje</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-green-700">
                Comprar en <strong>{formatExchangeName(metrics.arbitrage.buyExchange)}</strong>
              </span>
              <ArrowRight className="h-4 w-4 text-green-500" />
              <span className="text-green-700">
                Vender en <strong>{formatExchangeName(metrics.arbitrage.sellExchange)}</strong>
              </span>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-green-600">
                {formatPrice(metrics.arbitrage.buyPrice)} - {formatPrice(metrics.arbitrage.sellPrice)} VES
              </span>
              <span className="text-lg font-bold text-green-600">
                +{metrics.arbitrage.profitPercent.toFixed(2)}%
              </span>
            </div>
          </div>
        )}

        {(!metrics.arbitrage || metrics.arbitrage.profitPercent <= 0) && (
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <p className="text-sm text-muted-foreground">
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
  let gains = 0
  let losses = 0
  for (let i = 1; i <= period; i++) {
    const change = data[i] - data[i - 1]
    if (change > 0) gains += change
    else losses -= change
  }
  if (losses === 0) return 100
  const rs = gains / losses
  return 100 - 100 / (1 + rs)
}

function calculateMA(data: number[], period: number): number {
  if (data.length < period) return 0
  const slice = data.slice(-period)
  const sum = slice.reduce((a, b) => a + b, 0)
  return sum / period
}
