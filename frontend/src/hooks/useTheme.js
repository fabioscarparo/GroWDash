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
 * @returns {{ theme: string, toggle: Function }} An object containing:
 *   - `theme`: The currently active theme string (`'dark'` or `'light'`).
 *   - `toggle`: A stable function to invert the active theme state.
 */
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    // Attempt to hydrate persistence state first
    const stored = localStorage.getItem('theme')
    if (stored) return stored
    
    // Fall back to sniffing the OS-level browser preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    const root = document.documentElement
    
    // Mutate the root DOM element to trigger global Tailwind cascading color shifts
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    
    // Persist the choice so returning users aren't flashed with the wrong mode
    localStorage.setItem('theme', theme)
  }, [theme])

  /**
   * Reverses the currently active theme setting.
   */
  function toggle() {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  return { theme, toggle }
}