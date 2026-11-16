import { useMemo, useState } from 'react'
import { Clock, Download, Route, Star, Wallet } from 'lucide-react'
import clsx from 'clsx'
import type { Trip } from '../../types'
import { useCavio } from '../../store/store'
import { getTripsForDriver } from '../../store/selectors'
import { PageHeader } from '../../components/layout/PageHeader'
import { DemoBadge } from '../../components/Brand'
import { Button } from '../../components/ui/Button'
import { EmptyState, StatCard } from '../../components/ui/Display'
import { SearchInput } from '../../components/ui/Field'
import { TripCard } from '../../features/trips/TripCard'
import { TripDetailModal } from '../../features/trips/TripDetailModal'
import { formatCOP, formatDistance } from '../../lib/format'
import { useToast } from '../../hooks/useToast'

// ============================================================
// CAVIO — Historial del conductor
// ============================================================

type Filter = 'all' | 'completed' | 'cancelled' | 'active'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'completed', label: 'Completados' },
  { id: 'cancelled', label: 'Cancelados' },
  { id: 'active', label: 'En curso' },
]

export function DriverHistory() {
  const { state, currentDriver } = useCavio()
  const { toast } = useToast()
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(10)
  const [selected, setSelected] = useState<Trip | null>(null)

  const trips = currentDriver ? getTripsForDriver(state, currentDriver.id) : []

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return trips.filter((trip) => {
      const matchFilter =
        filter === 'all'
          ? true
          : filter === 'active'
            ? ['assigned', 'arriving', 'arrived', 'in_progress'].includes(trip.status)
            : trip.status === filter
      const matchQuery =
        !q ||
        trip.code.toLowerCase().includes(q) ||
        trip.origin.label.toLowerCase().includes(q) ||
        trip.destination.label.toLowerCase().includes(q)
      return matchFilter && matchQuery
    })
  }, [trips, filter, query])

  const completed = trips.filter((t) => t.status === 'completed')
  const total = completed.reduce((acc, t) => acc + (t.finalFare ?? t.agreedFare ?? 0), 0)
  const distance = completed.reduce((acc, t) => acc + t.distanceKm, 0)
  const ratings = state.ratings.filter((r) => r.driverId === currentDriver?.id)
  const avg = ratings.length ? ratings.reduce((acc, r) => acc + r.score, 0) / ratings.length : 0

  const exportCsv = () => {
    if (!trips.length) {
      toast('No hay viajes para exportar.', 'info')
      return
    }
    const header = ['Codigo', 'Fecha', 'Pasajero', 'Origen', 'Destino', 'Tarifa COP', 'Estado']
    const rows = trips.map((t) => [
      t.code,
      new Date(t.createdAt).toLocaleString('es-CO'),
      state.users.find((u) => u.id === t.passengerId)?.firstName ?? '',
      t.origin.label,
      t.destination.label,
      String(t.finalFare ?? t.agreedFare ?? t.suggestedFare),
      t.status,
    ])
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\r\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'cavio-viajes-conductor.csv'
    link.click()
    URL.revokeObjectURL(url)
    toast('Historial exportado.', 'success')
  }

  return (
    <div>
      <PageHeader
        title="Historial de viajes"
        subtitle="Todos los viajes asociados a tu cuenta de conductor."
        badge={<DemoBadge />}
        actions={
          <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={exportCsv}>
            Exportar CSV
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <StatCard label="Viajes completados" value={completed.length} icon={<Route size={15} />} accent />
        <StatCard label="Volumen total" value={formatCOP(total)} icon={<Wallet size={15} />} />
        <StatCard label="Distancia" value={formatDistance(distance)} icon={<Clock size={15} />} />
        <StatCard
          label="Calificación media"
          value={avg ? `${avg.toFixed(1)} / 5` : '—'}
          icon={<Star size={15} />}
          hint={`${ratings.length} calificaciones`}
        />
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setFilter(item.id)
                setLimit(10)
              }}
              className={clsx(
                'shrink-0 rounded-full border px-3.5 py-2 text-[12px] font-medium transition',
                filter === item.id
                  ? 'border-lime/30 bg-lime/[0.12] text-lime'
                  : 'border-white/10 bg-white/[0.03] text-white/50 hover:text-white/80',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Buscar por código o ruta"
          className="w-full sm:max-w-xs"
        />
      </div>

      <div className="mt-4 space-y-2.5">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Route size={22} />}
            title="No hay viajes en esta vista"
            description="Los viajes que completes o canceles aparecerán aquí con su detalle."
            action={
              <Button variant="secondary" size="sm" onClick={() => setFilter('all')}>
                Ver todos
              </Button>
            }
          />
        ) : (
          <>
            {filtered.slice(0, limit).map((trip) => {
              const passenger = state.users.find((u) => u.id === trip.passengerId)
              return (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  passenger={passenger}
                  showPassenger
                  onClick={() => setSelected(trip)}
                />
              )
            })}
            {filtered.length > limit && (
              <div className="flex justify-center pt-2">
                <Button variant="secondary" size="sm" onClick={() => setLimit((v) => v + 10)}>
                  Ver más ({filtered.length - limit})
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <TripDetailModal trip={selected} open={Boolean(selected)} onClose={() => setSelected(null)} />
    </div>
  )
}

