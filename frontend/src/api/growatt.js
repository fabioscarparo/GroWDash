/**
 * Growatt API Client — Centralized data fetching layer for the GroWDash frontend.
 *
 * This module encapsulates all HTTP requests to the FastAPI backend. It leverages the
 * Fetch API and utilizes environment variables to determine the backend URL.
 * 
 * @module api/growatt
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Wrapper for the native `fetch` function that standardizes error handling
 * and JSON parsing.
 * 
 * @param {string} path - The backend API endpoint path (must start with '/').
 * @throws {Error} Throws an error if the HTTP response status is not OK (200-299).
 * @returns {Promise<any>} A promise that resolves to the parsed JSON payload.
 */
async function fetcher(path) {
  const res = await fetch(`${BASE_URL}${path}`, { 
    credentials: 'include' 
  })

  if (res.status === 401) {
    const error = new Error('Unauthorized')
    error.status = 401
    throw error
  }

  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

/**
 * The core API object exposing methods to interact with the backend services.
 */
export const api = {
  /**
   * Retrieves general information about the photovoltaic plant.
   * @returns {Promise<Object>} Plant data including name, location, capacity, and installation date.
   */
  getPlantInfo: () => fetcher('/plant/info'),

  /**
   * Retrieves the currently logged-in user session.
   */
  getMe: () => fetcher('/auth/me'),

  /**
   * Retrieves the high-level Key Performance Indicators (KPIs) for the plant.
   * @returns {Promise<Object>} Energy overview containing today, month, year, total energy yields, and CO2 saved.
   */
  getOverview: () => fetcher('/energy/overview'),

  /**
   * Retrieves detailed data for the current day.
   * @returns {Promise<Object>} Live power flow (W), daily totals (kWh), alongside inverter and battery operational status.
   */
  getToday: () => fetcher('/energy/today'),

  /**
   * Retrieves granular 5-minute power snapshots within a specific date range.
   * @param {string} startDate - The start date in 'YYYY-MM-DD' format.
   * @param {string} endDate - The end date in 'YYYY-MM-DD' format (maximum 7 days from start date).
   * @returns {Promise<Object>} Historical power data points for charting.
   */
  getHistory: (startDate, endDate) =>
    fetcher(`/energy/history?start_date=${startDate}&end_date=${endDate}`),

  /**
   * Retrieves historical energy totals aggregated by a specific time unit.
   * @param {string} startDate - The start date in 'YYYY-MM-DD' format.
   * @param {string} endDate - The end date in 'YYYY-MM-DD' format.
   * @param {string} timeUnit - The aggregation interval: 'day', 'month', or 'year'.
   * @returns {Promise<Object>} Aggregated energy metrics.
   */
  getAggregate: (startDate, endDate, timeUnit) =>
    fetcher(`/energy/aggregate?start_date=${startDate}&end_date=${endDate}&time_unit=${timeUnit}`),

  /**
   * Retrieves a comprehensive daily energy breakdown.
   * It includes solar generation, home consumption, grid import/export, and battery charge/discharge.
   * Note: There is no hard limit on the date range, as the backend automatically chunks requests.
   * @param {string} startDate - The start date in 'YYYY-MM-DD' format.
   * @param {string} endDate - The end date in 'YYYY-MM-DD' format.
   * @returns {Promise<Object>} Detailed daily breakdown arrays.
   */
  getDailyBreakdown: (startDate, endDate) =>
    fetcher(`/energy/daily-breakdown?start_date=${startDate}&end_date=${endDate}`),

  /**
   * Retrieves the technical technical details of the inverter(s).
   * @returns {Promise<Object>} Details such as the inverter model, firmware version, and connection status.
   */
  getDeviceDetail: () => fetcher('/device/detail'),

  /**
   * Retrieves the full configuration and settings of the inverter.
   * @returns {Promise<Object>} The current inverter settings and operational parameters.
   */
  getDeviceSettings: () => fetcher('/device/settings'),

  /**
   * Retrieves a list of all devices connected to the photovoltaic plant.
   * @returns {Promise<Object>} A list of connected devices (e.g., inverters, dataloggers).
   */
  getDeviceList: () => fetcher('/device/list'),
};