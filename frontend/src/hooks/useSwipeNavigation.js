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

import { useEffect, useRef, useState } from 'react'

const MIN_DISTANCE = 50
const MAX_VERTICAL = 60

/**
 * useSwipeNavigation hook.
 * Adds real-time drag-to-follow tracking for horizontal page swipes.
 * 
 * @function useSwipeNavigation
 * @returns {{ isDragging: boolean, dragOffset: number }}
 */
export function useSwipeNavigation({ onNext, onPrev, enabled = true }) {
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  
  const startX = useRef(null)
  const startY = useRef(null)
  const isHorizontalSwipe = useRef(false)

  useEffect(() => {
    if (!enabled) return

    function onTouchStart(e) {
      if (e.target.closest('.recharts-wrapper, [role="slider"], input[type="range"], .no-swipe')) {
        startX.current = null
        return
      }
      startX.current = e.touches[0].clientX
      startY.current = e.touches[0].clientY
      isHorizontalSwipe.current = false
      setDragOffset(0)
    }

    function onTouchMove(e) {
      if (startX.current === null) return

      const dx = e.touches[0].clientX - startX.current
      const dy = e.touches[0].clientY - startY.current

      // First move decides direction: if horizontal delta > vertical, it's a swipe
      if (!isHorizontalSwipe.current && Math.abs(dx) > 10) {
        if (Math.abs(dx) > Math.abs(dy)) {
          isHorizontalSwipe.current = true
        } else {
          startX.current = null // It's a vertical scroll, abort
          return
        }
      }

      if (isHorizontalSwipe.current) {
        // Block native browser back/forward and overscroll gestures ONLY if the event is cancelable.
        // If it's not (e.g. scroll already started), we shouldn't attempt to block it to avoid warnings.
        if (e.cancelable) e.preventDefault()
        
        setDragOffset(dx)
        setIsDragging(true)
        // Set CSS variable for the animation engine to use as starting point
        document.documentElement.style.setProperty('--swipe-dx', `${dx}px`)
      }
    }

    function onTouchEnd(e) {
      if (startX.current === null || !isHorizontalSwipe.current) {
        startX.current = null
        return
      }

      const dx = e.changedTouches[0].clientX - startX.current
      const dy = Math.abs(e.changedTouches[0].clientY - startY.current)

      startX.current = null
      setIsDragging(false)

      if (dy < MAX_VERTICAL && Math.abs(dx) > MIN_DISTANCE) {
        if (dx < 0) onNext?.()
        else onPrev?.()
      } else {
        // Did not cross threshold: reset CSS var so it snaps back normally
        document.documentElement.style.removeProperty('--swipe-dx')
        setDragOffset(0)
      }
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove',  onTouchMove,  { passive: false })
    window.addEventListener('touchend',   onTouchEnd)

    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove',  onTouchMove)
      window.removeEventListener('touchend',   onTouchEnd)
    }
  }, [onNext, onPrev, enabled])

  return { isDragging, dragOffset }
}