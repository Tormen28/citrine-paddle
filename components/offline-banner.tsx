"use client"

import { useEffect, useState } from "react"

export function OfflineBanner() {
  const [offline, setOffline] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    const onOffline = () => setOffline(true)
    const onOnline = () => setOffline(false)

    setOffline(!navigator.onLine)

    window.addEventListener("offline", onOffline)
    window.addEventListener("online", onOnline)

    return () => {
      window.removeEventListener("offline", onOffline)
      window.removeEventListener("online", onOnline)
    }
  }, [])

  if (!mounted) return null

  if (!offline) return null

  return (
    <div className="fixed top-0 inset-x-0 z-[80] bg-amber-500/90 text-white text-xs text-center py-1.5 px-4 animate-fade-in-up">
      Sin conexión — los datos podrían no actualizarse
    </div>
  )
}
