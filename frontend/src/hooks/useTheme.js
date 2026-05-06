/**
 * useTheme.js — Dark/light mode manager.
 *
 * This hook manages the application's visual theme state across the entire UI.
 * It intelligently initializes by reading a previously saved user preference from
 * `localStorage`. If no saved preference exists, it gracefully falls back to
 * querying the operating system's native `prefers-color-scheme` media query.
 *
 * When the theme changes, it automatically applies or removes the Tailwind `dark`
 * toggle class on the root `<html>` element and syncs the new choice back to local storage.
 *
 * Theme transitions use the View Transitions API to animate a circular ripple that
 * expands from the click origin point, covering the screen as the new theme is applied.
 * When the API is unavailable the theme switches instantly with no animation.
 *
 * @module hooks/useTheme
 */

import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * A custom hook to manage and toggle global application themes (Dark, Light, or System).
 *
 * ARCHITECTURAL DESIGN - RIPPLE TRANSITION:
 * -----------------------------------------
 * This project implements a modern 'View Transition' ripple effect. When switching
 * themes, we capture a snapshot of the old state, inject a circular SVG mask centered 
 * on the click coordinates, and expand that mask to reveal the new theme color 
 * surface.
 *
 * CSS Requirements:
 * - `:root` must define `--vt-x` and `--vt-y` for positional masking.
 * - `html.no-vt-transitions` must disable standard CSS transitions during snapshot 
 *   capture to avoid color bleeding/flicking.
 *
 * @function useTheme
 * @returns {{ theme: string, setTheme: Function, setThemeAt: Function }} An object containing:
 *   - `theme`      : The currently active theme string (`'dark'`, `'light'`, or `'system'`).
 *   - `setTheme`   : A function to set the active theme state (no positional animation).
 *   - `setThemeAt` : A function `(newTheme, x, y)` that sets the theme and triggers a
 *                    circular View-Transition ripple originating from pixel coords (x, y).
 */
export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('theme') || 'system'
  })
  const isTransitioningRef = useRef(false)

  // Core class-toggle logic — called synchronously inside startViewTransition
  const applyTheme = useCallback((currentTheme) => {
    const root = document.documentElement
    let resolvedTheme = currentTheme

    if (currentTheme === 'system') {
      resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }

    if (resolvedTheme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    const metaTheme = document.querySelector('meta[name="theme-color"]')
    if (metaTheme) {
      metaTheme.setAttribute(
        'content',
        resolvedTheme === 'dark' ? '#0f0f0f' : '#ffffff'
      )
    }
  }, [])

  // Sync class + localStorage whenever theme state changes
  useEffect(() => {
    applyTheme(theme)
    localStorage.setItem('theme', theme)

    // Listener for system theme changes
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      // Re-apply system theme whenever the OS preference changes.
      const handleChange = () => applyTheme('system')
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme, applyTheme])

  /**
   * Set theme without a positional animation (same API as before).
   * Accepts a string value or an updater function `prev => next`.
   */
  const setTheme = useCallback((valueOrUpdater) => {
    setThemeState(prev => {
      const next = typeof valueOrUpdater === 'function' ? valueOrUpdater(prev) : valueOrUpdater
      return next
    })
  }, [])

  /**
   * Set theme with a View Transitions circular ripple originating from (x, y).
   *
   * The CSS clip-path is set on <html> as a custom property so the
   * ::view-transition-new(root) pseudo-element can reference it.
   *
   * @param {string}  newTheme - Target theme: 'dark' | 'light' | 'system'
   * @param {number}  [x]      - Horizontal origin of the ripple in px (clientX)
   * @param {number}  [y]      - Vertical origin of the ripple in px (clientY)
   */
  const setThemeAt = useCallback((newTheme, x, y) => {
    if (isTransitioningRef.current) return
    if (!document.startViewTransition) {
      setThemeState(newTheme)
      return
    }

    const root = document.documentElement
    isTransitioningRef.current = true

    // ── 1. Set origin coordinates ────────────────────────────────────────────
    if (x !== undefined && y !== undefined) {
      root.style.setProperty('--vt-x', `${x}px`)
      root.style.setProperty('--vt-y', `${y}px`)
    } else {
      // Fallback to viewport center (pixels required for mask-position calc)
      root.style.setProperty('--vt-x', `${window.innerWidth / 2}px`)
      root.style.setProperty('--vt-y', `${window.innerHeight / 2}px`)
    }

    // ── 2. Freeze CSS transitions before snapshot capture ────────────────────
    // Must be synchronous and BEFORE startViewTransition so the browser
    // captures a fully-settled color state with no mid-transition values.
    root.classList.add('no-vt-transitions')

    // ── 3. Run View Transition ───────────────────────────────────────────────
    // The ripple itself is CSS-driven via --vt-x / --vt-y.
    const transition = document.startViewTransition(() => {
      applyTheme(newTheme)
      setThemeState(newTheme)
    })

    // ── 4. Restore transitions once the ripple animation completes ───────────
    transition.finished.finally(() => {
      root.classList.remove('no-vt-transitions')
      root.style.removeProperty('--vt-x')
      root.style.removeProperty('--vt-y')
      isTransitioningRef.current = false
    })
  }, [applyTheme])


  return { theme, setTheme, setThemeAt }
}
