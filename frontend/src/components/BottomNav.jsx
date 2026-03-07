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
                 bg-card border-t border-border"
      style={{ height: '56px', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {NAV_ITEMS.map(({ id, icon: Icon }) => {
        const active = current === id
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className="flex flex-col items-center justify-center gap-1 w-16 h-full
                       border-none bg-transparent cursor-pointer"
          >
            <Icon
              size={20}
              strokeWidth={active ? 2.5 : 1.8}
              style={{ color: active ? '#006fff' : 'hsl(var(--muted-foreground))' }}
            />
            <div
              className="rounded-full transition-all duration-300"
              style={{
                width: active ? '20px' : '0px',
                height: '2px',
                backgroundColor: active ? '#006fff' : 'transparent',
              }}
            />
          </button>
        )
      })}
    </nav>
  )
}