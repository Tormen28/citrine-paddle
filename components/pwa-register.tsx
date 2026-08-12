"use client"

import { useEffect, useRef, useState } from "react"

export function PwaRegister() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const isFirstActivation = useRef(true)

  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      typeof window === "undefined" ||
      !("serviceWorker" in navigator)
    )
      return

    const handler = (event: MessageEvent) => {
      if (event.data?.type === "SW_UPDATED") {
        if (!isFirstActivation.current) {
          setUpdateAvailable(true)
        }
        isFirstActivation.current = false
      }
    }

    navigator.serviceWorker.addEventListener("message", handler)
    navigator.serviceWorker.register("/sw.js").catch(() => {})

    return () => {
      navigator.serviceWorker.removeEventListener("message", handler)
    }
  }, [])

  if (!updateAvailable) return null

  return (
    <div className="fixed bottom-4 inset-x-4 sm:left-auto sm:right-4 z-[95] animate-fade-in-up">
      <div className="rounded-xl border bg-background shadow-2xl p-3 flex items-center gap-3">
        <span className="text-sm flex-1">Nueva versión disponible</span>
        <button
          onClick={() => window.location.reload()}
          className="brand-gradient text-white brand-shadow text-xs px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap"
        >
          Actualizar
        </button>
      </div>
    </div>
  )
}
