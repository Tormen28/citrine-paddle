"use client"

import { useEffect, useRef, useCallback } from "react"
import { AlertService } from "@/services/alert.service"
import {
  ALERT_STORAGE_KEY,
  DEFAULT_ALERT_CONFIG,
  type AlertConfigShape,
} from "@/types/alerts"

export const ALERT_CONFIG_EVENT = "vesp2p-alert-config-changed"

function readConfig(): AlertConfigShape {
  if (typeof window === "undefined") return DEFAULT_ALERT_CONFIG
  try {
    const raw = localStorage.getItem(ALERT_STORAGE_KEY)
    if (!raw) return DEFAULT_ALERT_CONFIG
    const parsed = JSON.parse(raw)
    return {
      thresholds: {
        ...DEFAULT_ALERT_CONFIG.thresholds,
        ...(parsed.thresholds ?? {}),
      },
      enabled: parsed.enabled ?? DEFAULT_ALERT_CONFIG.enabled,
      soundEnabled: parsed.soundEnabled ?? DEFAULT_ALERT_CONFIG.soundEnabled,
    }
  } catch {
    return DEFAULT_ALERT_CONFIG
  }
}

export function dispatchAlertConfigChanged(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(ALERT_CONFIG_EVENT))
}

interface Condition {
  key: string
  active: boolean
  label: string
  body: string
}

export function useAlertWatcher() {
  const configRef = useRef<AlertConfigShape>(DEFAULT_ALERT_CONFIG)
  const armedRef = useRef<Set<string>>(new Set())

  const reload = useCallback(() => {
    configRef.current = readConfig()
    if (!configRef.current.enabled) {
      armedRef.current.clear()
    }
  }, [])

  useEffect(() => {
    reload()
    window.addEventListener("storage", reload)
    window.addEventListener(ALERT_CONFIG_EVENT, reload)
    return () => {
      window.removeEventListener("storage", reload)
      window.removeEventListener(ALERT_CONFIG_EVENT, reload)
    }
  }, [reload])

  const checkMarket = useCallback((
    spread: number | null,
    changePct: number | null
  ): void => {
    const cfg = configRef.current
    if (!cfg.enabled) return
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission !== "granted") {
      return
    }

    const t = cfg.thresholds

    const conditions: Condition[] = [
      {
        key: "minSpread",
        active: spread !== null && t.minSpread > 0 && spread < t.minSpread,
        label: "Spread bajo mínimo",
        body: `Spread ${spread?.toFixed(2) ?? "—"}% por debajo de ${t.minSpread.toFixed(2)}%`,
      },
      {
        key: "maxSpread",
        active: spread !== null && t.maxSpread > 0 && spread > t.maxSpread,
        label: "Spread sobre máximo",
        body: `Spread ${spread?.toFixed(2) ?? "—"}% supera ${t.maxSpread.toFixed(2)}%`,
      },
      {
        key: "priceChange",
        active: changePct !== null && t.priceChangePercent > 0 && Math.abs(changePct) > t.priceChangePercent,
        label: "Cambio de precio 24h",
        body: `Cambio ${changePct! >= 0 ? "+" : ""}${changePct!.toFixed(2)}% supera ${t.priceChangePercent.toFixed(1)}%`,
      },
    ]

    for (const c of conditions) {
      if (c.active) {
        if (!armedRef.current.has(c.key)) {
          armedRef.current.add(c.key)
          AlertService.sendNotification("Alerta P2P VES", c.body)
          if (cfg.soundEnabled) {
            AlertService.playAlertSound()
          }
        }
      } else {
        armedRef.current.delete(c.key)
      }
    }
  }, [])

  return { checkMarket }
}
