import { useCallback, useEffect, useRef, useState } from 'react'
import type { LatLng } from '../types'

// ============================================================
// CAVIO — Geolocalización real del navegador
// Maneja permiso, errores, timeout y limpieza de observadores.
// ============================================================

export type GeoStatus =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'unavailable'
  | 'timeout'
  | 'insecure'
  | 'unsupported'

export interface GeoState {
  position: LatLng | null
  accuracy: number | null
  status: GeoStatus
  error: string | null
  updatedAt: number | null
}

const INITIAL: GeoState = {
  position: null,
  accuracy: null,
  status: 'idle',
  error: null,
  updatedAt: null,
}

export function geoErrorMessage(status: GeoStatus): string {
  switch (status) {
    case 'denied':
      return 'No diste permiso de ubicación. Puedes elegir el origen manualmente en el mapa o en la búsqueda.'
    case 'unavailable':
      return 'Tu ubicación no está disponible en este momento. Intenta de nuevo o selecciona el origen manualmente.'
    case 'timeout':
      return 'Estamos tardando en obtener tu ubicación. Puedes reintentar o elegir el origen manualmente.'
    case 'insecure':
      return 'La ubicación requiere una conexión segura (HTTPS o localhost). Mientras tanto, elige el origen manualmente.'
    case 'unsupported':
      return 'Este navegador no permite obtener la ubicación. Puedes elegir el origen manualmente en el mapa.'
    default:
      return 'No pudimos obtener tu ubicación.'
  }
}

export function useGeolocation(options: { auto?: boolean } = {}) {
  const { auto = false } = options
  const [geo, setGeo] = useState<GeoState>(INITIAL)
  const watchId = useRef<number | null>(null)
  const mounted = useRef(true)

  const stop = useCallback(() => {
    if (watchId.current !== null && typeof navigator !== 'undefined') {
      navigator.geolocation.clearWatch(watchId.current)
      watchId.current = null
    }
  }, [])

  const handleError = useCallback((error: GeolocationPositionError) => {
    const status: GeoStatus =
      error.code === error.PERMISSION_DENIED
        ? 'denied'
        : error.code === error.POSITION_UNAVAILABLE
          ? 'unavailable'
          : 'timeout'
    setGeo((prev) => ({
      ...prev,
      status,
      error: geoErrorMessage(status),
    }))
  }, [])

  const request = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      const status: GeoStatus = 'unsupported'
      setGeo((prev) => ({ ...prev, status, error: geoErrorMessage(status) }))
      return
    }
    // En contextos no seguros el navegador bloquea la geolocalización.
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      const status: GeoStatus = 'insecure'
      setGeo((prev) => ({ ...prev, status, error: geoErrorMessage(status) }))
      return
    }

    setGeo((prev) => ({ ...prev, status: 'requesting', error: null }))
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!mounted.current) return
        setGeo({
          position: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          accuracy: pos.coords.accuracy,
          status: 'granted',
          error: null,
          updatedAt: Date.now(),
        })
        if (watchId.current === null) {
          watchId.current = navigator.geolocation.watchPosition(
            (watchPos) => {
              if (!mounted.current) return
              setGeo({
                position: { lat: watchPos.coords.latitude, lng: watchPos.coords.longitude },
                accuracy: watchPos.coords.accuracy,
                status: 'granted',
                error: null,
                updatedAt: Date.now(),
              })
            },
            handleError,
            { enableHighAccuracy: true, maximumAge: 8000, timeout: 18000 },
          )
        }
      },
      handleError,
      { enableHighAccuracy: true, timeout: 14000, maximumAge: 5000 },
    )
  }, [handleError])

  useEffect(() => {
    mounted.current = true
    if (auto) request()
    return () => {
      mounted.current = false
      stop()
    }
  }, [auto, request, stop])

  return { ...geo, request, stop }
}
