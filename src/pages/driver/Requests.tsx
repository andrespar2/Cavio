import { useMemo, useState } from 'react'
import { ArrowDownWideNarrow, Car, Filter, Info, Play, Power, Route } from 'lucide-react'
import clsx from 'clsx'
import type { Trip } from '../../types'
import { useCavio } from '../../store/store'
import { getPendingRequestsForDriver } from '../../store/selectors'
import { haversineKm } from '../../lib/geo'
import { PageHeader } from '../../components/layout/PageHeader'
import { DemoBadge } from '../../components/Brand'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/Display'
import { SearchInput, Select } from '../../components/ui/Field'
import { RequestCard } from '../../features/trips/RequestCard'
import { CounterOfferDialog } from '../../features/trips/CounterOfferDialog'
import { useToast } from '../../hooks/useToast'

// ============================================================
// CAVIO — Solicitudes del conductor
// ============================================================

export function DriverRequests() {
  const { state, currentDriver, sendOffer, setDriverAvailability, simulation } = useCavio()
  const { toast } = useToast()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'recent' | 'distance' | 'fare'>('distance')
  const [counterTrip, setCounterTrip] = useState<Trip | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const driver = currentDriver

  const requests = useMemo(() => {
    if (!driver) return []
    const base = getPendingRequestsForDriver(state, driver.id)
    const q = query.trim().toLowerCase()
    const filtered = base.filter(
      (t) =>
        !q ||
        t.code.toLowerCase().includes(q) ||
        t.origin.label.toLowerCase().includes(q) ||
        t.destination.label.toLowerCase().includes(q),
    )
    return filtered.sort((a, b) => {
      if (sort === 'recent') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (sort === 'fare') return b.suggestedFare - a.suggestedFare
      return haversineKm(driver.location, a.origin) - haversineKm(driver.location, b.origin)
    })
  }, [state, driver, query, sort])

  if (!driver) {
    return (
      <EmptyState
        icon={<Car size={22} />}
        title="Perfil de conductor no disponible"
        description="Restaura los datos DEMO o regístrate nuevamente como conductor."
      />
    )
  }

  if (driver.approval !== 'approved') {
    return (
      <EmptyState
        icon={<Info size={22} />}
        title="Tu cuenta aún no está aprobada"
        description="Solo los conductores aprobados pueden ver y responder solicitudes. Revisa tu perfil o espera la revisión del administrador."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => setDriverAvailability(driver.id, false)}>
              Actualizar estado
            </Button>
            <a href="/conductor/perfil">
              <Button size="sm">Ir a mi perfil</Button>
            </a>
          </div>
        }
      />
    )
  }

  const accept = (trip: Trip) => {
    setBusy(trip.id)
    const result = sendOffer({
      tripId: trip.id,
      driverId: driver.id,
      amount: trip.suggestedFare,
      kind: 'accept',
    })
    setBusy(null)
    if (!result.ok) toast(result.error ?? 'No pudimos enviar la oferta.', 'error')
    else toast('Aceptaste la tarifa propuesta. Espera la confirmación del pasajero.', 'success')
  }

  const sendCounter = (amount: number, message: string) => {
    if (!counterTrip) return
    setBusy(counterTrip.id)
    const result = sendOffer({
      tripId: counterTrip.id,
      driverId: driver.id,
      amount,
      kind: 'counter',
      message,
    })
    setBusy(null)
    if (!result.ok) toast(result.error ?? 'No pudimos enviar la contraoferta.', 'error')
    else {
      toast('Contraoferta enviada al pasajero.', 'success')
      setCounterTrip(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Solicitudes"
        subtitle="Solicitudes de pasajeros compatibles con tu categoría de vehículo."
        badge={<DemoBadge />}
        actions={
          <Button
            variant={driver.available ? 'secondary' : 'primary'}
            size="sm"
            icon={<Power size={14} />}
            onClick={() => {
              const result = setDriverAvailability(driver.id, !driver.available)
              if (!result.ok) toast(result.error ?? 'No pudimos cambiar tu disponibilidad.', 'error')
              else toast(!driver.available ? 'Ahora estás disponible.' : 'Te desconectaste.', 'info')
            }}
          >
            {driver.available ? 'Desconectarme' : 'Ponerme disponible'}
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchInput value={query} onChange={setQuery} placeholder="Buscar por código, origen o destino" className="flex-1" />
        <div className="flex items-center gap-2">
          <ArrowDownWideNarrow size={15} className="shrink-0 text-white/30" />
          <Select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="min-w-[160px]">
            <option value="distance">Más cercanas</option>
            <option value="recent">Más recientes</option>
            <option value="fare">Mejor tarifa</option>
          </Select>
        </div>
      </div>

      {!driver.available ? (
        <EmptyState
          icon={<Power size={22} />}
          title="Conéctate para ver solicitudes"
          description="Tu disponibilidad está desactivada. Actívala para recibir solicitudes cercanas y compartir tu ubicación mientras trabajas."
          action={
            <Button
              size="sm"
              onClick={() => {
                const result = setDriverAvailability(driver.id, true)
                if (!result.ok) toast(result.error ?? 'No pudimos activar tu disponibilidad.', 'error')
                else toast('Ahora estás disponible.', 'success')
              }}
            >
              Ponerme disponible
            </Button>
          }
        />
      ) : requests.length === 0 ? (
        <EmptyState
          icon={<Route size={22} />}
          title="No hay solicitudes compatibles"
          description="No encontramos solicitudes para tu categoría en este momento. Puedes activar la simulación DEMO para generar ofertas automáticamente."
          action={
            !state.simulation.running ? (
              <Button size="sm" variant="secondary" icon={<Play size={13} />} onClick={simulation.start}>
                Iniciar simulación DEMO
              </Button>
            ) : (
              <span className="chip border-lime/20 text-lime/70">La simulación está activa</span>
            )
          }
        />
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-white/30">
            <Filter size={12} />
            {requests.length} solicitud{requests.length === 1 ? '' : 'es'} · Categoría{' '}
            {state.vehicles.find((v) => v.id === driver.vehicleId)?.category ?? 'CAVIO'}
            <span className="mx-1 h-1 w-1 rounded-full bg-white/20" />
            Orden: {sort === 'distance' ? 'cercanía' : sort === 'fare' ? 'tarifa' : 'reciente'}
          </div>
          <div className="grid gap-2.5 xl:grid-cols-2">
            {requests.map((trip) => {
              const existing = state.offers.find(
                (o) => o.tripId === trip.id && o.driverId === driver.id && o.status === 'pending',
              )
              return (
                <div key={trip.id} className={clsx(existing && 'opacity-95')}>
                  <RequestCard
                    trip={trip}
                    driver={driver}
                    existingOffer={existing}
                    onAccept={() => accept(trip)}
                    onCounter={() => setCounterTrip(trip)}
                    busy={busy === trip.id}
                  />
                </div>
              )
            })}
          </div>
        </>
      )}

      <div className="mt-5 rounded-2xl border border-white/[0.07] bg-[#090909] p-4">
        <p className="flex items-center gap-2 text-[12px] font-medium text-white/65">
          <Info size={13} className="text-lime" /> Sobre las ofertas
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-white/30">
          Aceptar la tarifa o contraofertar envía una propuesta al pasajero; el viaje solo se asigna cuando el
          pasajero la acepta. No se asignan viajes simultáneamente a varios conductores.
        </p>
      </div>

      <CounterOfferDialog
        open={Boolean(counterTrip)}
        onClose={() => setCounterTrip(null)}
        trip={counterTrip}
        initialAmount={
          counterTrip
            ? state.offers.find(
                (o) => o.tripId === counterTrip.id && o.driverId === driver.id && o.status === 'pending',
              )?.amount ?? counterTrip.suggestedFare
            : undefined
        }
        onSend={sendCounter}
        busy={Boolean(counterTrip && busy === counterTrip.id)}
      />
    </div>
  )
}

