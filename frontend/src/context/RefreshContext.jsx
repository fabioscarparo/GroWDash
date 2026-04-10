/**
 * RefreshContext.jsx — Global state for manual data synchronization.
 *
 * This context manages the "Last Update" timestamp and the loading state
 * for user-initiated data refreshes (e.g., Pull-to-Refresh).
 *
 * Centralizing this state ensures that when a refresh is triggered from a
 * global component like PullToRefreshChip, all observer pages (like Overview)
 * can immediately update their "Updated at" display.
 *
 * @module context/RefreshContext
 */

import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'

const RefreshContext = createContext(null)

/**
 * Formats a Date object into a HH:MM string.
 * @param {Date} date 
 * @returns {string} locale time string
 */
const formatTime = (date) => {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

/**
 * RefreshProvider wraps the app to provide data sync state.
 */
export function RefreshProvider({ children }) {
  const queryClient = useQueryClient()
  
  const [lastUpdate, setLastUpdate] = useState(() => formatTime(new Date()))
  const [isRefreshing, setIsRefreshing] = useState(false)

  /**
   * Refreshes all application data by invalidating TanStack Query caches.
   * Updates the global timestamp upon completion.
   */
  const refresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      // Invalidates all queries in the cache to force a global data reload.
      // We pass the key if we want to target specific data, but global is safer for PTR.
      await queryClient.invalidateQueries()
      setLastUpdate(formatTime(new Date()))
    } catch (error) {
      console.error('Refresh failed:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [queryClient])

  const value = useMemo(() => ({
    lastUpdate,
    isRefreshing,
    refresh
  }), [lastUpdate, isRefreshing, refresh])

  return (
    <RefreshContext.Provider value={value}>
      {children}
    </RefreshContext.Provider>
  )
}

/**
 * Hook to consume the RefreshContext.
 * @returns {{ lastUpdate: string, isRefreshing: boolean, refresh: Function }}
 */
export function useRefresh() {
  const context = useContext(RefreshContext)
  if (!context) {
    throw new Error('useRefresh must be used within a RefreshProvider')
  }
  return context
}
