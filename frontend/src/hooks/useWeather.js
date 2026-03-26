/**
 * useWeather.js — Open-Meteo weather integration.
 *
 * This hook fetches real-time meteorological current conditions, alongside daily 
 * forecast boundaries, from the free Open-Meteo API. It utilizes the PV plant's
 * configured geographic coordinates (latitude and longitude) to deliver hyper-local 
 * environmental context on the main dashboard.
 *
 * @module hooks/useWeather
 */

import { useQuery } from '@tanstack/react-query'

/**
 * Executes a network fetch against the Open-Meteo V1 Forecast API.
 * Requests a highly specific payload tailored exclusively for the dashboard's needs:
 * - Current conditions: temperature, apparent "feels like" temp, weather code, cloud cover, and wind.
 * - Daily forecast (1 day bounds): max/min temperatures, precipitation probabilities.
 *
 * @async
 * @param {number} lat - The geographic latitude coordinate of the PV plant.
 * @param {number} lon - The geographic longitude coordinate of the PV plant.
 * @returns {Promise<Object>} The resolved JSON payload containing raw weather telemetry.
 * @throws {Error} Throws if the underlying network response fails or returns non-OK status.
 */
async function fetchWeather(lat, lon) {
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', lat)
  url.searchParams.set('longitude', lon)
  url.searchParams.set('current', [
    'temperature_2m',
    'apparent_temperature',
    'weathercode',
    'cloudcover',
    'windspeed_10m',
    'is_day',
  ].join(','))
  url.searchParams.set('daily', [
    'temperature_2m_max',
    'temperature_2m_min',
    'weathercode',
    'precipitation_probability_max',
  ].join(','))
  url.searchParams.set('hourly', [
    'temperature_2m',
    'weathercode',
    'precipitation_probability',
  ].join(','))
  url.searchParams.set('timezone', 'auto')
  url.searchParams.set('forecast_days', '2')

  const res = await fetch(url)
  if (!res.ok) throw new Error('Weather fetch failed')
  return res.json()
}

/**
 * A custom React hook wrapping TanStack Query's caching engine to manage the
 * asynchronous fetching and persistent background polling of weather data.
 *
 * The query is dynamically disabled (`enabled: false`) if coordinate props are missing
 * (e.g., while the plant info itself is still loading).
 *
 * @param {number} lat - The geographic latitude component.
 * @param {number} lon - The geographic longitude component.
 * @returns {import('@tanstack/react-query').UseQueryResult} The TanStack Query result object providing loading states and weather data.
 */
export function useWeather(lat, lon) {
  return useQuery({
    queryKey: ['weather', lat, lon],
    queryFn: () => fetchWeather(lat, lon),
    enabled: !!lat && !!lon,

    // Treat weather data as "fresh" (preventing silent background refetches across UI mounts)
    // for exactly 15 minutes to respect Open-Meteo rate limits while remaining practically accurate.
    staleTime: 15 * 60 * 1000,

    // Automatically poll the endpoint every 15 minutes as long as the page remains open.  
    refetchInterval: 15 * 60 * 1000,
  })
}