export function uid(prefix = 'id'): string {
  const random = Math.random().toString(36).slice(2, 8)
  const time = Date.now().toString(36).slice(-5)
  return `${prefix}_${time}${random}`
}

export function nowIso(): string {
  return new Date().toISOString()
}

/** Generador pseudoaleatorio determinista (para datos DEMO estables). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function pick<T>(rand: () => number, list: T[]): T {
  return list[Math.floor(rand() * list.length)]
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function daysAgo(days: number, hours = 0): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(8 + (hours % 12), (hours * 7) % 60, 0, 0)
  return d.toISOString()
}

export function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export function isToday(iso: string): boolean {
  const d = new Date(iso)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

export function isWithinDays(iso: string, days: number): boolean {
  return Date.now() - new Date(iso).getTime() <= days * 86400000
}

export function isThisMonth(iso: string): boolean {
  const d = new Date(iso)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

export function dayKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function humanDay(iso: string): string {
  const d = new Date(iso)
  return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short' }).format(d)
}
