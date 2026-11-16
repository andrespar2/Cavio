import type { CategoryConfig, LatLng } from '../types'

// ============================================================
// Utilidades geográficas y de cálculo de tarifas
// ============================================================

const EARTH_RADIUS_KM = 6371

export function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/** Distancia en línea recta (Haversine). */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

/** Distancia aproximada de recorrido urbano (factor de sinuosidad). */
export function estimateRoadKm(a: LatLng, b: LatLng): number {
  const straight = haversineKm(a, b)
  return Math.max(0.8, straight * 1.32)
}

/** Duración estimada en minutos para tráfico urbano promedio (22 km/h). */
export function estimateDurationMin(distanceKm: number): number {
  return Math.max(4, Math.round((distanceKm / 22) * 60 + 3))
}

export function roundFare(value: number): number {
  return Math.max(0, Math.round(value / 100) * 100)
}

export function estimateFare(category: CategoryConfig, distanceKm: number, durationMin: number): number {
  const raw = category.baseFare + category.perKm * distanceKm + category.perMin * durationMin
  return roundFare(Math.max(category.minFare, raw))
}

/** Punto interpolado entre a y b con progreso 0..1 */
export function interpolate(a: LatLng, b: LatLng, t: number): LatLng {
  const clamped = Math.min(1, Math.max(0, t))
  return {
    lat: a.lat + (b.lat - a.lat) * clamped,
    lng: a.lng + (b.lng - a.lng) * clamped,
  }
}

/** Avanza un punto `km` hacia otro punto. */
export function moveTowards(from: LatLng, to: LatLng, km: number): LatLng {
  const total = haversineKm(from, to)
  if (total <= 0.001 || km >= total) return { ...to }
  return interpolate(from, to, km / total)
}

/** Posición dentro de una polilínea según progreso 0..1. */
export function pointAlongRoute(route: LatLng[], progress: number): LatLng {
  if (!route.length) return { lat: 0, lng: 0 }
  if (route.length === 1) return route[0]
  const distances = [0]
  let total = 0
  for (let i = 1; i < route.length; i++) {
    total += haversineKm(route[i - 1], route[i])
    distances.push(total)
  }
  if (total === 0) return route[0]
  const target = Math.min(1, Math.max(0, progress)) * total
  for (let i = 1; i < route.length; i++) {
    if (target <= distances[i]) {
      const segment = distances[i] - distances[i - 1]
      const t = segment === 0 ? 0 : (target - distances[i - 1]) / segment
      return interpolate(route[i - 1], route[i], t)
    }
  }
  return route[route.length - 1]
}

/** Genera una ruta sintética (curva suave) entre dos puntos para la simulación. */
export function syntheticRoute(a: LatLng, b: LatLng, points = 24): LatLng[] {
  const route: LatLng[] = []
  const curve = 0.18
  const mid: LatLng = {
    lat: (a.lat + b.lat) / 2 + (b.lng - a.lng) * curve * 0.18,
    lng: (a.lng + b.lng) / 2 - (b.lat - a.lat) * curve * 0.18,
  }
  for (let i = 0; i <= points; i++) {
    const t = i / points
    const lat = (1 - t) ** 2 * a.lat + 2 * (1 - t) * t * mid.lat + t ** 2 * b.lat
    const lng = (1 - t) ** 2 * a.lng + 2 * (1 - t) * t * mid.lng + t ** 2 * b.lng
    route.push({ lat, lng })
  }
  return route
}

/** Ubicación DEMO determinista alrededor de un centro. */
export function demoOffset(center: LatLng, seed: number, radiusKm = 3.5): LatLng {
  const angle = (seed * 137.508) % 360
  const r = ((seed * 7919) % 1000) / 1000
  const distance = radiusKm * (0.15 + r * 0.85)
  const dLat = (distance / 111) * Math.cos(toRad(angle))
  const dLng = (distance / (111 * Math.cos(toRad(center.lat)))) * Math.sin(toRad(angle))
  return { lat: center.lat + dLat, lng: center.lng + dLng }
}

export function boundsOf(points: LatLng[]): [LatLng, LatLng] | null {
  if (!points.length) return null
  let minLat = points[0].lat
  let maxLat = points[0].lat
  let minLng = points[0].lng
  let maxLng = points[0].lng
  for (const p of points) {
    minLat = Math.min(minLat, p.lat)
    maxLat = Math.max(maxLat, p.lat)
    minLng = Math.min(minLng, p.lng)
    maxLng = Math.max(maxLng, p.lng)
  }
  return [
    { lat: minLat, lng: minLng },
    { lat: maxLat, lng: maxLng },
  ]
}
