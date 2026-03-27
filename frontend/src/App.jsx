/**
 * App.jsx — Root application component.
 *
 * Handles page routing, navigation, theme management and layout.
 *
 * ── Layout ────────────────────────────────────────────────────────────────────
 *
 *   Desktop (md+):
 *     Collapsible sidebar on the left, main content area on the right.
 *     The sidebar contains navigation items and a theme toggle in the footer.
 *
 *   Mobile:
 *     Full-width content area with a fixed bottom navigation bar.
 *     A floating button above the bottom nav handles theme toggling.
 *
 * ── Navigation ────────────────────────────────────────────────────────────────
 *
 *   Three input methods all call the same navigate() function:
 *     - Sidebar menu items (desktop)
 *     - BottomNav icon buttons (mobile)
 *     - Horizontal swipe gesture (mobile, via useSwipeNavigation)
 *
 *   Pages are ordered in PAGE_ORDER. The relative position of the current
 *   and target page determines the slide direction:
 *     forward (higher index) → left
 *     backward (lower index) → right
 *
 * ── Page transitions ──────────────────────────────────────────────────────────
 *
 *   Mobile:
 *     Realistic slide — the outgoing page exits in the navigation direction
 *     while the incoming page enters simultaneously from the opposite side.
 *     Both pages are rendered during the transition inside an overflow-hidden
 *     container. The outgoing page is absolutely positioned so it overlaps
 *     the incoming one without affecting layout. After ANIM_DURATION ms,
 *     the outgoing page is unmounted and animation state is reset.
 *
 *   Desktop (md+):
 *     Simple fade-in / fade-out. More appropriate for a sidebar layout
 *     where pages don't conceptually "slide" horizontally.
 *     Implemented by overriding the slide animation class with
 *     md:animate-fade-in / md:animate-fade-out at the breakpoint.
 *
 * ── Theme ─────────────────────────────────────────────────────────────────────
 *
 *   Managed by useTheme — toggles the .dark class on <html> and persists
 *   the preference to localStorage. Falls back to prefers-color-scheme.
 */

import { useState, useCallback, useEffect } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SidebarProvider } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Sun, Moon } from 'lucide-react'
import AppSidebar from './components/AppSidebar'
import BottomNav from './components/BottomNav'
import Overview from './pages/Overview'
import History from './pages/History'
import Device from './pages/Device'
import DeviceSettings from './pages/DeviceSettings'
import UserAccount from './pages/UserAccount'
import LoginPage from './pages/LoginPage'
import { useTheme } from './hooks/useTheme'
import { useSwipeNavigation } from './hooks/useSwipeNavigation'
import { useAuth } from './context/AuthContext'
import PullToRefreshChip from './components/PullToRefreshChip'
import Splash from './components/Splash'

/**
 * Ordered list of page IDs.
 * The order determines slide direction when navigating:
 * moving to a higher index slides left, lower index slides right.
 */
const PAGE_ORDER = ['overview', 'history', 'device', 'settings', 'account']

/**
 * Map of page ID → JSX element.
 * Defined at module level to avoid recreating elements on every render.
 */
const PAGES = {
  overview: <Overview />,
  history:  <History />,
  device:   <Device />,
  settings: <DeviceSettings />,
  account:  <UserAccount />,
}

/**
 * Duration of the page transition animation in milliseconds.
 * Must match the animation duration defined in index.css.
 */
const ANIM_DURATION = 400

