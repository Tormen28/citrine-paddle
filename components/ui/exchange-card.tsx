"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, RefreshCw, TrendingUp, ArrowUp, ArrowDown, Check } from "lucide-react"
import type { ExchangeRate } from "@/hooks/use-rates"
import { useBcv } from "@/hooks/use-bcv"

interface ExchangeCardProps {
  rates: ExchangeRate[]
  bestBid: { exchange: string; price: number } | null
  bestAsk: { exchange: string; price: number } | null
  globalSpread: number
  avgPrice: number
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
  onRefresh: () => void
}

function formatPrice(price: number): string {
  return price.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatExchangeName(name: string): string {
  const names: Record<string, string> = {
    binancep2p: "Binance P2P",
    okexp2p: "OKX P2P",
    bybitp2p: "Bybit P2P",
    bitgetp2p: "Bitget P2P",
    bingxp2p: "BingX P2P",
    mexcp2p: "MEXC P2P",
    coinexp2p: "CoinEx P2P",
    saldo: "Saldo",
  }
  return names[name] || name
}

function BrechaValue({ brecha }: { brecha: number | null }) {
  if (brecha === null) {
    return <span className="text-xs text-muted-foreground">—</span>
  }
  const color =
    brecha < 0
      ? "text-green-500"
      : brecha > 0
      ? "text-red-500"
      : "text-muted-foreground"
  return (
    <span className={`text-xs font-medium ${color}`}>
      {brecha > 0 ? "+" : ""}
      {brecha.toFixed(2)}%
    </span>
  )
}

export function ExchangeCard({
  rates,
  bestBid,
  bestAsk,
  globalSpread,
  avgPrice,
  isLoading,
  error,
  lastUpdated,
  onRefresh,
}: ExchangeCardProps) {
  const { latest: bcvLatest } = useBcv()
  const bcvPrice = bcvLatest?.usd_ves
  const brechaFor = (price: number): number | null =>
    bcvPrice ? ((price - bcvPrice) / bcvPrice) * 100 : null

  if (isLoading && rates.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                Exchanges P2P
              </CardTitle>
              <CardDescription className="text-xs">Cargando precios...</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error && rates.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="h-4 w-4 text-red-500" />
            Exchanges P2P
          </CardTitle>
          <CardDescription className="text-xs">Error al cargar precios</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mb-4 text-red-500/50" />
            <p className="text-sm font-medium">Error: {error}</p>
            <button
              onClick={onRefresh}
              className="mt-4 flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reintentar
            </button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const sortedByBestBuy = [...rates].sort((a, b) => a.ask - b.ask)
  const sortedByBestSell = [...rates].sort((a, b) => b.bid - a.bid)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Exchanges P2P
            </CardTitle>
            <CardDescription className="text-xs">
              Compara precios para comprar y vender USDT
              {bcvLatest && (
                <span className="block text-xs mt-0.5 text-muted-foreground/80">
                  Tasa BCV: {formatPrice(bcvLatest.usd_ves)} VES
                </span>
              )}
            </CardDescription>
          </div>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            {lastUpdated && (
              <span>{lastUpdated.toLocaleTimeString("es-VE")}</span>
            )}
          </button>
        </div>

        {bestBid && bestAsk && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t">
            <div className="relative overflow-hidden rounded-xl border bg-green-500/10 border-green-500/30 p-4 transition-transform hover:-translate-y-0.5">
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-green-500 to-emerald-400" />
              <div className="flex items-center gap-1.5 text-green-700 dark:text-green-300 text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2">
                <ArrowDown className="h-3 w-3" />
                Mejor para comprar
              </div>
              <div className="text-green-700 dark:text-green-300 text-xl sm:text-2xl font-bold tabular-nums tracking-tight">
                {formatPrice(bestAsk.price)}
              </div>
              <div className="text-green-600/70 dark:text-green-400/60 text-[10px] sm:text-xs mt-0.5">VES por USDT</div>
              <div className="text-green-700 dark:text-green-300 text-xs font-medium mt-2 truncate">
                {formatExchangeName(bestAsk.exchange)}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl border bg-red-500/10 border-red-500/30 p-4 transition-transform hover:-translate-y-0.5">
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-red-500 to-rose-400" />
              <div className="flex items-center gap-1.5 text-red-700 dark:text-red-300 text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2">
                <ArrowUp className="h-3 w-3" />
                Mejor para vender
              </div>
              <div className="text-red-700 dark:text-red-300 text-xl sm:text-2xl font-bold tabular-nums tracking-tight">
                {formatPrice(bestBid.price)}
              </div>
              <div className="text-red-600/70 dark:text-red-400/60 text-[10px] sm:text-xs mt-0.5">VES por USDT</div>
              <div className="text-red-700 dark:text-red-300 text-xs font-medium mt-2 truncate">
                {formatExchangeName(bestBid.exchange)}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-xl border bg-muted/30 p-4 col-span-2 sm:col-span-1 transition-transform hover:-translate-y-0.5">
              <div className="text-muted-foreground text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2">
                Spread global
              </div>
              <div className="text-foreground text-xl sm:text-2xl font-bold tabular-nums tracking-tight">
                {globalSpread.toFixed(2)}%
              </div>
              <div className="text-muted-foreground text-[10px] sm:text-xs mt-2">
                {((Number(bestAsk.price) - Number(bestBid.price)) / Number(bestAsk.price) * 100).toFixed(2)}% entre mejor compra y mejor venta
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6 pt-0">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold flex items-center gap-1.5">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-green-500/15 text-green-700 dark:text-green-300 text-[10px] font-bold">↗</span>
              Ranking para Comprar USDT
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Brecha vs BCV</span>
          </div>
          <div className="space-y-2">
            {sortedByBestBuy.slice(0, 5).map((rate, index) => {
              const isBest = index === 0
              return (
                <div
                  key={`buy-${rate.name}`}
                  className={`group flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 ${
                    isBest
                      ? "bg-green-500/10 border-green-500/30 shadow-sm shadow-green-500/10"
                      : "bg-card/50 border-border hover:border-green-500/20 hover:bg-green-500/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      isBest
                        ? "bg-green-600 text-white shadow-sm shadow-green-600/30"
                        : "bg-muted text-muted-foreground group-hover:bg-green-500/15 group-hover:text-green-700 dark:group-hover:text-green-300"
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className={`font-semibold text-sm ${isBest ? "text-green-800 dark:text-green-200" : "text-foreground"}`}>
                        {formatExchangeName(rate.name)}
                      </div>
                      <div className={`text-xs ${isBest ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                        Ask: {formatPrice(rate.ask)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <div className={`text-lg font-bold tabular-nums ${isBest ? "text-green-700 dark:text-green-300" : "text-foreground"}`}>
                      {formatPrice(rate.ask)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">VES</div>
                    <BrechaValue brecha={brechaFor(rate.ask)} />
                    {isBest && (
                      <div className="text-[10px] text-green-700 dark:text-green-300 font-medium flex items-center gap-1 mt-1">
                        <Check className="h-3 w-3" /> Mejor precio
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold flex items-center gap-1.5">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-red-500/15 text-red-700 dark:text-red-300 text-[10px] font-bold">↗</span>
              Ranking para Vender USDT
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Brecha vs BCV</span>
          </div>
          <div className="space-y-2">
            {sortedByBestSell.slice(0, 5).map((rate, index) => {
              const isBest = index === 0
              return (
                <div
                  key={`sell-${rate.name}`}
                  className={`group flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 ${
                    isBest
                      ? "bg-red-500/10 border-red-500/30 shadow-sm shadow-red-500/10"
                      : "bg-card/50 border-border hover:border-red-500/20 hover:bg-red-500/5"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      isBest
                        ? "bg-red-600 text-white shadow-sm shadow-red-600/30"
                        : "bg-muted text-muted-foreground group-hover:bg-red-500/15 group-hover:text-red-700 dark:group-hover:text-red-300"
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className={`font-semibold text-sm ${isBest ? "text-red-800 dark:text-red-200" : "text-foreground"}`}>
                        {formatExchangeName(rate.name)}
                      </div>
                      <div className={`text-xs ${isBest ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                        Bid: {formatPrice(rate.bid)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <div className={`text-lg font-bold tabular-nums ${isBest ? "text-red-700 dark:text-red-300" : "text-foreground"}`}>
                      {formatPrice(rate.bid)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">VES</div>
                    <BrechaValue brecha={brechaFor(rate.bid)} />
                    {isBest && (
                      <div className="text-[10px] text-red-700 dark:text-red-300 font-medium flex items-center gap-1 mt-1">
                        <Check className="h-3 w-3" /> Mejor precio
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {avgPrice > 0 && (
          <div className="pt-4 border-t text-center">
            <span className="text-xs text-muted-foreground">
              Precio promedio: <span className="font-semibold tabular-nums">{formatPrice(avgPrice)} VES</span>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
