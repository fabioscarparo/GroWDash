/**
 * usePullToRefresh.js — Mobile-native pull-to-refresh gesture handler.
 *
 * This hook attaches native touch event listeners to the document to track the 
 * user's vertical swipe down from the absolute top of the scrollable page.
 * It strictly simulates mobile rubber-band physics using an exponential decay curve.
 * 
 * If the user's pull distance exceeds the configured resistance threshold and they
 * release their touch, it triggers an asynchronous refresh callback, snaps the indicator 
 * to a loading position, fires a haptic feedback pulse, and waits for resolution.
 *
 * Example Usage:
 * ```javascript
 *   const { pulling, pullDistance, progress } = usePullToRefresh(handleRefresh)
 * ```
 *
 * @module hooks/usePullToRefresh
 */

import { useEffect, useRef, useState } from 'react'

/** 
 * Minimum drag distance required in pixels (post-easing calculation) 
 * for the release to officially trigger the refresh action.
 * @constant {number}
 */
const THRESHOLD = 72

/**
 * A custom hook providing pull-to-refresh logic and animated physics values.
 *
 * @param {() => Promise<void>} onRefresh - Async callback fired when the user
 *   releases after successfully pulling past the threshold. The hook inherently waits 
 *   for the promise to resolve before resetting its loading UI state, allowing you 
 *   to `await` data fetching directly inside the callback.
 * @returns {{ pulling: boolean, pullDistance: number, progress: number }} 
 *   - `pulling`: A boolean that is `true` while the user's finger is actively dragging on the screen.
 *   - `pullDistance`: The current elasticated pull distance in pixels (ideal for CSS `translateY`).
 *   - `progress`: A normalized float between `0.0` and `1.0` representing how close the user 
 *     is to triggering the refresh threshold (ideal for CSS opacity or rotation transformations).
 */
export function usePullToRefresh(onRefresh) {
  const [pulling, setPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)

  /**
   * Ref pointing to the Y coordinate of the initial touch event, in pixels 
   * from the top of the viewport. Remains `null` when idle or mid-scroll.
   * @type {React.MutableRefObject<number|null>}
   */
  const startY = useRef(null)

  /**
   * A synchronous ref mirror of the strictly controlled state `pullDistance`.
   * This operates as a fast-read escape hatch inside `onTouchEnd` to avoid 
   * closing over stale React state variables during gesture resolution.
   * @type {React.MutableRefObject<number>}
   */
  const pullDistanceRef = useRef(0)

  useEffect(() => {
    /**
     * Touchstart listener.
     * Captures the initial vertical touch coordinate, but ONLY if the window is fully scrolled to the top.
     * Prevents hijacking normal scrolling behavior mid-page.
     *
     * @param {TouchEvent} e - The native touch event.
     */
    function onTouchStart(e) {
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY
      }
    }

    /**
     * Touchmove listener.
     * Tracks the descent distance and applies natural rubber-band easing mathematics.
     *
     * Note: `e.preventDefault()` is invoked to actively suppress the native browser overscroll glow or bounce.
     * Because of this, the listener must be registered as **not passive** (`{ passive: false }`).
     *
     * Easing curve: `eased = THRESHOLD × (1 − e^(−delta / (THRESHOLD × 2)))`
     * This exponentially approaches the `THRESHOLD` ceiling, simulating spring resistance.
     *
     * @param {TouchEvent} e - The native touch event.
     */
    function onTouchMove(e) {
      if (startY.current === null) return

      const delta = e.touches[0].clientY - startY.current

      // If the user scrolls upward or sideways instead of pulling down, immediately abort the gesture.
      if (delta <= 0) {
        startY.current = null
        setPulling(false)
        setPullDistance(0)
        pullDistanceRef.current = 0
        return
      }

      // Block native document vertical scrolling during a valid downward pull.
      e.preventDefault()

      const eased = THRESHOLD * (1 - Math.exp(-delta / (THRESHOLD * 2)))
      pullDistanceRef.current = eased
      setPulling(true)
      setPullDistance(eased)
    }

    /**
     * Touchend listener.
     * Evaluates the conclusion of the gesture upon finger lift.
     * If the smoothed `pullDistanceRef` surpassed 90% of the threshold requirement,
     * it proceeds with the refresh execution, playing a device vibration if supported.
     */
    async function onTouchEnd() {
      if (pullDistanceRef.current >= THRESHOLD * 0.9) {
        // Issue a tiny haptic pulse for physical feedback. Supported organically here 
        // since Touchend acts as a direct user-interaction activation perimeter.
        navigator.vibrate?.(10)
        
        // Retract to an intermediary "loading" position to show the spinner spinning
        setPullDistance(THRESHOLD * 0.6) 
        await onRefresh()
      }

      // Ensure total state wipeout upon completion.
      startY.current = null
      setPulling(false)
      setPullDistance(0)
      pullDistanceRef.current = 0
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove',  onTouchMove,  { passive: false }) // passive: false critical here for preventDefault!
    document.addEventListener('touchend',   onTouchEnd)

    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove',  onTouchMove)
      document.removeEventListener('touchend',   onTouchEnd)
    }
  }, [onRefresh])

  /** 
   * A strictly normalized 0-to-1 ratio representing proximity to the threshold. 
   * Capped tightly at 1 to prevent animation blowouts during aggressive pulls.
   */
  const progress = Math.min(pullDistance / THRESHOLD, 1)

  return { pulling, pullDistance, progress }
}