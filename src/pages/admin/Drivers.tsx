import { useMemo, useState } from 'react'
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  ShieldOff,
  Star,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react'
import clsx from 'clsx'
import type { DriverProfile } from '../../types'
import { useCavio } from '../../store/store'
import { getDriverStats, getDriverVehicle, getTripsForDriver, getUser } from '../../store/selectors'
import { PageHeader } from '../../components/layout/PageHeader'
import { DemoBadge } from '../../components/Brand'
import { Button } from '../../components/ui/Button'
import { ApprovalBadge, Avatar, EmptyState, StatCard, Stars, TripStatusBadge } from '../../components/ui/Display'
import { ConfirmDialog, Modal } from '../../components/ui/Modal'
import { SearchInput } from '../../components/ui/Field'
import { formatCOP, formatDate, formatDistance } from '../../lib/format'
import { useToast } from '../../hooks/useToast'

// ============================================================
// CAVIO — Gestión y aprobación de conductores
// ============================================================

const PAGE_SIZE = 8
type Filter = 'all' | 'pending' | 'approved' | 'rejected' | 'suspended'
type Action = 'approve' | 'reject' | 'suspend' | 'reactivate'

const ACTION_META: Record<Action, { title: string; description: string; label: string; danger: boolean; requireReason: boolean }> = {
  approve: {
    title: 'Aprobar conductor',
    description: 'El conductor podrá activar su disponibilidad y recibir solicitudes de pasajeros.',
    label: 'Aprobar',
    danger: false,
    requireReason: false,
  },
  reject: {
    title: 'Rechazar registro',
    description: 'El conductor no podrá operar en CAVIO. Explica el motivo para que pueda corregirlo.',
    label: 'Rechazar registro',
    danger: true,
    requireReason: true,
  },
  suspend: {
    title: 'Suspender conductor',
    description: 'El conductor no recibirá solicitudes y sus viajes activos serán cancelados. La acción queda auditada.',
    label: 'Suspender',
    danger: true,
    requireReason: true,
  },
  reactivate: {
    title: 'Reactivar conductor',
    description: 'La cuenta volverá al estado aprobado y podrá conectarse nuevamente.',
    label: 'Reactivar',
    danger: false,
    requireReason: false,
  },
}

