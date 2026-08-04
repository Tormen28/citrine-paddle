export interface AlertThresholds {
  minSpread: number
  maxSpread: number
  priceChangePercent: number
}

export interface AlertConfigShape {
  thresholds: AlertThresholds
  enabled: boolean
  soundEnabled: boolean
}

export const ALERT_STORAGE_KEY = "vesp2p-alert-config"

export const DEFAULT_ALERT_THRESHOLDS: AlertThresholds = {
  minSpread: 0.5,
  maxSpread: 5,
  priceChangePercent: 3,
}

export const DEFAULT_ALERT_CONFIG: AlertConfigShape = {
  thresholds: DEFAULT_ALERT_THRESHOLDS,
  enabled: false,
  soundEnabled: true,
}
