"use client"

import { useState, useEffect, useRef } from "react"

export function useCountUp(target: number, duration = 700): number {
  const [value, setValue] = useState(target)
  const prevTarget = useRef(target)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    if (target === prevTarget.current) return

    const startValue = prevTarget.current
    const diff = target - startValue
    const startTime = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 4)
      setValue(startValue + diff * eased)

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate)
      } else {
        prevTarget.current = target
      }
    }

    frameRef.current = requestAnimationFrame(animate)

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [target, duration])

  return value
}
