import { Calendar, Clock, CreditCard, MapPin, TrendingUp, User as UserIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Trip } from '../../types'
import { Modal } from '../../components/ui/Modal'
import { Avatar, Stars, TripStatusBadge } from '../../components/ui/Display'
import { MapView } from '../../components/map/MapView'
import { TripStatusTimeline } from './TripStatusTimeline'
import { useCavio } from '../../store/store'
import { getCategory } from '../../store/selectors'
import {
  formatCOP,
  formatDate,
  formatDistance,
  formatDuration,
  PAYMENT_LABEL,
} from '../../lib/format'
import { syntheticRoute } from '../../lib/geo'

// ============================================================
// CAVIO — Detalle de viaje (compartido entre roles)
// ============================================================

export function TripDetailModal({
  trip,
  open,
  onClose,
  footer,
}: {
  trip: Trip | null
  open: boolean
  onClose: () => void
  footer?: ReactNode
}) {
  const { state } = useCavio()
  if (!trip) return null

  const passenger = state.users.find((u) => u.id === trip.passengerId)
  const driver = trip.driverId ? state.drivers.find((d) => d.id === trip.driverId) : undefined
  const driverUser = driver ? state.users.find((u) => u.id === driver.userId) : undefined
  const vehicle = driver ? state.vehicles.find((v) => v.id === driver.vehicleId) : undefined
  const category = getCategory(state, trip.category)
  const rating = state.ratings.find((r) => r.tripId === trip.id)
  const fare = trip.finalFare ?? trip.agreedFare ?? trip.suggestedFare
  const commission = (fare * state.settings.commissionPct) / 100
  const route = trip.route?.length ? trip.route : syntheticRoute(trip.origin, trip.destination, 16)
  const offers = state.offers.filter((o) => o.tripId === trip.id)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Viaje ${trip.code}`}
      description={formatDate(trip.createdAt, true)}
      size="lg"
      footer={footer}
    >
      <div className="space-y-4 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <TripStatusBadge status={trip.status} />
          <span className="chip">{category.name}</span>
          <span className="chip">{PAYMENT_LABEL[trip.paymentMethod]}</span>
          {trip.simulated && <span className="chip border-lime/20 text-lime/70">Simulado</span>}
        </div>

        <div className="h-[190px] overflow-hidden rounded-2xl border border-white/[0.08]">
          <MapView
            center={trip.origin}
            zoom={13}
            markers={[
              { id: 'o', kind: 'origin', ...trip.origin, label: trip.origin.label },
              { id: 'd', kind: 'destination', ...trip.destination, label: trip.destination.label },
              ...(driver
                ? [{ id: 'v', kind: 'driver' as const, ...driver.location, label: 'Conductor' }]
                : []),
            ]}
            route={route}
            fitSignature={`detail-${trip.id}`}
            interactive={false}
          />
        </div>

        <div className="space-y-2 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5">
          <div className="flex items-start gap-3">
            <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-lime" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-white/30">Origen</p>
              <p className="text-[13px] text-white/85">{trip.origin.label}</p>
              {trip.origin.address && <p className="text-[11px] text-white/30">{trip.origin.address}</p>}
            </div>
          </div>
          <div className="ml-[4px] h-3 w-px bg-white/10" />
          <div className="flex items-start gap-3">
            <MapPin size={12} className="mt-1.5 shrink-0 text-lime" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-white/30">Destino</p>
              <p className="text-[13px] text-white/85">{trip.destination.label}</p>
              {trip.destination.address && (
                <p className="text-[11px] text-white/30">{trip.destination.address}</p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <InfoBox label="Distancia" value={formatDistance(trip.distanceKm)} icon={<Clock size={11} />} />
          <InfoBox label="Duración" value={formatDuration(trip.durationMin)} icon={<Clock size={11} />} />
          <InfoBox label="Tarifa" value={formatCOP(fare)} icon={<CreditCard size={11} />} />
          <InfoBox label="Ofertas" value={String(offers.length)} icon={<TrendingUp size={11} />} />
        </div>

        {(passenger || driverUser) && (
          <div className="grid gap-2 sm:grid-cols-2">
            {passenger && (
              <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
                <Avatar user={passenger} size={38} />
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-medium text-white/85">
                    {passenger.firstName} {passenger.lastName}
                  </p>
                  <p className="flex items-center gap-1 text-[10.5px] text-white/30">
                    <UserIcon size={9} /> Pasajero
                  </p>
                </div>
              </div>
            )}
            {driverUser && driver && (
              <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
                <Avatar user={driverUser} size={38} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium text-white/85">
                    {driverUser.firstName} {driverUser.lastName}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2 text-[10.5px] text-white/30">
                    <Stars value={driver.rating} size={9} showValue={false} />
                    <span className="truncate">
                      {vehicle ? `${vehicle.brand} ${vehicle.model} · ${vehicle.plate}` : 'Conductor CAVIO'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {state.settings.commissionPct > 0 && trip.status === 'completed' && (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5">
            <p className="section-title mb-2">Liquidación DEMO</p>
            <div className="space-y-1.5 text-[12px]">
              <Row label="Tarifa cobrada" value={formatCOP(fare)} />
              <Row label={`Comisión plataforma (${state.settings.commissionPct}%)`} value={`− ${formatCOP(commission)}`} />
              <div className="h-px bg-white/[0.06]" />
              <Row label="Ganancia del conductor" value={formatCOP(fare - commission)} strong />
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5">
            <p className="section-title mb-2.5">Estado del viaje</p>
            <TripStatusTimeline trip={trip} dense />
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5">
            <p className="section-title mb-2.5">Fechas registradas</p>
            <div className="space-y-2 text-[11.5px]">
              <DateRow label="Creado" value={trip.createdAt} />
              {trip.assignedAt && <DateRow label="Asignado" value={trip.assignedAt} />}
              {trip.startedAt && <DateRow label="Iniciado" value={trip.startedAt} />}
              {trip.finishedAt && <DateRow label="Finalizado" value={trip.finishedAt} />}
              {trip.cancelledAt && <DateRow label="Cancelado" value={trip.cancelledAt} />}
            </div>
            {trip.cancelReason && (
              <p className="mt-2 rounded-lg bg-red-500/[0.06] px-2.5 py-2 text-[11px] leading-relaxed text-red-200/60">
                {trip.cancelReason}
              </p>
            )}
            {rating && (
              <div className="mt-3 border-t border-white/[0.06] pt-2.5">
                <p className="text-[10px] uppercase tracking-wider text-white/30">Calificación del pasajero</p>
                <div className="mt-1 flex items-center gap-2">
                  <Stars value={rating.score} size={12} />
                  <span className="text-[11px] text-white/40">{formatDate(rating.createdAt)}</span>
                </div>
                {rating.comment && (
                  <p className="mt-1 text-[11.5px] italic leading-relaxed text-white/45">“{rating.comment}”</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}

function InfoBox({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
      <p className="flex items-center gap-1 text-[9.5px] uppercase tracking-wider text-white/30">
        {icon} {label}
      </p>
      <p className="mt-0.5 truncate text-[13px] font-semibold text-white/85">{value}</p>
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={strong ? 'font-medium text-white/80' : 'text-white/40'}>{label}</span>
      <span className={strong ? 'font-semibold text-lime' : 'text-white/70'}>{value}</span>
    </div>
  )
}

function DateRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-1 text-white/35">
        <Calendar size={10} /> {label}
      </span>
      <span className="text-right text-white/60">{formatDate(value, true)}</span>
    </div>
  )
}
