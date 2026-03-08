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
import { useTheme } from './hooks/useTheme'
import { useSwipeNavigation } from './hooks/useSwipeNavigation'

/**
 * Ordered list of page IDs.
 * The order determines slide direction when navigating:
 * moving to a higher index slides left, lower index slides right.
 */
const PAGE_ORDER = ['overview', 'history', 'device', 'settings']

/**
 * Map of page ID → JSX element.
 * Defined at module level to avoid recreating elements on every render.
 */
const PAGES = {
  overview: <Overview />,
  history:  <History />,
  device:   <Device />,
  settings: <DeviceSettings />,
}

/**
 * Duration of the page transition animation in milliseconds.
 * Must match the animation duration defined in index.css.
 */
const ANIM_DURATION = 300

export default function App() {
  const { theme, toggle } = useTheme()

  /**
   * current   — ID of the page currently visible (or transitioning in).
   * previous  — ID of the page transitioning out. Null when not animating.
   * dir       — Slide direction: 'left' for forward, 'right' for backward.
   * animating — True while a page transition is in progress.
   */
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

  return (
    <TooltipProvider>
      <SidebarProvider>
        <div className="min-h-dvh bg-background flex w-full">

          {/* Sidebar — desktop only (md+) */}
          <div className="hidden md:block">
            <AppSidebar
              current={current}
              onChange={navigate}
              theme={theme}
              onToggleTheme={toggle}
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

          {/*
           * Dark mode toggle — mobile only.
           * Floats above the bottom navigation bar (bottom-20 = 80px).
           * On desktop the toggle is inside the sidebar footer.
           */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            className="md:hidden fixed bottom-20 right-4 z-50 rounded-full bg-background border border-border shadow-md"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </Button>

        </div>
      </SidebarProvider>
    </TooltipProvider>
  )
}