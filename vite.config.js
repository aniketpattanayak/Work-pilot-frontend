import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // CRITICAL: Ensures assets load correctly on all subdomains
  build: {
    outDir: 'dist', // Standard output directory for Vite
  }
})