export default function App() {
  const { theme, setTheme } = useTheme()

  const { isAuthenticated, loading, user, logout } = useAuth()

  const [current,   setCurrent]   = useState('overview')
  const [previous,  setPrevious]  = useState(null)
  const [dir,       setDir]       = useState(null)
  const [animating, setAnimating] = useState(false)

  /**
   * Navigates to a new page.
   *
   * Determines the slide direction based on the relative index of the
   * current and target pages, then starts the transition by setting
   * the previous page (outgoing) and current page (incoming).
   *
   * No-ops if the target is already the current page or a transition
   * is already running (prevents stacking animations).
   *
   * @param {string} newPage - ID of the page to navigate to.
   */
  const navigate = useCallback((newPage) => {
    if (newPage === current || animating) return

    const isDesktop = window.innerWidth >= 768

    if (isDesktop) {
      // Instant switch on desktop
      setCurrent(newPage)
      return
    }

    const currentIdx = PAGE_ORDER.indexOf(current)
    const newIdx     = PAGE_ORDER.indexOf(newPage)

    setDir(newIdx > currentIdx ? 'left' : 'right')
    setPrevious(current)
    setCurrent(newPage)
    setAnimating(true)
  }, [current, animating])

  /**
   * Cleans up transition state after the animation completes.
   * Unmounts the outgoing page and resets direction and animating flag.
   */
  useEffect(() => {
    if (!animating) return
    const t = setTimeout(() => {
      setPrevious(null)
      setDir(null)
      setAnimating(false)
    }, ANIM_DURATION)
    return () => clearTimeout(t)
  }, [animating])

  // Current page index — used to determine swipe nav boundaries
  const currentIdx = PAGE_ORDER.indexOf(current)

  // Stable toggle for sidebar (Desktop)
  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }, [setTheme])

  // Register horizontal swipe gesture for mobile navigation
  useSwipeNavigation({
    onNext: () => {
      if (currentIdx < PAGE_ORDER.length - 1)
        navigate(PAGE_ORDER[currentIdx + 1])
    },
    onPrev: () => {
      if (currentIdx > 0)
        navigate(PAGE_ORDER[currentIdx - 1])
    },
  })

  // --- CONDITIONAL RENDERS (Must be AFTER all hooks) ---

  if (loading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground uppercase tracking-widest text-xs">
          Loading GroWDash...
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginPage />
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <div className="min-h-dvh bg-background flex w-full">
          <PullToRefreshChip />

          {/* Sidebar — desktop only (md+) */}
          <div className="hidden md:block">
            <AppSidebar
              current={current}
              onChange={navigate}
              theme={theme}
              onToggleTheme={toggleTheme}
              user={user}

              onLogout={logout}
            />
          </div>

          {/*
           * Main content area.
           * overflow-hidden clips the outgoing page as it slides out.
           * position: relative is required for the absolutely positioned
           * outgoing page to be contained within this element.
           */}
          <main className="flex-1 pb-16 md:pb-0 relative overflow-hidden">

            {/*
             * Outgoing page — rendered only during a transition.
             *
             * Absolutely positioned so it overlaps the incoming page
             * without pushing it out of the layout. Slides out on mobile
             * and fades out on desktop (md:animate-fade-out overrides the
             * slide class at the md breakpoint).
             *
             * The key includes the page ID prefixed with "prev-" to avoid
             * colliding with the incoming page's key when navigating back
             * to a page that was previously the outgoing one.
             */}
            {previous && (
              <div
                key={`prev-${previous}`}
                className={[
                  'absolute inset-0',
                  dir === 'left' ? 'animate-slide-out-left' : 'animate-slide-out-right',
                  'md:animate-fade-out',
                ].join(' ')}
              >
                {PAGES[previous]}
              </div>
            )}

            {/*
             * Incoming page — slides in on mobile, fades in on desktop.
             * No animation class applied when idle (no transition running)
             * to avoid replaying the animation on unrelated re-renders.
             */}
            <div
              key={current}
              className={animating ? [
                dir === 'left' ? 'animate-slide-in-left' : 'animate-slide-in-right',
                'md:animate-fade-in',
              ].join(' ') : ''}
            >
              {PAGES[current]}
            </div>

          </main>

          {/* Bottom navigation bar — mobile only */}
          <div className="md:hidden">
            <BottomNav current={current} onChange={navigate} />
          </div>

        </div>
      </SidebarProvider>
    </TooltipProvider>
  )
}