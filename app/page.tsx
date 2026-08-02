"use client"

import { useState, useEffect, useMemo } from "react"
import { DashboardHeader } from "@/components/ui/dashboard-header"
import { ExchangeCard } from "@/components/ui/exchange-card"
import { CandleChart } from "@/components/ui/candle-chart"
import { TrendChart } from "@/components/ui/trend-chart"
import { AlertConfig } from "@/components/ui/alert-config"
import { AlgorithmPanel } from "@/components/ui/algorithm-panel"
import { BcvTable } from "@/components/ui/bcv-table"
import { PriceProjection } from "@/components/price-projection"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRates } from "@/hooks/use-rates"
import { useBcv } from "@/hooks/use-bcv"
import { DataRange, DEFAULT_RANGE, RANGE_OPTIONS } from "@/lib/data-range"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertCircle,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  TrendingDown,
  Minus,
  Landmark,
  RefreshCw,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

type Section = "overview" | "exchanges" | "analisis" | "config"

export default function Home() {
  const [currentSection, setCurrentSection] = useState<Section>("overview")
  const [range, setRange] = useState<DataRange>(DEFAULT_RANGE)

  const {
    data,
    isLoading,
    error,
    lastUpdated,
    refresh,
    metrics,
  } = useRates()

  const renderSection = () => {
    switch (currentSection) {
      case "overview":
        return <OverviewSection data={data} isLoading={isLoading} error={error} />
      case "exchanges":
        return (
          <ExchangeCard
            rates={data?.rates || []}
            bestBid={data?.bestBid || null}
            bestAsk={data?.bestAsk || null}
            globalSpread={data?.globalSpread || 0}
            avgPrice={data?.avgPrice || 0}
            isLoading={isLoading}
            error={error}
            lastUpdated={lastUpdated}
            onRefresh={refresh}
          />
        )
      case "analisis":
        return (
          <div className="space-y-6">
            <DataRangeSelector range={range} onRangeChange={setRange} />
            <TrendChart range={range} />
            <CandleChart range={range} />
            <AlgorithmPanel metrics={metrics} isLoading={isLoading} range={range} />
            <BcvTable />
            <PriceProjection
              advertisements={(data?.rates || []).map((rate) => ({
                price: rate.bid,
                available: 0,
                orderCount: 0,
                advertiser: { nickName: rate.name, monthOrderCount: 0 },
              }))}
              tradeType="SELL"
              isLoading={isLoading}
            />
          </div>
        )
      case "config":
        return (
          <AlertConfig
            currentSpread={data?.globalSpread}
            currentPrice={data?.avgPrice}
          />
        )
      default:
        return null
    }
  }

  return (
    <main className="container mx-auto p-4 py-6 space-y-6">
      <DashboardHeader
        onSectionChange={setCurrentSection}
        currentSection={currentSection}
      />

      {error && data?.rates.length === 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex flex-col gap-2">
            <span>{error}</span>
            <button
              onClick={refresh}
              className="self-start text-sm underline"
            >
              Reintentar
            </button>
          </AlertDescription>
        </Alert>
      )}

      {renderSection()}
    </main>
  )
}

