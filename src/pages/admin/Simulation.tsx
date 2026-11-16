import { useState } from 'react'
import {
  FastForward,
  FlaskConical,
  Info,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Timer,
  Zap,
} from 'lucide-react'
import clsx from 'clsx'
import { useCavio } from '../../store/store'
import { getCategory } from '../../store/selectors'
import { PageHeader } from '../../components/layout/PageHeader'
import { DemoBadge } from '../../components/Brand'
import { MapView } from '../../components/map/MapView'
import { Button } from '../../components/ui/Button'
import { EmptyState, ProgressBar, Toggle, TripStatusBadge } from '../../components/ui/Display'
import { ConfirmDialog } from '../../components/ui/Modal'
import { formatCOP, formatTime, relativeTime } from '../../lib/format'
import { useToast } from '../../hooks/useToast'

// ============================================================
// CAVIO — Panel de simulación DEMO
// ============================================================

const ACTIVE_STATUSES = ['searching', 'offers', 'assigned', 'arriving', 'arrived', 'in_progress']

export function AdminSimulation() {
  const { state, simulation, updateSettings, restoreDemo } = useCavio()
  const { toast } = useToast()
  const [restoreOpen, setRestoreOpen] = useState(false)

  const activeTrips = state.trips.filter((t) => ACTIVE_STATUSES.includes(t.status))
  const pendingRequests = state.trips.filter((t) => t.status === 'searching' || t.status === 'offers')
  const activeDrivers = state.drivers.filter((d) => d.approval === 'approved' && d.available)
  const progressByStatus: Record<string, number> = {
    searching: 10,
    offers: 22,
    assigned: 38,
    arriving: 54,
    arrived: 70,
    in_progress: 86,
    completed: 100,
    cancelled: 0,
  }

  const toggle = () => {
    if (state.simulation.running) {
      simulation.pause()
      toast('Simulación pausada.', 'info')
    } else {
      simulation.start()
      toast('Simulación iniciada. Avanzará cada segundo.', 'success')
    }
  }

  return (
    <div>
      <PageHeader
        title="Simulación DEMO"
        subtitle="Controla el avance automático, las ofertas y el movimiento de los conductores."
        badge={<DemoBadge />}
        actions={
          <span
            className={clsx(
              'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11.5px] font-medium',
              state.simulation.running
                ? 'border-lime/30 bg-lime/[0.08] text-lime'
                : 'border-white/10 bg-white/[0.04] text-white/50',
            )}
          >
            <span className={clsx('h-2 w-2 rounded-full', state.simulation.running ? 'animate-pulse bg-lime' : 'bg-white/30')} />
            {state.simulation.running ? 'En ejecución' : 'Detenida'} · x{state.simulation.speed}
          </span>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <div className="space-y-4">
          <div className="card">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-white">
              <FlaskConical size={16} className="text-lime" /> Controles de simulación
            </h2>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="md"
                variant={state.simulation.running ? 'secondary' : 'primary'}
                onClick={toggle}
                icon={state.simulation.running ? <Pause size={15} /> : <Play size={15} />}
              >
                {state.simulation.running ? 'Pausar' : 'Iniciar simulación'}
              </Button>
              <Button
                size="md"
                variant="secondary"
                onClick={() => {
                  simulation.resume()
                  toast('Simulación reanudada.', 'success')
                }}
                disabled={state.simulation.running}
                icon={<Play size={15} />}
              >
                Continuar
              </Button>
              <Button
                size="md"
                variant="secondary"
                onClick={() => {
                  simulation.reset()
                  toast('Contadores de simulación reiniciados.', 'info')
                }}
                icon={<RotateCcw size={15} />}
              >
                Reiniciar contadores
              </Button>
              <Button
                size="md"
                variant="danger"
                onClick={() => setRestoreOpen(true)}
                icon={<RefreshCw size={15} />}
              >
                Restaurar datos
              </Button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="text-[10px] uppercase tracking-wider text-white/30">Velocidad</p>
                <div className="mt-2 flex gap-1">
                  {[0.5, 1, 2, 4].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => simulation.setSpeed(value)}
                      className={clsx(
                        'flex-1 rounded-lg border py-1.5 text-[11px] font-medium transition',
                        state.simulation.speed === value
                          ? 'border-lime/40 bg-lime/[0.12] text-lime'
                          : 'border-white/10 bg-white/[0.02] text-white/40 hover:text-white',
                      )}
                    >
                      {value}×
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="text-[10px] uppercase tracking-wider text-white/30">Avance automático de estados</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[11.5px] text-white/50">
                    {state.simulation.autoAdvance ? 'Activado' : 'Desactivado'}
                  </span>
                  <Toggle
                    checked={state.simulation.autoAdvance}
                    onChange={() => simulation.toggleAutoAdvance()}
                    label="Avance automático de estados"
                  />
                </div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="text-[10px] uppercase tracking-wider text-white/30">Ofertas automáticas</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[11.5px] text-white/50">{state.settings.autoOffers ? 'Activadas' : 'Desactivadas'}</span>
                  <Toggle
                    checked={state.settings.autoOffers}
                    onChange={(value) => updateSettings({ autoOffers: value })}
                    label="Ofertas automáticas"
                  />
                </div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="text-[10px] uppercase tracking-wider text-white/30">Ticks ejecutados</p>
                <p className="mt-1 text-[20px] font-semibold tabular-nums text-white">{state.simulation.ticks}</p>
                <p className="text-[10px] text-white/25">
                  Último: {state.simulation.lastTickAt ? relativeTime(state.simulation.lastTickAt) : '—'}
                </p>
              </div>
            </div>

            <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-white/[0.025] px-3 py-2 text-[10.5px] leading-relaxed text-white/30">
              <Info size={11} className="mt-0.5 shrink-0" />
              La simulación comprime los tiempos: los recorridos y estados avanzan más rápido que en un viaje
              real. El avance manual de cada viaje está disponible más abajo.
            </p>
          </div>

          <div className="card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[15px] font-semibold text-white">Viajes activos</h2>
              <span className="text-[11px] text-white/30">{activeTrips.length} en proceso</span>
            </div>
            <div className="mt-3 space-y-2.5">
              {activeTrips.length === 0 ? (
                <EmptyState
                  title="No hay viajes activos"
                  description="Crea una solicitud desde el perfil de pasajero o inicia la simulación para generar ofertas en las solicitudes pendientes."
                  action={
                    <Button size="sm" variant="secondary" icon={<Sparkles size={13} />} onClick={simulation.start}>
                      Iniciar simulación
                    </Button>
                  }
                />
              ) : (
                activeTrips.map((trip) => {
                  const driver = trip.driverId ? state.drivers.find((d) => d.id === trip.driverId) : undefined
                  const driverUser = driver ? state.users.find((u) => u.id === driver.userId) : undefined
                  const passenger = state.users.find((u) => u.id === trip.passengerId)
                  const category = getCategory(state, trip.category)
                  const offers = state.offers.filter((o) => o.tripId === trip.id && o.status === 'pending').length
                  return (
                    <div key={trip.id} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10.5px] font-semibold text-white/45">{trip.code}</span>
                            <TripStatusBadge status={trip.status} />
                            <span className="chip">{category.name.replace('CAVIO ', '')}</span>
                          </div>
                          <p className="mt-1.5 truncate text-[11.5px] text-white/55">
                            {trip.origin.label} → {trip.destination.label}
                          </p>
                          <p className="mt-0.5 truncate text-[10.5px] text-white/30">
                            {passenger?.firstName ?? 'Pasajero'} · {driverUser?.firstName ?? 'Sin conductor'} ·{' '}
                            {formatCOP(trip.agreedFare ?? trip.suggestedFare)} · {offers} oferta{offers === 1 ? '' : 's'}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={<FastForward size={13} />}
                          disabled={!trip.driverId}
                          onClick={() => {
                            simulation.advanceTrip(trip.id)
                            toast(`Viaje ${trip.code}: estado avanzado.`, 'success')
                          }}
                        >
                          {trip.driverId ? 'Avanzar' : 'Sin conductor'}
                        </Button>
                      </div>
                      <ProgressBar value={progressByStatus[trip.status] ?? 0} className="mt-2.5" />
                      {trip.status === 'arriving' && driver && (
                        <p className="mt-1.5 flex items-center gap-1 text-[10px] text-white/25">
                          <Timer size={10} /> Conductor a {(Math.hypot(driver.location.lat - trip.origin.lat, driver.location.lng - trip.origin.lng) * 111).toFixed(2)} km del origen
                        </p>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div className="card">
            <h2 className="text-[15px] font-semibold text-white">Solicitudes sin asignar</h2>
            <p className="text-[11px] text-white/30">Se generarán ofertas automáticas mientras la simulación esté activa.</p>
            <div className="mt-3 space-y-1.5">
              {pendingRequests.length === 0 ? (
                <p className="rounded-xl bg-white/[0.02] px-3 py-4 text-center text-[11.5px] text-white/30">
                  No hay solicitudes pendientes.
                </p>
              ) : (
                pendingRequests.map((trip) => {
                  const offers = state.offers.filter((o) => o.tripId === trip.id && o.status === 'pending').length
                  return (
                    <div key={trip.id} className="flex min-w-0 flex-wrap items-center gap-2 rounded-xl bg-white/[0.025] px-3 py-2.5">
                      <span className="text-[10.5px] font-semibold text-white/45">{trip.code}</span>
                      <TripStatusBadge status={trip.status} />
                      <span className="min-w-0 flex-1 truncate text-[11px] text-white/45">
                        {trip.origin.label} → {trip.destination.label}
                      </span>
                      <span className="shrink-0 text-[10.5px] text-white/40">{offers} ofertas</span>
                      <span className="shrink-0 text-[11px] font-medium tabular-nums text-lime">
                        {formatCOP(trip.suggestedFare)}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-3xl border border-white/[0.08]">
            <div className="h-[300px] sm:h-[360px] xl:h-[420px]">
              <MapView
                center={state.settings.center}
                zoom={12}
                markers={[
                  ...activeDrivers.slice(0, 14).map((driver) => {
                    const user = state.users.find((u) => u.id === driver.userId)
                    return {
                      id: `drv_${driver.id}`,
                      kind: 'available' as const,
                      ...driver.location,
                      label: `${user?.firstName ?? 'Conductor'} · ${state.vehicles.find((v) => v.id === driver.vehicleId)?.plate ?? ''}`,
                    }
                  }),
                  ...activeTrips.map((trip) => ({
                    id: `trip_${trip.id}`,
                    kind: 'origin' as const,
                    ...trip.origin,
                    label: `${trip.code} · ${trip.origin.label}`,
                  })),
                ]}
                fitSignature="simulation-map"
              />
            </div>
            <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-black/70 px-2.5 py-1.5 text-[10px] text-white/60 backdrop-blur-md">
                {activeDrivers.length} conductores disponibles
              </span>
              <span className="rounded-full border border-lime/20 bg-black/70 px-2.5 py-1.5 text-[10px] text-lime backdrop-blur-md">
                {activeTrips.length} viajes activos
              </span>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[15px] font-semibold text-white">Registro de simulación</h2>
              <span className="text-[10px] text-white/25">{state.simulation.log.length} eventos</span>
            </div>
            <div className="mt-3 max-h-[300px] space-y-1.5 overflow-y-auto pr-1">
              {state.simulation.log.map((entry) => (
                <div key={entry.id} className="flex items-start gap-2 text-[10.5px]">
                  <span
                    className={clsx(
                      'mt-1 h-1.5 w-1.5 shrink-0 rounded-full',
                      entry.kind === 'offer'
                        ? 'bg-lime'
                        : entry.kind === 'trip'
                          ? 'bg-sky-300'
                          : entry.kind === 'driver'
                            ? 'bg-amber-300'
                            : 'bg-white/25',
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="leading-snug text-white/55">{entry.message}</p>
                    <p className="text-[9.5px] text-white/20">{formatTime(entry.at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#090909] p-4">
            <p className="flex items-center gap-2 text-[12.5px] font-medium text-white/70">
              <Zap size={14} className="text-lime" /> Datos de la simulación
            </p>
            <div className="mt-2.5 grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Pasajeros', value: state.users.filter((u) => u.role === 'passenger').length },
                { label: 'Conductores', value: state.drivers.length },
                { label: 'Viajes', value: state.trips.length },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-white/[0.03] px-2 py-2">
                  <p className="text-[16px] font-semibold text-white">{item.value}</p>
                  <p className="text-[9px] uppercase tracking-wider text-white/25">{item.label}</p>
                </div>
              ))}
            </div>
            <p className="mt-2.5 text-[10px] leading-relaxed text-white/25">
              Ofertas, calificaciones y auditoría también forman parte del estado persistente. Restaurar datos
              devuelve todo a su estado inicial.
            </p>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={restoreOpen}
        onClose={() => setRestoreOpen(false)}
        onConfirm={() => {
          restoreDemo()
          setRestoreOpen(false)
          toast('Datos DEMO restaurados correctamente.', 'success')
        }}
        title="Restaurar datos DEMO"
        description="Se eliminarán los viajes, cuentas y cambios locales creados durante las pruebas. Esta acción no se puede deshacer."
        confirmLabel="Restaurar"
        danger
        requireReason
        reasonLabel="Escribe “restaurar” para confirmar"
        reasonPlaceholder="restaurar"
      />
    </div>
  )
}

