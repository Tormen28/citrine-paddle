"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Bell, BellOff, Save, RotateCcw } from "lucide-react"

interface AlertThresholds {
  minSpread: number
  maxSpread: number
  priceChangePercent: number
}

interface AlertConfigProps {
  currentSpread?: number
  currentPrice?: number
}

const STORAGE_KEY = "vesp2p-alert-config"

const DEFAULT_THRESHOLDS: AlertThresholds = {
  minSpread: 0.5,
  maxSpread: 5,
  priceChangePercent: 3,
}

export function AlertConfig({ currentSpread, currentPrice }: AlertConfigProps) {
  const [thresholds, setThresholds] = useState<AlertThresholds>(DEFAULT_THRESHOLDS)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setThresholds(parsed.thresholds || DEFAULT_THRESHOLDS)
        setNotificationsEnabled(parsed.enabled || false)
      } catch {
        console.error("Failed to parse stored config")
      }
    }

    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted")
    }
  }, [])

  const handleSave = () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        thresholds,
        enabled: notificationsEnabled,
      })
    )
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleReset = () => {
    setThresholds(DEFAULT_THRESHOLDS)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleNotificationToggle = async () => {
    if (!notificationsEnabled) {
      if (typeof window !== "undefined" && "Notification" in window) {
        const permission = await Notification.requestPermission()
        if (permission === "granted") {
          setNotificationsEnabled(true)
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ thresholds, enabled: true })
          )
        }
      }
    } else {
      setNotificationsEnabled(false)
    }
  }

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
