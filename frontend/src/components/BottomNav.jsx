/**
 * BottomNav.jsx — Futuristic 'iOS 26' Navigation Dock
 *
 * Implements a floating, high-gloss navigation dock inspired by modern iOS concepts.
 * Features ultra-glassmorphism, active state capsule highlighting, and 
 * dynamic label visibility for a minimal yet functional aesthetic.
 */

import { LayoutGrid, ChartLine, Info, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'history',  label: 'History',  icon: ChartLine  },
  { id: 'technical', label: 'Technical', icon: Info     },
  { id: 'account',  label: 'Account',  icon: User       },
]

/**
 * Renders the futuristic bottom dock.
 *
 * @component
 * @param {Object} props
 * @param {string} props.current - ID of the active tab.
 * @param {Function} props.onChange - Callback when a tab is clicked.
 */
export default function BottomNav({ current, onChange }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 pb-8 z-50 flex justify-center pointer-events-none">
      <div
        className="pointer-events-auto flex items-center gap-1.5 p-1.5
                   bg-white/70 dark:bg-[#1c1c1e]/80 backdrop-blur-3xl backdrop-saturate-[1.8]
                   border border-black/5 dark:border-white/10
                   rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)]"
      >
        {NAV_ITEMS.map(({ id, icon, label }) => {
          const IconComponent = icon
          const active = current === id
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={cn(
                "relative flex items-center gap-2.5 px-4 py-3 rounded-full transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-90",
                active
                  ? "bg-primary text-white shadow-[0_10px_20px_rgba(0,113,227,0.3)]"
                  : "text-muted-foreground/60 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5"
              )}
              onPointerDown={(e) => e.preventDefault()}
              tabIndex={-1}
            >
              <div className="flex items-center justify-center">
                <IconComponent
                  size={20}
                  strokeWidth={active ? 2.5 : 2}
                  className={cn(
                    "transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]",
                    active ? "scale-110" : "scale-100"
                  )}
                />
              </div>
              
              {/* Dynamic Label - Only visible when active for that minimal iOS 26 look */}
              {active && (
                <span className="text-[13px] font-semibold tracking-tight animate-in slide-in-from-left-3 fade-in duration-500 ease-out whitespace-nowrap">
                  {label}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
