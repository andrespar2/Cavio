import type { PaymentMethod, TripStatus, VehicleCategoryId } from '../types'

// ============================================================
// Formato local Colombia (COP, fechas, textos)
// ============================================================

const cop = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const num = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 })

export function formatCOP(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—'
  return cop.format(Math.round(value))
}

export function formatNumber(value: number): string {
  return num.format(value)
}

export function formatCompactCOP(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1).replace('.', ',')} M`
  if (value >= 1_000) return `$${Math.round(value / 1_000)} mil`
  return formatCOP(value)
}

export function formatDate(iso: string | undefined | null, withTime = false): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(d)
}

export function formatDateTimeShort(iso: string | undefined | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export function formatTime(iso: string | undefined | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit' }).format(d)
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const min = Math.round(diff / 60000)
  if (min < 1) return 'hace un momento'
  if (min < 60) return `hace ${min} min`
  const hours = Math.round(min / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.round(hours / 24)
  if (days < 7) return `hace ${days} d`
  return formatDate(iso)
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${num.format(km)} km`
}

export function formatDuration(min: number): string {
  const m = Math.max(1, Math.round(min))
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const rest = m % 60
  return rest ? `${h} h ${rest} min` : `${h} h`
}

export function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

export function fullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim()
}

export function shortName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName.charAt(0)}.`
}

export const TRIP_STATUS_LABEL: Record<TripStatus, string> = {
  created: 'Solicitud creada',
  searching: 'Buscando conductor',
  offers: 'Recibiendo ofertas',
  assigned: 'Conductor asignado',
  arriving: 'Conductor en camino',
  arrived: 'Conductor en el origen',
  in_progress: 'Viaje en curso',
  completed: 'Viaje finalizado',
  cancelled: 'Viaje cancelado',
}

export const TRIP_STATUS_COLOR: Record<TripStatus, string> = {
  created: 'bg-white/10 text-white/70 border-white/15',
  searching: 'bg-amber-400/10 text-amber-300 border-amber-400/20',
  offers: 'bg-lime/10 text-lime border-lime/25',
  assigned: 'bg-sky-400/10 text-sky-300 border-sky-400/20',
  arriving: 'bg-sky-400/10 text-sky-300 border-sky-400/20',
  arrived: 'bg-sky-400/15 text-sky-200 border-sky-400/30',
  in_progress: 'bg-indigo-400/10 text-indigo-200 border-indigo-400/25',
  completed: 'bg-lime/10 text-lime border-lime/25',
  cancelled: 'bg-red-500/10 text-red-300 border-red-500/20',
}

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
}

export const CATEGORY_NAMES: Record<VehicleCategoryId, string> = {
  economy: 'CAVIO Economy',
  comfort: 'CAVIO Comfort',
  xl: 'CAVIO XL',
  moto: 'CAVIO Moto',
}

export function maskDocument(doc: string): string {
  if (doc.length <= 4) return doc
  return `${'•'.repeat(Math.max(0, doc.length - 4))}${doc.slice(-4)}`
}
