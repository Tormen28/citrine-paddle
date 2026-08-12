"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Share, Smartphone, X } from "lucide-react"

const STORAGE_KEY = "yatecambio-install-dismissed"
const SHOW_DELAY = 6000

function getStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function setStored(value: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {}
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return true
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true
  )
}

function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false
  return (
    /iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  )
}

interface DeferredPrompt {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
  platforms: string[]
}

export function InstallPrompt() {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSInstructions, setShowIOSInstructions] = useState(false)

  const deferredPromptRef = useRef<DeferredPrompt | null>(null)
  const delayPassedRef = useRef(false)
  const dismissedRef = useRef(false)

  useEffect(() => {
    setMounted(true)

    if (isStandalone()) return

    const stored = getStored()
    // "accepted" no debe suprimir el letrero para siempre porque si el usuario desinstala la app,
    // Chrome vuelve a disparar beforeinstallprompt en la siguiente visita y el letrero debe poder reaparecer;
    // mientras la app esta instalada Chrome no dispara beforeinstallprompt de todos modos, asi que no hay riesgo de molestar.
    if (stored === "dismissed") return

    const ios = isIOSDevice()
    setIsIOS(ios)

    const showBanner = () => {
      if (dismissedRef.current) return
      if (ios) {
        setVisible(true)
      } else if (deferredPromptRef.current) {
        setVisible(true)
      }
    }

    const delayId = setTimeout(() => {
      delayPassedRef.current = true
      showBanner()
    }, SHOW_DELAY)

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      deferredPromptRef.current = e as unknown as DeferredPrompt
      if (delayPassedRef.current && !ios) {
        showBanner()
      }
    }

    const handleAppInstalled = () => {
      setVisible(false)
      setStored("accepted")
      dismissedRef.current = true
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall)
    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      clearTimeout(delayId)
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  const handleDismiss = useCallback(() => {
    setVisible(false)
    setStored("dismissed")
    dismissedRef.current = true
  }, [])

  const handleInstall = useCallback(async () => {
    const prompt = deferredPromptRef.current
    if (!prompt) return

    try {
      await prompt.prompt()
      const choice = await prompt.userChoice
      if (choice.outcome === "accepted") {
        setStored("accepted")
        setVisible(false)
        dismissedRef.current = true
      }
    } catch {
      handleDismiss()
    }
  }, [handleDismiss])

  if (!mounted || !visible) return null

  if (isIOS && showIOSInstructions) {
    return (
      <div
        role="dialog"
        aria-label="Instalar aplicacion"
        className="fixed top-[max(6rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[85] w-[calc(100%-2rem)] max-w-md sm:top-4"
      >
        <div className="animate-fade-in-down">
          <div className="rounded-2xl border bg-background/95 backdrop-blur p-4 shadow-2xl shadow-black/40">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#FF6811]/10 text-[#FF6811] flex items-center justify-center shrink-0">
                <Smartphone className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Instala Ya Te Cambio</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Abrela como una app, rapido y sin navegador
                </p>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="h-5 w-5 rounded-full bg-[#FF6811]/10 text-[#FF6811] flex items-center justify-center shrink-0 text-[10px] font-bold">
                      1
                    </span>
                    <span>
                      Toca el boton <Share className="h-3 w-3 inline -mt-0.5" />{" "}
                      Compartir en la barra de Safari
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="h-5 w-5 rounded-full bg-[#FF6811]/10 text-[#FF6811] flex items-center justify-center shrink-0 text-[10px] font-bold">
                      2
                    </span>
                    <span>Elige &quot;Agregar a pantalla de inicio&quot;</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowIOSInstructions(false)
                  handleDismiss()
                }}
                aria-label="Cerrar"
                className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors active:scale-[0.97]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      role="dialog"
      aria-label="Instalar aplicacion"
      className="fixed top-[max(6rem,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[85] w-[calc(100%-2rem)] max-w-md sm:top-4"
    >
      <div className="animate-fade-in-down">
        <div className="rounded-2xl border bg-background/95 backdrop-blur p-4 shadow-2xl shadow-black/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#FF6811]/10 text-[#FF6811] flex items-center justify-center shrink-0">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Instala Ya Te Cambio</p>
              <p className="text-xs text-muted-foreground">
                Abrela como una app, rapido y sin navegador
              </p>
            </div>
            <button
              onClick={handleDismiss}
              aria-label="Cerrar"
              className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors active:scale-[0.97]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            {isIOS ? (
              <button
                onClick={() => setShowIOSInstructions(true)}
                className="flex-1 rounded-xl bg-[#FF6811] text-white text-sm font-semibold py-2.5 active:scale-[0.97] transition-all duration-200 brand-shadow"
              >
                Como instalarla
              </button>
            ) : (
              <button
                onClick={handleInstall}
                className="flex-1 rounded-xl bg-[#FF6811] text-white text-sm font-semibold py-2.5 brand-shadow active:scale-[0.97] transition-all duration-200"
              >
                Instalar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
