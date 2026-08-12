"use client"

import { useEffect, useState } from "react"
import { Activity, ArrowLeftRight, ChartCandlestick } from "lucide-react"

const STORAGE_KEY = "yatecambio-onboarding-v1"

const steps = [
  {
    icon: Activity,
    title: "Dólar en vivo",
    description:
      "Tasas P2P de 7 exchanges en tiempo real, tasa BCV y brecha oficial al instante.",
  },
  {
    icon: ArrowLeftRight,
    title: "Conversor BCV ↔ P2P",
    description:
      "Convierte Bs a USDT y viceversa a ambas tasas, con comisión de tarjeta opcional.",
  },
  {
    icon: ChartCandlestick,
    title: "Velas y análisis",
    description:
      "Arrastra para navegar, botones +/− para zoom, y análisis algorítmico RSI/MA.",
  },
]

export function OnboardingModal() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const done = localStorage.getItem(STORAGE_KEY)
    if (!done) {
      setOpen(true)
    }
  }, [])

  const close = () => {
    setOpen(false)
    localStorage.setItem(STORAGE_KEY, "done")
  }

  const next = () => {
    if (step < steps.length - 1) {
      setStep((s) => s + 1)
    } else {
      close()
    }
  }

  if (!mounted || !open) return null

  const StepIcon = steps[step].icon

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in-up">
      <div className="max-w-sm w-full rounded-2xl border bg-background p-6 space-y-5 shadow-2xl animate-fade-in-up">
        <div className="flex justify-center gap-2">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full transition-all duration-300 ${
                i === step ? "bg-[#FF6811] w-5" : "bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        <div className="flex flex-col items-center text-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FF6811]/10">
            <StepIcon className="h-7 w-7 text-[#FF6811]" />
          </div>
          <h2 className="text-lg font-semibold">{steps[step].title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {steps[step].description}
          </p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <button
            onClick={next}
            className="brand-gradient text-white brand-shadow w-full py-2.5 rounded-xl text-sm font-semibold transition-transform active:scale-[0.97]"
          >
            {step === steps.length - 1 ? "¡Entrar!" : "Siguiente"}
          </button>
          <button
            onClick={close}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors active:scale-[0.97]"
          >
            Omitir
          </button>
        </div>
      </div>
    </div>
  )
}
