/**
 * App.jsx — Root application component.
 *
 * Owns the top-level concerns of the GroWDash single-page application:
 * authentication gating, special-purpose route handling, page routing,
 * animated page transitions, layout composition, and theme management.
 *
 * ── Authentication gating ─────────────────────────────────────────────────────
 *
 *   On every mount, AuthContext calls GET /auth/me to verify the session
 *   cookie.  While that check is in flight the app renders a loading screen.
 *   Once resolved:
 *     - Unauthenticated → LoginPage (no layout, no navigation)
 *     - Google Home linking path → GoogleHomeLinking (no layout, no navigation)
 *     - Authenticated → full dashboard layout
 *
 * ── Special-purpose routes ────────────────────────────────────────────────────
 *
 *   Because GroWDash is a single-page application served from a single HTML
 *   file, traditional path-based routing is handled by inspecting
 *   window.location.pathname before rendering the main layout.
 *
 *   /google-home-link
 *     Rendered when Google redirects the user here during the Smart Home
 *     account linking OAuth2 flow.  GoogleHomeLinking is rendered outside
 *     the normal sidebar / bottom-nav layout because Google opens it inside
 *     its own in-app browser and the standard chrome would be confusing.
 *     The user must still be authenticated — the component itself shows a
 *     "login required" message if the session cookie is absent.
 *
 * ── Layout ────────────────────────────────────────────────────────────────────
 *
 *   Desktop (md+)
 *     Collapsible sidebar (AppSidebar) on the left, main content area on the
 *     right.  The sidebar contains navigation items, a theme toggle, the
 *     username, and a logout button.
 *
 *   Mobile
 *     Full-width content area with a fixed BottomNav bar pinned to the bottom
 *     of the viewport.  Safe-area insets are respected for devices with a
 *     home indicator.  A PullToRefreshChip floats above the content area and
 *     handles the native pull-to-refresh gesture.
 *
 * ── Navigation ────────────────────────────────────────────────────────────────
 *
 *   All three navigation methods funnel through the same navigate() callback:
 *     - Sidebar menu items (desktop)
 *     - BottomNav icon buttons (mobile)
 *     - Horizontal swipe gesture (mobile, via useSwipeNavigation)
 *
 *   Pages are ordered in PAGE_ORDER.  The position of the target page relative
 *   to the current page determines the slide direction:
 *     target at higher index → slides left  (forward)
 *     target at lower index  → slides right (backward)
 *
 * ── Page transitions ──────────────────────────────────────────────────────────
 *
 *   Mobile
 *     A realistic simultaneous slide: the outgoing page exits in the direction
 *     of navigation while the incoming page enters from the opposite side.
 *     Both pages are present in the DOM for ANIM_DURATION milliseconds inside
 *     an overflow-hidden container.  The outgoing page is absolutely positioned
 *     so it does not affect the layout flow of the incoming page.  After the
 *     animation completes, the outgoing page is unmounted and animation state
 *     is reset to avoid replaying animations on unrelated re-renders.
 *
 *   Desktop (md+)
 *     Instant switch — no animation.  The Tailwind md: breakpoint overrides
 *     the slide keyframe classes, giving a clean instant transition that is
 *     more appropriate for the wider sidebar layout.
 *
 * ── Theme ─────────────────────────────────────────────────────────────────────
 *
 *   Managed by useTheme.  Supports three modes: light, dark, and system
 *   (follows prefers-color-scheme).  The active mode is persisted to
 *   localStorage and applied by toggling the .dark class on <html>.
 *
 * @module App
 */

