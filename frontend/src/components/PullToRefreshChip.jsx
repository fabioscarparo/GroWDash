/**
 * PullToRefreshChip.jsx — Global pull-to-refresh component.
 */
import { useRefresh } from '../context/RefreshContext'
import { RefreshCw } from 'lucide-react'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import { cn } from '@/lib/utils'

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
    ? 'translateY(24px)' 
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
        className="bg-background/80 backdrop-blur-md border border-border/50 rounded-full w-9 h-9 shadow-[0_4px_16px_rgba(0,0,0,0.1)] flex items-center justify-center"
        style={{
          animation: progress >= 0.9 && !isRefreshing ? 'ptr-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
        }}
      >
        <RefreshCw
          size={18}
          className={cn(
            "transition-colors duration-200",
            isRefreshing || progress >= 0.9 ? 'text-primary' : 'text-muted-foreground'
          )}
          style={{
            animation: isRefreshing
              ? 'spin 1s linear infinite'
              : progress >= 0.9
                ? 'ptr-wiggle 0.4s ease-out'
                : 'none',
            transform: (!isRefreshing && progress < 0.9)
              ? `rotate(${progress * 360}deg)`
              : undefined,
          }}
        />
      </div>
    </div>
  )
}
