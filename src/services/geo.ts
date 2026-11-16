import type { LatLng, Place } from '../types'
import { BOGOTA_CENTER, BOGOTA_PLACES } from '../data/places'
import { estimateDurationMin, estimateRoadKm, syntheticRoute } from '../lib/geo'

// ============================================================
// CAVIO — Capa de servicios geográficos
// Proveedores: Nominatim (geocodificación) y OSRM (rutas).
// Sin claves privadas. Si fallan, se usa una estimación DEMO
// claramente identificada.
// ============================================================

const NOMINATIM = 'https://nominatim.openstreetmap.org'
const OSRM = 'https://router.project-osrm.org'
const TIMEOUT_MS = 9000

const geocodeCache = new Map<string, Place[]>()
const reverseCache = new Map<string, Place>()
const routeCache = new Map<string, RoutePlan>()

export interface RoutePlan {
  points: LatLng[]
  distanceKm: number
  durationMin: number
  source: 'osrm' | 'demo'
}

function fetchWithTimeout(url: string, timeout = TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  return fetch(url, {
    signal: controller.signal,
    headers: { Accept: 'application/json' },
  }).finally(() => clearTimeout(timer))
}

function nominatimPlace(item: {
  display_name?: string
  name?: string
  lat: string
  lon: string
  address?: Record<string, string>
}): Place {
  const parts = (item.display_name ?? '').split(',').map((p) => p.trim())
  const label = item.name || parts[0] || 'Ubicación'
  const address = item.display_name
  return {
    label,
    address,
    lat: Number(item.lat),
    lng: Number(item.lon),
  }
}

export function searchLocalPlaces(query: string): Place[] {
  const q = query.trim().toLowerCase()
  if (!q) return BOGOTA_PLACES
  return BOGOTA_PLACES.filter(
    (p) => p.label.toLowerCase().includes(q) || (p.address ?? '').toLowerCase().includes(q),
  ).slice(0, 10)
}

export async function geocode(query: string): Promise<Place[]> {
  const q = query.trim()
  if (q.length < 3) return []
  const key = q.toLowerCase()
  if (geocodeCache.has(key)) return geocodeCache.get(key)!

  const params = new URLSearchParams({
    q,
    format: 'jsonv2',
    addressdetails: '1',
    limit: '6',
    countrycodes: 'co',
    'accept-language': 'es',
  })
  // Sesgo hacia Bogotá para mejorar resultados locales.
  const delta = 0.6
  params.set(
    'viewbox',
    `${BOGOTA_CENTER.lng - delta},${BOGOTA_CENTER.lat + delta},${BOGOTA_CENTER.lng + delta},${BOGOTA_CENTER.lat - delta}`,
  )

  try {
    const response = await fetchWithTimeout(`${NOMINATIM}/search?${params.toString()}`)
    if (!response.ok) return []
    const data = (await response.json()) as Array<Parameters<typeof nominatimPlace>[0]>
    const places = data
      .map(nominatimPlace)
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
    geocodeCache.set(key, places)
    return places
  } catch {
    return []
  }
}

export async function reverseGeocode(position: LatLng): Promise<Place | null> {
  const key = `${position.lat.toFixed(4)},${position.lng.toFixed(4)}`
  if (reverseCache.has(key)) return reverseCache.get(key)!
  const params = new URLSearchParams({
    lat: String(position.lat),
    lon: String(position.lng),
    format: 'jsonv2',
    addressdetails: '1',
    'accept-language': 'es',
  })
  try {
    const response = await fetchWithTimeout(`${NOMINATIM}/reverse?${params.toString()}`)
    if (!response.ok) return null
    const data = (await response.json()) as Parameters<typeof nominatimPlace>[0]
    const place = nominatimPlace(data)
    reverseCache.set(key, place)
    return place
  } catch {
    return null
  }
}

export function demoRoute(a: LatLng, b: LatLng): RoutePlan {
  const distanceKm = Number(estimateRoadKm(a, b).toFixed(2))
  return {
    points: syntheticRoute(a, b, 20),
    distanceKm,
    durationMin: estimateDurationMin(distanceKm),
    source: 'demo',
  }
}

export async function routeBetween(a: LatLng, b: LatLng): Promise<RoutePlan> {
  const key = `${a.lat.toFixed(4)},${a.lng.toFixed(4)}->${b.lat.toFixed(4)},${b.lng.toFixed(4)}`
  if (routeCache.has(key)) return routeCache.get(key)!

  const coords = `${a.lng},${a.lat};${b.lng},${b.lat}`
  try {
    const response = await fetchWithTimeout(
      `${OSRM}/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`,
    )
    if (!response.ok) throw new Error('OSRM no disponible')
    const data = (await response.json()) as {
      code: string
      routes?: Array<{ distance: number; duration: number; geometry: { coordinates: [number, number][] } }>
    }
    const route = data.routes?.[0]
    if (data.code !== 'Ok' || !route) throw new Error('Sin ruta')
    const plan: RoutePlan = {
      points: route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
      distanceKm: Number((route.distance / 1000).toFixed(2)),
      durationMin: Math.max(3, Math.round(route.duration / 60)),
      source: 'osrm',
    }
    routeCache.set(key, plan)
    return plan
  } catch {
    const fallback = demoRoute(a, b)
    routeCache.set(key, fallback)
    return fallback
  }
}
