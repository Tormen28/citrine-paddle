"use client"

import * as React from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"
import type { Locale } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"

interface DatePickerSimpleProps {
  className?: string
  dateRange: DateRange
  setDateRange: React.Dispatch<React.SetStateAction<DateRange>>
  locale?: Locale
}

export function DatePickerSimple({ className, dateRange, setDateRange, locale = es }: DatePickerSimpleProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Cerrar el calendario cuando se hace clic fuera
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const handleButtonClick = () => {
    setIsOpen(!isOpen)
  }

  // Formatear el rango de fechas para mostrar
  const formatDateRange = () => {
    if (!dateRange.from) {
      return <span>Selecciona un rango de fechas</span>
    }

    const fromFormatted = format(dateRange.from, "dd/MM/yyyy", { locale })

    if (!dateRange.to) {
      return fromFormatted
    }

    const toFormatted = format(dateRange.to, "dd/MM/yyyy", { locale })
    return `${fromFormatted} - ${toFormatted}`
  }

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <Button
        id="date"
        variant="outline"
        className={cn("w-full justify-start text-left font-normal", !dateRange && "text-muted-foreground")}
        onClick={handleButtonClick}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {formatDateRange()}
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-2 bg-popover rounded-md border shadow-md">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={(range) => {
              if (range) {
                // Asegurarse de que las fechas tengan horas consistentes para evitar problemas de comparación
                const normalizedRange = {
                  from: range.from ? new Date(range.from.setHours(0, 0, 0, 0)) : undefined,
                  to: range.to ? new Date(range.to.setHours(23, 59, 59, 999)) : undefined,
                }
                setDateRange(normalizedRange)
              } else {
                setDateRange({ from: new Date(), to: undefined })
              }

              if (range?.to) {
                setIsOpen(false)
              }
            }}
            numberOfMonths={2}
            locale={locale}
          />
        </div>
      )}
    </div>
  )
}
