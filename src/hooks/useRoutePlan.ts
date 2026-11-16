import { useEffect, useRef, useState } from 'react'
import type { LatLng } from '../types'
import { demoRoute, routeBetween, type RoutePlan } from '../services/geo'

// Hook de ruta: calcula con OSRM y cae a estimación DEMO.
export function useRoutePlan(origin: LatLng | null, destination: LatLng | null): {
  route: RoutePlan | null
  loading: boolean
} {
  const [route, setRoute] = useState<RoutePlan | null>(null)
  const [loading, setLoading] = useState(false)
  const requestId = useRef(0)

  useEffect(() => {
    if (!origin || !destination) {
      setRoute(null)
      setLoading(false)
      return
    }
    let cancelled = false
    const id = ++requestId.current
    setLoading(true)
    setRoute(demoRoute(origin, destination))

    routeBetween(origin, destination)
      .then((plan) => {
        if (!cancelled && id === requestId.current) {
          setRoute(plan)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled && id === requestId.current) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng])

  return { route, loading }
}
