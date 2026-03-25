/**
 * useSolarForecast.js — Open-Meteo Global Tilted Irradiance (GTI) hook.
 *
 * Fetches today's hourly GTI forecast from Open-Meteo using the plant's
 * geographic coordinates and the user's panel orientation settings.
 *
 * Open-Meteo azimuth convention: 0=south, -90=east, 90=west, 180=north.
 * We store azimuth as a standard compass bearing (0=N, 90=E, 180=S, 270=W)
 * and convert at fetch time.
 *
 * Endpoint reference:
 *   https://open-meteo.com/en/docs#hourly=global_tilted_irradiance&tilt=30&azimuth=0
 *
 * @module hooks/useSolarForecast
 */

import { useQuery } from '@tanstack/react-query'

/**
 * Converts a compass bearing (0=N, 90=E, 180=S, 270=W) to the
 * Open-Meteo azimuth convention (0=S, -90=E, 90=W, ±180=N).
 *
 * @param {number} compassDeg
 * @returns {number} Open-Meteo azimuth in degrees
 */
function compassToOpenMeteo(compassDeg) {
  let om = compassDeg - 180
  if (om > 180) om -= 360
  if (om < -180) om += 360
  return om
}

/**
 * Fetches hourly GTI (W/m²) for the current day from Open-Meteo.
 *
 * @param {{ lat: number, lon: number, tilt: number, azimuth: number }} params
 * @returns {Promise<object>} Raw Open-Meteo JSON response
 */
async function fetchSolarForecast({ lat, lon, tilt, azimuth }) {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude',  lat)
  url.searchParams.set('longitude', lon)
  url.searchParams.set('hourly',    'global_tilted_irradiance')
  url.searchParams.set('tilt',      tilt)
  url.searchParams.set('azimuth',   compassToOpenMeteo(azimuth))
  url.searchParams.set('timezone',  'auto')
  url.searchParams.set('forecast_days', '1')

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Solar forecast fetch failed: ${res.status}`)
  return res.json()
}

/**
 * React Query hook that returns today's hourly GTI forecast.
 *
 * The query is disabled until lat/lon are available (i.e. while
 * plant info is loading). Data is considered fresh for 1 hour
 * to avoid hammering Open-Meteo — the irradiance forecast for
 * today does not change meaningfully more frequently than that.
 *
 * @param {{ lat: number|null, lon: number|null, tilt: number, azimuth: number }} params
 * @returns {import('@tanstack/react-query').UseQueryResult}
 */
export function useSolarForecast({ lat, lon, tilt, azimuth }) {
  return useQuery({
    queryKey: ['solar-forecast', lat, lon, tilt, azimuth],
    queryFn:  () => fetchSolarForecast({ lat, lon, tilt, azimuth }),
    enabled:  !!(lat && lon),
    staleTime:      60 * 60 * 1000, // 1 hour
    refetchInterval: 60 * 60 * 1000,
  })
}