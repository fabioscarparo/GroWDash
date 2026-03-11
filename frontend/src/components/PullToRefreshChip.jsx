import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { usePullToRefresh } from '../hooks/usePullToRefresh'

/**
 * PullToRefreshChip provides a pull-to-refresh mechanism available on all pages.
 * It manages both the gesture logic and the visual spinner.
 */
export default function PullToRefreshChip() {
  const queryClient = useQueryClient()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    // Invalidates all queries in the cache to force a global data reload
    await queryClient.invalidateQueries()
    setIsRefreshing(false)
  }, [queryClient])

  const { pulling, pullDistance, progress } = usePullToRefresh(handleRefresh)

  // Determine visibility states to fix the "shadow always visible" issue
  const isVisible = pulling || isRefreshing || progress > 0
  const activeTranslation = isRefreshing 
    ? 'translateY(12px)' 
    : `translateY(calc(-100% + ${pullDistance}px))`

  return (
    <div
      className="fixed left-0 right-0 z-[100] flex justify-center pointer-events-none transition-all duration-300"
      style={{
        top: 0,
        transform: activeTranslation,
        // Hide completely when inactive to prevent shadow from leaking
        opacity: isVisible ? 1 : 0,
        visibility: isVisible ? 'visible' : 'hidden',
        transition: pulling ? 'none' : 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease-in-out',
      }}
    >
      <div
        className="bg-card border border-border rounded-full px-3 py-1.5 shadow-md flex items-center gap-2"
        style={{
          animation: progress >= 0.9 && !isRefreshing ? 'ptr-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
        }}
      >
        <RefreshCw
          size={14}
          className={isRefreshing ? 'text-primary' : progress >= 0.9 ? 'text-primary' : 'text-muted-foreground'}
          style={{
            animation: isRefreshing
              ? 'spin 0.8s linear infinite'
              : progress >= 0.9
                ? 'ptr-wiggle 0.4s ease-out'
                : 'none',
            transform: (!isRefreshing && progress < 0.9)
              ? `rotate(${progress * 360}deg)`
              : undefined,
          }}
        />
        <span
          key={isRefreshing ? 'refreshing' : progress >= 0.9 ? 'release' : 'pull'}
          className="text-xs text-muted-foreground"
          style={{ animation: 'ptr-text-in 0.2s ease-out' }}
        >
          {isRefreshing ? 'Updating...' : progress >= 0.9 ? 'Release to refresh' : 'Pull to refresh'}
        </span>
      </div>
    </div>
  )
}
