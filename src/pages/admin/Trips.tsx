import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, Route, Search } from 'lucide-react'
import type { Trip, TripStatus, VehicleCategoryId } from '../../types'
import { useCavio } from '../../store/store'
import { getUser } from '../../store/selectors'
import { PageHeader } from '../../components/layout/PageHeader'
import { DemoBadge } from '../../components/Brand'
import { Button } from '../../components/ui/Button'
import { EmptyState, TripStatusBadge } from '../../components/ui/Display'
import { SearchInput, Select } from '../../components/ui/Field'
import { ConfirmDialog } from '../../components/ui/Modal'
import { TripDetailModal } from '../../features/trips/TripDetailModal'
import { formatCOP, formatDate } from '../../lib/format'
import { useToast } from '../../hooks/useToast'

// ============================================================
// CAVIO — Gestión de viajes (administrador)
// ============================================================

const PAGE_SIZE = 10

const STATUS_OPTIONS: { value: 'all' | 'active' | 'completed' | 'cancelled'; label: string }[] = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'active', label: 'En curso / buscando' },
  { value: 'completed', label: 'Completados' },
  { value: 'cancelled', label: 'Cancelados' },
]

const ACTIVE: TripStatus[] = ['created', 'searching', 'offers', 'assigned', 'arriving', 'arrived', 'in_progress']

