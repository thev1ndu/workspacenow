import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
