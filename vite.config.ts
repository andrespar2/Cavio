import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// CAVIO — Vite config
// El servidor escucha en toda la red local para poder probar en dispositivos
// Android mediante ADB reverse o directamente por LAN.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ['**/android/**', '**/dist/**'],
    },
  },
  preview: {
    host: true,
    port: 4173,
  },
  build: {
    target: 'es2019',
    chunkSizeWarningLimit: 1200,
  },
})
