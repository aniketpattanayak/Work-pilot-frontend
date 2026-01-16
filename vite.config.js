import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // Ensures assets load from the root on all subdomains
  build: {
    outDir: 'dist', // Standard output directory for Vite
    emptyOutDir: true,
  },
  resolve: {
    alias: [
      {
        find: './runtimeConfig',
        replacement: './runtimeConfig.browser', // Fixes specific AWS SDK issues
      },
    ],
  },
})