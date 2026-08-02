"use client"

import { useState, useMemo } from "react"
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
    spark,
    metrics,
  } = useRates()

  const renderSection = () => {
    switch (currentSection) {
      case "overview":
        return <OverviewSection data={data} spark={spark} isLoading={isLoading} error={error} />
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
        data={data}
        isLoading={isLoading}
        error={error}
        lastUpdated={lastUpdated}
        onRefresh={refresh}
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
  spark: number[]
  isLoading: boolean
  error: string | null
}

function OverviewSection({ data, spark, isLoading, error }: OverviewSectionProps) {
  const { latest: bcvLatest, isLoading: bcvLoading } = useBcv()

  const sparkStats = useMemo((): { changePct: number; trend: "up" | "down" | "stable" } | null => {
    if (spark.length < 2) return null
    const first = spark[0]
    const last = spark[spark.length - 1]
    const changePct = first > 0 ? ((last - first) / first) * 100 : 0
    const trend = changePct > 0.1 ? "up" : changePct < -0.1 ? "down" : "stable"
    return { changePct, trend }
  }, [spark])

  const trend: "up" | "down" | "stable" = sparkStats?.trend ?? "stable"
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

  const marketSentiment = useMemo(() => {
    if (!sparkStats || !sparkSummary) return null
    const { drift } = sparkSummary
    const momentum = drift >= 0.05 ? "acelerando" : drift <= -0.05 ? "desacelerando" : "sostenido"
    const direction = trend === "up" ? "al alza" : trend === "down" ? "a la baja" : "lateral"
    const volLabel = volatility > 0.008 ? "con volatilidad elevada" : volatility > 0.004 ? "con volatilidad moderada" : "con baja volatilidad"
    return { momentum, direction, volLabel }
  }, [sparkStats, sparkSummary, trend, volatility])

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

  const brecha = bcvLatest && avgPrice > 0
    ? ((avgPrice - bcvLatest.usd_ves) / bcvLatest.usd_ves) * 100
    : null

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

      <MarketSummaryCard
        trend={trend}
        changePct={changePct}
        volatility={volatility}
        sentiment={marketSentiment}
        brecha={brecha}
        bcv={bcvLatest?.usd_ves ?? null}
        avgPrice={avgPrice}
        hasData={spark.length >= 2}
      />

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

type MarketSummaryCardProps = {
  trend: "up" | "down" | "stable"
  changePct: number
  volatility: number
  sentiment: {
    momentum: string
    direction: string
    volLabel: string
  } | null
  brecha: number | null
  bcv: number | null
  avgPrice: number
  hasData: boolean
}

function MarketSummaryCard({
  trend,
  changePct,
  volatility,
  sentiment,
  brecha,
  bcv,
  avgPrice,
  hasData,
}: MarketSummaryCardProps) {
  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus
  const trendColor =
    trend === "up"
      ? "text-green-600 dark:text-green-400"
      : trend === "down"
      ? "text-red-600 dark:text-red-400"
      : "text-yellow-600 dark:text-yellow-400"

  return (
    <Card>
      <CardContent className="pt-6">
        {!hasData ? (
          <div className="flex items-center gap-3 py-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Reuniendo datos para el análisis… vuelve en unos minutos.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${
                  trend === "up"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                    : trend === "down"
                    ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                    : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300"
                }`}
              >
                <TrendIcon className="h-4 w-4" />
                {trend === "up" ? "Al alza" : trend === "down" ? "A la baja" : "Lateral"}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                  sentiment?.momentum === "acelerando"
                    ? "bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-300"
                    : sentiment?.momentum === "desacelerando"
                    ? "bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {sentiment?.momentum === "acelerando"
                  ? "Acelerando"
                  : sentiment?.momentum === "desacelerando"
                  ? "Desacelerando"
                  : "Sin cambios bruscos"}
              </span>
            </div>

            <p className="text-sm leading-relaxed text-muted-foreground">
              El USDT paralelo se mueve{" "}
              <span className={`font-semibold ${trendColor}`}>
                {sentiment?.direction ?? "lateral"}
              </span>{" "}
              con{" "}
              <span className="font-medium text-foreground">
                {sentiment?.volLabel}
              </span>
              {brecha !== null && bcv !== null ? (
                <>
                  . Frente al BCV se paga{" "}
                  <span className="font-semibold text-foreground">
                    {brecha.toFixed(2)}%
                  </span>{" "}
                  más por cada dólar.
                </>
              ) : (
                <>.</>
              )}
            </p>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border bg-muted/40 p-3">
                <p
                  className={`text-xl font-bold tabular-nums ${
                    changePct >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {changePct > 0 ? "+" : ""}
                  {changePct.toFixed(2)}%
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">Cambio 24h</p>
              </div>
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-xl font-bold tabular-nums">
                  {(volatility * 100).toFixed(2)}%
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">Volatilidad</p>
              </div>
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-xl font-bold tabular-nums">
                  {avgPrice.toLocaleString("es-VE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">Precio medio</p>
              </div>
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-xl font-bold tabular-nums">
                  {brecha !== null ? `${brecha.toFixed(2)}%` : "—"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">vs. BCV</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
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
