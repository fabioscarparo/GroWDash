/**
 * useWeather.js — Backend weather integration.
 *
 * This hook fetches real-time meteorological current conditions, alongside daily 
 * forecast boundaries, from the GroWDash backend (which proxies Open-Meteo).
 * 
 * It no longer requires coordinates as parameters, as the backend retrieves 
 * them from the plant configuration.
 *
 * @module hooks/useWeather
 */

import { useQuery } from '@tanstack/react-query'
import { api } from '../api/growatt'

/**
 * A custom React hook wrapping TanStack Query's caching engine to manage the
 * asynchronous fetching and persistent background polling of weather data.
 *
 * @function useWeather
 * @returns {import('@tanstack/react-query').UseQueryResult} The TanStack Query result object providing loading states and weather data.
 */
export function useWeather() {
  return useQuery({
    queryKey: ['weather'],
    queryFn: api.getWeather,

    // Treat weather data as "fresh" for exactly 15 minutes.
    // This matches the backend cache TTL.
    staleTime: 15 * 60 * 1000,

    // Automatically poll the endpoint every 15 minutes as long as the page remains open.  
    refetchInterval: 15 * 60 * 1000,
  })
}