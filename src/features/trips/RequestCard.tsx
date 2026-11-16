import { ArrowRight, Clock, MapPin, Navigation, Timer, User, Zap } from 'lucide-react'
import type { DriverProfile, Offer, Trip } from '../../types'
import { Button } from '../../components/ui/Button'
import { TripStatusBadge } from '../../components/ui/Display'
import { formatCOP, formatDistance, formatDuration, relativeTime } from '../../lib/format'
import { haversineKm } from '../../lib/geo'
import { useCavio } from '../../store/store'
import { getCategory } from '../../store/selectors'

// ============================================================
// CAVIO — Solicitud cercana vista por el conductor
// ============================================================

export function RequestCard({
  trip,
  driver,
  existingOffer,
  onAccept,
  onCounter,
  busy,
}: {
  trip: Trip
  driver: DriverProfile
  existingOffer?: Offer
  onAccept: () => void
  onCounter: () => void
  busy?: boolean
}) {
  const { state } = useCavio()
  const passenger = state.users.find((u) => u.id === trip.passengerId)
  const category = getCategory(state, trip.category)
  const pickupKm = haversineKm(driver.location, trip.origin)
  const eta = Math.max(1, Math.round((pickupKm / 20) * 60) + 2)
  const offersCount = state.offers.filter((o) => o.tripId === trip.id && o.status === 'pending').length

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0a0a0a] p-4 transition hover:border-white/[0.15]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/50">
            {category.name.replace('CAVIO ', '')}
          </span>
          <TripStatusBadge status={trip.status} />
          <span className="text-[10.5px] text-white/25">{relativeTime(trip.createdAt)}</span>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[16px] font-semibold tabular-nums text-lime">{formatCOP(trip.suggestedFare)}</p>
          <p className="text-[9.5px] uppercase tracking-wider text-white/30">Tarifa propuesta</p>
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        <div className="flex min-w-0 items-start gap-2">
          <span className="mt-1 h-2 w-2 shrink-0 rounded-full border-2 border-lime" />
          <p className="min-w-0 flex-1 truncate text-[12.5px] text-white/80">{trip.origin.label}</p>
          <span className="shrink-0 text-[10px] text-white/30">{formatDistance(pickupKm)} de ti</span>
        </div>
        <div className="ml-[3px] h-2.5 w-px bg-white/10" />
        <div className="flex min-w-0 items-start gap-2">
          <MapPin size={11} className="mt-1 shrink-0 text-lime" />
          <p className="min-w-0 flex-1 truncate text-[12.5px] text-white/80">{trip.destination.label}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10.5px] text-white/35">
        <span className="inline-flex items-center gap-1">
          <Zap size={10} /> Viaje {formatDistance(trip.distanceKm)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock size={10} /> {formatDuration(trip.durationMin)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Timer size={10} /> Recogida ~{eta} min
        </span>
        <span className="inline-flex items-center gap-1">
          <User size={10} /> {passenger?.firstName ?? 'Pasajero'}
        </span>
        {offersCount > 0 && (
          <span className="inline-flex items-center gap-1 text-amber-200/60">
            <Navigation size={10} /> {offersCount} oferta{offersCount === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {existingOffer ? (
        <div className="mt-3 rounded-xl border border-lime/20 bg-lime/[0.05] px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11.5px] text-white/60">
              Tu oferta:{' '}
              <span className="font-semibold text-lime">{formatCOP(existingOffer.amount)}</span>
            </p>
            <span className="text-[10px] text-white/30">Esperando al pasajero</span>
          </div>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="secondary" className="flex-1" onClick={onCounter} disabled={busy}>
              Modificar oferta
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Button size="sm" variant="secondary" onClick={onCounter} disabled={busy} className="sm:flex-1">
            Contraofertar
          </Button>
          <Button size="sm" fullWidth onClick={onAccept} loading={busy} className="sm:flex-1" icon={<ArrowRight size={14} />}>
            Aceptar tarifa
          </Button>
        </div>
      )}
    </div>
  )
}
