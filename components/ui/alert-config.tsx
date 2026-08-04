"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Bell, BellOff, Save, RotateCcw, Volume2, VolumeX } from "lucide-react"
import { dispatchAlertConfigChanged } from "@/hooks/use-alert-watcher"
import {
  ALERT_STORAGE_KEY,
  DEFAULT_ALERT_THRESHOLDS,
  type AlertThresholds,
} from "@/types/alerts"

interface AlertConfigProps {
  currentSpread?: number
  currentPrice?: number
  currentChange?: number
}

export function AlertConfig({ currentSpread, currentPrice, currentChange }: AlertConfigProps) {
  const [thresholds, setThresholds] = useState<AlertThresholds>(DEFAULT_ALERT_THRESHOLDS)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(ALERT_STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setThresholds(parsed.thresholds || DEFAULT_ALERT_THRESHOLDS)
        setNotificationsEnabled(parsed.enabled || false)
        setSoundEnabled(parsed.soundEnabled ?? true)
      } catch {
        console.error("Failed to parse stored config")
      }
    }

    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted")
    }
  }, [])

  const persist = (next: { thresholds: AlertThresholds; enabled: boolean; soundEnabled: boolean }) => {
    localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(next))
    dispatchAlertConfigChanged()
  }

  const handleSave = () => {
    persist({ thresholds, enabled: notificationsEnabled, soundEnabled })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleReset = () => {
    setThresholds(DEFAULT_ALERT_THRESHOLDS)
    persist({ thresholds: DEFAULT_ALERT_THRESHOLDS, enabled: notificationsEnabled, soundEnabled })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleNotificationToggle = async () => {
    if (!notificationsEnabled) {
      if (typeof window !== "undefined" && "Notification" in window) {
        const permission = await Notification.requestPermission()
        if (permission === "granted") {
          setNotificationsEnabled(true)
          persist({ thresholds, enabled: true, soundEnabled })
        }
      }
    } else {
      setNotificationsEnabled(false)
      persist({ thresholds, enabled: false, soundEnabled })
    }
  }

  const statusRows = [
    {
      label: "Spread bajo mínimo",
      detail: `< ${thresholds.minSpread.toFixed(2)}%`,
      active: currentSpread !== undefined && currentSpread < thresholds.minSpread,
      current: currentSpread !== undefined ? `${currentSpread.toFixed(2)}%` : null,
    },
    {
      label: "Spread sobre máximo",
      detail: `> ${thresholds.maxSpread.toFixed(2)}%`,
      active: currentSpread !== undefined && currentSpread > thresholds.maxSpread,
      current: currentSpread !== undefined ? `${currentSpread.toFixed(2)}%` : null,
    },
    {
      label: "Cambio de precio 24h",
      detail: `> ${thresholds.priceChangePercent.toFixed(1)}%`,
      active: currentChange !== undefined && Math.abs(currentChange) > thresholds.priceChangePercent,
      current: currentChange !== undefined ? `${currentChange >= 0 ? "+" : ""}${currentChange.toFixed(2)}%` : null,
    },
  ]

  const activeCount = statusRows.filter((row) => row.active).length

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          {notificationsEnabled ? (
            <Bell className="h-4 w-4 text-muted-foreground" />
          ) : (
            <BellOff className="h-4 w-4 text-muted-foreground" />
          )}
          Configuracion de Alertas
        </CardTitle>
        <CardDescription className="text-xs">
          Configura los umbrales para recibir notificaciones cuando el mercado cambie
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5 pt-0">
        <div className={`rounded-xl border p-4 ${activeCount > 0 ? "border-red-500/40 bg-red-500/5" : "border-green-500/40 bg-green-500/5"}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Estado de alertas
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                activeCount > 0
                  ? "bg-red-500/15 text-red-700 dark:text-red-300"
                  : "bg-green-500/15 text-green-700 dark:text-green-300"
              }`}
            >
              {activeCount > 0 ? `${activeCount} activa${activeCount > 1 ? "s" : ""} ahora` : "Todo en calma"}
            </span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {statusRows.map((row) => (
              <div
                key={row.label}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                  row.active
                    ? "border-red-500/40 bg-red-500/10"
                    : "border-transparent bg-background/60"
                }`}
              >
                <div>
                  <p className="text-xs font-medium">{row.label}</p>
                  <p className="text-[10px] text-muted-foreground">{row.detail}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-block h-2 w-2 rounded-full ${row.active ? "bg-red-500 animate-pulse" : "bg-green-500"}`} />
                  {row.current && (
                    <p className="text-[10px] font-semibold tabular-nums mt-0.5">{row.current}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          {!notificationsEnabled && (
            <p className="mt-3 text-[10px] text-muted-foreground">
              Las notificaciones estan desactivadas: aunque haya alertas activas no se mostraran avisos.
            </p>
          )}
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/30">
          <div className="space-y-0.5">
            <Label htmlFor="notifications" className="text-sm font-medium">Notificaciones del navegador</Label>
            <p className="text-[10px] text-muted-foreground">
              Recibir alertas cuando se cumplan las condiciones
            </p>
          </div>
          <Switch
            id="notifications"
            checked={notificationsEnabled}
            onCheckedChange={handleNotificationToggle}
          />
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/30">
          <div className="space-y-0.5">
            <Label htmlFor="sound" className="text-sm font-medium">Sonido de alerta</Label>
            <p className="text-[10px] text-muted-foreground">
              Reproducir un tono cuando se dispare una alerta
            </p>
          </div>
          <Switch
            id="sound"
            checked={soundEnabled}
            onCheckedChange={(value) => {
              setSoundEnabled(value)
              persist({ thresholds, enabled: notificationsEnabled, soundEnabled: value })
            }}
          />
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="minSpread" className="text-xs font-medium">Spread minimo (%)</Label>
            <Input
              id="minSpread"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={thresholds.minSpread}
              onChange={(e) =>
                setThresholds({
                  ...thresholds,
                  minSpread: parseFloat(e.target.value) || 0,
                })
              }
              className="h-9"
            />
            <p className="text-[10px] text-muted-foreground">
              Alertar cuando el spread global baje de este valor
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxSpread" className="text-xs font-medium">Spread maximo (%)</Label>
            <Input
              id="maxSpread"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={thresholds.maxSpread}
              onChange={(e) =>
                setThresholds({
                  ...thresholds,
                  maxSpread: parseFloat(e.target.value) || 0,
                })
              }
              className="h-9"
            />
            <p className="text-[10px] text-muted-foreground">
              Alertar cuando el spread global suba de este valor
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priceChange" className="text-xs font-medium">Cambio de precio (%)</Label>
            <Input
              id="priceChange"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={thresholds.priceChangePercent}
              onChange={(e) =>
                setThresholds({
                  ...thresholds,
                  priceChangePercent: parseFloat(e.target.value) || 0,
                })
              }
              className="h-9"
            />
            <p className="text-[10px] text-muted-foreground">
              Alertar cuando el precio cambie mas de este porcentaje
            </p>
          </div>
        </div>

        {currentSpread !== undefined && (
          <div className="rounded-xl border bg-gradient-to-b from-card to-muted/20 p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Valores actuales</div>
            <div className="flex gap-6">
              <div>
                <span className="text-xl font-bold tabular-nums">{currentSpread.toFixed(2)}%</span>
                <span className="text-[10px] text-muted-foreground ml-1.5">Spread</span>
              </div>
              {currentPrice && (
                <div>
                  <span className="text-xl font-bold tabular-nums">
                    {currentPrice.toLocaleString("es-VE", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-1.5">VES/USDT</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={handleSave} className="flex-1 h-9" size="sm">
            <Save className="h-3.5 w-3.5 mr-2" />
            {saved ? "Guardado" : "Guardar Configuracion"}
          </Button>
          <Button variant="outline" onClick={handleReset} size="sm" className="h-9">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
