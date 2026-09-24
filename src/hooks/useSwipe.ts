import { useRef, useCallback } from 'react'

interface UseSwipeOptions {
  onLeft: () => void
  onRight: () => void
  threshold?: number
}

// Detección de gesto horizontal (swipe) con eventos touch.
// Devuelve handlers para attach a un elemento.
export function useSwipe({ onLeft, onRight, threshold = 60 }: UseSwipeOptions) {
  const startX = useRef<number | null>(null)
  const startY = useRef<number | null>(null)
  const movedX = useRef(0)
  const movedY = useRef(0)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0]
    if (!t) return
    startX.current = t.clientX
    startY.current = t.clientY
    movedX.current = 0
    movedY.current = 0
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (startX.current == null || startY.current == null) return
    const t = e.touches[0]
    if (!t) return
    movedX.current = t.clientX - startX.current
    movedY.current = t.clientY - startY.current
  }, [])

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (startX.current == null || startY.current == null) {
        startX.current = null
        startY.current = null
        return
      }
      const dx = movedX.current
      const dy = movedY.current
      startX.current = null
      startY.current = null
      movedX.current = 0
      movedY.current = 0
      if (Math.abs(dx) < threshold) return
      if (Math.abs(dx) < Math.abs(dy)) return
      if (dx < 0) onLeft()
      else onRight()
    },
    [onLeft, onRight, threshold]
  )

  return { onTouchStart, onTouchMove, onTouchEnd }
}