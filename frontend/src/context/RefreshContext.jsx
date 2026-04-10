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
 * Translates explicit JavaScript temporal Date primitives into localized short time-strings truncating seconds.
 * 
 * @function formatTime
 * @param {Date} date - An explicitly mapped absolute datetime instance.
 * @returns {string} Truncated string formatted optimally strictly as "HH:MM".
 */
const formatTime = (date) => {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

/**
 * RefreshProvider wraps downstream contexts intercepting universally cascaded explicit refetch signals 
 * mapping them into the instantiated TanStack Query caching nodes. Maintains last-pull tracking to indicate staleness visually.
 *
 * @component
 * @param {object} props - The component settings.
 * @param {JSX.Element} props.children - Bound scoped tree inheriting context context payloads.
 * @returns {JSX.Element} Exposes refresh endpoints broadly across descendants.
 */
export function RefreshProvider({ children }) {
  const queryClient = useQueryClient()
  
  const [lastUpdate, setLastUpdate] = useState(() => formatTime(new Date()))
  const [isRefreshing, setIsRefreshing] = useState(false)

  /**
   * An exposed callback strictly blasting invalidation endpoints cascading forced query purges 
   * against the root TanStack server state tree, actively mitigating polling lags upon user explicit swipe mandates.
   * Mutates global temporal trackers matching successful invalidation completions.
   *
   * @function refresh
   * @async
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
 * Provides instantaneous consumption logic referencing the RefreshContext properties.
 * Exposes methods inherently required to drive PullToRefresh integrations synchronously triggering QueryClient invalidation routines.
 *
 * @function useRefresh
 * @throws {Error} Context invocation absent a wrapping Provider node.
 * @returns {{ lastUpdate: string, isRefreshing: boolean, refresh: function(): Promise<void> }} Destructured tracking mapping bindings hook.
 */
export function useRefresh() {
  const context = useContext(RefreshContext)
  if (!context) {
    throw new Error('useRefresh must be used within a RefreshProvider')
  }
  return context
}
