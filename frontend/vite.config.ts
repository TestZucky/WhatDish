import { defineConfig } from 'vite'
import path from 'path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // Proxy /api to the backend so the app can talk to it same-origin. This is
    // what lets `make tunnel` expose everything through a single HTTPS URL for
    // phone testing (no CORS, no second tunnel).
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
    },
    // Allow Cloudflare quick-tunnel hostnames to reach the dev server.
    allowedHosts: ['.trycloudflare.com'],
  },
})
