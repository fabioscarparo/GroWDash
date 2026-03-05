/**
 * useGrowatt.js — TanStack Query hooks for the GroWDash API.
 *
 * Each hook corresponds to one backend endpoint.
 * Data is automatically cached and refreshed every 5 minutes
 * to match the Growatt API update interval.
 */

import { useQuery } from '@tanstack/react-query'
import { api } from '../api/growatt'

/**
 * Returns plant info — name, location, capacity, installation date.
 * Cached for 1 hour since plant info rarely changes.
 */
export function usePlantInfo() {
  return useQuery({
    queryKey: ['plant', 'info'],
    queryFn: api.getPlantInfo,
    staleTime: 60 * 60 * 1000,
  })
}

/**
 * Returns KPI overview — today, month, year, total energy and CO2 saved.
 */
export function useOverview() {
  return useQuery({
    queryKey: ['energy', 'overview'],
    queryFn: api.getOverview,
  })
}

/**
 * Returns today's full data — live power flow, daily totals,
 * inverter status and battery state.
 */
export function useToday() {
  return useQuery({
    queryKey: ['energy', 'today'],
    queryFn: api.getToday,
  })
}

/**
 * Returns 5-minute power snapshots for a date range (max 7 days).
 * Only runs when startDate is provided.
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 */
export function useHistory(startDate, endDate) {
  return useQuery({
    queryKey: ['energy', 'history', startDate, endDate],
    queryFn: () => api.getHistory(startDate, endDate),
    enabled: !!startDate,
  })
}

/**
 * Returns aggregated energy totals by day, month or year.
 * Only runs when startDate and timeUnit are provided.
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @param {string} timeUnit - Granularity: 'day', 'month' or 'year'
 */
export function useAggregate(startDate, endDate, timeUnit) {
  return useQuery({
    queryKey: ['energy', 'aggregate', startDate, endDate, timeUnit],
    queryFn: () => api.getAggregate(startDate, endDate, timeUnit),
    enabled: !!startDate && !!timeUnit,
  })
}

/**
 * Returns inverter technical details — model, firmware, status.
 */
export function useDeviceDetail() {
  return useQuery({
    queryKey: ['device', 'detail'],
    queryFn: api.getDeviceDetail,
  })
}

/**
 * Returns all inverter settings.
 */
export function useDeviceSettings() {
  return useQuery({
    queryKey: ['device', 'settings'],
    queryFn: api.getDeviceSettings,
  })
}

/**
 * Returns list of all devices connected to the plant.
 * Cached for 1 hour since the device list rarely changes.
 */
export function useDeviceList() {
  return useQuery({
    queryKey: ['device', 'list'],
    queryFn: api.getDeviceList,
    staleTime: 60 * 60 * 1000,
  })
}