import { useCallback, useEffect, useState } from 'react'
import { SidebarProvider } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import AppSidebar from './components/AppSidebar'
import BottomNav from './components/BottomNav'
import PullToRefreshChip from './components/PullToRefreshChip'
import { useAuth } from './context/AuthContext'
import { useSwipeNavigation } from './hooks/useSwipeNavigation'
import { useTheme } from './hooks/useTheme'
import Device from './pages/Device'
import DeviceSettings from './pages/DeviceSettings'
import GoogleHomeLinking from './pages/GoogleHomeLinking'
import History from './pages/History'
import LoginPage from './pages/LoginPage'
import Overview from './pages/Overview'
import UserAccount from './pages/UserAccount'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Canonical ordered list of main page IDs.
 *
 * The index of each entry determines the slide direction when navigating:
 * moving to a higher index slides the viewport left (forward), moving to a
 * lower index slides right (backward).  This list must stay in sync with
 * the keys of PAGES and with the IDs used in AppSidebar / BottomNav.
 */
const PAGE_ORDER = ['overview', 'history', 'device', 'settings', 'account']

/**
 * Pre-instantiated page elements keyed by page ID.
 *
 * Defined at module level (outside the component) so the JSX elements are
 * created once and reused across renders rather than being recreated on
 * every state change.  This avoids unnecessary unmount/remount cycles for
 * pages that are not currently transitioning.
 */
const PAGES = {
  overview: <Overview />,
  history: <History />,
  device: <Device />,
  settings: <DeviceSettings />,
  account: <UserAccount />,
}

/**
 * Duration of the page slide animation in milliseconds.
 *
 * Must match the ``animation-duration`` value defined in index.css for the
 * ``animate-slide-*`` keyframe classes.  The cleanup ``setTimeout`` in the
 * transition effect uses this value to unmount the outgoing page only after
 * the CSS animation has fully completed.
 */
const ANIM_DURATION = 400


// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * App — root application component.
 *
 * Renders one of three top-level views depending on application state:
 *   1. Loading screen    — session check in progress
 *   2. LoginPage         — user is not authenticated
 *   3. GoogleHomeLinking — current path is /google-home-link
 *   4. Dashboard layout  — user is authenticated, normal navigation
 *
 * All hooks are called unconditionally (React rules) and the conditional
 * returns appear after the hook block.
 *
 * @returns {JSX.Element}
 */
