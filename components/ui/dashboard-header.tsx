"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, RefreshCw, Bell, Sun, Moon } from "lucide-react"
import { useTheme } from "next-themes"
import type { RatesResponse } from "@/hooks/use-rates"

type Section = "overview" | "exchanges" | "analisis" | "config"

interface DashboardHeaderProps {
  onSectionChange: (section: Section) => void
  currentSection: Section
  alertCount?: number
  data?: RatesResponse | null
  isLoading?: boolean
  error?: string | null
  lastUpdated?: Date | null
  onRefresh?: () => void
}

function getRelativeTime(date: Date | null): string {
  if (!date) return ""
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diff < 60) return `Hace ${diff}s`
  const minutes = Math.floor(diff / 60)
  if (minutes === 1) return "Hace 1 min"
  return `Hace ${minutes} min`
}

export function DashboardHeader({
  onSectionChange,
  currentSection,
  alertCount = 0,
  data,
  isLoading = false,
  error = null,
  lastUpdated = null,
  onRefresh,
}: DashboardHeaderProps) {
  const { theme, setTheme } = useTheme()
  const [relativeTime, setRelativeTime] = useState<string>("")

  useEffect(() => {
    const interval = setInterval(() => {
      setRelativeTime(getRelativeTime(lastUpdated))
    }, 1000)
    return () => clearInterval(interval)
  }, [lastUpdated])

  const sections: { id: Section; label: string }[] = [
    { id: "overview", label: "Resumen" },
    { id: "exchanges", label: "Exchanges" },
    { id: "analisis", label: "Análisis" },
    { id: "config", label: "Config" },
  ]

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border brand-header p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <Image
              src="/logo-yatecambio.png"
              alt="Ya Te Cambio"
              width={110}
              height={50}
              className="h-9 w-auto shrink-0 object-contain"
              priority
            />
            <div>
              <h1 className="text-xl font-bold tracking-tight">Ya Te Cambio <span className="text-muted-foreground font-normal">· Dashboard P2P</span></h1>
              <div className="text-xs text-muted-foreground">
                {isLoading && !data ? (
                  <Skeleton className="h-3 w-40 inline-block align-middle" />
                ) : error && !data ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)] animate-pulse" />
                    Error: {error}
                  </span>
                ) : data ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span className={`inline-block h-2 w-2 rounded-full animate-pulse ${
                      lastUpdated && (Date.now() - lastUpdated.getTime()) > 300_000
                        ? "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]"
                        : "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]"
                    }`} />
                    En vivo · {relativeTime} · {data.rates.length || 0} exchanges
                  </span>
                ) : null}
              </div>
            </div>
          </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 hover:bg-muted active:scale-[0.95]"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Cambiar tema"
          >
            <Sun className="h-3.5 w-3.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-3.5 w-3.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 hover:bg-muted active:scale-[0.95]"
            onClick={onRefresh}
            disabled={isLoading}
            aria-label="Refrescar datos"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </Button>

          {alertCount > 0 && (
            <Button variant="outline" size="icon" className="h-8 w-8 relative hover:bg-muted active:scale-[0.95]" aria-label={`${alertCount} alertas`}>
              <Bell className="h-3.5 w-3.5" />
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center shadow-sm shadow-red-500/30">
                {alertCount}
              </span>
            </Button>
          )}
        </div>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-muted/70 rounded-2xl overflow-x-auto">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onSectionChange(section.id)}
            className={`relative px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 active:scale-[0.97] whitespace-nowrap ${
              currentSection === section.id
                ? "brand-gradient text-white shadow-sm brand-shadow"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {section.label}
          </button>
        ))}
      </div>
    </div>
  )
}
