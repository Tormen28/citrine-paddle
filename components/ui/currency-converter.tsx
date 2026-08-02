"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRightLeft, Percent } from "lucide-react"
import { cn } from "@/lib/utils"

interface CurrencyConverterProps {
  avgPrice: number
  bcvRate: number
  brecha: number | null
}

function formatNumber(n: number | null): string {
  if (n === null || !isFinite(n)) return "—"
  return n.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function CurrencyConverter({ avgPrice, bcvRate, brecha }: CurrencyConverterProps) {
  const [unit, setUnit] = useState<"bs" | "usd">("bs")
  const [amount, setAmount] = useState<string>("")
  const [commissionActive, setCommissionActive] = useState(false)
  const [commissionPct, setCommissionPct] = useState(4)

  const numericAmount = useMemo(() => {
    const v = parseFloat(amount.replace(",", "."))
    return isNaN(v) || v <= 0 ? null : v
  }, [amount])

  const results = useMemo(() => {
    if (numericAmount === null || bcvRate <= 0 || avgPrice <= 0) {
      return null
    }

    if (unit === "bs") {
      const usdtBcv = numericAmount / bcvRate
      const usdtP2p = numericAmount / avgPrice
      const netP2p = commissionActive
        ? usdtP2p * (1 - commissionPct / 100)
        : null
      return { type: "bs" as const, usdtBcv, usdtP2p, netP2p, vesBcv: 0, vesP2p: 0 }
    } else {
      const vesBcv = numericAmount * bcvRate
      const vesP2p = numericAmount * avgPrice
      return { type: "usd" as const, vesBcv, vesP2p, usdtBcv: 0, usdtP2p: 0, netP2p: null }
    }
  }, [numericAmount, unit, bcvRate, avgPrice, commissionActive, commissionPct])

  const hasData = bcvRate > 0 && avgPrice > 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
          Conversor BCV ↔ P2P
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {!hasData ? (
          <p className="text-xs text-muted-foreground">
            Esperando tasas del mercado…
          </p>
        ) : (
          <>
            {/* Toggle de unidad */}
            <div className="flex gap-0.5 p-1 bg-muted/50 rounded-lg w-fit">
              <button
                onClick={() => setUnit("bs")}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200",
                  unit === "bs"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                Bs
              </button>
              <button
                onClick={() => setUnit("usd")}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200",
                  unit === "usd"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                USDT $
              </button>
            </div>

            {/* Input */}
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                placeholder={unit === "bs" ? "Ej: 1000" : "Ej: 10"}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full h-9 rounded-lg border bg-background px-3 text-sm tabular-nums placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                {unit === "bs" ? "VES" : "USDT"}
              </span>
            </div>

            {/* Resultados */}
            {results && numericAmount !== null && (
              <div className="space-y-2">
                {results.type === "bs" ? (
                  <>
                    {/* Bs → USDT */}
                    <ResultRow
                      label="USDT a tasa BCV"
                      value={results.usdtBcv}
                      secondary
                      currency="USDT"
                    />
                    <ResultRow
                      label="USDT a tasa P2P"
                      value={results.usdtP2p}
                      netValue={results.netP2p}
                      commissionActive={commissionActive}
                      commissionPct={commissionPct}
                      currency="USDT"
                    />
                  </>
                ) : (
                  <>
                    {/* USDT → Bs */}
                    <ResultRow
                      label="VES a tasa BCV"
                      value={results.vesBcv}
                      secondary
                      currency="VES"
                    />
                    <ResultRow
                      label="VES a tasa P2P"
                      value={results.vesP2p}
                      currency="VES"
                    />
                  </>
                )}
              </div>
            )}

            {/* Botón de comisión */}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => setCommissionActive(!commissionActive)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200",
                  commissionActive
                    ? "bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300"
                    : "bg-muted/30 border-border text-muted-foreground hover:border-amber-500/30 hover:text-amber-700 dark:hover:text-amber-300"
                )}
              >
                <Percent className="h-3 w-3" />
                Comisión tarjeta
              </button>

              {commissionActive && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.5"
                    value={commissionPct}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value)
                      if (!isNaN(v) && v >= 0 && v <= 10) setCommissionPct(v)
                    }}
                    className="w-14 h-7 rounded-md border bg-background px-2 text-xs tabular-nums text-center focus:outline-none focus:ring-2 focus:ring-ring/50"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function ResultRow({
  label,
  value,
  secondary,
  netValue,
  commissionActive,
  commissionPct,
  currency = "USDT",
}: {
  label: string
  value: number
  secondary?: boolean
  netValue?: number | null
  commissionActive?: boolean
  commissionPct?: number
  currency?: string
}) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-right">
        <span
          className={cn(
            "text-sm font-semibold tabular-nums",
            secondary ? "text-muted-foreground" : "text-foreground"
          )}
        >
          {formatNumber(value)} {currency}
        </span>
        {commissionActive && netValue !== null && netValue !== undefined && (
          <span className="ml-2 text-xs font-medium text-amber-600 dark:text-amber-400">
            neto {formatNumber(netValue)} {currency}
          </span>
        )}
      </div>
    </div>
  )
}
