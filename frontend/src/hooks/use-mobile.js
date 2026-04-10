/**
 * use-mobile.js — Mobile viewport detection hook.
 *
 * This hook listens to window resize events mapping viewport widths against
 * configured Tailwind thresholds to orchestrate responsive JS side-effects.
 *
 * @module hooks/use-mobile
 */

import * as React from "react";

/** 
 * Breakpoint threshold in pixels used to determine if the viewport is considered "mobile".
 * Matches common Tailwind CSS `md` breakpoints.
 * @constant {number}
 */
const MOBILE_BREAKPOINT = 768

/**
 * A React hook that determines if the current viewport width falls under the mobile breakpoint.
 * It listens to window resize events via `matchMedia` for efficient updates.
 *
 * @function useIsMobile
 * @returns {boolean} `true` if the viewport is narrower than `MOBILE_BREAKPOINT`, otherwise `false`.
 *                    Returns `false` strictly during initial SSR (if applicable) until mounted.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange);
  }, [])

  return !!isMobile
}
