/**
 * usePullToRefresh.js — Pull-to-refresh gesture handler.
 *
 * Attaches touch listeners to a container ref.
 * Calls onRefresh() when the user pulls down from the top of the page.
 */

import { useEffect, useRef, useState } from 'react'

const THRESHOLD = 72

export function usePullToRefresh(onRefresh) {
  const [pulling, setPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(null)
  const pullDistanceRef = useRef(0)

  useEffect(() => {
    function onTouchStart(e) {
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY
      }
    }

    function onTouchMove(e) {
      if (startY.current === null) return
      const delta = e.touches[0].clientY - startY.current
      if (delta <= 0) {
        startY.current = null
        setPulling(false)
        setPullDistance(0)
        pullDistanceRef.current = 0
        return
      }
      // Prevent native scroll while pulling
      e.preventDefault()
      const eased = THRESHOLD * (1 - Math.exp(-delta / (THRESHOLD * 2)))
      // Haptic feedback when threshold is first crossed
        if (eased >= THRESHOLD * 0.9 && pullDistanceRef.current < THRESHOLD * 0.9) {
        navigator.vibrate?.(10)
        }
      pullDistanceRef.current = eased
      setPulling(true)
      setPullDistance(eased)
    }

    async function onTouchEnd() {
      if (pullDistanceRef.current >= THRESHOLD * 0.9) {
        setPullDistance(THRESHOLD * 0.6)
        await onRefresh()
      }
      startY.current = null
      setPulling(false)
      setPullDistance(0)
      pullDistanceRef.current = 0
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    // passive: false — needed to call preventDefault()
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend', onTouchEnd)

    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [onRefresh])

  const progress = Math.min(pullDistance / THRESHOLD, 1)
  return { pulling, pullDistance, progress }
}