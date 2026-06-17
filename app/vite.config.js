import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/',
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
  preview: {
    allowedHosts: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.js'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-') || id.includes('node_modules/victory-')) return 'charts';
          if (id.includes('node_modules/jspdf') || id.includes('node_modules/html2canvas')) return 'export';
          if (id.includes('node_modules/dexie')) return 'dexie';
          if (id.includes('node_modules/react-dom')) return 'react-dom';
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'offline.html', 'fonts/*.woff2'],
      manifest: {
        name: 'VANTAGE',
        short_name: 'VANTAGE',
        description: 'Precision sideline analytics for volleyball coaches',
        theme_color: '#f97316',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
        ],
      },
      workbox: {
        // SPA navigation fallback — serves index.html for all unmatched routes so
        // the React router handles them. offline.html is served by the network-first
        // handler when the device is truly offline and index.html itself can't be fetched.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],

        // Pre-cache all built assets (content-hashed filenames handle versioning)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
})