export function AdminDrivers() {
  const { state, setDriverApproval } = useCavio()
  const { toast } = useToast()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [action, setAction] = useState<{ driverId: string; type: Action } | null>(null)
  const [busy, setBusy] = useState(false)

  const rows = useMemo(
    () =>
      state.drivers
        .map((driver) => ({
          driver,
          user: getUser(state, driver.userId),
          vehicle: getDriverVehicle(state, driver.id),
          stats: getDriverStats(state, driver.id),
        }))
        .filter((row) => row.user)
        .sort((a, b) => new Date(b.driver.createdAt).getTime() - new Date(a.driver.createdAt).getTime()),
    [state],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows
      .filter((row) => (filter === 'all' ? true : row.driver.approval === filter))
      .filter((row) => {
        if (!q) return true
        const user = row.user!
        return (
          `${user.firstName} ${user.lastName}`.toLowerCase().includes(q) ||
          user.email.toLowerCase().includes(q) ||
          user.documentNumber.includes(q) ||
          (row.vehicle?.plate ?? '').toLowerCase().includes(q)
        )
      })
  }, [rows, filter, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const selectedRow = selectedId ? rows.find((row) => row.driver.id === selectedId) : undefined
  const selectedTrips = selectedRow ? getTripsForDriver(state, selectedRow.driver.id) : []

  const openAction = (driver: DriverProfile, type: Action) => {
    setAction({ driverId: driver.id, type })
  }

  const applyAction = (reason: string) => {
    if (!action) return
    setBusy(true)
    const driver = state.drivers.find((d) => d.id === action.driverId)
    const mapping: Record<Action, DriverProfile['approval']> = {
      approve: 'approved',
      reject: 'rejected',
      suspend: 'suspended',
      reactivate: 'approved',
    }
    setDriverApproval(action.driverId, mapping[action.type], reason || undefined)
    setBusy(false)
    toast(
      `${driver ? 'El conductor' : 'La cuenta'} quedó ${mapping[action.type] === 'approved' ? 'aprobado' : mapping[action.type] === 'rejected' ? 'rechazado' : 'suspendido'}.`,
      'success',
    )
    setAction(null)
  }

  return (
    <div>
      <PageHeader
        title="Conductores"
        subtitle="Revisa registros, documentación, vehículos y estado de cada conductor."
        badge={<DemoBadge />}
        actions={
          <span className="chip">
            <Users size={12} /> {rows.length} conductores
          </span>
        }
      />

      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center">
        <SearchInput
          value={query}
          onChange={(value) => {
            setQuery(value)
            setPage(1)
          }}
          placeholder="Buscar por nombre, documento, correo o placa"
          className="flex-1"
        />
        <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03] p-1">
          {(['all', 'pending', 'approved', 'rejected', 'suspended'] as const).map((value) => {
            const count = value === 'all' ? rows.length : rows.filter((r) => r.driver.approval === value).length
            return (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setFilter(value)
                  setPage(1)
                }}
                className={clsx(
                  'shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition',
                  filter === value ? 'bg-lime text-black' : 'text-white/45 hover:text-white',
                )}
              >
                {value === 'all'
                  ? 'Todos'
                  : value === 'pending'
                    ? 'Pendientes'
                    : value === 'approved'
                      ? 'Aprobados'
                      : value === 'rejected'
                        ? 'Rechazados'
                        : 'Suspendidos'}{' '}
                <span className={filter === value ? 'text-black/50' : 'text-white/25'}>{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<UserCheck size={22} />}
          title="No hay conductores en esta vista"
          description="Cambia el filtro o prueba otro término de búsqueda."
        />
      ) : (
        <>
          <div className="space-y-2 md:hidden">
            {visible.map(({ driver, user, vehicle, stats }) => (
              <div key={driver.id} className="rounded-2xl border border-white/[0.07] bg-[#0a0a0a] p-3.5">
                <div className="flex items-start gap-2.5">
                  <Avatar user={user} size={38} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-white/85">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="truncate text-[10.5px] text-white/30">{user?.email}</p>
                  </div>
                  <ApprovalBadge approval={driver.approval} />
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-white/35">
                  <span className="truncate">
                    {vehicle ? `${vehicle.brand} ${vehicle.model} · ${vehicle.plate}` : 'Sin vehículo'}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Star size={10} className="fill-lime text-lime" /> {driver.rating.toFixed(1)}
                  </span>
                  <span>
                    {stats.completed}/{stats.totalTrips} viajes
                  </span>
                  {driver.approval === 'approved' && (
                    <span className={driver.available ? 'text-lime/70' : 'text-white/25'}>
                      {driver.available ? '● En línea' : '○ Desconectado'}
                    </span>
                  )}
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <Button size="sm" variant="secondary" onClick={() => setSelectedId(driver.id)}>
                    Ficha
                  </Button>
                  {driver.approval === 'pending' && (
                    <Button size="sm" onClick={() => openAction(driver, 'approve')}>
                      Aprobar
                    </Button>
                  )}
                  {driver.approval === 'approved' && (
                    <Button size="sm" variant="danger" onClick={() => openAction(driver, 'suspend')}>
                      Suspender
                    </Button>
                  )}
                  {(driver.approval === 'rejected' || driver.approval === 'suspended') && (
                    <Button size="sm" onClick={() => openAction(driver, 'reactivate')}>
                      Reactivar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="table-wrap hidden md:block">
            <table className="data-table min-w-[900px]">
              <thead>
                <tr>
                  <th>Conductor</th>
                  <th>Vehículo</th>
                  <th>Categoría</th>
                  <th>Calificación</th>
                  <th>Viajes</th>
                  <th>Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(({ driver, user, vehicle, stats }) => (
                  <tr key={driver.id}>
                    <td className="max-w-[250px]">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Avatar user={user} size={32} />
                        <div className="min-w-0">
                          <p className="truncate text-[12.5px] font-medium text-white/85">
                            {user?.firstName} {user?.lastName}
                          </p>
                          <p className="truncate text-[10.5px] text-white/35">{user?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap text-[11.5px] text-white/55">
                      {vehicle ? `${vehicle.brand} ${vehicle.model}` : '—'}
                      <span className="ml-1.5 text-white/25">{vehicle?.plate}</span>
                    </td>
                    <td className="whitespace-nowrap text-[11.5px] capitalize text-white/45">{vehicle?.category ?? '—'}</td>
                    <td>
                      <Stars value={driver.rating} count={driver.ratingCount} size={11} />
                    </td>
                    <td className="text-[11.5px] text-white/50">
                      {stats.completed}
                      <span className="text-white/25"> / {stats.totalTrips}</span>
                    </td>
                    <td>
                      <div className="flex flex-col gap-1">
                        <ApprovalBadge approval={driver.approval} />
                        {driver.approval === 'approved' && (
                          <span className={clsx('text-[9.5px]', driver.available ? 'text-lime/70' : 'text-white/25')}>
                            {driver.available ? '● En línea' : '○ Desconectado'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="secondary" onClick={() => setSelectedId(driver.id)}>
                          Ficha
                        </Button>
                        {driver.approval === 'pending' && (
                          <Button size="sm" onClick={() => openAction(driver, 'approve')}>
                            Aprobar
                          </Button>
                        )}
                        {driver.approval === 'approved' && (
                          <Button size="sm" variant="danger" onClick={() => openAction(driver, 'suspend')}>
                            Suspender
                          </Button>
                        )}
                        {(driver.approval === 'rejected' || driver.approval === 'suspended') && (
                          <Button size="sm" onClick={() => openAction(driver, 'reactivate')}>
                            Reactivar
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-white/30">
              Mostrando {visible.length} de {filtered.length} conductores
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

      <Modal
        open={Boolean(selectedRow)}
        onClose={() => setSelectedId(null)}
        title={selectedRow ? `${selectedRow.user?.firstName} ${selectedRow.user?.lastName}` : 'Conductor'}
        description={selectedRow ? `Registro creado el ${formatDate(selectedRow.driver.createdAt)}` : undefined}
        size="lg"
        footer={
          selectedRow && (
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              {selectedRow.driver.approval === 'pending' && (
                <>
                  <Button
                    variant="danger"
                    onClick={() => openAction(selectedRow.driver, 'reject')}
                    icon={<XCircle size={14} />}
                  >
                    Rechazar
                  </Button>
                  <Button onClick={() => openAction(selectedRow.driver, 'approve')} icon={<UserCheck size={14} />}>
                    Aprobar conductor
                  </Button>
                </>
              )}
              {selectedRow.driver.approval === 'approved' && (
                <Button
                  variant="danger"
                  onClick={() => openAction(selectedRow.driver, 'suspend')}
                  icon={<ShieldOff size={14} />}
                >
                  Suspender
                </Button>
              )}
              {(selectedRow.driver.approval === 'rejected' || selectedRow.driver.approval === 'suspended') && (
                <Button onClick={() => openAction(selectedRow.driver, 'reactivate')} icon={<BadgeCheck size={14} />}>
                  Reactivar
                </Button>
              )}
            </div>
          )
        }
      >
        {selectedRow && (
          <div className="space-y-4 pb-2">
            <div className="flex flex-wrap items-center gap-3">
              <Avatar user={selectedRow.user} size={56} ring />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <ApprovalBadge approval={selectedRow.driver.approval} />
                  <span className="chip">{selectedRow.vehicle?.category ?? '—'}</span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-white/45">
                    <Star size={11} className="fill-lime text-lime" /> {selectedRow.driver.rating.toFixed(2)}
                  </span>
                </div>
                <p className="mt-1 truncate text-[11.5px] text-white/35">{selectedRow.user?.email}</p>
                <p className="truncate text-[11px] text-white/30">
                  {selectedRow.user?.phone} · {selectedRow.user?.documentType} {selectedRow.user?.documentNumber}
                </p>
              </div>
            </div>

            {selectedRow.driver.reviewNote && (
              <p className="rounded-xl border border-red-500/15 bg-red-500/[0.05] px-3 py-2 text-[11.5px] leading-relaxed text-red-200/70">
                {selectedRow.driver.reviewNote}
              </p>
            )}

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatCard label="Completados" value={selectedRow.stats.completed} accent />
              <StatCard label="Ganancia neta" value={formatCOP(selectedRow.stats.total)} />
              <StatCard label="Cancelados" value={selectedRow.stats.cancelled} />
              <StatCard label="Distancia" value={formatDistance(selectedTrips.reduce((a, t) => a + t.distanceKm, 0))} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                <p className="section-title mb-2">Vehículo</p>
                {selectedRow.vehicle ? (
                  <div className="space-y-1 text-[12px]">
                    <Row label="Marca y modelo" value={`${selectedRow.vehicle.brand} ${selectedRow.vehicle.model}`} />
                    <Row label="Año" value={String(selectedRow.vehicle.year)} />
                    <Row label="Color" value={selectedRow.vehicle.color} />
                    <Row label="Placa" value={selectedRow.vehicle.plate} />
                    <Row label="Capacidad" value={`${selectedRow.vehicle.capacity} pasajeros`} />
                  </div>
                ) : (
                  <p className="text-[11.5px] text-white/30">Sin vehículo.</p>
                )}
                <p className="mt-2 border-t border-white/[0.06] pt-2 text-[10.5px] text-white/25">
                  Licencia {selectedRow.driver.licenseNumber} ({selectedRow.driver.licenseCategory}) · vence{' '}
                  {formatDate(selectedRow.driver.licenseExpiry)}
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                <p className="section-title mb-2">Documentación DEMO</p>
                <ul className="space-y-1.5">
                  {selectedRow.driver.documents.map((doc) => (
                    <li key={doc.id} className="flex items-center justify-between gap-2 text-[11.5px]">
                      <span className="min-w-0 truncate text-white/50">{doc.name}</span>
                      <span
                        className={clsx(
                          'shrink-0 rounded-full px-1.5 py-0.5 text-[9px]',
                          doc.status === 'cargado' ? 'bg-lime/10 text-lime/80' : 'bg-amber-400/10 text-amber-200/80',
                        )}
                      >
                        {doc.status === 'cargado' ? 'Cargado' : 'Pendiente'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <p className="section-title mb-2">Últimos viajes</p>
              {selectedTrips.length === 0 ? (
                <p className="rounded-xl bg-white/[0.02] px-3 py-4 text-center text-[11.5px] text-white/30">
                  Sin viajes registrados.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {selectedTrips.slice(0, 5).map((trip) => (
                    <div key={trip.id} className="flex min-w-0 flex-wrap items-center gap-2 rounded-xl bg-white/[0.025] px-3 py-2">
                      <span className="text-[10.5px] font-semibold text-white/45">{trip.code}</span>
                      <TripStatusBadge status={trip.status} />
                      <span className="min-w-0 flex-1 truncate text-[11px] text-white/40">
                        {trip.origin.label} → {trip.destination.label}
                      </span>
                      <span className="shrink-0 text-[10.5px] tabular-nums text-white/55">
                        {formatCOP(trip.finalFare ?? trip.agreedFare ?? trip.suggestedFare)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(action)}
        onClose={() => setAction(null)}
        onConfirm={applyAction}
        title={action ? ACTION_META[action.type].title : 'Confirmar'}
        description={action ? ACTION_META[action.type].description : ''}
        confirmLabel={action ? ACTION_META[action.type].label : 'Confirmar'}
        danger={action ? ACTION_META[action.type].danger : false}
        requireReason={action ? ACTION_META[action.type].requireReason : false}
        reasonLabel="Motivo"
        reasonPlaceholder="Describe el motivo para el registro de auditoría…"
        loading={busy}
      />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-white/35">{label}</span>
      <span className="truncate text-right text-white/70">{value}</span>
    </div>
  )
}

