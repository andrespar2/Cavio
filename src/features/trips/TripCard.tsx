import { ArrowRight, Clock, MapPin, Star, Wallet, Zap } from 'lucide-react'
import clsx from 'clsx'
import type { DriverProfile, Trip, User, Vehicle } from '../../types'
import { formatCOP, formatDateTimeShort, formatDistance, formatDuration, PAYMENT_LABEL, TRIP_STATUS_LABEL } from '../../lib/format'
import { TripStatusBadge } from '../../components/ui/Display'
import { Avatar } from '../../components/ui/Display'
import { getCategory } from '../../store/selectors'
import { useCavio } from '../../store/store'

// ============================================================
// CAVIO — Tarjeta de viaje (listas e historial)
// ============================================================

export function TripCard({
  trip,
  onClick,
  driver,
  passenger,
  vehicle,
  showPassenger = false,
  showDriver = false,
  className,
}: {
  trip: Trip
  onClick?: () => void
  driver?: DriverProfile
  passenger?: User
  vehicle?: Vehicle
  showPassenger?: boolean
  showDriver?: boolean
  className?: string
}) {
  const { state } = useCavio()
  const category = getCategory(state, trip.category)
  const driverUser = driver ? state.users.find((u) => u.id === driver.userId) : undefined
  const fare = trip.finalFare ?? trip.agreedFare ?? trip.suggestedFare

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={clsx(
        'w-full min-w-0 rounded-2xl border border-white/[0.07] bg-[#0a0a0a] p-4 text-left transition',
        onClick && 'hover:border-white/[0.15] hover:bg-[#101010] active:scale-[0.995]',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/35">{trip.code}</span>
            <TripStatusBadge status={trip.status} />
          </div>
          <p className="mt-1.5 text-[11.5px] text-white/30">{formatDateTimeShort(trip.createdAt)}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[15px] font-semibold tabular-nums text-white">{formatCOP(fare)}</p>
          <p className="text-[10.5px] text-white/30">
            {category.name.replace('CAVIO ', '')} · {PAYMENT_LABEL[trip.paymentMethod]}
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-lime/80" />
          <div className="min-w-0">
            <p className="truncate text-[13px] text-white/80">{trip.origin.label}</p>
            {trip.origin.address && (
              <p className="truncate text-[11px] text-white/30">{trip.origin.address}</p>
            )}
          </div>
        </div>
        <div className="ml-[3px] h-3 w-px bg-white/10" />
        <div className="flex min-w-0 items-start gap-2.5">
          <MapPin size={12} className="mt-1 shrink-0 text-lime" />
          <div className="min-w-0">
            <p className="truncate text-[13px] text-white/80">{trip.destination.label}</p>
            {trip.destination.address && (
              <p className="truncate text-[11px] text-white/30">{trip.destination.address}</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-white/[0.05] pt-3 text-[11px] text-white/40">
        <span className="inline-flex items-center gap-1">
          <Zap size={11} /> {formatDistance(trip.distanceKm)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock size={11} /> {formatDuration(trip.durationMin)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Wallet size={11} /> {PAYMENT_LABEL[trip.paymentMethod]}
        </span>
        {trip.ratingId && (
          <span className="inline-flex items-center gap-1 text-lime/80">
            <Star size={11} className="fill-lime/80" /> Calificado
          </span>
        )}
      </div>

      {(showDriver || showPassenger) && (
        <div className="mt-3 flex items-center gap-3 rounded-xl bg-white/[0.025] px-3 py-2">
          {showPassenger && passenger && (
            <div className="flex min-w-0 items-center gap-2">
              <Avatar user={passenger} size={26} />
              <div className="min-w-0">
                <p className="truncate text-[11px] leading-tight text-white/70">
                  {passenger.firstName} {passenger.lastName}
                </p>
                <p className="text-[10px] text-white/30">Pasajero</p>
              </div>
            </div>
          )}
          {showDriver && driver && driverUser && (
            <>
              {showPassenger && <ArrowRight size={13} className="shrink-0 text-white/20" />}
              <div className="flex min-w-0 items-center gap-2">
                <Avatar user={driverUser} size={26} />
                <div className="min-w-0">
                  <p className="truncate text-[11px] leading-tight text-white/70">
                    {driverUser.firstName} {driverUser.lastName}
                  </p>
                  <p className="text-[10px] text-white/30">
                    {vehicle ? `${vehicle.brand} ${vehicle.model} · ${vehicle.plate}` : 'Conductor'}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </button>
  )
}

export function TripRowStatus({ status }: { status: Trip['status'] }) {
  return <span className="text-[11px] text-white/40">{TRIP_STATUS_LABEL[status]}</span>
}
