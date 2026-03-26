/**
 * useSwipeNavigation.js — Horizontal swipe detector for accessible page navigation.
 *
 * This hook attaches mobile-friendly touch drag event listeners to the global window
 * instance, intelligently parsing horizontal swipe gestures into navigation actions.
 * Perfect for paginated carousels, date pickers, or switching tabs sequentially.
 *
 * It uses simple heuristics to reject sloppy or diagonal scrolls:
 *  - Must clear a strict minimum horizontal distance criteria.
 *  - Must NOT exceed a stringent maximum vertical drift.
 *
 * @module hooks/useSwipeNavigation
 */

import { useEffect, useRef } from 'react'

/** 
 * Absolute minimum horizontal pixels the user must travel to register a swipe.
 * Extrapolated from common user interaction bounds.
 * @constant {number}
 */
const MIN_DISTANCE = 60

/** 
 * Maximum allowable vertical drift in pixels before the swipe is dismissed as a scroll attempt.
 * @constant {number}
 */
const MAX_VERTICAL = 80

/**
 * A custom hook to listen for and execute callbacks upon verified horizontal touch gestures.
 *
 * @param {Object} props - Hook configuration block.
 * @param {Function} [props.onNext] - Callback executed upon a valid leftward swipe (indicates navigating forward/next).
 * @param {Function} [props.onPrev] - Callback executed upon a valid rightward swipe (indicates navigating backward/previous).
 * @param {boolean} [props.enabled=true] - A short-circuit flag to forcibly unbind listeners and pause detection.
 */
export function useSwipeNavigation({ onNext, onPrev, enabled = true }) {
  const startX = useRef(null)
  const startY = useRef(null)

  useEffect(() => {
    // Instantly abort binding processes if explicitly disabled
    if (!enabled) return

    /**
     * Touchstart boundary listener tracking origin X and Y coordinates.
     * @param {TouchEvent} e - Native mobile touchstart event data payload.
     */
    function onTouchStart(e) {
      // Ignore swipe events originating inside charts, sliders, or explicit no-swipe elements
      // so users can freely scroll tooltips or adjust values without triggering a page transition
      if (e.target.closest('.recharts-wrapper, [role="slider"], input[type="range"], .no-swipe')) {
        startX.current = null
        startY.current = null
        return
      }
      startX.current = e.touches[0].clientX
      startY.current = e.touches[0].clientY
    }

    /**
     * Touchend boundary listener parsing final coordinate delta relative to the origin point.
     * Analyzes distance and direction to invoke the requested paging callback.
     * @param {TouchEvent} e - Native mobile touchend event payload containing changedTouches array.
     */
    function onTouchEnd(e) {
      // Guard clause to prevent processing orphan end events disjointed from known origin points
      if (startX.current === null) return

      const dx = e.changedTouches[0].clientX - startX.current
      const dy = Math.abs(e.changedTouches[0].clientY - startY.current)

      // Wipe originating coordinates regardless of the event's outcome status
      startX.current = null
      startY.current = null

      // Reject the operation outright if structural user movement indicates a vertical scroll rather than a swipe
      if (dy > MAX_VERTICAL) return
      // Reject the operation if sweeping energy did not exceed designated horizontal force requirements
      if (Math.abs(dx) < MIN_DISTANCE) return

      // Determine vector direction and execute relevant functional callback securely 
      if (dx < 0) onNext?.()  // swipe dragging left → next page
      else        onPrev?.()  // swipe dragging right → prev page
    }

    // Passive true optimizations allow frictionless native scroll rendering
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [onNext, onPrev, enabled])
}