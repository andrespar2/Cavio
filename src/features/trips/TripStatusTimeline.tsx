import { Check, Circle, MapPin, Navigation, Phone, Flag, Car } from 'lucide-react'
import clsx from 'clsx'
import type { ReactNode } from 'react'
import type { Trip } from '../../types'
import { TRIP_STATUS_LABEL } from '../../lib/format'

// ============================================================
// CAVIO — Línea de tiempo del viaje
// ============================================================

const STEPS = [
  { key: 'searching', label: 'Solicitud creada', hint: 'Buscando conductores', icon: Circle, statuses: ['created', 'searching', 'offers'] },
  { key: 'assigned', label: 'Conductor asignado', hint: 'Oferta aceptada', icon: Check, statuses: ['assigned'] },
  { key: 'arriving', label: 'En camino', hint: 'El conductor va por ti', icon: Navigation, statuses: ['arriving'] },
  { key: 'arrived', label: 'En el punto de recogida', hint: 'Te está esperando', icon: MapPin, statuses: ['arrived'] },
  { key: 'in_progress', label: 'Viaje en curso', hint: 'Disfruta tu trayecto', icon: Car, statuses: ['in_progress'] },
  { key: 'completed', label: 'Viaje finalizado', hint: 'Llegaste a tu destino', icon: Flag, statuses: ['completed'] },
]

export function TripStatusTimeline({ trip, dense = false }: { trip: Trip; dense?: boolean }) {
  if (trip.status === 'cancelled') {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3">
        <p className="text-[13px] font-semibold text-red-200">Viaje cancelado</p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-red-200/50">
          {trip.cancelReason ?? 'El viaje fue cancelado.'}
        </p>
      </div>
    )
  }

  const currentIndex = STEPS.findIndex((s) => s.statuses.includes(trip.status))

  return (
    <ol className={clsx('relative', dense ? 'space-y-2.5' : 'space-y-3')} aria-label="Estado del viaje">
      {STEPS.map((step, index) => {
        const done = index < currentIndex || trip.status === 'completed'
        const current = index === currentIndex
        const Icon = step.icon
        return (
          <li key={step.key} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <span
                className={clsx(
                  'grid shrink-0 place-items-center rounded-full border transition-colors',
                  dense ? 'h-6 w-6' : 'h-7 w-7',
                  done
                    ? 'border-lime/30 bg-lime/15 text-lime'
                    : current
                      ? 'border-lime bg-lime text-black'
                      : 'border-white/10 bg-white/[0.03] text-white/25',
                )}
              >
                <Icon size={dense ? 11 : 13} strokeWidth={2.5} />
              </span>
              {index < STEPS.length - 1 && (
                <span
                  className={clsx('mt-1 w-px flex-1', done ? 'bg-lime/25' : 'bg-white/10')}
                  style={{ minHeight: dense ? 12 : 18 }}
                />
              )}
            </div>
            <div className={clsx('min-w-0 pb-0.5', current ? 'opacity-100' : done ? 'opacity-70' : 'opacity-40')}>
              <p
                className={clsx(
                  'text-[13px] leading-tight',
                  current ? 'font-semibold text-lime' : 'font-medium text-white/80',
                )}
              >
                {step.label}
                {current && trip.status !== 'completed' && (
                  <span className="ml-2 inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-lime align-middle" />
                )}
              </p>
              <p className="mt-0.5 text-[11.5px] leading-snug text-white/35">{step.hint}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export function TripStatusHint({ trip }: { trip: Trip }) {
  const text =
    trip.status === 'searching' || trip.status === 'offers'
      ? 'Estamos buscando conductores cerca de tu punto de recogida.'
      : trip.status === 'assigned'
        ? 'Tu conductor fue asignado y se prepara para salir.'
        : trip.status === 'arriving'
          ? 'Tu conductor va en camino. Mantente atento al mapa.'
          : trip.status === 'arrived'
            ? 'Tu conductor llegó. Confirma tu llegada al vehículo.'
            : trip.status === 'in_progress'
              ? 'Estás en camino a tu destino.'
              : trip.status === 'completed'
                ? 'El viaje terminó. ¡Gracias por viajar con CAVIO!'
                : trip.cancelReason ?? TRIP_STATUS_LABEL[trip.status]
  return <p className="text-[12.5px] leading-relaxed text-white/45">{text}</p>
}

export function DemoNote({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-white/30">
      <Phone size={11} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  )
}
