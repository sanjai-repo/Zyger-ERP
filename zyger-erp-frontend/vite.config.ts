import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    css: false,
    include: ['src/**/*.test.{ts,tsx}'],
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'Zyger ERP — Precision Manufacturing ERP',
        short_name: 'Zyger ERP',
        description: 'CNC Manufacturing ERP for quality, maintenance, and production',
        theme_color: '#1e293b',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        categories: ['business', 'productivity', 'utilities'],
        icons: [
          { src: 'icons.svg', sizes: '192x192', type: 'image/svg+xml' },
          { src: 'icons.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^\/api\/(v1\/production|v1\/planning|v2\/master|v1\/quality|maintenance)\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'api-v1-cache', networkTimeoutSeconds: 10, expiration: { maxEntries: 200, maxAgeSeconds: 3600 } }
          },
          {
            urlPattern: /^\/api\/master\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'master-data', expiration: { maxEntries: 50, maxAgeSeconds: 86400 } }
          },
          {
            urlPattern: /^\/api\/v1\/master\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'v2-master-data', expiration: { maxEntries: 100, maxAgeSeconds: 86400 } }
          }
        ]
      }
    })
  ],
  build: {
  },
  server: {
    port: 9091,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:9090',
    },
  },
})