export function AdminTrips() {
  const { state, cancelTrip } = useCavio()
  const { toast } = useToast()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | 'active' | 'completed' | 'cancelled'>('all')
  const [category, setCategory] = useState<'all' | VehicleCategoryId>('all')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Trip | null>(null)
  const [cancelId, setCancelId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return state.trips
      .filter((trip) => {
        if (status === 'active') return ACTIVE.includes(trip.status)
        if (status === 'completed') return trip.status === 'completed'
        if (status === 'cancelled') return trip.status === 'cancelled'
        return true
      })
      .filter((trip) => (category === 'all' ? true : trip.category === category))
      .filter((trip) => {
        if (!q) return true
        const passenger = getUser(state, trip.passengerId)
        const driver = trip.driverId ? state.drivers.find((d) => d.id === trip.driverId) : undefined
        const driverUser = driver ? getUser(state, driver.userId) : undefined
        return (
          trip.code.toLowerCase().includes(q) ||
          trip.origin.label.toLowerCase().includes(q) ||
          trip.destination.label.toLowerCase().includes(q) ||
          `${passenger?.firstName ?? ''} ${passenger?.lastName ?? ''}`.toLowerCase().includes(q) ||
          `${driverUser?.firstName ?? ''} ${driverUser?.lastName ?? ''}`.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [state, query, status, category])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const exportCsv = () => {
    if (!filtered.length) {
      toast('No hay viajes para exportar.', 'info')
      return
    }
    const header = ['Codigo', 'Fecha', 'Pasajero', 'Conductor', 'Origen', 'Destino', 'Categoria', 'Tarifa COP', 'Estado']
    const rows = filtered.map((trip) => {
      const passenger = getUser(state, trip.passengerId)
      const driver = trip.driverId ? state.drivers.find((d) => d.id === trip.driverId) : undefined
      const driverUser = driver ? getUser(state, driver.userId) : undefined
      return [
        trip.code,
        new Date(trip.createdAt).toLocaleString('es-CO'),
        `${passenger?.firstName ?? ''} ${passenger?.lastName ?? ''}`.trim(),
        `${driverUser?.firstName ?? ''} ${driverUser?.lastName ?? ''}`.trim() || 'Sin conductor',
        trip.origin.label,
        trip.destination.label,
        trip.category,
        String(trip.finalFare ?? trip.agreedFare ?? trip.suggestedFare),
        trip.status,
      ]
    })
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\r\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'cavio-viajes.csv'
    link.click()
    URL.revokeObjectURL(url)
    toast('Viajes exportados.', 'success')
  }

  return (
    <div>
      <PageHeader
        title="Viajes"
        subtitle="Consulta y filtra todos los viajes del ecosistema CAVIO."
        badge={<DemoBadge />}
        actions={
          <>
            <span className="chip">{state.trips.length} viajes</span>
            <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={exportCsv}>
              Exportar
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_190px_170px]">
        <SearchInput
          value={query}
          onChange={(value) => {
            setQuery(value)
            setPage(1)
          }}
          placeholder="Buscar por código, ruta, pasajero o conductor"
        />
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as typeof status)
            setPage(1)
          }}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value as typeof category)
            setPage(1)
          }}
        >
          <option value="all">Todas las categorías</option>
          {state.settings.categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={22} />}
          title="No encontramos viajes"
          description="Ajusta los filtros o crea una solicitud desde el perfil de pasajero para probar el flujo."
        />
      ) : (
        <>
          <div className="space-y-2 md:hidden">
            {visible.map((trip) => {
              const passenger = getUser(state, trip.passengerId)
              const driver = trip.driverId ? state.drivers.find((d) => d.id === trip.driverId) : undefined
              const driverUser = driver ? getUser(state, driver.userId) : undefined
              return (
                <div key={trip.id} className="rounded-2xl border border-white/[0.07] bg-[#0a0a0a] p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-white/50">{trip.code}</span>
                      <TripStatusBadge status={trip.status} />
                    </div>
                    <span className="text-[13px] font-semibold tabular-nums text-white">
                      {formatCOP(trip.finalFare ?? trip.agreedFare ?? trip.suggestedFare)}
                    </span>
                  </div>
                  <p className="mt-2 truncate text-[12px] text-white/65">
                    {trip.origin.label} → {trip.destination.label}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-white/30">
                    <span>{passenger?.firstName} {passenger?.lastName}</span>
                    <span>{driverUser ? `${driverUser.firstName} ${driverUser.lastName}` : 'Sin conductor'}</span>
                    <span>{formatDate(trip.createdAt)}</span>
                  </div>
                  <div className="mt-2.5">
                    <Button size="sm" variant="secondary" onClick={() => setSelected(trip)}>
                      Ver detalle
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="table-wrap hidden md:block">
            <table className="data-table min-w-[980px]">
              <thead>
                <tr>
                  <th>Viaje</th>
                  <th>Pasajero</th>
                  <th>Conductor</th>
                  <th>Ruta</th>
                  <th>Categoría</th>
                  <th className="text-right">Tarifa</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th className="text-right">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((trip) => {
                  const passenger = getUser(state, trip.passengerId)
                  const driver = trip.driverId ? state.drivers.find((d) => d.id === trip.driverId) : undefined
                  const driverUser = driver ? getUser(state, driver.userId) : undefined
                  return (
                    <tr key={trip.id}>
                      <td className="whitespace-nowrap text-[11.5px] font-semibold text-white/60">{trip.code}</td>
                      <td className="max-w-[160px] truncate text-[11.5px] text-white/55">
                        {passenger?.firstName} {passenger?.lastName}
                      </td>
                      <td className="max-w-[160px] truncate text-[11.5px] text-white/55">
                        {driverUser ? `${driverUser.firstName} ${driverUser.lastName}` : 'Sin asignar'}
                      </td>
                      <td className="max-w-[260px]">
                        <p className="truncate text-[11.5px] text-white/65">{trip.origin.label}</p>
                        <p className="truncate text-[10.5px] text-white/30">→ {trip.destination.label}</p>
                      </td>
                      <td className="whitespace-nowrap text-[11px] capitalize text-white/45">{trip.category}</td>
                      <td className="whitespace-nowrap text-right text-[11.5px] tabular-nums text-white/65">
                        {formatCOP(trip.finalFare ?? trip.agreedFare ?? trip.suggestedFare)}
                      </td>
                      <td className="whitespace-nowrap text-[11px] text-white/40">{formatDate(trip.createdAt, true)}</td>
                      <td>
                        <TripStatusBadge status={trip.status} />
                      </td>
                      <td className="text-right">
                        <Button size="sm" variant="secondary" onClick={() => setSelected(trip)}>
                          Ver
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-white/30">
              Mostrando {visible.length} de {filtered.length} viajes
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="secondary"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                icon={<ChevronLeft size={13} />}
                aria-label="Página anterior"
              />
              <span className="px-2 text-[11.5px] text-white/45">
                {currentPage} / {totalPages}
              </span>
              <Button
                size="sm"
                variant="secondary"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                icon={<ChevronRight size={13} />}
                aria-label="Página siguiente"
              />
            </div>
          </div>
        </>
      )}

      <TripDetailModal
        trip={selected}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        footer={
          selected && ACTIVE.includes(selected.status) ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[10.5px] text-white/30">Como administrador puedes cancelar un viaje activo.</p>
              <Button
                variant="danger"
                size="sm"
                icon={<Route size={14} />}
                onClick={() => setCancelId(selected.id)}
              >
                Cancelar viaje
              </Button>
            </div>
          ) : (
            <p className="text-[10.5px] text-white/25">Este viaje ya está cerrado. No requiere acciones.</p>
          )
        }
      />

      <ConfirmDialog
        open={Boolean(cancelId)}
        onClose={() => setCancelId(null)}
        onConfirm={(reason) => {
          if (cancelId) {
            cancelTrip(cancelId, reason || 'Cancelado por el administrador.', 'admin')
            toast('Viaje cancelado y participantes notificados.', 'success')
          }
          setCancelId(null)
          setSelected(null)
        }}
        title="Cancelar viaje"
        description="Se notificará al pasajero y al conductor. La acción quedará registrada en la simulación."
        confirmLabel="Cancelar viaje"
        danger
        requireReason
        reasonLabel="Motivo de la cancelación"
      />
    </div>
  )
}

