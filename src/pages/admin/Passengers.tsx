import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Search, ShieldOff, UserCheck, Users } from 'lucide-react'
import clsx from 'clsx'
import type { User } from '../../types'
import { useCavio } from '../../store/store'
import { getTripsForPassenger } from '../../store/selectors'
import { PageHeader } from '../../components/layout/PageHeader'
import { DemoBadge } from '../../components/Brand'
import { Button } from '../../components/ui/Button'
import { Avatar, EmptyState, StatCard, UserStatusBadge } from '../../components/ui/Display'
import { ConfirmDialog, Modal } from '../../components/ui/Modal'
import { Field, Input, SearchInput } from '../../components/ui/Field'
import { formatCOP, formatDate, formatDistance } from '../../lib/format'
import { useToast } from '../../hooks/useToast'

// ============================================================
// CAVIO — Gestión de pasajeros (administrador)
// ============================================================

const PAGE_SIZE = 8

export function AdminPassengers() {
  const { state, updateUser, setUserStatus } = useCavio()
  const { toast } = useToast()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | 'active' | 'suspended'>('all')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [edit, setEdit] = useState({ email: '', phone: '' })
  const [confirm, setConfirm] = useState<'suspend' | 'reactivate' | null>(null)
  const [busy, setBusy] = useState(false)

  const passengers = useMemo(() => state.users.filter((u) => u.role === 'passenger'), [state.users])

  const selected = selectedId ? passengers.find((p) => p.id === selectedId) ?? null : null

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return passengers
      .filter((p) => (status === 'all' ? true : p.status === status))
      .filter(
        (p) =>
          !q ||
          `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          p.documentNumber.includes(q) ||
          p.phone.includes(q),
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [passengers, query, status])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const openDetail = (user: User) => {
    setSelectedId(user.id)
    setEdit({ email: user.email, phone: user.phone })
  }

  const selectedTrips = selected ? getTripsForPassenger(state, selected.id) : []
  const completed = selectedTrips.filter((t) => t.status === 'completed')
  const spent = completed.reduce((acc, t) => acc + (t.finalFare ?? t.agreedFare ?? 0), 0)

  const saveEdit = () => {
    if (!selected) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(edit.email)) {
      toast('Escribe un correo válido.', 'error')
      return
    }
    if (edit.phone.replace(/\D/g, '').length < 10) {
      toast('Escribe un teléfono válido.', 'error')
      return
    }
    const result = updateUser(selected.id, { email: edit.email.trim(), phone: edit.phone.trim() })
    if (!result.ok) toast(result.error ?? 'No pudimos guardar los cambios.', 'error')
    else toast('Datos del pasajero actualizados.', 'success')
  }

  const confirmAction = (reason: string) => {
    if (!selected || !confirm) return
    setBusy(true)
    if (confirm === 'suspend') {
      setUserStatus(selected.id, 'suspended', reason || 'Suspensión administrativa.')
      toast('Cuenta suspendida. Se cancelaron sus viajes activos si existían.', 'success')
    } else {
      setUserStatus(selected.id, 'active', reason || 'Cuenta reactivada por el administrador.')
      toast('Cuenta reactivada.', 'success')
    }
    setBusy(false)
    setConfirm(null)
  }

  return (
    <div>
      <PageHeader
        title="Pasajeros"
        subtitle="Consulta, edita y administra las cuentas de pasajeros de CAVIO."
        badge={<DemoBadge />}
        actions={
          <span className="chip">
            <Users size={12} /> {passengers.length} registrados
          </span>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput
          value={query}
          onChange={(value) => {
            setQuery(value)
            setPage(1)
          }}
          placeholder="Buscar por nombre, documento, correo o teléfono"
          className="flex-1"
        />
        <div className="flex gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
          {(['all', 'active', 'suspended'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setStatus(value)
                setPage(1)
              }}
              className={clsx(
                'rounded-lg px-3 py-1.5 text-[11px] font-medium transition',
                status === value ? 'bg-lime text-black' : 'text-white/45 hover:text-white',
              )}
            >
              {value === 'all' ? 'Todos' : value === 'active' ? 'Activos' : 'Suspendidos'}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={22} />}
          title="No encontramos pasajeros"
          description="Prueba con otro término de búsqueda o cambia el filtro de estado."
        />
      ) : (
        <>
          <div className="space-y-2 md:hidden">
            {visible.map((user) => {
              const trips = getTripsForPassenger(state, user.id)
              return (
                <div key={user.id} className="rounded-2xl border border-white/[0.07] bg-[#0a0a0a] p-3.5">
                  <div className="flex items-start gap-2.5">
                    <Avatar user={user} size={38} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-white/85">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="truncate text-[10.5px] text-white/30">{user.email}</p>
                    </div>
                    <UserStatusBadge status={user.status} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-white/35">
                    <span>{user.documentType} {user.documentNumber}</span>
                    <span>{user.phone}</span>
                    <span>{trips.length} viajes</span>
                  </div>
                  <div className="mt-2.5 flex gap-1.5">
                    <Button size="sm" variant="secondary" onClick={() => openDetail(user)}>
                      Ver ficha
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="table-wrap hidden md:block">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Pasajero</th>
                  <th>Documento</th>
                  <th>Teléfono</th>
                  <th>Registro</th>
                  <th>Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((user) => (
                  <tr key={user.id}>
                    <td className="max-w-[260px]">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Avatar user={user} size={32} />
                        <div className="min-w-0">
                          <p className="truncate text-[12.5px] font-medium text-white/85">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="truncate text-[10.5px] text-white/35">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap text-[11.5px] text-white/50">
                      {user.documentType} {user.documentNumber}
                    </td>
                    <td className="whitespace-nowrap text-[11.5px] text-white/50">{user.phone}</td>
                    <td className="whitespace-nowrap text-[11.5px] text-white/45">{formatDate(user.createdAt)}</td>
                    <td>
                      <UserStatusBadge status={user.status} />
                    </td>
                    <td className="text-right">
                      <Button size="sm" variant="secondary" onClick={() => openDetail(user)}>
                        Ver ficha
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-white/30">
              Mostrando {visible.length} de {filtered.length} pasajeros
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
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        title={selected ? `${selected.firstName} ${selected.lastName}` : 'Pasajero'}
        description={selected ? `Cuenta creada el ${formatDate(selected.createdAt)}` : undefined}
        size="lg"
        footer={
          selected && (
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              {selected.status === 'active' ? (
                <Button variant="danger" onClick={() => setConfirm('suspend')} icon={<ShieldOff size={14} />}>
                  Suspender cuenta
                </Button>
              ) : (
                <Button onClick={() => setConfirm('reactivate')} icon={<UserCheck size={14} />}>
                  Reactivar cuenta
                </Button>
              )}
            </div>
          )
        }
      >
        {selected && (
          <div className="space-y-4 pb-2">
            <div className="flex flex-wrap items-center gap-3">
              <Avatar user={selected} size={56} ring />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <UserStatusBadge status={selected.status} />
                  <span className="chip">Pasajero</span>
                </div>
                <p className="mt-1 truncate text-[11.5px] text-white/35">{selected.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StatCard label="Viajes" value={selectedTrips.length} accent />
              <StatCard label="Completados" value={completed.length} />
              <StatCard label="Gasto total" value={formatCOP(spent)} />
              <StatCard label="Distancia" value={formatDistance(completed.reduce((acc, t) => acc + t.distanceKm, 0))} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Correo electrónico">
                <Input value={edit.email} onChange={(e) => setEdit((prev) => ({ ...prev, email: e.target.value }))} />
              </Field>
              <Field label="Teléfono">
                <Input value={edit.phone} onChange={(e) => setEdit((prev) => ({ ...prev, phone: e.target.value }))} />
              </Field>
              <Field label="Documento">
                <Input value={`${selected.documentType} ${selected.documentNumber}`} disabled />
              </Field>
              <Field label="Ciudad">
                <Input value={selected.city} disabled />
              </Field>
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={saveEdit}>
                Guardar cambios
              </Button>
            </div>

            <div>
              <p className="section-title mb-2">Últimos viajes</p>
              {selectedTrips.length === 0 ? (
                <p className="rounded-xl bg-white/[0.02] px-3 py-4 text-center text-[11.5px] text-white/30">
                  Este pasajero no tiene viajes registrados.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {selectedTrips.slice(0, 5).map((trip) => (
                    <div key={trip.id} className="flex min-w-0 items-center gap-2 rounded-xl bg-white/[0.025] px-3 py-2">
                      <span className="text-[10.5px] font-semibold text-white/45">{trip.code}</span>
                      <span className="min-w-0 flex-1 truncate text-[11px] text-white/40">
                        {trip.origin.label} → {trip.destination.label}
                      </span>
                      <span className="shrink-0 text-[10.5px] tabular-nums text-white/55">
                        {formatCOP(trip.finalFare ?? trip.agreedFare ?? trip.suggestedFare)}
                      </span>
                      <span
                        className={clsx(
                          'shrink-0 rounded-full px-1.5 py-0.5 text-[9px]',
                          trip.status === 'completed'
                            ? 'bg-lime/10 text-lime/80'
                            : trip.status === 'cancelled'
                              ? 'bg-red-500/10 text-red-300/80'
                              : 'bg-white/10 text-white/50',
                        )}
                      >
                        {trip.status === 'completed' ? 'Completado' : trip.status === 'cancelled' ? 'Cancelado' : 'Activo'}
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
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={confirmAction}
        title={confirm === 'suspend' ? 'Suspender cuenta de pasajero' : 'Reactivar cuenta de pasajero'}
        description={
          confirm === 'suspend'
            ? 'El pasajero no podrá crear nuevas solicitudes y sus viajes activos serán cancelados. La acción queda registrada en auditoría.'
            : 'El pasajero podrá volver a solicitar viajes. La acción queda registrada en auditoría.'
        }
        confirmLabel={confirm === 'suspend' ? 'Suspender' : 'Reactivar'}
        danger={confirm === 'suspend'}
        requireReason={confirm === 'suspend'}
        reasonLabel="Motivo de la suspensión"
        reasonPlaceholder="Describe el motivo para el registro de auditoría…"
        loading={busy}
      />
    </div>
  )
}

