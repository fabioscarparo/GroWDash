import { useState } from 'react'
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

const PAGES = {
  overview: <Overview />,
  history:  <History />,
  device:   <Device />,
  settings: <DeviceSettings />,
}

export default function App() {
  const [page, setPage] = useState('overview')
  const { theme, toggle } = useTheme()

  return (
    <TooltipProvider>
      <SidebarProvider>
        <div className="min-h-dvh bg-background flex w-full">

          {/* Sidebar — desktop only */}
          <div className="hidden md:block">
            <AppSidebar
              current={page}
              onChange={setPage}
              theme={theme}
              onToggleTheme={toggle}
            />
          </div>

          {/* Main content */}
          <main className="flex-1 pb-16 md:pb-0 overflow-auto">
            {PAGES[page]}
          </main>

          {/* Bottom nav — mobile only */}
          <div className="md:hidden">
            <BottomNav current={page} onChange={setPage} />
          </div>

          {/* Dark mode toggle — mobile only, fixed bottom right above nav */}
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