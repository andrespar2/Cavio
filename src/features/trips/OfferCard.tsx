import { Check, Clock, MapPin, MessageSquare, X } from 'lucide-react'
import type { DriverProfile, Offer, Trip, User, Vehicle } from '../../types'
import { Avatar, Stars } from '../../components/ui/Display'
import { Button } from '../../components/ui/Button'
import { formatCOP, relativeTime } from '../../lib/format'
import { estimateDurationMin, haversineKm } from '../../lib/geo'

// ============================================================
// CAVIO — Tarjeta de oferta / contraoferta
// ============================================================

export function OfferCard({
  offer,
  trip,
  driver,
  driverUser,
  vehicle,
  onAccept,
  onReject,
  busy,
}: {
  offer: Offer
  trip: Trip
  driver: DriverProfile
  driverUser: User
  vehicle?: Vehicle
  onAccept?: () => void
  onReject?: () => void
  busy?: boolean
}) {
  const distanceToPickup = haversineKm(driver.location, trip.origin)
  const eta = Math.max(1, Math.round((distanceToPickup / 20) * 60) + 2)
  const isCounter = offer.amount > trip.suggestedFare

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0b0b0b] p-3.5 transition hover:border-white/[0.14]">
      <div className="flex items-start gap-3">
        <Avatar user={driverUser} size={42} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <p className="truncate text-[13.5px] font-semibold text-white">
              {driverUser.firstName} {driverUser.lastName}
            </p>
            <Stars value={driver.rating} count={driver.ratingCount} size={11} />
          </div>
          <p className="mt-0.5 truncate text-[11.5px] text-white/40">
            {vehicle ? `${vehicle.brand} ${vehicle.model} · ${vehicle.color} · ${vehicle.plate}` : 'Vehículo CAVIO'}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/35">
            <span className="inline-flex items-center gap-1">
              <MapPin size={10} /> a {distanceToPickup.toFixed(1)} km
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock size={10} /> llega en ~{eta} min
            </span>
            <span>{relativeTime(offer.createdAt)}</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[16px] font-semibold tabular-nums leading-none text-white">{formatCOP(offer.amount)}</p>
          <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-white/30">
            {isCounter ? 'Contraoferta' : 'Acepta tarifa'}
          </p>
        </div>
      </div>

      {offer.message && (
        <div className="mt-2.5 flex items-start gap-2 rounded-xl bg-white/[0.035] px-3 py-2">
          <MessageSquare size={12} className="mt-0.5 shrink-0 text-white/30" />
          <p className="text-[11.5px] leading-relaxed text-white/50">{offer.message}</p>
        </div>
      )}

      {(onAccept || onReject) && (
        <div className="mt-3 flex gap-2">
          {onReject && (
            <Button size="sm" variant="ghost" onClick={onReject} disabled={busy} icon={<X size={14} />}>
              Rechazar
            </Button>
          )}
          {onAccept && (
            <Button
              size="sm"
              variant="primary"
              fullWidth
              onClick={onAccept}
              loading={busy}
              icon={<Check size={14} />}
            >
              Aceptar {formatCOP(offer.amount)}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export function estimateEta(driverLocation: { lat: number; lng: number }, pickup: { lat: number; lng: number }): number {
  return estimateDurationMin(haversineKm(driverLocation, pickup))
}
