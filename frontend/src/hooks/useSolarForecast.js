/**
 * useSolarForecast.js — Backend GTI forecast hook.
 *
 * Fetches today's hourly Global Tilted Irradiance (GTI) forecast 
 * from the GroWDash backend (which proxies Open-Meteo).
 * 
 * It no longer requires coordinates as parameters, as the backend 
 * retrieves them from the plant configuration.
 *
 * @module hooks/useSolarForecast
 */

import { useQuery } from '@tanstack/react-query'
import { api } from '../api/growatt'

/**
 * React Query hook that returns today's hourly GTI forecast.
 *
 * @function useSolarForecast
 * @param {{ tilt: number, azimuth: number }} params
 * @returns {import('@tanstack/react-query').UseQueryResult}
 */
export function useSolarForecast({ tilt, azimuth }) {
  return useQuery({
    queryKey: ['solar-forecast', tilt, azimuth],
    queryFn:  () => api.getSolarForecast(tilt, azimuth),
    
    // Data is considered fresh for 1 hour to avoid excessive backend requests.
    // This matches the backend cache TTL.
    staleTime:      60 * 60 * 1000, 
    refetchInterval: 60 * 60 * 1000,
  })
}