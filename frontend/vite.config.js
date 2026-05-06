/**
 * vite.config.js — Bundler configuration.
 *
 * Configures the Vite build tool for the React + Tailwind v4 environment.
 * Includes path aliasing (@/) for cleaner import structures and integration
 * with the new @tailwindcss/vite plugin.
 */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Allows importing from @/components instead of ../../components
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
