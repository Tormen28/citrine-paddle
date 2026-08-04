export interface MarketSnapshot {
  id: number
  timestamp: Date
  buyPrice: number
  sellPrice: number
  spread: number
  volume: number | null
  medianBuy?: number
  medianSell?: number
  q1Buy?: number
  q3Buy?: number
  q1Sell?: number
  q3Sell?: number
  trimmedAds?: number
}

export interface SnapshotResult {
  id: number
  timestamp: Date
  buyPrice: number
  sellPrice: number
  spread: number
  sellCount: number
  buyCount: number
}

export interface OHLCData {
  time: number
  open: number
  high: number
  low: number
  close: number
}

export interface ChartSnapshot {
  time: number
  buyPrice: number
  sellPrice: number
  spread: number
  volume: number | null
}

export type TimeInterval = "5m" | "15m" | "1h" | "4h" | "1d"

export interface PriceStats {
  min: string
  max: string
  spread: string
}
