"use client"

import { useState, useEffect, useCallback, useRef } from "react"

export interface BcvRow {
  date: string
  usd_ves: number
  p2p: number | null
  brecha: number | null
}

export interface BcvLatest {
  date: string
  usd_ves: number
  p2pRef: number
  brecha: number
  updated_at?: string
}

export interface BcvResponse {
  success: boolean
  data: BcvLatest | BcvRow[]
  error?: string
}

interface UseBcvResult {
  latest: BcvLatest | null
  history: BcvRow[]
  isLoading: boolean
  error: string | null
  refresh: () => void
}

const POLL_INTERVAL = 300000 // 5 min

export function useBcv(): UseBcvResult {
  const [latest, setLatest] = useState<BcvLatest | null>(null)
  const [history, setHistory] = useState<BcvRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetchLatest = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const response = await fetch("/api/bcv", { signal: controller.signal })
      const result: BcvResponse = await response.json()

      if (result.success && result.data && !Array.isArray(result.data)) {
        setLatest(result.data)
        setError(null)
      } else if (result.error) {
        setError(result.error)
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchHistory = useCallback(async () => {
    try {
      const response = await fetch("/api/bcv?history=true&days=90")
      const result: BcvResponse = await response.json()

      if (result.success && Array.isArray(result.data)) {
        setHistory(result.data)
      }
    } catch (err) {
      console.error("Error cargando historial BCV:", err)
    }
  }, [])

  const refresh = useCallback(() => {
    setIsLoading(true)
    fetchLatest()
  }, [fetchLatest])

  useEffect(() => {
    fetchLatest()
    fetchHistory()

    const interval = setInterval(fetchLatest, POLL_INTERVAL)

    return () => {
      clearInterval(interval)
      abortRef.current?.abort()
    }
  }, [fetchLatest, fetchHistory])

  return { latest, history, isLoading, error, refresh }
}
