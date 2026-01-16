import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/', // CRITICAL for subdomains
  resolve: {
    alias: [
      {
        find: './runtimeConfig',
        replacement: './runtimeConfig.browser', // Ensures browser-compatible version of AWS SDK
      },
    ],
  },
  build: {
    outDir: 'dist', // Standard output directory for Vite
    emptyOutDir: true,
  }
})