export default function App() {
  const { theme, setTheme } = useTheme()
  const { isAuthenticated, loading, user, logout } = useAuth()

  // ── Transition state ────────────────────────────────────────────────────
  // current   : ID of the page currently visible (or sliding in)
  // previous  : ID of the page sliding out; null when no transition is active
  // dir       : slide direction — 'left' (forward) or 'right' (backward)
  // animating : true while a transition is in progress; blocks new navigations
  const [current, setCurrent] = useState('overview')
  const [previous, setPrevious] = useState(null)
  const [dir, setDir] = useState(null)
  const [animating, setAnimating] = useState(false)

  // ── navigate() ──────────────────────────────────────────────────────────

  /**
   * Navigate to a new page, triggering a slide transition on mobile.
   *
   * On desktop (viewport width ≥ 768 px) the switch is instant — no animation
   * is applied because the sidebar layout does not benefit from horizontal
   * slides.
   *
   * On mobile, the direction is derived by comparing the index of the target
   * page against the current page in PAGE_ORDER.  The outgoing page is stored
   * in ``previous`` so it can be rendered with an exit animation while the
   * incoming page renders with an entrance animation.
   *
   * Guards
   * ------
   * - No-ops when the target is already the current page.
   * - No-ops when a transition is already running to prevent stacked animations.
   *
   * @param {string} newPage - ID of the page to navigate to.
   */
  const navigate = useCallback((newPage) => {
    if (newPage === current || animating) return

    const isDesktop = window.innerWidth >= 768

    if (isDesktop) {
      setCurrent(newPage)
      return
    }

    const currentIdx = PAGE_ORDER.indexOf(current)
    const newIdx = PAGE_ORDER.indexOf(newPage)

    setDir(newIdx > currentIdx ? 'left' : 'right')
    setPrevious(current)
    setCurrent(newPage)
    setAnimating(true)
  }, [current, animating])

  // ── Transition cleanup ───────────────────────────────────────────────────

  /**
   * Unmounts the outgoing page and resets transition state after the CSS
   * animation has finished.
   *
   * The timeout duration matches ANIM_DURATION so the cleanup fires only
   * after the slide keyframe has fully completed.  Clearing the timeout on
   * effect cleanup prevents a stale state update if the component unmounts
   * mid-transition (e.g. during a logout that happens while navigating).
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

  // ── Derived values ───────────────────────────────────────────────────────

  /** Index of the current page in PAGE_ORDER — used for swipe boundary checks. */
  const currentIdx = PAGE_ORDER.indexOf(current)

  /**
   * Stable theme toggle callback passed to AppSidebar.
   * Cycles between light and dark; system mode is set from UserAccount only.
   */
  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }, [setTheme])

  // ── Swipe navigation ─────────────────────────────────────────────────────

  /**
   * Register horizontal swipe gesture listeners.
   * Swiping left advances to the next page; swiping right goes back.
   * Both directions are clamped to the PAGE_ORDER boundaries.
   */
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

  // ── Conditional renders (always after all hooks) ─────────────────────────

  /**
   * Loading screen — shown while AuthContext verifies the session cookie
   * via GET /auth/me on application mount.
   */
  if (loading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground uppercase tracking-widest text-xs">
          Loading GroWDash...
        </div>
      </div>
    )
  }

  /**
   * Login page — shown when no valid session cookie is present.
   *
   * When the user arrives on /google-home-link without a session (e.g. the
   * Google Home in-app browser has no GroWDash cookie), we pass the full
   * current URL as returnUrl so LoginPage can redirect back to it after a
   * successful login, preserving all OAuth query parameters.
   */
  if (!isAuthenticated) {
    const isGoogleHomeLink = window.location.pathname
      .replace(/\/$/, '')
      .endsWith('/google-home-link')
    const returnUrl = isGoogleHomeLink
      ? window.location.pathname + window.location.search
      : null
    return <LoginPage returnUrl={returnUrl} />
  }

  /**
   * Google Home linking page — rendered when Google redirects the user to
   * /google-home-link during the Smart Home account linking OAuth2 flow.
   *
   * Placed AFTER the isAuthenticated guard: only a logged-in user can reach
   * this point, ensuring no one else can use the Google Home linking flow
   * to obtain an OAuth code for this account.
   */
  if (window.location.pathname.replace(/\/$/, '').endsWith('/google-home-link')) {
    return <GoogleHomeLinking />
  }

  // ── Main dashboard layout ─────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <SidebarProvider>
        <div className="min-h-dvh bg-background flex w-full">

          {/* Pull-to-refresh chip — floats above all content on mobile */}
          <PullToRefreshChip />

          {/* ── Sidebar (desktop only, md+) ──────────────────────────────── */}
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
           * ── Main content area ───────────────────────────────────────────
           *
           * overflow-hidden clips the outgoing page as it slides beyond the
           * viewport edge.  position: relative is required so the absolutely
           * positioned outgoing page is contained within this element and
           * does not affect the document flow of the incoming page.
           */}
          <main className="flex-1 pb-16 md:pb-0 relative overflow-hidden">

            {/*
             * Outgoing page — present in the DOM only during a transition.
             *
             * Absolutely positioned so it overlaps the incoming page without
             * displacing it.  Exits left or right on mobile; the md: prefix
             * on the animation class overrides to an instant disappearance
             * on desktop where slide animations are disabled.
             *
             * The "prev-" key prefix prevents React from reusing the same
             * DOM node when navigating back to a page that was recently the
             * outgoing element.
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
             * Incoming page — slides in on mobile, appears instantly on desktop.
             *
             * No animation class is applied outside of a transition (animating
             * === false) to avoid replaying the entrance animation on unrelated
             * re-renders such as theme changes or data refetches.
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

          {/* ── Bottom navigation bar (mobile only) ─────────────────────── */}
          <div className="md:hidden">
            <BottomNav current={current} onChange={navigate} />
          </div>

        </div>
      </SidebarProvider>
    </TooltipProvider>
  )
}