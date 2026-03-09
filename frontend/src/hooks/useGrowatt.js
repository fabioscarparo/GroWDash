/**
 * useGrowatt.js — TanStack Query hooks for the GroWDash API.
 *
 * Data is automatically cached and refreshed every 5 minutes
 * to match the Growatt API update interval.
 */

import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { api } from '../api/growatt'

// 5 minutes in milliseconds — matches Growatt API update interval
const REFRESH_INTERVAL = 5 * 60 * 1000

export function usePlantInfo() {
  return useQuery({
    queryKey: ['plant', 'info'],
    queryFn: api.getPlantInfo,
    refetchInterval: REFRESH_INTERVAL,
  })
}

export function useOverview() {
  return useQuery({
    queryKey: ['energy', 'overview'],
    queryFn: api.getOverview,
    refetchInterval: REFRESH_INTERVAL,
  })
}

export function useToday() {
  return useQuery({
    queryKey: ['energy', 'today'],
    queryFn: api.getToday,
    refetchInterval: REFRESH_INTERVAL,
  })
}

export function useHistory(startDate, endDate) {
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const isToday = startDate === todayStr

  return useQuery({
    queryKey: ['energy', 'history', startDate, endDate],
    queryFn: () => api.getHistory(startDate, endDate),
    enabled: !!startDate,
    refetchInterval: isToday ? REFRESH_INTERVAL : false,
  })
}

export function useAggregate(startDate, endDate, timeUnit) {
  return useQuery({
    queryKey: ['energy', 'aggregate', startDate, endDate, timeUnit],
    queryFn: () => api.getAggregate(startDate, endDate, timeUnit),
    enabled: !!startDate && !!endDate && !!timeUnit,
    refetchInterval: REFRESH_INTERVAL,
  })
}

/**
 * Returns daily energy breakdown for all power flows, reconstructed
 * from 5-minute snapshots. Supports arbitrary date ranges — the service
 * layer handles chunking automatically.
 *
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate   - End date in YYYY-MM-DD format
 */
export function useDailyBreakdown(startDate, endDate) {
  return useQuery({
    queryKey: ['energy', 'daily-breakdown', startDate, endDate],
    queryFn: () => api.getDailyBreakdown(startDate, endDate),
    enabled: !!startDate && !!endDate,
    placeholderData: keepPreviousData,
  })
}

export function useDeviceDetail() {
  return useQuery({
    queryKey: ['device', 'detail'],
    queryFn: api.getDeviceDetail,
    refetchInterval: REFRESH_INTERVAL,
  })
}

export function useDeviceSettings() {
  return useQuery({
    queryKey: ['device', 'settings'],
    queryFn: api.getDeviceSettings,
  })
}

export function useDeviceList() {
  return useQuery({
    queryKey: ['device', 'list'],
    queryFn: api.getDeviceList,
    refetchInterval: REFRESH_INTERVAL,
  })
}