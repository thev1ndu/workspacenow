import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'config.js'],
      manifest: {
        name: 'WorkspaceNow',
        short_name: 'WorkspaceNow',
        description: "Build, connect and operate your organization's applications, agents and workflows.",
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // API reads: network-first, fall back to the last good response when offline.
            urlPattern: ({ url }) => url.pathname.startsWith('/api/') && !import.meta.env?.DEV,
            handler: 'NetworkFirst',
            options: { cacheName: 'wsn-api', networkTimeoutSeconds: 5, expiration: { maxEntries: 200, maxAgeSeconds: 300 } },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    // Workspace packages ship TypeScript source; one copy of each runtime keeps contexts shared.
    dedupe: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query', '@heroui/react', 'react-aria-components'],
  },
  server: {
    port: 3100,
  },
  build: {
    chunkSizeWarningLimit: 6000,
  },
})
