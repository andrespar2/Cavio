import { useEffect, useMemo, useState } from 'react'
import {
  Car,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock,
  Crosshair,
  Gauge,
  Info,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Play,
  Power,
  RefreshCw,
  Route,
  ShieldCheck,
  Star,
  TrendingUp,
  TriangleAlert,
  User,
  Wallet,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import type { Trip } from '../../types'
import { useCavio } from '../../store/store'
import {
  getActiveTripForDriver,
  getCategory,
  getDriverStats,
  getPendingRequestsForDriver,
  getTripsForDriver,
} from '../../store/selectors'
import { BOGOTA_CENTER } from '../../data/places'
import {
  formatCOP,
  formatDistance,
  relativeTime,
} from '../../lib/format'
import { PageHeader } from '../../components/layout/PageHeader'
import { DemoBadge } from '../../components/Brand'
import { MapView, type MapMarker } from '../../components/map/MapView'
import { Button } from '../../components/ui/Button'
import { Avatar, ApprovalBadge, EmptyState, ProgressBar, StatCard, TripStatusBadge } from '../../components/ui/Display'
import { ConfirmDialog } from '../../components/ui/Modal'
import { TripStatusHint, TripStatusTimeline } from '../../features/trips/TripStatusTimeline'
import { RequestCard } from '../../features/trips/RequestCard'
import { CounterOfferDialog } from '../../features/trips/CounterOfferDialog'
import { useGeolocation } from '../../hooks/useGeolocation'
import { useToast } from '../../hooks/useToast'

// ============================================================
// CAVIO — Panel del conductor
// ============================================================

export function DriverDashboard() {
  const {
    state,
    currentUser,
    currentDriver,
    setDriverAvailability,
    updateDriverLocation,
    sendOffer,
    advanceTrip,
    cancelTrip,
    simulation,
  } = useCavio()
  const { toast } = useToast()
  const geo = useGeolocation({ auto: Boolean(currentDriver?.available) })
  const [counterTrip, setCounterTrip] = useState<Trip | null>(null)
  const [busyOffer, setBusyOffer] = useState<string | null>(null)
  const [cancelTripId, setCancelTripId] = useState<string | null>(null)
  const [advancing, setAdvancing] = useState(false)
  const [mapFocus, setMapFocus] = useState<{ lat: number; lng: number; zoom?: number } | null>(null)

  const driver = currentDriver
  const activeTrip = driver ? getActiveTripForDriver(state, driver.id) : undefined
  const requests = driver && driver.approval === 'approved' ? getPendingRequestsForDriver(state, driver.id) : []
  const stats = driver ? getDriverStats(state, driver.id) : null
  const trips = driver ? getTripsForDriver(state, driver.id) : []
  const completed = trips.filter((t) => t.status === 'completed')

  // Compartir ubicación real cuando el conductor está disponible o en viaje
  useEffect(() => {
    if (!driver || !geo.position || !state.settings.useRealLocation) return
    if (!driver.available && !activeTrip) return
    updateDriverLocation(driver.id, geo.position, 'gps')
    setMapFocus((prev) => prev ?? { ...geo.position!, zoom: 15 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.position, driver?.id, driver?.available, activeTrip?.id, state.settings.useRealLocation])

  const weeklyBars = useMemo(() => {
    const days: { label: string; value: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - i)
      const next = new Date(d)
      next.setDate(next.getDate() + 1)
      const value = completed
        .filter((t) => {
          const ts = new Date(t.finishedAt ?? t.createdAt).getTime()
          return ts >= d.getTime() && ts < next.getTime()
        })
        .reduce((acc, t) => acc + ((t.finalFare ?? t.agreedFare ?? 0) * (100 - state.settings.commissionPct)) / 100, 0)
      days.push({
        label: new Intl.DateTimeFormat('es-CO', { weekday: 'short' }).format(d).replace('.', ''),
        value,
      })
    }
    return days
  }, [completed, state.settings.commissionPct])

  if (!driver || !currentUser) {
    return (
      <EmptyState
        icon={<Car size={22} />}
        title="Perfil de conductor no disponible"
        description="No encontramos tu perfil de conductor en este dispositivo. Restaura los datos DEMO o regístrate nuevamente."
        action={
          <Link to="/registro-conductor">
            <Button size="sm">Registrarme como conductor</Button>
          </Link>
        }
      />
    )
  }

  const userSuspended = currentUser.status === 'suspended' || driver.approval === 'suspended'
  const requiresApproval = driver.approval !== 'approved'

  const toggleAvailability = () => {
    const result = setDriverAvailability(driver.id, !driver.available)
    if (!result.ok) {
      toast(result.error ?? 'No pudimos cambiar tu disponibilidad.', 'error')
      return
    }
    toast(
      !driver.available
        ? 'Estás disponible. Recibirás solicitudes cercanas.'
        : 'Te desconectaste. No recibirás nuevas solicitudes.',
      !driver.available ? 'success' : 'info',
    )
    if (!driver.available) geo.request()
  }

  const handleAccept = (trip: Trip) => {
    setBusyOffer(trip.id)
    const result = sendOffer({
      tripId: trip.id,
      driverId: driver.id,
      amount: trip.suggestedFare,
      kind: 'accept',
    })
    setBusyOffer(null)
    if (!result.ok) toast(result.error ?? 'No pudimos enviar tu oferta.', 'error')
    else toast('Oferta enviada. Espera la confirmación del pasajero.', 'success')
  }

  const handleCounter = (amount: number, message: string) => {
    if (!counterTrip) return
    setBusyOffer(counterTrip.id)
    const result = sendOffer({
      tripId: counterTrip.id,
      driverId: driver.id,
      amount,
      kind: 'counter',
      message,
    })
    setBusyOffer(null)
    if (!result.ok) toast(result.error ?? 'No pudimos enviar la contraoferta.', 'error')
    else {
      toast('Contraoferta enviada al pasajero.', 'success')
      setCounterTrip(null)
    }
  }

  const handleAdvance = () => {
    if (!activeTrip) return
    setAdvancing(true)
    advanceTrip(activeTrip.id)
    setAdvancing(false)
    const nextLabel =
      activeTrip.status === 'assigned'
        ? 'Estás en camino al punto de recogida.'
        : activeTrip.status === 'arriving'
          ? 'Marcaste que llegaste. Espera al pasajero.'
          : activeTrip.status === 'arrived'
            ? 'Viaje iniciado. ¡Buen camino!'
            : 'Viaje finalizado. Revisa tus ganancias.'
    toast(nextLabel, 'success')
  }

  const advanceLabel =
    activeTrip?.status === 'assigned'
      ? 'Iniciar camino'
      : activeTrip?.status === 'arriving'
        ? 'Llegué al punto'
        : activeTrip?.status === 'arrived'
          ? 'Iniciar viaje'
          : 'Finalizar viaje'

  // ------- Pantalla de cuenta no aprobada -------
  if (requiresApproval || userSuspended) {
    return (
      <div>
        <PageHeader
          title={`Hola, ${currentUser.firstName}`}
          subtitle="Tu cuenta de conductor necesita atención antes de recibir solicitudes."
          badge={<DemoBadge />}
          actions={<ApprovalBadge approval={driver.approval} />}
        />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="card">
            <div
              className={clsx(
                'grid h-12 w-12 place-items-center rounded-2xl',
                driver.approval === 'pending'
                  ? 'bg-amber-400/10 text-amber-300'
                  : 'bg-red-500/10 text-red-300',
              )}
            >
              {driver.approval === 'pending' ? <Clock size={22} /> : <TriangleAlert size={22} />}
            </div>
            <h2 className="mt-3 text-[18px] font-semibold text-white">
              {driver.approval === 'pending'
                ? 'Tu registro está en revisión'
                : driver.approval === 'rejected'
                  ? 'Tu registro fue rechazado'
                  : 'Tu cuenta está suspendida'}
            </h2>
            <p className="mt-1.5 max-w-lg text-[12.5px] leading-relaxed text-white/45">
              {driver.reviewNote ??
                (driver.approval === 'pending'
                  ? 'Un administrador está revisando tu documentación DEMO. Te avisaremos cuando esté aprobada.'
                  : 'Contacta al equipo de soporte de CAVIO para revisar tu situación.')}
            </p>

            {driver.approval === 'pending' && (
              <ol className="mt-4 space-y-2.5">
                {[
                  { done: true, text: 'Cuenta creada' },
                  { done: true, text: 'Documentación enviada' },
                  { done: false, text: 'Revisión del administrador' },
                  { done: false, text: 'Disponibilidad habilitada' },
                ].map((step, index) => (
                  <li key={step.text} className="flex items-center gap-2.5 text-[12px]">
                    <span
                      className={clsx(
                        'grid h-6 w-6 place-items-center rounded-full',
                        step.done ? 'bg-lime/15 text-lime' : 'bg-white/[0.05] text-white/30',
                      )}
                    >
                      {step.done ? <CheckCircle2 size={12} /> : <span className="text-[10px]">{index + 1}</span>}
                    </span>
                    <span className={step.done ? 'text-white/70' : 'text-white/35'}>{step.text}</span>
                  </li>
                ))}
              </ol>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              <Link to="/conductor/perfil">
                <Button size="sm" variant="secondary">
                  Revisar mi perfil y documentos
                </Button>
              </Link>
              <Link to="/admin/simulacion">
                <Button size="sm" variant="ghost">
                  Simulación DEMO
                </Button>
              </Link>
            </div>
            <p className="mt-4 rounded-xl bg-white/[0.03] px-3 py-2 text-[10.5px] leading-relaxed text-white/30">
              Para probar el flujo de aprobación, inicia sesión como administrador demo y aprueba este registro.
            </p>
          </div>

          <div className="space-y-3">
            <div className="card">
              <p className="section-title">Tu vehículo</p>
              {(() => {
                const vehicle = state.vehicles.find((v) => v.id === driver.vehicleId)
                return vehicle ? (
                  <div className="mt-2.5">
                    <p className="text-[14px] font-semibold text-white">
                      {vehicle.brand} {vehicle.model}
                    </p>
                    <p className="text-[11.5px] text-white/35">
                      {vehicle.color} · {vehicle.year} · {vehicle.plate}
                    </p>
                    <p className="mt-1 text-[11.5px] text-white/35">
                      Categoría {getCategory(state, vehicle.category).name}
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-[12px] text-white/35">Sin vehículo registrado.</p>
                )
              })()}
            </div>
            <div className="card">
              <p className="section-title">Documentación DEMO</p>
              <ul className="mt-2.5 space-y-1.5">
                {driver.documents.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between gap-2 text-[11.5px]">
                    <span className="truncate text-white/45">{doc.name}</span>
                    <span
                      className={clsx(
                        'shrink-0 rounded-full px-2 py-0.5 text-[9.5px]',
                        doc.status === 'cargado'
                          ? 'bg-lime/10 text-lime/80'
                          : 'bg-amber-400/10 text-amber-200/80',
                      )}
                    >
                      {doc.status === 'cargado' ? 'Cargado' : 'Pendiente'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ------- Marcadores del mapa -------
  const markers: MapMarker[] = [
    {
      id: 'me',
      kind: 'driver',
      ...(geo.position ?? driver.location),
      label: geo.position ? 'Mi ubicación (GPS)' : 'Mi ubicación DEMO',
    },
    ...requests.map((trip) => ({
      id: `req_${trip.id}`,
      kind: 'pickup' as const,
      ...trip.origin,
      label: `${trip.origin.label} · ${formatCOP(trip.suggestedFare)}`,
    })),
    ...(activeTrip
      ? [
          { id: 'origin', kind: 'origin' as const, ...activeTrip.origin, label: activeTrip.origin.label },
          { id: 'dest', kind: 'destination' as const, ...activeTrip.destination, label: activeTrip.destination.label },
        ]
      : []),
  ]

  const activePassenger = activeTrip ? state.users.find((u) => u.id === activeTrip.passengerId) : undefined
  const activeCategory = activeTrip ? getCategory(state, activeTrip.category) : null

  return (
    <div>
      <PageHeader
        title={`Hola, ${currentUser.firstName}`}
        subtitle={
          activeTrip
            ? 'Tienes un viaje en curso. Gestiona cada etapa desde aquí.'
            : driver.available
              ? 'Estás disponible. Las solicitudes cercanas aparecerán en tu panel.'
              : 'Activa tu disponibilidad para empezar a recibir solicitudes.'
        }
        badge={<DemoBadge />}
        actions={
          <button
            type="button"
            onClick={toggleAvailability}
            className={clsx(
              'flex items-center gap-2 rounded-full border px-3.5 py-2 text-[12px] font-medium transition',
              driver.available
                ? 'border-lime/30 bg-lime/[0.1] text-lime'
                : 'border-white/10 bg-white/[0.04] text-white/50 hover:text-white',
            )}
            aria-pressed={driver.available}
          >
            <span
              className={clsx(
                'h-2 w-2 rounded-full',
                driver.available ? 'bg-lime shadow-[0_0_8px_rgba(198,243,107,0.8)]' : 'bg-white/30',
              )}
            />
            {driver.available ? 'Disponible' : 'Desconectado'}
            <Power size={13} />
          </button>
        }
      />

      <div className="grid gap-5 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="min-w-0 space-y-4">
          {/* Disponibilidad */}
          <div className="card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-[14px] font-semibold text-white">
                  <CircleDot size={15} className={driver.available ? 'text-lime' : 'text-white/30'} />
                  {driver.available ? 'Estás en línea' : 'Estás desconectado'}
                </p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-white/35">
                  {driver.available
                    ? 'Tu ubicación se comparte solo mientras estás disponible o tienes un viaje.'
                    : 'Conéctate para recibir solicitudes de pasajeros cercanos.'}
                </p>
              </div>
              <Button
                size="sm"
                variant={driver.available ? 'danger' : 'primary'}
                onClick={toggleAvailability}
                icon={<Power size={14} />}
              >
                {driver.available ? 'Desconectarme' : 'Ponerme disponible'}
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10.5px] text-white/30">
              <span className="inline-flex items-center gap-1">
                <Crosshair size={10} />{' '}
                {state.settings.useRealLocation ? 'GPS del dispositivo' : 'Ubicación DEMO'} ·{' '}
                {geo.status === 'granted' ? 'permiso concedido' : geo.status === 'denied' ? 'permiso denegado' : geo.status === 'requesting' ? 'solicitando…' : 'sin GPS'}
              </span>
              <span className="inline-flex items-center gap-1">
                <RefreshCw size={10} /> Actualizada {relativeTime(driver.lastLocationAt)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Gauge size={10} /> {driver.locationSource === 'gps' ? 'Ubicación real' : 'Ubicación DEMO'}
              </span>
            </div>
            {geo.error && (
              <p className="mt-2 rounded-lg bg-amber-400/[0.06] px-2.5 py-2 text-[10.5px] leading-relaxed text-amber-200/60">
                {geo.error} La simulación seguirá usando la última ubicación disponible.
              </p>
            )}
          </div>

          {/* Viaje activo */}
          {activeTrip && activePassenger && (
            <div className="card">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-white/30">
                      {activeTrip.code}
                    </span>
                    <TripStatusBadge status={activeTrip.status} />
                  </div>
                  <p className="mt-1.5 text-[11.5px] text-white/30">
                    {relativeTime(activeTrip.createdAt)} · {activeCategory?.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[17px] font-semibold tabular-nums text-white">
                    {formatCOP(activeTrip.agreedFare ?? activeTrip.suggestedFare)}
                  </p>
                  <p className="text-[9.5px] uppercase tracking-wider text-white/30">Tarifa acordada</p>
                </div>
              </div>

              <div className="mt-3">
                <TripStatusHint trip={activeTrip} />
                <ProgressBar
                  value={
                    activeTrip.status === 'assigned'
                      ? 35
                      : activeTrip.status === 'arriving'
                        ? 55
                        : activeTrip.status === 'arrived'
                          ? 70
                          : 88
                  }
                  className="mt-3"
                />
              </div>

              <div className="mt-3 space-y-1.5 rounded-xl bg-white/[0.025] px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full border-2 border-lime" />
                  <p className="min-w-0 flex-1 truncate text-[12px] text-white/70">{activeTrip.origin.label}</p>
                </div>
                <div className="ml-[3px] h-2.5 w-px bg-white/10" />
                <div className="flex items-center gap-2">
                  <MapPin size={11} className="shrink-0 text-lime" />
                  <p className="min-w-0 flex-1 truncate text-[12px] text-white/70">{activeTrip.destination.label}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
                <Avatar user={activePassenger} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-white/90">
                    {activePassenger.firstName} {activePassenger.lastName}
                  </p>
                  <p className="flex items-center gap-1 text-[10.5px] text-white/35">
                    <User size={9} /> Pasajero · {formatDistance(activeTrip.distanceKm)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toast('Llamada DEMO: no se realiza una comunicación real.', 'info')}
                  className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.05] text-lime/80 transition hover:bg-white/10"
                  aria-label="Llamar al pasajero (DEMO)"
                >
                  <Phone size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => toast('Mensaje DEMO: no se envía ninguna comunicación real.', 'info')}
                  className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.05] text-lime/80 transition hover:bg-white/10"
                  aria-label="Enviar mensaje al pasajero (DEMO)"
                >
                  <MessageCircle size={15} />
                </button>
              </div>

              <Button className="mt-3" fullWidth size="lg" onClick={handleAdvance} loading={advancing} icon={<Navigation size={16} />}>
                {advanceLabel}
              </Button>

              {activeTrip.status !== 'in_progress' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1.5"
                  onClick={() => setCancelTripId(activeTrip.id)}
                  icon={<X size={13} />}
                >
                  Cancelar viaje
                </Button>
              )}

              <div className="mt-3 border-t border-white/[0.06] pt-3">
                <TripStatusTimeline trip={activeTrip} dense />
              </div>
            </div>
          )}

          {/* Solicitudes */}
          <div>
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-[15px] font-semibold text-white">Solicitudes cercanas</h2>
                <p className="text-[11.5px] text-white/35">
                  {driver.available
                    ? `${requests.length} solicitud${requests.length === 1 ? '' : 'es'} compatible${requests.length === 1 ? '' : 's'} con tu categoría`
                    : 'Conéctate para ver solicitudes'}
                </p>
              </div>
              <Link to="/conductor/solicitudes" className="shrink-0 text-[11.5px] font-medium text-lime hover:underline">
                Ver todas
              </Link>
            </div>

            {!driver.available ? (
              <EmptyState
                icon={<Power size={20} />}
                title="Estás desconectado"
                description="Ponte disponible para recibir solicitudes. Tu ubicación solo se comparte mientras estás en línea."
                action={
                  <Button size="sm" onClick={toggleAvailability} icon={<Power size={13} />}>
                    Ponerme disponible
                  </Button>
                }
              />
            ) : requests.length === 0 ? (
              <EmptyState
                icon={<Route size={20} />}
                title="Sin solicitudes por ahora"
                description={
                  activeTrip
                    ? 'Termina tu viaje actual para recibir nuevas solicitudes.'
                    : 'En la simulación DEMO, los pasajeros pueden crear solicitudes desde su perfil. También puedes activar la simulación.'
                }
                action={
                  !state.simulation.running ? (
                    <Button size="sm" variant="secondary" icon={<Play size={13} />} onClick={simulation.start}>
                      Iniciar simulación DEMO
                    </Button>
                  ) : (
                    <span className="chip border-lime/20 text-lime/70">Simulación activa</span>
                  )
                }
              />
            ) : (
              <div className="space-y-2.5">
                {requests.slice(0, 3).map((trip) => {
                  const existing = state.offers.find(
                    (o) => o.tripId === trip.id && o.driverId === driver.id && o.status === 'pending',
                  )
                  return (
                    <RequestCard
                      key={trip.id}
                      trip={trip}
                      driver={driver}
                      existingOffer={existing}
                      onAccept={() => handleAccept(trip)}
                      onCounter={() => setCounterTrip(trip)}
                      busy={busyOffer === trip.id}
                    />
                  )
                })}
              </div>
            )}
          </div>

          {/* Ganancias y viajes */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <StatCard
              label="Ganancias hoy"
              value={stats ? formatCOP(stats.today) : '—'}
              icon={<Wallet size={15} />}
              accent
              hint="Neto DEMO"
            />
            <StatCard label="Esta semana" value={stats ? formatCOP(stats.week) : '—'} icon={<TrendingUp size={15} />} />
            <StatCard label="Viajes" value={stats?.completed ?? 0} icon={<Car size={15} />} />
            <StatCard
              label="Calificación"
              value={
                <span className="inline-flex items-center gap-1.5">
                  {driver.rating.toFixed(1)} <Star size={15} className="fill-lime text-lime" />
                </span>
              }
              icon={<Star size={15} />}
              hint={`${driver.ratingCount} viajes calificados`}
            />
          </div>

          <div className="card">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-[14px] font-semibold text-white">Ganancias últimos 7 días</h3>
                <p className="text-[11px] text-white/30">Después de comisión del {state.settings.commissionPct}%</p>
              </div>
              <Link to="/conductor/ganancias" className="text-[11.5px] font-medium text-lime hover:underline">
                Detalle
              </Link>
            </div>
            <div className="mt-4 flex h-24 items-end gap-1.5">
              {weeklyBars.map((day) => {
                const max = Math.max(1, ...weeklyBars.map((d) => d.value))
                return (
                  <div key={day.label} className="flex h-full min-w-0 flex-1 flex-col justify-end">
                    <div
                      className="w-full rounded-t-md bg-lime/70 transition-all"
                      style={{ height: `${Math.max((day.value / max) * 100, 4)}%` }}
                      title={`${day.label}: ${formatCOP(day.value)}`}
                    />
                    <span className="mt-1.5 truncate text-center text-[9px] capitalize text-white/30">{day.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Mapa y lado derecho */}
        <div className="min-w-0 space-y-3">
          <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] md:sticky md:top-[84px]">
            <div className="h-[300px] sm:h-[340px] md:h-[calc(100dvh-190px)] lg:h-[420px] xl:h-[480px]">
              <MapView
                center={geo.position ?? driver.location ?? BOGOTA_CENTER}
                zoom={14}
                markers={markers}
                route={
                  activeTrip
                    ? activeTrip.route ?? undefined
                    : undefined
                }
                fitSignature={activeTrip ? `driver-trip-${activeTrip.id}` : 'driver-online'}
                focus={mapFocus}
                showRecenter
                recenterTo={geo.position ?? driver.location}
              />
            </div>
            <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-2">
              <span
                className={clsx(
                  'rounded-full border px-2.5 py-1.5 text-[10.5px] backdrop-blur-md',
                  driver.available
                    ? 'border-lime/25 bg-black/70 text-lime'
                    : 'border-white/10 bg-black/70 text-white/50',
                )}
              >
                {driver.available ? '● En línea' : '○ Desconectado'}
              </span>
              {geo.position && (
                <span className="rounded-full border border-white/10 bg-black/70 px-2.5 py-1.5 text-[10.5px] text-white/60 backdrop-blur-md">
                  GPS real
                </span>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#090909] p-4">
            <p className="flex items-center gap-2 text-[12.5px] font-medium text-white/75">
              <ShieldCheck size={14} className="text-lime" /> Tu cuenta
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <ApprovalBadge approval={driver.approval} />
              <span className="chip">Categoría {activeCategory?.name ?? getCategory(state, state.vehicles.find((v) => v.id === driver.vehicleId)?.category ?? 'economy').name}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-xl bg-white/[0.03] px-2.5 py-2">
                <p className="text-[9.5px] uppercase tracking-wider text-white/25">Comisión</p>
                <p className="mt-0.5 font-medium text-white/70">{state.settings.commissionPct}%</p>
              </div>
              <div className="rounded-xl bg-white/[0.03] px-2.5 py-2">
                <p className="text-[9.5px] uppercase tracking-wider text-white/25">Viajes totales</p>
                <p className="mt-0.5 font-medium text-white/70">{stats?.totalTrips ?? 0}</p>
              </div>
            </div>
            <Link to="/conductor/perfil" className="mt-3 flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2 text-[11.5px] text-white/50 hover:bg-white/[0.06]">
              Ver perfil, vehículo y documentos <ChevronRight size={13} />
            </Link>
          </div>

          <div className="rounded-2xl border border-lime/15 bg-lime/[0.045] p-4">
            <p className="flex items-center gap-2 text-[12.5px] font-medium text-lime">
              <Info size={14} /> Cómo funciona la negociación
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-white/40">
              Puedes aceptar la tarifa propuesta o enviar una contraoferta. El pasajero verá tu propuesta y,
              si la acepta, el viaje se asigna automáticamente. Luego avanza las etapas con el botón principal.
            </p>
            {!state.simulation.running && (
              <Button size="sm" variant="secondary" className="mt-2.5" icon={<Play size={12} />} onClick={simulation.start}>
                Simular movimiento y avance
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Link to="/conductor/solicitudes" className="flex-1">
              <Button variant="secondary" size="sm" fullWidth icon={<Route size={13} />}>
                Solicitudes
              </Button>
            </Link>
            <Link to="/conductor/historial" className="flex-1">
              <Button variant="ghost" size="sm" fullWidth icon={<Clock size={13} />}>
                Historial
              </Button>
            </Link>
            <Link to="/conductor/ganancias" className="flex-1">
              <Button variant="ghost" size="sm" fullWidth icon={<Wallet size={13} />}>
                Ganancias
              </Button>
            </Link>
          </div>

          <p className="px-1 text-[10px] leading-relaxed text-white/20">
            Datos y ganancias DEMO. En producción, el seguimiento en segundo plano requiere una app nativa o
            servicios de ubicación específicos.
          </p>
        </div>
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
        onSend={handleCounter}
        busy={Boolean(counterTrip && busyOffer === counterTrip.id)}
      />

      <ConfirmDialog
        open={Boolean(cancelTripId)}
        onClose={() => setCancelTripId(null)}
        onConfirm={(reason) => {
          if (cancelTripId) {
            cancelTrip(cancelTripId, reason || 'Cancelado por el conductor.', 'driver')
            toast('Viaje cancelado. El pasajero fue notificado.', 'info')
          }
          setCancelTripId(null)
        }}
        title="¿Cancelar el viaje?"
        description="El pasajero será notificado y el viaje volverá a quedar disponible para otros conductores. Las cancelaciones repetidas pueden afectar tu cuenta."
        confirmLabel="Sí, cancelar"
        danger
      />
    </div>
  )
}

