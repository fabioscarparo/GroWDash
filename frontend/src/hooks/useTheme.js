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

import { useState, useEffect, useCallback } from 'react'

/**
 * A custom hook to manage and toggle global application themes (Dark, Light, or System).
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
   * @param {number}  x        - Horizontal origin of the ripple in px (clientX)
   * @param {number}  y        - Vertical origin of the ripple in px (clientY)
   */
  const setThemeAt = useCallback((newTheme) => {
    if (!document.startViewTransition) {
      setThemeState(newTheme)
      return
    }

    const root = document.documentElement

    // ── 1. Freeze CSS transitions before snapshot capture ────────────────────
    // Must be synchronous and BEFORE startViewTransition so the browser
    // captures a fully-settled colour state with no mid-transition values
    // bleeding into the snapshot and causing a glitchy first frame.
    root.classList.add('no-vt-transitions')

    // ── 2. Run View Transition ───────────────────────────────────────────────
    // The SVG blur-mask is always centred; no click coordinates needed.
    const transition = document.startViewTransition(() => {
      applyTheme(newTheme)
      setThemeState(newTheme)
    })

    // ── 3. Restore transitions once the ripple animation completes ───────────
    transition.finished.finally(() => {
      root.classList.remove('no-vt-transitions')
    })
  }, [applyTheme])


  return { theme, setTheme, setThemeAt }
}