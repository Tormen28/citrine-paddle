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
      ? history
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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          BCV vs P2P (brecha oficial)
        </CardTitle>
        <CardDescription>
          Tasa oficial del Banco Central de Venezuela vs promedio P2P
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {latest && (
          <p className="text-sm font-medium">
            Brecha actual:{" "}
            <span
              className={
                latest.brecha < 0
                  ? "text-green-500"
                  : latest.brecha > 0
                  ? "text-red-500"
                  : "text-muted-foreground"
              }
            >
              {latest.brecha > 0 ? "+" : ""}
              {latest.brecha.toFixed(2)}%
            </span>
          </p>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2">Fecha</th>
                <th className="text-right py-2 px-2">BCV (VES)</th>
                <th className="text-right py-2 px-2">P2P (VES)</th>
                <th className="text-right py-2 px-2">Brecha %</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && rows.length === 0 ? (
                [1, 2, 3].map((i) => (
                  <tr key={i}>
                    <td colSpan={4} className="py-2 px-2">
                      <Skeleton className="h-8 w-full" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-muted-foreground">
                    Sin datos BCV aún
                  </td>
                </tr>
              ) : (
                rows.map((row, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-2 px-2">{formatDate(row.date)}</td>
                    <td className="text-right py-2 px-2">{formatPrice(row.usd_ves)}</td>
                    <td className="text-right py-2 px-2">
                      {row.p2p !== null ? formatPrice(row.p2p) : "—"}
                    </td>
                    <td className="text-right py-2 px-2">
                      {row.brecha !== null ? (
                        <span
                          className={
                            row.brecha < 0
                              ? "text-green-500"
                              : row.brecha > 0
                              ? "text-red-500"
                              : "text-muted-foreground"
                          }
                        >
                          {row.brecha > 0 ? "+" : ""}
                          {row.brecha.toFixed(2)}%
                        </span>
                      ) : (
                        "—"
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
