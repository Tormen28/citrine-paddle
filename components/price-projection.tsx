"use client"

import { useState, useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { ArrowUp, ArrowDown, TrendingUp, TrendingDown, AlertTriangle, LineChart, Calendar, Filter } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { DatePickerSimple } from "@/components/date-picker-simple"
import { addDays, isValid } from "date-fns"
import { Button } from "@/components/ui/button"
import { es } from "date-fns/locale"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { DateRange as DayPickerDateRange } from "react-day-picker"

interface Advertisement {
  price: number
  available: number
  orderCount: number
  advertiser: {
    nickName: string
    monthOrderCount: number
  }
}

interface PriceProjectionProps {
  advertisements: Advertisement[] | null | undefined
  tradeType: "SELL" | "BUY"
  isLoading: boolean
}

// Tipo de precio base para las proyecciones
type PriceBaseType = "min" | "avg" | "max"

export function PriceProjection({ advertisements = [], tradeType, isLoading }: PriceProjectionProps) {
  // Estado para el rango de fechas seleccionado
  const [dateRange, setDateRange] = useState<DayPickerDateRange>({
    from: new Date(),
    to: addDays(new Date(), 7),
  })

  // Estado para controlar si se aplica el filtro de fechas
  const [applyDateFilter, setApplyDateFilter] = useState(false)

  // Estado para el tipo de precio base seleccionado
  const [priceBaseType, setPriceBaseType] = useState<PriceBaseType>("avg")

  // Estado para almacenar mensajes de depuración
  const [debugInfo, setDebugInfo] = useState<string>("")

  const [projection, setProjection] = useState<{
    currentPrices: {
      min: number | null
      avg: number | null
      max: number | null
    }
    trend: "up" | "down" | "stable" | "unknown"
    projectedPrices: {
      min: number | null
      avg: number | null
      max: number | null
    }
    projectedChanges: {
      min: number | null
      avg: number | null
      max: number | null
    }
    recommendation: string
    bestTime: string
    pricePoints: {
      date: Date
      prices: {
        min: number
        avg: number
        max: number
      }
      event: string
      changes: {
        min: number
        avg: number
        max: number
      }
    }[]
    allPricePoints: {
      date: Date
      prices: {
        min: number
        avg: number
        max: number
      }
      event: string
      changes: {
        min: number
        avg: number
        max: number
      }
    }[]
  }>({
    currentPrices: {
      min: null,
      avg: null,
      max: null,
    },
    trend: "unknown",
    projectedPrices: {
      min: null,
      avg: null,
      max: null,
    },
    projectedChanges: {
      min: null,
      avg: null,
      max: null,
    },
    recommendation: "",
    bestTime: "",
    pricePoints: [],
    allPricePoints: [],
  })

  // Calcular proyección basada en los datos actuales
  useEffect(() => {
    if (!advertisements || advertisements.length === 0) {
      return
    }

    try {
      // Ordenar anuncios por precio
      const sortedAds = [...advertisements].sort((a, b) => a.price - b.price)

      // Calcular precios clave
      const minPrice = sortedAds[0].price
      const maxPrice = sortedAds[sortedAds.length - 1].price

      // Calcular precio promedio ponderado por volumen disponible
      let totalWeightedPrice = 0
      let totalVolume = 0

      sortedAds.forEach((ad) => {
        totalWeightedPrice += ad.price * ad.available
        totalVolume += ad.available
      })

      const avgPrice = totalVolume > 0 ? totalWeightedPrice / totalVolume : (minPrice + maxPrice) / 2

      // Determinar precio actual de referencia según el tipo seleccionado
      const currentPrices = {
        min: minPrice,
        avg: avgPrice,
        max: maxPrice,
      }

      // Calcular la dispersión de precios (volatilidad)
      const priceSpread = maxPrice - minPrice
      const volatility = priceSpread / avgPrice

      // Analizar la distribución de precios para determinar tendencia
      const priceDistribution = analyzePriceDistribution(sortedAds, avgPrice)

      // Determinar tendencia basada en la distribución y otros factores
      let trend: "up" | "down" | "stable" | "unknown" = "unknown"

      // Si hay poca dispersión de precios, consideramos que es estable
      if (volatility < 0.01) {
        trend = "stable"
      }
      // Si hay más anuncios con precios por encima del promedio, tendencia al alza
      else if (priceDistribution.aboveAvgCount > priceDistribution.belowAvgCount * 1.5) {
        trend = "up"
      }
      // Si hay más anuncios con precios por debajo del promedio, tendencia a la baja
      else if (priceDistribution.belowAvgCount > priceDistribution.aboveAvgCount * 1.5) {
        trend = "down"
      }
      // Si hay una clara concentración en los precios más altos
      else if (priceDistribution.highPriceConcentration > 0.6) {
        trend = "up"
      }
      // Si hay una clara concentración en los precios más bajos
      else if (priceDistribution.lowPriceConcentration > 0.6) {
        trend = "down"
      }
      // Si hay un equilibrio, consideramos que es estable
      else {
        trend = "stable"
      }

      // Proyectar cambio de precio basado en la tendencia y volatilidad
      let baseProjectedChange = 0

      if (trend === "up") {
        // Para tendencia al alza, proyectamos un aumento proporcional a la volatilidad
        baseProjectedChange = Math.min(0.1, volatility * 2) // Máximo 10% de aumento
      } else if (trend === "down") {
        // Para tendencia a la baja, proyectamos una disminución proporcional a la volatilidad
        baseProjectedChange = -Math.min(0.1, volatility * 2) // Máximo 10% de disminución
      } else {
        // Para tendencia estable, proyectamos cambios mínimos usando ruido determinista
        baseProjectedChange = Math.sin(advertisements.length * 0.5) * 0.005 // Pequeño cambio basado en datos
      }

      // Calcular cambios proyectados para cada tipo de precio
      // Los precios mínimos y máximos pueden tener cambios más extremos
      const projectedChanges = {
        min: baseProjectedChange * 0.8, // Menos volátil
        avg: baseProjectedChange,
        max: baseProjectedChange * 1.2, // Más volátil
      }

      // Calcular precios proyectados
      const projectedPrices = {
        min: minPrice * (1 + projectedChanges.min),
        avg: avgPrice * (1 + projectedChanges.avg),
        max: maxPrice * (1 + projectedChanges.max),
      }

      // Generar fechas y puntos de precio proyectados
      const today = new Date()
      const allPricePoints = []

      // Determinar la velocidad de cambio basada en la volatilidad
      // Mayor volatilidad = cambios más rápidos
      const changeSpeed = Math.max(0.2, Math.min(1.5, volatility * 10))

      // Calcular cuántos días tomará para un cambio significativo (5%)
      const daysForSignificantChange = Math.max(1, Math.round(5 / (changeSpeed * 100)))

      // Determinar el día de máximo/mínimo precio según la tendencia
      let peakDay = 0

      if (trend === "up") {
        // Para tendencia al alza, el pico estará entre 3 y 7 días
        peakDay = Math.min(7, Math.max(3, daysForSignificantChange))
      } else if (trend === "down") {
        // Para tendencia a la baja, el mínimo estará entre 3 y 7 días
        peakDay = Math.min(7, Math.max(3, daysForSignificantChange))
      }

      // Crear punto para hoy (día 0)
      allPricePoints.push({
        date: new Date(today),
        prices: {
          min: minPrice,
          avg: avgPrice,
          max: maxPrice,
        },
        event: "Precio actual",
        changes: {
          min: 0,
          avg: 0,
          max: 0,
        },
      })

      // Crear puntos de precio para los próximos 7 días
      for (let i = 1; i <= 7; i++) {
        const futureDate = new Date(today)
        futureDate.setDate(today.getDate() + i)

        // Calcular precio proyectado para esta fecha usando una curva
        let dayFactorBase = 0
        let event = ""

        if (trend === "up") {
          // Curva ascendente que alcanza su máximo en el día pico y luego se estabiliza o baja ligeramente
          if (i <= peakDay) {
            // Fase de subida hasta el pico
            dayFactorBase = Math.sin((i / peakDay) * (Math.PI / 2)) * baseProjectedChange * 2
          } else if (i <= peakDay * 2) {
            // Fase de estabilización o ligera bajada después del pico
            dayFactorBase = Math.sin((peakDay / i) * (Math.PI / 2)) * baseProjectedChange * 2
          } else {
            // Fase de posible nueva subida o bajada (ciclo)
            const cycleFactor = Math.sin(((i - peakDay * 2) / 10) * Math.PI) * baseProjectedChange
            dayFactorBase = Math.sin((peakDay / i) * (Math.PI / 2)) * baseProjectedChange * 1.5 + cycleFactor
          }

          // Marcar el día pico
          if (i === peakDay) {
            event = "Pico de la estimación"
          }
        } else if (trend === "down") {
          // Curva descendente que alcanza su mínimo en el día pico y luego se estabiliza o sube ligeramente
          if (i <= peakDay) {
            // Fase de bajada hasta el mínimo
            dayFactorBase = -(Math.sin((i / peakDay) * (Math.PI / 2)) * Math.abs(baseProjectedChange) * 2)
          } else if (i <= peakDay * 2) {
            // Fase de estabilización o ligera subida después del mínimo
            dayFactorBase = -(Math.sin((peakDay / i) * (Math.PI / 2)) * Math.abs(baseProjectedChange) * 2)
          } else {
            // Fase de posible nueva bajada o subida (ciclo)
            const cycleFactor = Math.sin(((i - peakDay * 2) / 10) * Math.PI) * baseProjectedChange
            dayFactorBase =
              -(Math.sin((peakDay / i) * (Math.PI / 2)) * Math.abs(baseProjectedChange) * 1.5) + cycleFactor
          }

          // Marcar el día mínimo
          if (i === peakDay) {
            event = "Mínimo de la estimación"
          }
        } else {
          // Fluctuación determinista pequeña para precios estables basada en el día
          dayFactorBase = (Math.sin(i * 0.3) * 0.01 * i) / 7
        }

        // Añadir un poco de ruido determinista para hacer la proyección más realista
        const noise = (Math.sin(i * 0.7) * 0.005) * i

        // Calcular factores para cada tipo de precio
        const dayFactors = {
          min: dayFactorBase * 0.8 + noise,
          avg: dayFactorBase + noise,
          max: dayFactorBase * 1.2 + noise,
        }

        // Calcular precios proyectados para cada tipo
        const projectedPricesForDay = {
          min: minPrice * (1 + dayFactors.min),
          avg: avgPrice * (1 + dayFactors.avg),
          max: maxPrice * (1 + dayFactors.max),
        }

        // Calcular cambios porcentuales
        const priceChanges = {
          min: dayFactors.min * 100,
          avg: dayFactors.avg * 100,
          max: dayFactors.max * 100,
        }

        // Determinar si este día es un punto de interés (si no se ha asignado ya)
        if (event === "") {
          if (i === 1) {
            event = "Mañana"
          } else if (i === 2) {
            event = "Pasado mañana"
          } else if (i === 7) {
            event = "Estimación a 7 días"
          }
        }

        allPricePoints.push({
          date: futureDate,
          prices: projectedPricesForDay,
          event,
          changes: priceChanges,
        })
      }

      // Si no se ha marcado ningún día como pico o mínimo, el mejor día es el más alto/bajo de la estimación
      if (tradeType === "SELL" && trend === "up") {
        const bestPoint = allPricePoints.reduce(
          (max, point, index) => (point.prices.avg > max.point.prices.avg ? { point, index } : max),
          { point: allPricePoints[0], index: 0 },
        )
        allPricePoints[bestPoint.index].event = "Pico de la estimación"
      } else if (tradeType === "BUY" && trend === "down") {
        const bestPoint = allPricePoints.reduce(
          (min, point, index) => (point.prices.avg < min.point.prices.avg ? { point, index } : min),
          { point: allPricePoints[0], index: 0 },
        )
        allPricePoints[bestPoint.index].event = "Mínimo de la estimación"
      }

      // Filtrar los puntos de precio según el rango de fechas seleccionado
      let filteredPricePoints = []
      let debugMessage = ""

      if (applyDateFilter) {
        try {
          // Verificar que las fechas del rango son válidas
          if (
            !dateRange.from ||
            !dateRange.to ||
            !isValid(dateRange.from) ||
            !isValid(dateRange.to) ||
            !(dateRange.from instanceof Date) ||
            !(dateRange.to instanceof Date)
          ) {
            debugMessage = "Rango de fechas inválido"
            filteredPricePoints = allPricePoints.slice(0, 8) // Mostrar los primeros 8 días por defecto
          } else {
            // Convertir las fechas a medianoche para comparación correcta
            const fromDate = new Date(dateRange.from)
            fromDate.setHours(0, 0, 0, 0)

            const toDate = new Date(dateRange.to)
            toDate.setHours(23, 59, 59, 999)

            debugMessage = `Filtrando desde ${fromDate.toISOString()} hasta ${toDate.toISOString()}`

            // Filtrar los puntos que están dentro del rango de fechas
            filteredPricePoints = allPricePoints.filter((point) => {
              if (!point.date || !(point.date instanceof Date) || !isValid(point.date)) {
                return false
              }

              const pointDate = new Date(point.date)
              pointDate.setHours(12, 0, 0, 0) // Establecer a mediodía para evitar problemas de zona horaria

              const isInRange = pointDate >= fromDate && pointDate <= toDate
              return isInRange
            })

            debugMessage += ` - Encontrados ${filteredPricePoints.length} puntos`

            // Si no hay puntos en el rango, mostrar un mensaje
            if (filteredPricePoints.length === 0) {
              debugMessage += " - No hay puntos en el rango seleccionado"
              // Usar los primeros 8 días como fallback
              filteredPricePoints = allPricePoints.slice(0, 8)
            }
          }
        } catch (error) {
          debugMessage = `Error al filtrar: ${error}`
          console.error("Error al filtrar por fechas:", error)
          filteredPricePoints = allPricePoints.slice(0, 8) // Usar los primeros 8 días como fallback
        }
      } else {
        // Si no se aplica filtro, mostrar los primeros 8 días
        filteredPricePoints = allPricePoints.slice(0, 8)
        debugMessage = "Sin filtro aplicado - Mostrando primeros 8 días"
      }

      setDebugInfo(debugMessage)

      // Generar recomendación basada en el tipo de precio seleccionado
      const selectedPrice = priceBaseType === "min" ? minPrice : priceBaseType === "max" ? maxPrice : avgPrice
      const selectedProjectedPrice =
        priceBaseType === "min"
          ? projectedPrices.min
          : priceBaseType === "max"
            ? projectedPrices.max
            : projectedPrices.avg
      const selectedProjectedChange =
        priceBaseType === "min"
          ? projectedChanges.min
          : priceBaseType === "max"
            ? projectedChanges.max
            : projectedChanges.avg

      let recommendation = ""
      let bestTime = ""

      if (tradeType === "SELL") {
        if (trend === "up") {
          recommendation = `Se estima un leve aumento en los próximos días. El precio podría acercarse a ${formatCurrency(selectedProjectedPrice, "VES")}.`
          bestTime = "Si planeas vender, la tendencia sugiere esperar unos días."
        } else if (trend === "down") {
          recommendation = `Se estima una leve disminución desde el precio actual de ${formatCurrency(selectedPrice, "VES")}.`
          bestTime = "Si planeas vender, la tendencia sugiere no esperar."
        } else {
          recommendation = `Los precios parecen estables alrededor de ${formatCurrency(selectedPrice, "VES")}. No se esperan cambios significativos en los próximos días.`
          bestTime = "El momento de venta no es crítico, los precios son estables."
        }
      } else {
        // BUY
        if (trend === "up") {
          recommendation = `Se estima un leve aumento desde el precio actual de ${formatCurrency(selectedPrice, "VES")}.`
          bestTime = "Si planeas comprar, la tendencia sugiere no esperar."
        } else if (trend === "down") {
          recommendation = `Se estima una leve disminución en los próximos días. El precio podría acercarse a ${formatCurrency(selectedProjectedPrice, "VES")}.`
          bestTime = "Si planeas comprar, la tendencia sugiere esperar unos días."
        } else {
          recommendation = `Los precios parecen estables alrededor de ${formatCurrency(selectedPrice, "VES")}. No se esperan cambios significativos en los próximos días.`
          bestTime = "El momento de compra no es crítico, los precios son estables."
        }
      }

      setProjection({
        currentPrices: {
          min: minPrice,
          avg: avgPrice,
          max: maxPrice,
        },
        trend,
        projectedPrices,
        projectedChanges,
        recommendation,
        bestTime,
        pricePoints: filteredPricePoints,
        allPricePoints,
      })
    } catch (error) {
      console.error("Error al calcular proyección:", error)
      setDebugInfo(`Error: ${error}`)
    }
  }, [advertisements, tradeType, dateRange, applyDateFilter, priceBaseType])

  // Función para analizar la distribución de precios
  function analyzePriceDistribution(ads: Advertisement[], avgPrice: number) {
    const totalAds = ads.length
    const aboveAvgCount = ads.filter((ad) => ad.price > avgPrice).length
    const belowAvgCount = ads.filter((ad) => ad.price < avgPrice).length

    // Dividir en cuartiles
    const quartileSize = Math.ceil(totalAds / 4)
    const lowestQuartile = ads.slice(0, quartileSize)
    const highestQuartile = ads.slice(-quartileSize)

    // Calcular concentración en los extremos
    const lowPriceConcentration = lowestQuartile.length / totalAds
    const highPriceConcentration = highestQuartile.length / totalAds

    return {
      aboveAvgCount,
      belowAvgCount,
      lowPriceConcentration,
      highPriceConcentration,
    }
  }

  // Función para formatear fechas con manejo de valores undefined
  function formatDate(date: Date | undefined | null): string {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return "Fecha no disponible"
    }

    try {
      return date.toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    } catch (error) {
      console.error("Error al formatear fecha:", error)
      return "Fecha inválida"
    }
  }

  // Función para aplicar el filtro de fechas
  const handleApplyFilter = () => {
    setApplyDateFilter(true)
  }

  // Función para resetear el filtro de fechas
  const handleResetFilter = () => {
    setApplyDateFilter(false)
    setDateRange({
      from: new Date(),
      to: addDays(new Date(), 7),
    })
  }

  // Función para obtener el nombre del tipo de precio
  const getPriceTypeName = (type: PriceBaseType): string => {
    switch (type) {
      case "min":
        return "Precio mínimo"
      case "avg":
        return "Precio promedio"
      case "max":
        return "Precio máximo"
      default:
        return "Precio promedio"
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (!advertisements || advertisements.length === 0) {
    return (
      <div className="bg-muted/50 p-4 rounded-lg text-center">
        <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
        <h3 className="font-medium mb-2">Proyección no disponible</h3>
        <p className="text-sm text-muted-foreground">
          No hay datos suficientes para generar una proyección. Actualiza los precios.
        </p>
      </div>
    )
  }

  const getTrendIcon = () => {
    switch (projection.trend) {
      case "up":
        return tradeType === "SELL" ? (
          <TrendingUp className="h-5 w-5 text-green-500" />
        ) : (
          <TrendingUp className="h-5 w-5 text-blue-500" />
        )
      case "down":
        return tradeType === "SELL" ? (
          <TrendingDown className="h-5 w-5 text-red-500" />
        ) : (
          <TrendingDown className="h-5 w-5 text-green-500" />
        )
      default:
        return <LineChart className="h-5 w-5 text-gray-500" />
    }
  }

  const getTrendBadge = () => {
    switch (projection.trend) {
      case "up":
        return <Badge className="bg-green-500/15 text-green-700 dark:text-green-300 border-0 text-[10px] font-semibold">Tendencia al alza</Badge>
      case "down":
        return <Badge className="bg-red-500/15 text-red-700 dark:text-red-300 border-0 text-[10px] font-semibold">Tendencia a la baja</Badge>
      default:
        return <Badge className="bg-muted text-muted-foreground border-0 text-[10px] font-semibold">Precios estables</Badge>
    }
  }

  // Obtener el precio actual y proyectado según el tipo seleccionado
  const currentPrice = projection.currentPrices[priceBaseType] || 0
  const projectedPrice = projection.projectedPrices[priceBaseType] || 0
  const projectedChange = projection.projectedChanges[priceBaseType] || 0

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-amber-500/10 border-amber-500/30 p-3 flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
          Estimación a muy corto plazo (7 días) basada en las tasas actuales. No es consejo financiero.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border bg-gradient-to-b from-card to-muted/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {getTrendIcon()}
              <span className="text-sm font-semibold">Analisis de Mercado</span>
            </div>
            {getTrendBadge()}
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Precio minimo:</span>
              <span className="text-sm font-semibold tabular-nums">
                {projection.currentPrices.min ? formatCurrency(projection.currentPrices.min, "VES") : "-"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Precio promedio:</span>
              <span className="text-sm font-semibold tabular-nums">
                {projection.currentPrices.avg ? formatCurrency(projection.currentPrices.avg, "VES") : "-"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Precio maximo:</span>
              <span className="text-sm font-semibold tabular-nums">
                {projection.currentPrices.max ? formatCurrency(projection.currentPrices.max, "VES") : "-"}
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-gradient-to-b from-card to-muted/20">
          <h3 className="text-sm font-semibold mb-3">Proyeccion de Precios</h3>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Precio actual ({getPriceTypeName(priceBaseType)}):</span>
            <span className="text-sm font-semibold tabular-nums">{currentPrice ? formatCurrency(currentPrice, "VES") : "-"}</span>
          </div>
          {projectedPrice && (
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-muted-foreground">Proyectado (7 dias):</span>
              <span className="text-sm font-bold tabular-nums">
                {formatCurrency(projectedPrice, "VES")}
                {projectedChange > 0 ? (
                  <ArrowUp className="inline h-3.5 w-3.5 ml-1 text-green-500" />
                ) : projectedChange < 0 ? (
                  <ArrowDown className="inline h-3.5 w-3.5 ml-1 text-red-500" />
                ) : null}
              </span>
            </div>
          )}
          {projectedChange && (
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-muted-foreground">Cambio proyectado:</span>
              <span className={`text-sm font-medium tabular-nums ${projectedChange > 0 ? "text-green-600 dark:text-green-400" : projectedChange < 0 ? "text-red-600 dark:text-red-400" : ""}`}>
                {projectedChange.toFixed(2)}%
              </span>
            </div>
          )}

          <div className="mt-4 pt-3 border-t">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Proyecciones a 7 dias</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Min:</span>
                <span className={`tabular-nums font-medium ${projection.projectedChanges.min && projection.projectedChanges.min > 0 ? "text-green-600 dark:text-green-400" : projection.projectedChanges.min && projection.projectedChanges.min < 0 ? "text-red-600 dark:text-red-400" : ""}`}>
                  {projection.projectedPrices.min ? formatCurrency(projection.projectedPrices.min, "VES") : "-"}
                  {projection.projectedChanges.min && projection.projectedChanges.min !== 0 && (
                    <span className="ml-1 text-[10px]">({projection.projectedChanges.min.toFixed(2)}%)</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Avg:</span>
                <span className={`tabular-nums font-medium ${projection.projectedChanges.avg && projection.projectedChanges.avg > 0 ? "text-green-600 dark:text-green-400" : projection.projectedChanges.avg && projection.projectedChanges.avg < 0 ? "text-red-600 dark:text-red-400" : ""}`}>
                  {projection.projectedPrices.avg ? formatCurrency(projection.projectedPrices.avg, "VES") : "-"}
                  {projection.projectedChanges.avg && projection.projectedChanges.avg !== 0 && (
                    <span className="ml-1 text-[10px]">({projection.projectedChanges.avg.toFixed(2)}%)</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Max:</span>
                <span className={`tabular-nums font-medium ${projection.projectedChanges.max && projection.projectedChanges.max > 0 ? "text-green-600 dark:text-green-400" : projection.projectedChanges.max && projection.projectedChanges.max < 0 ? "text-red-600 dark:text-red-400" : ""}`}>
                  {projection.projectedPrices.max ? formatCurrency(projection.projectedPrices.max, "VES") : "-"}
                  {projection.projectedChanges.max && projection.projectedChanges.max !== 0 && (
                    <span className="ml-1 text-[10px]">({projection.projectedChanges.max.toFixed(2)}%)</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-gradient-to-b from-card to-muted/20">
          <h3 className="text-sm font-semibold mb-3">Recomendacion</h3>
          <p className="text-xs leading-relaxed mb-3">{projection.recommendation}</p>
          <div className="p-2.5 rounded-lg bg-muted/50">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Mejor momento</p>
            <p className="text-xs">{projection.bestTime}</p>
          </div>
          <div className="text-[10px] text-muted-foreground mt-3">Basado en {advertisements.length} tasas de exchanges en vivo</div>
        </div>
      </div>

      <div className="rounded-xl border bg-muted/30 p-4">
        <div className="flex items-center mb-3">
          <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Filtrar proyecciones</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs font-medium mb-2 block text-muted-foreground">Tipo de precio base</label>
            <Select value={priceBaseType} onValueChange={(value) => setPriceBaseType(value as PriceBaseType)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar tipo de precio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="min">Precio minimo</SelectItem>
                <SelectItem value="avg">Precio promedio</SelectItem>
                <SelectItem value="max">Precio maximo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium mb-2 block text-muted-foreground">Rango de fechas</label>
            <DatePickerSimple
              dateRange={dateRange}
              setDateRange={(newRange) => {
                setDateRange(newRange)
              }}
              locale={es}
              className="w-full"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button onClick={handleApplyFilter} variant="default" size="sm">
            Aplicar filtros
          </Button>
          <Button onClick={handleResetFilter} variant="outline" size="sm">
            Resetear
          </Button>
        </div>

        {applyDateFilter && (
          <div className="mt-2 text-xs text-muted-foreground">
            Mostrando desde {formatDate(dateRange.from)} hasta {formatDate(dateRange.to)}
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-muted/30 p-4">
        <div className="flex items-center mb-3">
          <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Estimación de precios (próximos 7 días)</h3>
          {applyDateFilter && (
            <Badge variant="outline" className="ml-2 text-[10px]">
              {projection.pricePoints.length} fechas
            </Badge>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="text-left py-2 px-2 font-semibold">Fecha</th>
                <th className="text-right py-2 px-2 font-semibold">Min</th>
                <th className="text-right py-2 px-2 font-semibold">Promedio</th>
                <th className="text-right py-2 px-2 font-semibold">Max</th>
                <th className="text-left py-2 px-2 font-semibold">Evento</th>
              </tr>
            </thead>
            <tbody>
              {projection.pricePoints.length > 0 ? (
                projection.pricePoints.map((point, index) => (
                  <tr key={index} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${point.event.includes("✓") ? "bg-green-500/5" : ""}`}>
                    <td className="py-2.5 px-2 text-xs">{isSameDay(point.date, new Date()) ? "Hoy" : formatDate(point.date)}</td>
                    <td className="text-right py-2.5 px-2">
                      <span className="tabular-nums text-xs">{formatCurrency(point.prices.min, "VES")}</span>
                      {index > 0 && point.changes.min !== 0 && (
                        <span className={`text-[10px] ml-1 ${point.changes.min > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                          ({point.changes.min.toFixed(1)}%)
                        </span>
                      )}
                    </td>
                    <td className="text-right py-2.5 px-2">
                      <span className="tabular-nums text-xs font-medium">{formatCurrency(point.prices.avg, "VES")}</span>
                      {index > 0 && point.changes.avg !== 0 && (
                        <span className={`text-[10px] ml-1 ${point.changes.avg > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                          ({point.changes.avg.toFixed(1)}%)
                        </span>
                      )}
                    </td>
                    <td className="text-right py-2.5 px-2">
                      <span className="tabular-nums text-xs">{formatCurrency(point.prices.max, "VES")}</span>
                      {index > 0 && point.changes.max !== 0 && (
                        <span className={`text-[10px] ml-1 ${point.changes.max > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                          ({point.changes.max.toFixed(1)}%)
                        </span>
                      )}
                    </td>
                    <td className={`py-2.5 px-2 text-xs ${point.event.includes("✓") ? "font-semibold text-green-700 dark:text-green-300" : ""}`}>
                      {point.event}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-xs text-muted-foreground">
                    No hay proyecciones para el rango seleccionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <Badge variant="outline" className="text-[10px]">
          Estimación a partir de tasas en vivo
        </Badge>
      </div>
    </div>
  )
}

// Función auxiliar para comparar si dos fechas son el mismo día
function isSameDay(date1: Date | undefined | null, date2: Date | undefined | null): boolean {
  if (!date1 || !date2 || !(date1 instanceof Date) || !(date2 instanceof Date)) {
    return false
  }

  try {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    )
  } catch (error) {
    console.error("Error al comparar fechas:", error)
    return false
  }
}
