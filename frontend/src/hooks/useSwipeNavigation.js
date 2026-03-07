/**
 * useSwipeNavigation.js — Horizontal swipe gesture for page navigation.
 *
 * Attaches touch listeners to a ref element.
 * Calls onNext() or onPrev() based on swipe direction.
 * Only triggers if horizontal movement is dominant (not a scroll).
 */

import { useEffect, useRef } from 'react'

const MIN_DISTANCE = 60  // px minimum horizontal swipe
const MAX_VERTICAL = 80  // px max vertical drift before ignoring

export function useSwipeNavigation({ onNext, onPrev, enabled = true }) {
  const startX = useRef(null)
  const startY = useRef(null)

  useEffect(() => {
    if (!enabled) return

    function onTouchStart(e) {
      startX.current = e.touches[0].clientX
      startY.current = e.touches[0].clientY
    }

    function onTouchEnd(e) {
      if (startX.current === null) return

      const dx = e.changedTouches[0].clientX - startX.current
      const dy = Math.abs(e.changedTouches[0].clientY - startY.current)

      startX.current = null
      startY.current = null

      // Ignore if vertical movement is too large (user is scrolling)
      if (dy > MAX_VERTICAL) return
      if (Math.abs(dx) < MIN_DISTANCE) return

      if (dx < 0) onNext?.()  // swipe left → next page
      else        onPrev?.()  // swipe right → prev page
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [onNext, onPrev, enabled])
}