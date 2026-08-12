"use client"

import Image from "next/image"
import { useEffect, useState } from "react"

interface BrandSplashProps {
  visible: boolean
}

export function BrandSplash({ visible }: BrandSplashProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#0E0D09] flex items-center justify-center" />
    )
  }

  return (
    <div
      className={`fixed inset-0 z-[100] bg-[#0E0D09] flex flex-col items-center justify-center gap-8 transition-opacity duration-500 ${
        !visible ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      aria-hidden={!visible}
    >
      <div className="animate-fade-in-up flex flex-col items-center gap-4">
        <Image
          src="/logo-yatecambio.png"
          alt="Ya Te Cambio"
          width={64}
          height={64}
          priority
          className="h-16 w-auto drop-shadow-lg"
        />
        <p className="text-sm font-medium text-muted-foreground tracking-wide">
          El dólar en tiempo real
        </p>
      </div>

      <div className="w-40 h-0.5 rounded-full overflow-hidden bg-white/10">
        <div className="h-full w-full animate-brand-shimmer rounded-full" />
      </div>
    </div>
  )
}
