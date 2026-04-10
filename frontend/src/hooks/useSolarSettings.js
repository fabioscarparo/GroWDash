/**
 * useSolarSettings.js — Solar panel orientation settings manager.
 *
 * Stores panel tilt, azimuth and performance ratio in localStorage,
 * mirroring the same pattern used by useTheme.js.
 *
 * Settings are used by useSolarForecast to obtain an accurate
 * Global Tilted Irradiance (GTI) estimate from Open-Meteo.
 *
 * @module hooks/useSolarSettings
 */

import { useState } from 'react'

const STORAGE_KEY = 'growdash_solar_settings'

/**
 * Default panel settings — south-facing 30° tilt, 80% system efficiency.
 * These match a typical residential rooftop installation in Central/Southern Europe.
 */
export const SOLAR_SETTINGS_DEFAULTS = {
  tilt: 30,             // degrees from horizontal (0=flat, 90=vertical)
  azimuth: 180,         // compass bearing (0=N, 90=E, 180=S, 270=W)
  performanceRatio: 0.80, // system efficiency (inverter, wiring, temperature losses)
}

/**
 * Custom hook to persist solar panel settings in localStorage.
 *
 * @function useSolarSettings
 * @returns {{ settings: object, updateSettings: function }} Settings object and updater.
 */
export function useSolarSettings() {
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return SOLAR_SETTINGS_DEFAULTS
      return { ...SOLAR_SETTINGS_DEFAULTS, ...JSON.parse(stored) }
    } catch {
      return SOLAR_SETTINGS_DEFAULTS
    }
  })

  /**
   * Merges a partial settings patch and persists to localStorage.
   * @param {Partial<typeof SOLAR_SETTINGS_DEFAULTS>} patch
   */
  const updateSettings = (patch) => {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // localStorage may be unavailable in some private browsing modes
      }
      return next
    })
  }

  return { settings, updateSettings }
}