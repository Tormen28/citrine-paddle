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
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                USDT/VES
              </CardTitle>
              <CardDescription>Cargando precios...</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error && rates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            USDT/VES
          </CardTitle>
          <CardDescription>Error al cargar precios</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mb-4 text-red-500" />
            <p className="text-lg font-medium">Error: {error}</p>
            <button
              onClick={onRefresh}
              className="mt-4 flex items-center gap-2 text-primary hover:underline"
            >
              <RefreshCw className="h-4 w-4" />
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
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Exchanges P2P
            </CardTitle>
            <CardDescription>
              Compara precios para comprar y vender USDT
              {bcvLatest && (
                <span className="block text-xs">
                  Tasa BCV: {formatPrice(bcvLatest.usd_ves)} VES
                </span>
              )}
            </CardDescription>
          </div>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            {lastUpdated && (
              <span>{lastUpdated.toLocaleTimeString("es-VE")}</span>
            )}
          </button>
        </div>

        {bestBid && bestAsk && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-green-700 text-xs font-medium mb-1">
                <ArrowDown className="h-3 w-3" />
                MEJOR PARA COMPRAR
              </div>
              <div className="text-green-600 text-xl font-bold">
                {formatPrice(bestAsk.price)}
              </div>
              <div className="text-green-600 text-xs">VES por USDT</div>
              <div className="text-green-700 text-xs mt-1 truncate">
                {formatExchangeName(bestAsk.exchange)}
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-red-700 text-xs font-medium mb-1">
                <ArrowUp className="h-3 w-3" />
                MEJOR PARA VENDER
              </div>
              <div className="text-red-600 text-xl font-bold">
                {formatPrice(bestBid.price)}
              </div>
              <div className="text-red-600 text-xs">VES por USDT</div>
              <div className="text-red-700 text-xs mt-1 truncate">
                {formatExchangeName(bestBid.exchange)}
              </div>
            </div>

            <div className="bg-muted/50 border border-border rounded-lg p-3 col-span-2 sm:col-span-1">
              <div className="text-muted-foreground text-xs font-medium mb-1">
                SPREAD GLOBAL
              </div>
              <div className="text-foreground text-xl font-bold">
                {globalSpread.toFixed(2)}%
              </div>
              <div className="text-muted-foreground text-xs">
                {((Number(bestAsk.price) - Number(bestBid.price)) / Number(bestAsk.price) * 100).toFixed(2)}% entre mejor compra y mejor venta
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">🏆 Ranking para Comprar USDT</span>
            <span className="text-xs text-muted-foreground">Brecha vs BCV</span>
          </div>
          <div className="space-y-2">
            {sortedByBestBuy.slice(0, 5).map((rate, index) => {
              const isBest = index === 0
              return (
                <div
                  key={`buy-${rate.name}`}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                    isBest
                      ? "bg-green-100 border-green-400 shadow-sm"
                      : "bg-card border-border hover:border-green-300/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      isBest ? "bg-green-600 text-white" : "bg-muted text-muted-foreground"
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className={`font-bold text-base ${isBest ? "text-green-900" : ""}`}>
                        {formatExchangeName(rate.name)}
                      </div>
                      <div className={`text-sm ${isBest ? "text-green-700 font-medium" : "text-muted-foreground"}`}>
                        Ask: {formatPrice(rate.ask)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <div className={`font-extrabold text-2xl ${isBest ? "text-green-700" : "text-foreground"}`}>
                      {formatPrice(rate.ask)}
                    </div>
                    <div className="text-xs text-muted-foreground">VES</div>
                    <BrechaValue brecha={brechaFor(rate.ask)} />
                    {isBest && (
                      <div className="text-xs text-green-700 font-medium flex items-center gap-1 mt-1">
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
            <span className="text-sm font-medium">🏆 Ranking para Vender USDT</span>
            <span className="text-xs text-muted-foreground">Brecha vs BCV</span>
          </div>
          <div className="space-y-2">
            {sortedByBestSell.slice(0, 5).map((rate, index) => {
              const isBest = index === 0
              return (
                <div
                  key={`sell-${rate.name}`}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                    isBest
                      ? "bg-red-100 border-red-400 shadow-sm"
                      : "bg-card border-border hover:border-red-300/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      isBest ? "bg-red-600 text-white" : "bg-muted text-muted-foreground"
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className={`font-bold text-base ${isBest ? "text-red-900" : ""}`}>
                        {formatExchangeName(rate.name)}
                      </div>
                      <div className={`text-sm ${isBest ? "text-red-700 font-medium" : "text-muted-foreground"}`}>
                        Bid: {formatPrice(rate.bid)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <div className={`font-extrabold text-2xl ${isBest ? "text-red-700" : "text-foreground"}`}>
                      {formatPrice(rate.bid)}
                    </div>
                    <div className="text-xs text-muted-foreground">VES</div>
                    <BrechaValue brecha={brechaFor(rate.bid)} />
                    {isBest && (
                      <div className="text-xs text-red-700 font-medium flex items-center gap-1 mt-1">
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
            <span className="text-sm text-muted-foreground">
              Precio promedio: <span className="font-medium">{formatPrice(avgPrice)} VES</span>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
