/**
 * useWeather.js — Fetches current weather and today's forecast from Open-Meteo.
 *
 * Uses the plant's coordinates from /plant/info.
 */

import { useQuery } from '@tanstack/react-query'

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
  url.searchParams.set('timezone', 'auto')
  url.searchParams.set('forecast_days', '1')

  const res = await fetch(url)
  if (!res.ok) throw new Error('Weather fetch failed')
  return res.json()
}

export function useWeather(lat, lon) {
  return useQuery({
    queryKey: ['weather', lat, lon],
    queryFn: () => fetchWeather(lat, lon),
    enabled: !!lat && !!lon,
    staleTime: 15 * 60 * 1000,   // 15 minutes
    refetchInterval: 15 * 60 * 1000,
  })
}