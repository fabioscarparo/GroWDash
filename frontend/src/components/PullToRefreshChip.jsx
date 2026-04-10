/**
 * PullToRefreshChip.jsx — Global pull-to-refresh component.
 */
import { useRefresh } from '../context/RefreshContext'
import { RefreshCw } from 'lucide-react'
import { usePullToRefresh } from '../hooks/usePullToRefresh'

/**
 * PullToRefreshChip acts as a universal, gesture-driven global data refetch interface.
 * Operates autonomously at the application root level, intersecting Y-axis pan gestures bridging 
 * into a global React Context API (via `useRefresh`) to synchronize data updates synchronously across all mounted views.
 *
 * Implements an elastic, non-linear CSS displacement transform reflecting touch impedance 
 * and handles progressive visual feedback cues (spindle rotation, message snapping, color transitions).
 *
 * @component
 * @returns {JSX.Element} A fixed-position, z-elevated pill container driven by transform displacement.
 */
export default function PullToRefreshChip() {
  const { refresh, isRefreshing } = useRefresh()

  const { pulling, pullDistance, progress } = usePullToRefresh(refresh)

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
