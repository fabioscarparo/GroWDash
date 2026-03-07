import { useState, useCallback, useEffect, useRef } from 'react'
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

const PAGE_ORDER = ['overview', 'history', 'device', 'settings']

const PAGES = {
  overview: <Overview />,
  history:  <History />,
  device:   <Device />,
  settings: <DeviceSettings />,
}

export default function App() {
  const [page, setPage] = useState('overview')
  const [slideDir, setSlideDir] = useState(null) // 'left' | 'right' | null
  const [animating, setAnimating] = useState(false)
  const { theme, toggle } = useTheme()

  const navigate = useCallback((newPage) => {
    if (newPage === page || animating) return
    const currentIdx = PAGE_ORDER.indexOf(page)
    const newIdx = PAGE_ORDER.indexOf(newPage)
    setSlideDir(newIdx > currentIdx ? 'left' : 'right')
    setAnimating(true)
    setPage(newPage)
  }, [page, animating])

  // Clear animation state after transition
  useEffect(() => {
    if (!animating) return
    const t = setTimeout(() => {
      setAnimating(false)
      setSlideDir(null)
    }, 320)
    return () => clearTimeout(t)
  }, [animating])

  const currentIdx = PAGE_ORDER.indexOf(page)

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

  // Slide-in animation class
  const slideClass = !animating ? '' :
    slideDir === 'left'  ? 'animate-slide-in-left' :
    slideDir === 'right' ? 'animate-slide-in-right' : ''

  return (
    <TooltipProvider>
      <SidebarProvider>
        <div className="min-h-dvh bg-background flex w-full">

          {/* Sidebar — desktop only */}
          <div className="hidden md:block">
            <AppSidebar
              current={page}
              onChange={navigate}
              theme={theme}
              onToggleTheme={toggle}
            />
          </div>

          {/* Main content */}
          <main className="flex-1 pb-16 md:pb-0 overflow-auto overflow-x-hidden">
            <div key={page} className={slideClass}>
              {PAGES[page]}
            </div>
          </main>

          {/* Bottom nav — mobile only */}
          <div className="md:hidden">
            <BottomNav current={page} onChange={navigate} />
          </div>

          {/* Dark mode toggle — mobile only */}
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