function DataRangeSelector({
  range,
  onRangeChange,
}: {
  range: DataRange
  onRangeChange: (range: DataRange) => void
}) {
  return (
    <div className="flex gap-1 p-1 bg-muted rounded-lg overflow-x-auto w-fit">
      {RANGE_OPTIONS.map((option) => (
        <button
          key={option.id}
          onClick={() => onRangeChange(option)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
            range.id === option.id
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

interface OverviewSectionProps {
  data: ReturnType<typeof useRates>["data"]
  isLoading: boolean
  error: string | null
}

function OverviewSection({ data, isLoading, error }: OverviewSectionProps) {
  const { latest: bcvLatest, isLoading: bcvLoading } = useBcv()
  const [spark, setSpark] = useState<number[]>([])

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const res = await fetch("/api/history?limit=288&downsample=96")
        const json = await res.json()
        if (active && json.success && Array.isArray(json.data)) {
          setSpark(
            json.data.map((d: any) => (d.buyPrice + d.sellPrice) / 2)
          )
        }
      } catch {
        /* sin conexión: se mantiene la última lectura */
      }
    }
    load()
    const id = setInterval(load, 60000)
    return () => {
      active = false
      clearInterval(id)
    }
  }, [])

  const sparkStats = useMemo((): { changePct: number; trend: "up" | "down" | "stable" } | null => {
    if (spark.length < 2) return null
    const first = spark[0]
    const last = spark[spark.length - 1]
    const changePct = first > 0 ? ((last - first) / first) * 100 : 0
    const trend = changePct > 0.1 ? "up" : changePct < -0.1 ? "down" : "stable"
    return { changePct, trend }
  }, [spark])

  if (isLoading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  const bestBid = data?.bestBid
  const bestAsk = data?.bestAsk
  const avgPrice = data?.avgPrice || 0
  const globalSpread = data?.globalSpread || 0
  const exchangeCount = data?.rates?.length || 0
  const trend: "up" | "down" | "stable" = sparkStats?.trend ?? "stable"
  const changePct = sparkStats?.changePct ?? 0

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-card to-muted/40 p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Dólar paralelo hoy
            </p>
            <div className="mt-1 flex items-center gap-3">
              <span className="text-4xl font-bold tabular-nums tracking-tight sm:text-5xl">
                {avgPrice.toLocaleString("es-VE", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                <span className="ml-2 text-lg font-medium text-muted-foreground">
                  VES
                </span>
              </span>
              <TrendBadge trend={trend} changePct={changePct} />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Promedio en {exchangeCount} exchanges en vivo
            </p>
          </div>

          <div className="w-full lg:w-[45%]">
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>Últimas 24 horas</span>
              <span
                className={`font-semibold ${
                  trend === "up"
                    ? "text-green-500"
                    : trend === "down"
                    ? "text-red-500"
                    : "text-yellow-500"
                }`}
              >
                {changePct > 0 ? "+" : ""}
                {changePct.toFixed(2)}%
              </span>
            </div>
            <Sparkline data={spark} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ArrowDown className="h-4 w-4 text-green-500" />
              Comprar USDT al mejor precio
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bestAsk ? (
              <>
                <span className="text-2xl font-bold tabular-nums">
                  {bestAsk.price.toLocaleString("es-VE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  VES
                </span>
                <p className="mt-1 text-sm text-muted-foreground">
                  En{" "}
                  <span className="font-medium text-foreground capitalize">
                    {bestAsk.exchange}
                  </span>
                </p>
              </>
            ) : (
              <span className="text-2xl font-bold text-muted-foreground">—</span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ArrowUp className="h-4 w-4 text-red-500" />
              Vender USDT al mejor precio
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bestBid ? (
              <>
                <span className="text-2xl font-bold tabular-nums">
                  {bestBid.price.toLocaleString("es-VE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  VES
                </span>
                <p className="mt-1 text-sm text-muted-foreground">
                  En{" "}
                  <span className="font-medium text-foreground capitalize">
                    {bestBid.exchange}
                  </span>
                </p>
              </>
            ) : (
              <span className="text-2xl font-bold text-muted-foreground">—</span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Landmark className="h-4 w-4" />
              Tasa oficial BCV
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bcvLoading && !bcvLatest ? (
              <Skeleton className="h-8 w-32" />
            ) : bcvLatest ? (
              <>
                <span className="text-2xl font-bold tabular-nums">
                  {bcvLatest.usd_ves.toLocaleString("es-VE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  VES
                </span>
                <BcvBrechaBar
                  bcv={bcvLatest.usd_ves}
                  p2p={avgPrice}
                  brecha={bcvLatest.brecha}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Cuánto se paga por encima del dólar oficial
                </p>
              </>
            ) : (
              <span className="text-2xl font-bold text-muted-foreground">—</span>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <RefreshCw className="h-3 w-3" />
          Actualizado{" "}
          {data?.timestamp
            ? new Date(data.timestamp).toLocaleTimeString("es-VE")
            : "—"}
        </span>
        <span>
          Diferencia compra/venta promedio: {globalSpread.toFixed(2)}%
        </span>
      </div>
    </div>
  )
}

function TrendBadge({ trend, changePct }: { trend: "up" | "down" | "stable"; changePct: number }) {
  const Icon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus
  const color =
    trend === "up"
      ? "text-green-600 bg-green-100 dark:bg-green-900/30"
      : trend === "down"
      ? "text-red-600 bg-red-100 dark:bg-red-900/30"
      : "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30"
  const label =
    trend === "up" ? "Subiendo" : trend === "down" ? "Bajando" : "Estable"

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label} · {changePct > 0 ? "+" : ""}
      {changePct.toFixed(2)}% (24h)
    </span>
  )
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return <Skeleton className="h-16 w-full" />

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const W = 100
  const H = 40
  const step = W / (data.length - 1)
  const pts = data
    .map(
      (v, i) =>
        `${(i * step).toFixed(2)},${(H - ((v - min) / range) * H).toFixed(2)}`
    )
    .join(" ")
  const up = data[data.length - 1] >= data[0]
  const color = up ? "#22c55e" : "#ef4444"

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="h-16 w-full"
    >
      <polygon
        points={`0,${H} ${pts} ${W},${H}`}
        fill={color}
        opacity={0.15}
      />
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

function BcvBrechaBar({
  bcv,
  p2p,
  brecha,
}: {
  bcv: number
  p2p: number
  brecha: number
}) {
  const max = Math.max(bcv, p2p) || 1
  const bcvPct = (bcv / max) * 100
  const p2pPct = (p2p / max) * 100
  const isPremium = p2p >= bcv
  const lo = Math.min(bcvPct, p2pPct)
  const gap = Math.abs(p2pPct - bcvPct)

  return (
    <div className="mt-3">
      <div className="relative h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={`absolute inset-y-0 left-0 rounded-l-full ${
            isPremium ? "bg-primary/50" : "bg-green-500/60"
          }`}
          style={{ width: `${lo}%` }}
        />
        {gap > 0.5 && (
          <div
            className={`absolute inset-y-0 ${
              isPremium ? "bg-red-500/70" : "bg-primary/50"
            }`}
            style={{ left: `${lo}%`, width: `${gap}%` }}
          />
        )}
      </div>
      <div className="mt-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          BCV {bcv.toLocaleString("es-VE", { maximumFractionDigits: 2 })}
        </span>
        <span
          className={`font-semibold ${
            brecha < 0
              ? "text-green-600"
              : brecha > 0
              ? "text-red-600"
              : "text-muted-foreground"
          }`}
        >
          {brecha > 0 ? "+" : ""}
          {brecha.toFixed(2)}% sobre el BCV
        </span>
      </div>
    </div>
  )
}
