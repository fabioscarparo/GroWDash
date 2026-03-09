/**
 * growatt.js — API client for the GroWDash backend.
 *
 * All backend calls go through this file.
 * The base URL is read from the VITE_API_URL environment variable,
 * falling back to localhost:8000 for local development.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

/**
 * Base fetcher — throws an error if the response is not ok.
 * @param {string} path - API endpoint path
 * @returns {Promise<any>} Parsed JSON response
 */
async function fetcher(path) {
  const res = await fetch(`${BASE_URL}${path}`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export const api = {
  // Returns plant name, location, capacity and installation date
  getPlantInfo: () => fetcher('/plant/info'),

  // Returns KPI summary: today, month, year, total energy and CO2 saved
  getOverview: () => fetcher('/energy/overview'),

  // Returns live power flow (W), daily totals (kWh), inverter and battery status
  getToday: () => fetcher('/energy/today'),

  // Returns 5-minute power snapshots for a date range (max 7 days)
  getHistory: (startDate, endDate) =>
    fetcher(`/energy/history?start_date=${startDate}&end_date=${endDate}`),

  // Returns aggregated energy totals by day, month or year
  getAggregate: (startDate, endDate, timeUnit) =>
    fetcher(`/energy/aggregate?start_date=${startDate}&end_date=${endDate}&time_unit=${timeUnit}`),

  // Returns full daily energy breakdown (solar, home, grid, battery) for a date range.
  // No hard limit on range — the backend handles chunking automatically.
  getDailyBreakdown: (startDate, endDate) =>
    fetcher(`/energy/daily-breakdown?start_date=${startDate}&end_date=${endDate}`),

  // Returns inverter technical details (model, firmware, status)
  getDeviceDetail: () => fetcher('/device/detail'),

  // Returns all inverter settings
  getDeviceSettings: () => fetcher('/device/settings'),

  // Returns list of all devices connected to the plant
  getDeviceList: () => fetcher('/device/list'),
}