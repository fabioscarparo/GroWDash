/**
 * main.jsx — Application entry point
 *
 * Sets up the React root with TanStack Query for data fetching.
 * QueryClient is configured with a 5-minute refetch interval to match
 * the Growatt API update frequency.
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.jsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Auto-refresh every 5 minutes — matches Growatt API update interval
      refetchInterval: 5 * 60 * 1000,
      // Data is considered fresh for 2 minutes
      staleTime: 2 * 60 * 1000,
      // Retry failed requests twice before showing an error
      retry: 2,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)