/**
 * NavHeader.jsx — Top navigation bar for the dashboard shell.
 *
 * Provides a unified, sticky navigation experience with a translucent glass effect.
 * Works together with the mobile bottom nav to keep navigation consistent.
 */

import { Sun, Moon, LogOut, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview' },
  { id: 'history', label: 'History' },
  { id: 'technical', label: 'Technical Info' },
]

/**
 * Renders the nav header component.
 */
export default function NavHeader({ current, onChange, theme, onToggleTheme, user, onLogout }) {
  return (
    <nav className="glass-nav h-[56px] md:h-[52px] flex items-center justify-center px-4 md:px-6">
      <div className="max-w-[980px] w-full flex items-center justify-between">
        
        {/* Logo / Brand */}
        <div 
          className="flex items-center gap-2.5 cursor-pointer group"
          onClick={() => onChange('overview')}
        >
          <img 
            src="/favicon.svg" 
            alt="GroWDash Logo" 
            className="w-6 h-6 rounded-[22%]"
          />
          <span className="hidden sm:inline font-semibold text-[14px] tracking-tight text-foreground/90 dark:text-white/90">
            GroWDash
          </span>
        </div>

        {/* Desktop Links */}
        <ul className="hidden md:flex items-center gap-8 translate-x-[20px]">
          {NAV_ITEMS.map(({ id, label }) => (
            <li key={id}>
              <button
                onClick={() => onChange(id)}
                className={cn(
                  "text-[12px] font-normal transition-colors hover:text-foreground dark:hover:text-white",
                  current === id 
                    ? "text-foreground dark:text-white font-medium" 
                    : "text-foreground/60 dark:text-white/60"
                )}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>

        {/* Right Actions */}
        <div className="flex items-center gap-2 md:gap-4">
          
          <button 
            onClick={(e) => onToggleTheme(e)}
            className="w-8 h-8 flex items-center justify-center rounded-full text-foreground/70 dark:text-white/70 hover:text-foreground dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={16} strokeWidth={1.5} /> : <Moon size={16} strokeWidth={1.5} />}
          </button>

          {user && (
            <button 
              onClick={() => onChange('account')}
              className="hidden md:flex items-center gap-2 text-foreground/60 dark:text-white/60 hover:text-foreground dark:hover:text-white transition-colors"
            >
              <User size={16} strokeWidth={1.5} />
              <span className="text-[12px] font-normal max-w-[80px] truncate">{user.username}</span>
            </button>
          )}

          <button 
            onClick={onLogout}
            className="hidden md:flex w-8 h-8 items-center justify-center rounded-full text-foreground/60 dark:text-white/60 hover:text-destructive hover:bg-destructive/10 transition-colors"
            aria-label="Logout"
          >
            <LogOut size={16} strokeWidth={1.5} />
          </button>
        </div>

      </div>
    </nav>
  )
}
