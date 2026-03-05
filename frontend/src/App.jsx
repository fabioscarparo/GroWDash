/**
 * App.jsx — Root component.
 *
 * Handles page routing via a simple state variable.
 * Renders a bottom navigation bar on mobile.
 * On desktop (md+) the bottom nav will become a sidebar — coming soon.
 *
 * Dark/light mode is applied automatically based on the device system
 * preference via the CSS prefers-color-scheme media query.
 */

import { useState } from 'react'
import BottomNav from './components/BottomNav'
import Overview from './pages/Overview'
import History from './pages/History'
import Device from './pages/Device'
import DeviceSettings from './pages/DeviceSettings'

// Map of page IDs to their components
const PAGES = {
  overview: <Overview />,
  history: <History />,
  device: <Device />,
  settings: <DeviceSettings />,
}

export default function App() {
  // Active page — defaults to overview
  const [page, setPage] = useState('overview')

  return (
    <div className="min-h-dvh bg-background">

      {/* Page content — bottom padding to avoid overlap with the nav bar */}
      <main className="pb-16">
        {PAGES[page]}
      </main>

      {/* Bottom navigation bar — fixed at the bottom on mobile */}
      <BottomNav current={page} onChange={setPage} />

    </div>
  )
}