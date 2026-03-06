/**
 * BottomNav.jsx — Mobile bottom navigation bar
 *
 * Displays four navigation items at the bottom of the screen.
 * The active item is highlighted with the primary accent color.
 *
 * On desktop (md+) this will be replaced by a sidebar — coming soon.
 *
 * Safe area inset is respected via paddingBottom to support
 * devices with a home indicator (iPhone X and later).
 */

import { LayoutGrid, ChartLine, Cpu, Settings } from 'lucide-react'

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'history',  label: 'History',  icon: ChartLine  },
  { id: 'device',   label: 'Device',   icon: Cpu        },
  { id: 'settings', label: 'Settings', icon: Settings   },
]

export default function BottomNav({ current, onChange }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around
                 bg-background border-t border-border"
      style={{ height: '64px', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
        const active = current === id
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className="flex flex-col items-center gap-1 px-4 py-2 border-none bg-transparent
                       cursor-pointer transition-colors duration-150"
            style={{ color: active ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}
          >
            <Icon
              size={22}
              strokeWidth={active ? 2 : 1.8}
            />
            <span style={{
              fontSize: '10px',
              fontWeight: active ? 600 : 400,
              letterSpacing: '0.02em',
            }}>
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}