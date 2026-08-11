"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useBcv } from "@/hooks/use-bcv"

function formatPrice(price: number): string {
  return price.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function BcvTable() {
  const { latest, history, isLoading } = useBcv()

  const rows =
    history.length > 0
      ? history.filter((r) => r.p2p !== null && r.p2p !== undefined)
      : latest
      ? [
          {
            date: latest.date,
            usd_ves: latest.usd_ves,
            p2p: latest.p2pRef,
            brecha: latest.brecha,
          },
        ]
      : []

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-muted text-[10px] font-bold">₿</span>
          BCV vs P2P (brecha oficial)
        </CardTitle>
        <CardDescription className="text-xs">
          Tasa oficial del Banco Central de Venezuela vs promedio P2P
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {latest && (
          <div className="rounded-xl border bg-muted/30 p-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Brecha actual</span>
            <span
              className={`text-lg font-bold tabular-nums ${
                latest.brecha < 0
                  ? "text-green-600 dark:text-green-400"
                  : latest.brecha > 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-muted-foreground"
              }`}
            >
              {latest.brecha > 0 ? "+" : ""}
              {latest.brecha.toFixed(2)}%
            </span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="text-left py-2 px-2 font-semibold">Fecha</th>
                <th className="text-right py-2 px-2 font-semibold">BCV (VES)</th>
                <th className="text-right py-2 px-2 font-semibold">P2P (VES)</th>
                <th className="text-right py-2 px-2 font-semibold">Brecha %</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && rows.length === 0 ? (
                [1, 2, 3].map((i) => (
                  <tr key={i}>
                    <td colSpan={4} className="py-2 px-2">
                      <Skeleton className="h-8 w-full rounded-xl" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-xs text-muted-foreground">
                    Sin datos BCV aún
                  </td>
                </tr>
              ) : (
                rows.map((row, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-2 text-xs">{formatDate(row.date)}</td>
                    <td className="text-right py-2.5 px-2 tabular-nums">{formatPrice(row.usd_ves)}</td>
                    <td className="text-right py-2.5 px-2 tabular-nums">
                      {row.p2p !== null ? formatPrice(row.p2p) : ""}
                    </td>
                    <td className="text-right py-2.5 px-2">
                      {row.brecha !== null ? (
                        <span
                          className={`tabular-nums font-medium ${
                            row.brecha < 0
                              ? "text-green-600 dark:text-green-400"
                              : row.brecha > 0
                              ? "text-red-600 dark:text-red-400"
                              : "text-muted-foreground"
                          }`}
                        >
                          {row.brecha > 0 ? "+" : ""}
                          {row.brecha.toFixed(2)}%
                        </span>
                      ) : (
                        ""
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
