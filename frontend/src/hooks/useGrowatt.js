/**
 * useGrowatt.js — TanStack Query hooks for the GroWDash API.
 *
 * This module provides custom React hooks wrapping the TanStack Query library 
 * for fetching data from the local FastAPI backend.
 * Data is automatically cached, and queries are strategically configured to poll
 * and refresh every 5 minutes, carefully mimicking the official Growatt API update interval
 * to avoid stale data while limiting unnecessary network traffic.
 *
 * @module hooks/useGrowatt
 */

import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { api } from '../api/growatt'

/** 
 * Polling interval (5 minutes) in milliseconds.
 * Matches the Growatt API update Interval
 * @constant {number}
 */
const REFRESH_INTERVAL = 5 * 60 * 1000

/**
 * Hook to retrieve general static information about the PV plant.
 *
 * @returns {import('@tanstack/react-query').UseQueryResult} TanStack Query result object containing plant metadata (name, geolocation, capacity).
 */
export function usePlantInfo() {
  return useQuery({
    queryKey: ['plant', 'info'],
    queryFn: api.getPlantInfo,
    refetchInterval: REFRESH_INTERVAL,
  })
}

/**
 * Hook to retrieve high-level cumulative KPIs (Key Performance Indicators) for the entire plant.
 * Useful for displaying today's energy totals, monthly/yearly generated values, and CO2 offset.
 *
 * @returns {import('@tanstack/react-query').UseQueryResult} TanStack Query result containing the energy overview metrics.
 */
export function useOverview() {
  return useQuery({
    queryKey: ['energy', 'overview'],
    queryFn: api.getOverview,
    refetchInterval: REFRESH_INTERVAL,
  })
}

/**
 * Hook to retrieve real-time telemetry and today's accumulated energy status.
 * This includes live power flow (solar, home, battery, grid) and battery state of charge (SOC).
 *
 * @returns {import('@tanstack/react-query').UseQueryResult} TanStack Query result detailing today's live energy vectors.
 */
export function useToday() {
  return useQuery({
    queryKey: ['energy', 'today'],
    queryFn: api.getToday,
    refetchInterval: REFRESH_INTERVAL,
  })
}

/**
 * Hook to retrieve the 5-minute snapshot history of generated power curves over a date span.
 * If the requested span includes "today", the query will automatically enable 5-minute background polling.
 *
 * @param {string} startDate - The start date string in 'YYYY-MM-DD' format.
 * @param {string} endDate - The end date string in 'YYYY-MM-DD' format.
 * @returns {import('@tanstack/react-query').UseQueryResult} TanStack Query result containing the timeline plot points.
 */
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

/**
 * Hook to retrieve historical energy generation grouped into aggregated time buckets (per day, per month, or per year).
 * Note: This endpoint tracks strictly solar generation volumes, not net export or consumption.
 *
 * @param {string} startDate - The start boundary date in 'YYYY-MM-DD' format.
 * @param {string} endDate - The end boundary date in 'YYYY-MM-DD' format.
 * @param {number} timeUnit - The grouping granularity (1=day, 2=month, 3=year).
 * @returns {import('@tanstack/react-query').UseQueryResult} TanStack Query result with aggregated charting data.
 */
export function useAggregate(startDate, endDate, timeUnit) {
  return useQuery({
    queryKey: ['energy', 'aggregate', startDate, endDate, timeUnit],
    queryFn: () => api.getAggregate(startDate, endDate, timeUnit),
    enabled: !!startDate && !!endDate && !!timeUnit,
    refetchInterval: REFRESH_INTERVAL,
  })
}

/**
 * Hook that retrieves a comprehensive reconstructed daily breakdown of ALL energy flows
 * (production, consumption, import, export, battery charge/discharge) across a date span.
 * It is reconstructed manually from snapshots by the backend, thus `placeholderData` is kept
 * to prevent jarring UI state changes during large multi-day chart navigations.
 *
 * @param {string} startDate - The start date in 'YYYY-MM-DD' format.
 * @param {string} endDate   - The end date in 'YYYY-MM-DD' format.
 * @returns {import('@tanstack/react-query').UseQueryResult} TanStack Query result containing the complete multi-vector daily breakdowns.
 */
export function useDailyBreakdown(startDate, endDate) {
  return useQuery({
    queryKey: ['energy', 'daily-breakdown', startDate, endDate],
    queryFn: () => api.getDailyBreakdown(startDate, endDate),
    enabled: !!startDate && !!endDate,
    placeholderData: keepPreviousData,
  })
}

/**
 * Hook to retrieve deep technical metadata regarding the primary inverter system.
 * Includes firmware versions, nominal capacities, and datalogger references.
 *
 * @returns {import('@tanstack/react-query').UseQueryResult} TanStack Query result containing the inverter specifications.
 */
export function useDeviceDetail() {
  return useQuery({
    queryKey: ['device', 'detail'],
    queryFn: api.getDeviceDetail,
    refetchInterval: REFRESH_INTERVAL,
  })
}

/**
 * Hook to fetch the mutable parameters array and configuration settings map of the inverter.
 * These govern operational rules like grid-tie limits, battery load priorities, and phase boundaries.
 * 
 * Note: Settings are relatively static, so automatic polling is omitted here to save bandwidth.
 *
 * @returns {import('@tanstack/react-query').UseQueryResult} TanStack Query result containing the raw inverter settings dictionary.
 */
export function useDeviceSettings() {
  return useQuery({
    queryKey: ['device', 'settings'],
    queryFn: api.getDeviceSettings,
  })
}

/**
 * Hook to retrieve a manifest list of all hardware devices physically or logically connected to the plant.
 * Usually indicates the main inverter and attached dongles or meters, including their online/offline heartbeat status.
 *
 * @returns {import('@tanstack/react-query').UseQueryResult} TanStack Query result detailing connected devices and their types.
 */
export function useDeviceList() {
  return useQuery({
    queryKey: ['device', 'list'],
    queryFn: api.getDeviceList,
    refetchInterval: REFRESH_INTERVAL,
  })
}