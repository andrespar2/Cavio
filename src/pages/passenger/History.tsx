import { useMemo, useState } from 'react'
import { ArrowRight, Download, MapPin, ReceiptText, Star, TrendingUp } from 'lucide-react'
import clsx from 'clsx'
import { useCavio } from '../../store/store'
import { getTripsForPassenger } from '../../store/selectors'
import type { Trip } from '../../types'
import { PageHeader } from '../../components/layout/PageHeader'
import { SearchInput } from '../../components/ui/Field'
import { EmptyState, StatCard } from '../../components/ui/Display'
import { Button } from '../../components/ui/Button'
import { TripCard } from '../../features/trips/TripCard'
import { TripDetailModal } from '../../features/trips/TripDetailModal'
import { formatCOP, formatDistance } from '../../lib/format'
import { useToast } from '../../hooks/useToast'

// ============================================================
// CAVIO — Historial del pasajero
// ============================================================

type Filter = 'all' | 'completed' | 'cancelled' | 'active'

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'completed', label: 'Completados' },
  { id: 'cancelled', label: 'Cancelados' },
  { id: 'active', label: 'En curso' },
]

export function PassengerHistory() {
  const { state, currentUser } = useCavio()
  const { toast } = useToast()
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(8)
  const [selected, setSelected] = useState<Trip | null>(null)

  const trips = currentUser ? getTripsForPassenger(state, currentUser.id) : []

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return trips.filter((trip) => {
      const matchFilter =
        filter === 'all'
          ? true
          : filter === 'active'
            ? ['created', 'searching', 'offers', 'assigned', 'arriving', 'arrived', 'in_progress'].includes(trip.status)
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
  const totalSpent = completed.reduce((acc, t) => acc + (t.finalFare ?? t.agreedFare ?? 0), 0)
  const totalDistance = completed.reduce((acc, t) => acc + t.distanceKm, 0)
  const ratingsGiven = state.ratings.filter((r) => r.passengerId === currentUser?.id)
  const averageRating = ratingsGiven.length
    ? ratingsGiven.reduce((acc, r) => acc + r.score, 0) / ratingsGiven.length
    : 0

  const exportCsv = () => {
    if (!completed.length) {
      toast('Aún no hay viajes completados para exportar.', 'info')
      return
    }
    const header = ['Codigo', 'Fecha', 'Origen', 'Destino', 'Categoria', 'Distancia km', 'Tarifa COP', 'Estado']
    const rows = completed.map((t) => [
      t.code,
      new Date(t.createdAt).toLocaleString('es-CO'),
      t.origin.label,
      t.destination.label,
      t.category,
      t.distanceKm.toFixed(1),
      String(t.finalFare ?? t.agreedFare ?? 0),
      t.status,
    ])
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\r\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'cavio-historial.csv'
    link.click()
    URL.revokeObjectURL(url)
    toast('Historial exportado en CSV.', 'success')
  }

  return (
    <div>
      <PageHeader
        title="Mis viajes"
        subtitle="Revisa tus recorridos, tus tarifas y las calificaciones que has dejado."
        actions={
          <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={exportCsv}>
            Exportar CSV
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <StatCard label="Viajes completados" value={completed.length} icon={<ReceiptText size={15} />} accent />
        <StatCard label="Total gastado" value={formatCOP(totalSpent)} icon={<TrendingUp size={15} />} />
        <StatCard label="Distancia total" value={formatDistance(totalDistance)} icon={<MapPin size={15} />} />
        <StatCard
          label="Tu calificación media"
          value={averageRating ? `${averageRating.toFixed(1)} / 5` : '—'}
          icon={<Star size={15} />}
          hint={`${ratingsGiven.length} calificaciones`}
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
                setLimit(8)
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
          placeholder="Buscar por código, origen o destino"
          className="w-full sm:max-w-xs"
        />
      </div>

      <div className="mt-4 space-y-2.5">
        {filtered.length === 0 ? (
          <EmptyState
            icon={<ReceiptText size={22} />}
            title="No hay viajes en esta vista"
            description="Cuando completes un viaje aparecerá aquí con su tarifa, distancia y calificación."
            action={
              <Button variant="secondary" size="sm" onClick={() => setFilter('all')}>
                Ver todos los viajes
              </Button>
            }
          />
        ) : (
          <>
            {filtered.slice(0, limit).map((trip) => {
              const driver = trip.driverId ? state.drivers.find((d) => d.id === trip.driverId) : undefined
              const vehicle = driver ? state.vehicles.find((v) => v.id === driver.vehicleId) : undefined
              return (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  driver={driver}
                  vehicle={vehicle}
                  showDriver
                  onClick={() => setSelected(trip)}
                />
              )
            })}
            {filtered.length > limit && (
              <div className="flex justify-center pt-2">
                <Button variant="secondary" size="sm" onClick={() => setLimit((v) => v + 8)} icon={<ArrowRight size={14} />}>
                  Ver más viajes ({filtered.length - limit})
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
