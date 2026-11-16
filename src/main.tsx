import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Botón físico "atrás" en Android: navega dentro de la app o la cierra.
if (Capacitor.isNativePlatform()) {
  void CapacitorApp.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack && window.history.length > 1) {
      window.history.back()
    } else {
      void CapacitorApp.exitApp()
    }
  })
}

// Registro de la PWA solo en producción web (evita interferencias en desarrollo).
if ('serviceWorker' in navigator && import.meta.env.PROD && !Capacitor.isNativePlatform()) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* El service worker es opcional; la app funciona sin él. */
    })
  })
}
