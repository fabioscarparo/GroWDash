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
 * @module hooks/useTheme
 */

import { useState, useEffect } from 'react'

/**
 * A custom hook to manage and toggle global application themes (Dark vs. Light).
 *
 * A custom hook to manage and toggle global application themes (Dark, Light, or System).
 *
 * @returns {{ theme: string, setTheme: Function }} An object containing:
 *   - `theme`: The currently active theme string (`'dark'`, `'light'`, or `'system'`).
 *   - `setTheme`: A function to set the active theme state.
 */
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'system'
  })

  useEffect(() => {
    const root = document.documentElement

    const applyTheme = (currentTheme) => {
      let resolvedTheme = currentTheme

      if (currentTheme === 'system') {
        resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      }

      if (resolvedTheme === 'dark') {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }

    applyTheme(theme)
    localStorage.setItem('theme', theme)

    // Listener for system theme changes
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => applyTheme('system')
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme])

  return { theme, setTheme }
}