/**
 * usePullToRefresh.js — Pull-to-refresh gesture handler.
 *
 * Attaches touch listeners to the document and tracks the user's pull gesture
 * from the top of the page. When the pull exceeds the threshold, releasing
 * triggers a refresh callback and a short haptic feedback pulse.
 *
 * The pull distance uses an exponential easing function to simulate
 * rubber-band resistance — the further you pull, the harder it gets.
 *
 * Usage:
 *   const { pulling, pullDistance, progress } = usePullToRefresh(handleRefresh)
 *
 *   pulling      — true while the user is actively pulling down
 *   pullDistance — current eased pull distance in pixels (use for translateY)
 *   progress     — 0–1 normalized progress toward the threshold (use for opacity/rotation)
 *
 * @param {() => Promise<void>} onRefresh - Async callback fired when the user
 *   releases after pulling past the threshold. The hook waits for it to resolve
 *   before resetting state, so you can await your data fetching inside it.
 */

import { useEffect, useRef, useState } from 'react'

/** Pixels the user must pull to trigger a refresh. */
const THRESHOLD = 72

export function usePullToRefresh(onRefresh) {
  const [pulling, setPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)

  /**
   * Y position of the initial touch, in pixels from the top of the viewport.
   * Set to null when no pull gesture is in progress.
   */
  const startY = useRef(null)

  /**
   * Ref mirror of pullDistance — used inside onTouchEnd to read the current
   * value without creating a stale closure over the state variable.
   */
  const pullDistanceRef = useRef(0)

  useEffect(() => {
    /**
     * Records the starting Y position only when the page is scrolled to the top.
     * If the user is mid-scroll we don't want to intercept the gesture.
     */
    function onTouchStart(e) {
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY
      }
    }

    /**
     * Tracks the pull distance and applies rubber-band easing.
     *
     * preventDefault() is called to suppress native scroll while pulling.
     * This requires the listener to be registered with passive: false.
     *
     * Easing formula:
     *   eased = THRESHOLD × (1 − e^(−delta / (THRESHOLD × 2)))
     *
     * This asymptotically approaches THRESHOLD, making it feel like
     * the page resists being pulled further the closer you get.
     */
    function onTouchMove(e) {
      if (startY.current === null) return

      const delta = e.touches[0].clientY - startY.current

      // If the user scrolls up or sideways, cancel the pull gesture
      if (delta <= 0) {
        startY.current = null
        setPulling(false)
        setPullDistance(0)
        pullDistanceRef.current = 0
        return
      }

      // Block native scroll so the page doesn't scroll while pulling
      e.preventDefault()

      const eased = THRESHOLD * (1 - Math.exp(-delta / (THRESHOLD * 2)))
      pullDistanceRef.current = eased
      setPulling(true)
      setPullDistance(eased)
    }

    /**
     * Fires when the user lifts their finger.
     * If the pull reached the threshold, triggers haptic feedback and calls onRefresh.
     * Resets all state regardless of whether a refresh was triggered.
     */
    async function onTouchEnd() {
      if (pullDistanceRef.current >= THRESHOLD * 0.9) {
        // Short haptic pulse — only works after a direct user interaction,
        // which is guaranteed here since we're inside a touch handler.
        navigator.vibrate?.(10)
        setPullDistance(THRESHOLD * 0.6) // snap to resting position while loading
        await onRefresh()
      }

      startY.current = null
      setPulling(false)
      setPullDistance(0)
      pullDistanceRef.current = 0
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove',  onTouchMove,  { passive: false }) // passive: false required for preventDefault()
    document.addEventListener('touchend',   onTouchEnd)

    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove',  onTouchMove)
      document.removeEventListener('touchend',   onTouchEnd)
    }
  }, [onRefresh])

  /** Normalized progress toward the threshold, clamped to 0–1. */
  const progress = Math.min(pullDistance / THRESHOLD, 1)

  return { pulling, pullDistance, progress }
}