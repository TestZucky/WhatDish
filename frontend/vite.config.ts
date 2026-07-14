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
    // Uncomment to proxy API calls to the backend during local dev instead of
    // setting VITE_API_BASE_URL:
    // proxy: {
    //   '/api': { target: 'http://localhost:8000', changeOrigin: true },
    // },
  },
})
