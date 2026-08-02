"use client"

import { useState, useEffect } from "react"
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard USDT/VES</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading && !data
              ? "Cargando..."
              : error && !data
              ? `Error: ${error}`
              : `${relativeTime} • ${data?.rates.length || 0} exchanges`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>

          {alertCount > 0 && (
            <Button variant="outline" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
                {alertCount}
              </span>
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-muted rounded-lg overflow-x-auto">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onSectionChange(section.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              currentSection === section.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            }`}
          >
            {section.label}
          </button>
        ))}
      </div>
    </div>
  )
}
