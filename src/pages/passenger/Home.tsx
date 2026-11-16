import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDownUp,
  ArrowRight,
  Car,
  CheckCircle2,
  Clock,
  Crosshair,
  Info,
  MapPin,
  MessageCircle,
  Phone,
  Play,
  Route as RouteIcon,
  Shield,
  Sparkles,
  TriangleAlert,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import type { LatLng, PaymentMethod, Place, Trip, VehicleCategoryId } from '../../types'
import { useCavio } from '../../store/store'
import {
  getActiveTripForPassenger,
  getCategory,
  getOffersForTrip,
} from '../../store/selectors'
import { BOGOTA_CENTER, PAYMENT_METHODS } from '../../data/places'
import { estimateDurationMin, estimateFare, estimateRoadKm, syntheticRoute } from '../../lib/geo'
import {
  formatCOP,
  formatDistance,
  formatDuration,
  relativeTime,
} from '../../lib/format'
import { PageHeader } from '../../components/layout/PageHeader'
import { DemoBadge } from '../../components/Brand'
import { MapView, type MapMarker } from '../../components/map/MapView'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Field'
import { MoneyInput } from '../../components/ui/Field'
import { Avatar, ProgressBar, Spinner, Stars, TripStatusBadge } from '../../components/ui/Display'
import { ConfirmDialog } from '../../components/ui/Modal'
import { LocationPicker } from '../../features/trips/LocationPicker'
import { OfferCard } from '../../features/trips/OfferCard'
import { RatingDialog } from '../../features/trips/RatingDialog'
import { TripStatusHint, TripStatusTimeline } from '../../features/trips/TripStatusTimeline'
import { CategoryIcon } from '../../features/vehicles/CategoryIcon'
import { useGeolocation } from '../../hooks/useGeolocation'
import { useRoutePlan } from '../../hooks/useRoutePlan'
import { useToast } from '../../hooks/useToast'
import { reverseGeocode } from '../../services/geo'

// ============================================================
// CAVIO — Inicio del pasajero
// Solicitud, negociación, seguimiento y calificación
// ============================================================

export function PassengerHome() {
  const {
    state,
    currentUser,
    requestTrip,
    cancelTrip,
    acceptOffer,
    rejectOffer,
    simulation,
  } = useCavio()
  const { toast } = useToast()
  const geo = useGeolocation({ auto: true })

  const activeTrip = currentUser ? getActiveTripForPassenger(state, currentUser.id) : undefined

  const [origin, setOrigin] = useState<Place | null>(null)
  const [destination, setDestination] = useState<Place | null>(null)
  const [picker, setPicker] = useState<'origin' | 'destination' | null>(null)
  const [categoryId, setCategoryId] = useState<VehicleCategoryId>('economy')
  const [fare, setFare] = useState(0)
  const [fareTouched, setFareTouched] = useState(false)
  const [payment, setPayment] = useState<PaymentMethod>('cash')
  const [busyOffer, setBusyOffer] = useState<string | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelBusy, setCancelBusy] = useState(false)
  const [ratingTripId, setRatingTripId] = useState<string | null>(null)
  const [dismissedRatings, setDismissedRatings] = useState<string[]>([])
  const [mapFocus, setMapFocus] = useState<(LatLng & { zoom?: number }) | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const geoLabelRequested = useRef(false)

  const category = getCategory(state, categoryId)
  const { route, loading: routeLoading } = useRoutePlan(origin, destination)

  const distanceKm = route?.distanceKm ?? (origin && destination ? estimateRoadKm(origin, destination) : 0)
  const durationMin = route?.durationMin ?? (distanceKm ? estimateDurationMin(distanceKm) : 0)
  const suggestedFare = distanceKm ? estimateFare(category, distanceKm, durationMin) : 0
  const minAllowed = Math.max(1000, Math.round(category.minFare * 0.6))

  // ------- Ubicación real como origen inicial -------
  useEffect(() => {
    if (!geo.position) return
    if (!mapFocus) setMapFocus({ ...geo.position, zoom: 15 })
    setOrigin((prev) => {
      if (prev) return prev
      return {
        label: 'Mi ubicación actual',
        address: undefined,
        lat: geo.position!.lat,
        lng: geo.position!.lng,
      }
    })
  }, [geo.position, mapFocus])

  // Mejorar la etiqueta del origen GPS con geocodificación inversa (una vez)
  useEffect(() => {
    if (!origin || geoLabelRequested.current) return
    if (origin.label !== 'Mi ubicación actual') return
    geoLabelRequested.current = true
    void reverseGeocode(origin).then((place) => {
      if (!place) return
      setOrigin((prev) =>
        prev && prev.label === 'Mi ubicación actual' ? { ...place, label: place.label || 'Mi ubicación' } : prev,
      )
    })
  }, [origin])

  // Tarifa sugerida dinámica
  useEffect(() => {
    if (!fareTouched && suggestedFare > 0) setFare(suggestedFare)
  }, [suggestedFare, fareTouched])

  const availableDrivers = useMemo(
    () =>
      state.drivers
        .filter((d) => d.approval === 'approved' && d.available)
        .filter((d) => !state.trips.some((t) => t.driverId === d.id && ['assigned', 'arriving', 'arrived', 'in_progress'].includes(t.status)))
        .slice(0, 12),
    [state.drivers, state.trips],
  )

  const nearbyCount = availableDrivers.filter(
    (d) => state.vehicles.find((v) => v.id === d.vehicleId)?.category === categoryId,
  ).length

  // ------- Viajes completados pendientes de calificar -------
  const unratedTrip = useMemo(() => {
    if (!currentUser) return undefined
    return state.trips
      .filter(
        (t) =>
          t.passengerId === currentUser.id &&
          t.status === 'completed' &&
          !t.ratingId &&
          !dismissedRatings.includes(t.id) &&
          Date.now() - new Date(t.finishedAt ?? t.createdAt).getTime() < 6 * 3600 * 1000,
      )
      .sort((a, b) => new Date(b.finishedAt ?? b.createdAt).getTime() - new Date(a.finishedAt ?? a.createdAt).getTime())[0]
  }, [state.trips, currentUser, dismissedRatings])

  useEffect(() => {
    if (!unratedTrip || activeTrip) return
    setRatingTripId(unratedTrip.id)
  }, [unratedTrip, activeTrip])

  const ratingTrip = ratingTripId ? state.trips.find((t) => t.id === ratingTripId) ?? null : null

  // ------- Rutas y marcadores del mapa -------
  const activeDriver = activeTrip?.driverId ? state.drivers.find((d) => d.id === activeTrip.driverId) : undefined
  const activeDriverUser = activeDriver ? state.users.find((u) => u.id === activeDriver.userId) : undefined
  const activeVehicle = activeDriver ? state.vehicles.find((v) => v.id === activeDriver.vehicleId) : undefined

  const mapRoute = useMemo(() => {
    if (activeTrip) {
      if (activeTrip.status === 'in_progress') {
        return activeTrip.route?.length
          ? activeTrip.route
          : syntheticRoute(activeTrip.origin, activeTrip.destination, 24)
      }
      if (activeDriver && ['assigned', 'arriving', 'arrived'].includes(activeTrip.status)) {
        return syntheticRoute(activeDriver.location, activeTrip.origin, 16)
      }
      return undefined
    }
    return route?.points
  }, [activeTrip, activeDriver, route])

  const markers: MapMarker[] = useMemo(() => {
    const list: MapMarker[] = []
    if (geo.position) list.push({ id: 'me', kind: 'user', ...geo.position, label: 'Mi ubicación' })
    if (activeTrip) {
      list.push({ id: 'origin', kind: 'origin', ...activeTrip.origin, label: activeTrip.origin.label })
      list.push({ id: 'dest', kind: 'destination', ...activeTrip.destination, label: activeTrip.destination.label })
      if (activeDriver) {
        list.push({
          id: 'driver',
          kind: 'driver',
          ...activeDriver.location,
          label: `${activeDriverUser?.firstName ?? 'Conductor'} · ${activeVehicle?.plate ?? ''}`,
        })
      }
    } else {
      if (origin) list.push({ id: 'origin', kind: 'origin', ...origin, label: origin.label })
      if (destination) list.push({ id: 'dest', kind: 'destination', ...destination, label: destination.label })
      for (const d of availableDrivers) {
        const user = state.users.find((u) => u.id === d.userId)
        list.push({
          id: `drv_${d.id}`,
          kind: 'available',
          ...d.location,
          label: `${user?.firstName ?? 'Conductor'} · disponible`,
        })
      }
    }
    return list
  }, [geo.position, activeTrip, origin, destination, activeDriver, activeDriverUser, activeVehicle, availableDrivers, state.users])

  const fitSignature = activeTrip ? `trip-${activeTrip.id}-${activeTrip.status}` : `plan-${origin?.label ?? ''}-${destination?.label ?? ''}`

  // ------- Acciones -------
  const handleSubmit = () => {
    if (!currentUser) return
    if (!origin || !destination) {
      toast('Selecciona el origen y el destino para continuar.', 'error')
      return
    }
    if (fare < minAllowed) {
      toast(`La tarifa mínima para esta solicitud es ${formatCOP(minAllowed)}.`, 'error')
      return
    }
    setSubmitting(true)
    const result = requestTrip({
      passengerId: currentUser.id,
      origin,
      destination,
      category: categoryId,
      offeredFare: fare,
      paymentMethod: payment,
      distanceKm,
      durationMin,
    })
    setSubmitting(false)
    if (!result.ok) {
      toast(result.error ?? 'No pudimos crear la solicitud.', 'error')
      return
    }
    toast('Solicitud creada. Estamos buscando conductores.', 'success')
    setDestination(null)
    setFareTouched(false)
    setFare(0)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleAcceptOffer = (offerId: string) => {
    setBusyOffer(offerId)
    const result = acceptOffer(offerId)
    setBusyOffer(null)
    if (!result.ok) toast(result.error ?? 'No pudimos aceptar la oferta.', 'error')
    else toast('¡Conductor asignado! Revisa su información en el mapa.', 'success')
  }

  const handleRejectOffer = (offerId: string) => {
    rejectOffer(offerId)
    toast('Oferta rechazada.', 'info')
  }

  const handleCancel = (reason: string) => {
    if (!activeTrip) return
    setCancelBusy(true)
    cancelTrip(activeTrip.id, reason || 'Cancelado por el pasajero.', 'passenger')
    setCancelBusy(false)
    setCancelOpen(false)
    toast('Tu viaje fue cancelado.', 'info')
  }

  const useDemoLocation = () => {
    setOrigin({
      label: 'Ubicación DEMO · Bogotá',
      address: 'Centro de Bogotá (simulado)',
      ...BOGOTA_CENTER,
    })
    setMapFocus({ ...BOGOTA_CENTER, zoom: 14 })
    toast('Usando una ubicación DEMO claramente identificada.', 'info')
  }

  const swapPlaces = () => {
    if (!origin && !destination) return
    const nextOrigin = destination
    setOrigin(nextOrigin)
    setDestination(origin)
  }

  const requestForm = (
    <div className="card space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold text-white">¿A dónde vamos?</h2>
          <p className="mt-0.5 text-[12px] text-white/40">Elige tu ruta, tu CAVIO y tu tarifa.</p>
        </div>
        <DemoBadge />
      </div>

      <div className="relative rounded-2xl border border-white/[0.08] bg-[#080808]">
        <button
          type="button"
          onClick={() => setPicker('origin')}
          className="flex w-full min-w-0 items-center gap-3 rounded-t-2xl px-3.5 py-3 text-left transition hover:bg-white/[0.03]"
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center">
            <span className="h-3 w-3 rounded-full border-2 border-lime" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-white/30">Origen</span>
            <span className={clsx('block truncate text-[13.5px]', origin ? 'text-white/90' : 'text-white/35')}>
              {origin?.label ?? 'Elige tu punto de partida'}
            </span>
          </span>
          <Crosshair size={15} className="shrink-0 text-white/25" />
        </button>
        <div className="mx-12 h-px bg-white/[0.06]" />
        <button
          type="button"
          onClick={() => setPicker('destination')}
          className="flex w-full min-w-0 items-center gap-3 rounded-b-2xl px-3.5 py-3 text-left transition hover:bg-white/[0.03]"
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center">
            <MapPin size={15} className="text-lime" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-white/30">Destino</span>
            <span className={clsx('block truncate text-[13.5px]', destination ? 'text-white/90' : 'text-white/35')}>
              {destination?.label ?? '¿A dónde quieres ir?'}
            </span>
          </span>
          <ArrowRight size={15} className="shrink-0 text-white/25" />
        </button>
        <button
          type="button"
          onClick={swapPlaces}
          disabled={!origin && !destination}
          className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl border border-white/10 bg-[#141414] text-white/45 transition hover:text-lime disabled:opacity-30"
          aria-label="Intercambiar origen y destino"
        >
          <ArrowDownUp size={14} />
        </button>
      </div>

      {!origin && destination && (
        <p className="rounded-xl border border-amber-400/15 bg-amber-400/[0.05] px-3 py-2 text-[11px] leading-relaxed text-amber-100/60">
          Falta tu origen: elige una ubicación para calcular la distancia y la tarifa sugerida.
        </p>
      )}

      {geo.status === 'denied' && (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.05] p-3">
          <p className="flex items-center gap-1.5 text-[12px] font-medium text-amber-200">
            <TriangleAlert size={13} /> Ubicación no disponible
          </p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-amber-100/50">
            Puedes escribir tu origen o tocar el mapa para elegirlo. También puedes usar una ubicación DEMO.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => setPicker('origin')}>
              Elegir origen
            </Button>
            <Button size="sm" variant="ghost" onClick={useDemoLocation}>
              Usar ubicación DEMO
            </Button>
          </div>
        </div>
      )}
      {geo.status === 'insecure' && (
        <p className="rounded-xl bg-white/[0.03] px-3 py-2 text-[11px] leading-relaxed text-white/40">
          La ubicación requiere HTTPS o localhost. Elige tu origen manualmente mientras tanto.
        </p>
      )}
      {geo.error &&
        !['denied', 'insecure', 'idle', 'requesting', 'granted'].includes(geo.status) && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <p className="flex items-start gap-1.5 text-[11.5px] leading-relaxed text-white/45">
              <Info size={12} className="mt-0.5 shrink-0 text-amber-200/70" />
              {geo.error}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={geo.request}>
                Reintentar ubicación
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPicker('origin')}>
                Elegir origen
              </Button>
            </div>
          </div>
        )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="section-title">Elige tu CAVIO</p>
          <span className="inline-flex items-center gap-1 text-[10.5px] text-white/30">
            <Users size={10} /> {nearbyCount} cerca
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {state.settings.categories.map((cat) => {
            const selected = cat.id === categoryId
            const catDistance = distanceKm
            const catDuration = durationMin
            const price = catDistance ? estimateFare(cat, catDistance, catDuration) : null
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryId(cat.id)}
                className={clsx(
                  'min-w-0 rounded-2xl border p-3 text-left transition',
                  selected
                    ? 'border-lime/50 bg-lime/[0.08] shadow-[inset_0_0_0_1px_rgba(198,243,107,0.15)]'
                    : 'border-white/[0.07] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]',
                )}
                aria-pressed={selected}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <span
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-xl"
                    style={{ background: `${cat.color}18`, color: cat.color }}
                  >
                    <CategoryIcon category={cat.id} size={17} />
                  </span>
                  {selected && <CheckCircle2 size={14} className="shrink-0 text-lime" />}
                </div>
                <p className="mt-2 truncate text-[12.5px] font-semibold text-white">
                  {cat.name.replace('CAVIO ', '')}
                </p>
                <p className="mt-0.5 text-[10.5px] text-white/35">
                  {cat.capacity} {cat.capacity === 1 ? 'pasajero' : 'pasajeros'} · ~{cat.etaMin} min
                </p>
                <p className="mt-1 truncate text-[12px] font-medium tabular-nums text-white/70">
                  {price ? formatCOP(price) : '—'}
                </p>
              </button>
            )
          })}
        </div>
        <p className="mt-1.5 text-[10.5px] leading-relaxed text-white/25">
          Tarifas y disponibilidad DEMO. El tiempo de llegada es estimado.
        </p>
      </div>

      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] font-medium text-white/85">Tu tarifa</p>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/25">Tarifa DEMO</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11.5px] text-white/35">
            Sugerida: <span className="font-medium text-lime/80">{suggestedFare ? formatCOP(suggestedFare) : '—'}</span>
          </p>
          <button
            type="button"
            disabled={!suggestedFare}
            onClick={() => {
              setFareTouched(false)
              setFare(suggestedFare)
            }}
            className="inline-flex min-h-[38px] items-center rounded-lg px-2 text-[11px] font-medium text-lime/80 transition hover:bg-lime/[0.06] hover:text-lime disabled:opacity-30"
          >
            Usar sugerida
          </button>
        </div>
        <div className="mt-2.5">
          <MoneyInput
            value={fare}
            onChange={(value) => {
              setFare(value)
              setFareTouched(true)
            }}
            min={minAllowed}
            max={suggestedFare ? suggestedFare * 4 : undefined}
            step={500}
            disabled={!origin || !destination}
          />
        </div>
        {fare > 0 && fare < category.minFare && (
          <p className="mt-2 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-amber-200/60">
            <Info size={11} className="mt-0.5 shrink-0" />
            Tu tarifa está por debajo de la sugerida. Los conductores pueden contraofertar.
          </p>
        )}
        {fareTouched && (
          <p className="mt-2 text-[10.5px] text-white/30">
            Los conductores podrán aceptar tu tarifa o enviarte una contraoferta.
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <div>
          <label htmlFor="payment" className="field-label">
            Método de pago
          </label>
          <Select
            id="payment"
            value={payment}
            onChange={(e) => setPayment(e.target.value as PaymentMethod)}
          >
            {PAYMENT_METHODS.map((method) => (
              <option key={method.id} value={method.id}>
                {method.label} — {method.hint}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3">
          <div className="min-w-0">
            <p className="text-[9.5px] uppercase tracking-wider text-white/30">Distancia</p>
            <p className="mt-0.5 truncate text-[12px] font-medium text-white/80">
              {distanceKm ? formatDistance(distanceKm) : '—'}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[9.5px] uppercase tracking-wider text-white/30">Tiempo</p>
            <p className="mt-0.5 truncate text-[12px] font-medium text-white/80">
              {durationMin ? formatDuration(durationMin) : '—'}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[9.5px] uppercase tracking-wider text-white/30">Ruta</p>
            <p className="mt-0.5 truncate text-[12px] font-medium text-white/80">
              {routeLoading ? '…' : route?.source === 'osrm' ? 'OSRM' : route ? 'DEMO' : '—'}
            </p>
          </div>
        </div>
      </div>

      <Button
        size="lg"
        fullWidth
        onClick={handleSubmit}
        loading={submitting}
        disabled={!origin || !destination || fare < minAllowed}
        icon={<Car size={18} />}
      >
        Solicitar viaje
      </Button>
      <p className="flex items-start gap-1.5 text-[10.5px] leading-relaxed text-white/25">
        <Shield size={11} className="mt-0.5 shrink-0 text-lime/50" />
        Prototipo DEMO: no se realizan cobros reales ni se comparte tu ubicación fuera de la simulación.
      </p>
    </div>
  )

  const activeView = activeTrip ? (
    <ActiveTripPanel
      trip={activeTrip}
      onAcceptOffer={handleAcceptOffer}
      onRejectOffer={handleRejectOffer}
      busyOffer={busyOffer}
      onCancel={() => setCancelOpen(true)}
      simulationRunning={state.simulation.running}
      onStartSimulation={simulation.start}
      onRate={() => setRatingTripId(activeTrip.id)}
    />
  ) : null

  return (
    <div>
      <PageHeader
        title={`Hola, ${currentUser?.firstName ?? 'viajero'}`}
        subtitle={
          activeTrip
            ? 'Tu viaje está activo. Sigue el estado en tiempo real dentro de la simulación.'
            : 'Pide tu próximo viaje, negocia tu tarifa y viaja con tranquilidad.'
        }
        badge={<DemoBadge />}
        actions={
          <div className="hidden items-center gap-2 sm:flex">
            <Link to="/pasajero/historial">
              <Button variant="secondary" size="sm" icon={<Clock size={14} />}>
                Mis viajes
              </Button>
            </Link>
            <Link to="/pasajero/ayuda">
              <Button variant="ghost" size="sm" icon={<Shield size={14} />}>
                Ayuda
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid gap-5 md:grid-cols-[minmax(0,370px)_minmax(0,1fr)] lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,470px)_minmax(0,1fr)]">
        <div className="order-2 min-w-0 space-y-4 md:order-1">
          {activeView ?? requestForm}
        </div>

        <div className="order-1 min-w-0 md:order-2">
          <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] md:sticky md:top-[84px] lg:top-[92px]">
            <div className="h-[300px] sm:h-[360px] md:h-[calc(100dvh-170px)] md:max-h-[880px]">
              <MapView
                center={geo.position ?? BOGOTA_CENTER}
                zoom={13}
                markers={markers}
                route={mapRoute}
                fitSignature={fitSignature}
                focus={mapFocus}
                showRecenter
                recenterTo={geo.position}
              />
            </div>
            <div className="pointer-events-none absolute left-3 top-3 flex max-w-[calc(100%-24px)] flex-wrap gap-2">
              <span className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/70 px-2.5 py-1.5 text-[10.5px] text-white/70 backdrop-blur-md">
                <RouteIcon size={11} className="text-lime" />
                {activeTrip ? `Viaje ${activeTrip.code}` : `${nearbyCount} CAVIO cerca`}
              </span>
              {geo.status === 'requesting' && (
                <span className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/70 px-2.5 py-1.5 text-[10.5px] text-white/60 backdrop-blur-md">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime" /> Solicitando ubicación…
                </span>
              )}
              {(!geo.position || geo.status === 'denied' || geo.status === 'insecure') &&
                geo.status !== 'requesting' && (
                  <span className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1.5 text-[10.5px] text-amber-200/80 backdrop-blur-md">
                    <TriangleAlert size={11} /> Ubicación manual/DEMO
                  </span>
                )}
              {routeLoading && (
                <span className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/70 px-2.5 py-1.5 text-[10.5px] text-white/60 backdrop-blur-md">
                  <Sparkles size={11} className="animate-pulse text-lime" /> Calculando ruta…
                </span>
              )}
            </div>
          </div>

          {!activeTrip && (
            <div className="mt-4 hidden gap-2 sm:grid-cols-2 lg:grid">
              <div className="rounded-2xl border border-white/[0.07] bg-[#080808] p-3.5">
                <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-white/60">
                  <Wallet size={13} className="text-lime" /> Pago DEMO
                </p>
                <p className="mt-1 text-[10.5px] leading-relaxed text-white/30">
                  {PAYMENT_METHODS.find((m) => m.id === payment)?.hint}. No se realizan transacciones reales.
                </p>
              </div>
              <div className="rounded-2xl border border-white/[0.07] bg-[#080808] p-3.5">
                <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-white/60">
                  <Shield size={13} className="text-lime" /> Viaje seguro
                </p>
                <p className="mt-1 text-[10.5px] leading-relaxed text-white/30">
                  Conductores con calificación DEMO. Soporte disponible desde Ayuda.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <LocationPicker
        open={picker === 'origin'}
        onClose={() => setPicker(null)}
        onSelect={(place) => {
          setOrigin(place)
          setFareTouched(false)
        }}
        title="Elige tu origen"
        subtitle="Puedes usar tu ubicación real, buscar una dirección o marcar un punto."
        kind="origen"
      />
      <LocationPicker
        open={picker === 'destination'}
        onClose={() => setPicker(null)}
        onSelect={(place) => {
          setDestination(place)
          setFareTouched(false)
        }}
        title="Elige tu destino"
        subtitle="Busca una dirección o selecciona un punto en el mapa."
        kind="destino"
      />

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={handleCancel}
        title="¿Cancelar tu viaje?"
        description="Si un conductor ya fue asignado, se le notificará la cancelación. Esta acción quedará registrada en la simulación."
        confirmLabel="Sí, cancelar viaje"
        cancelLabel="Seguir esperando"
        danger
        loading={cancelBusy}
      />

      <RatingDialog
        open={Boolean(ratingTrip)}
        trip={ratingTrip}
        onClose={() => {
          if (ratingTripId) setDismissedRatings((prev) => [...prev, ratingTripId])
          setRatingTripId(null)
        }}
      />
    </div>
  )
}

// ============================================================
// Panel de viaje activo
// ============================================================

function ActiveTripPanel({
  trip,
  onAcceptOffer,
  onRejectOffer,
  busyOffer,
  onCancel,
  simulationRunning,
  onStartSimulation,
  onRate,
}: {
  trip: Trip
  onAcceptOffer: (offerId: string) => void
  onRejectOffer: (offerId: string) => void
  busyOffer: string | null
  onCancel: () => void
  simulationRunning: boolean
  onStartSimulation: () => void
  onRate: () => void
}) {
  const { state } = useCavio()
  const { toast } = useToast()
  const offers = getOffersForTrip(state, trip.id)
  const driver = trip.driverId ? state.drivers.find((d) => d.id === trip.driverId) : undefined
  const driverUser = driver ? state.users.find((u) => u.id === driver.userId) : undefined
  const vehicle = driver ? state.vehicles.find((v) => v.id === driver.vehicleId) : undefined
  const eta = driver
    ? Math.max(1, Math.round((Math.hypot(driver.location.lat - trip.origin.lat, driver.location.lng - trip.origin.lng) * 111 * 1.4 / 20) * 60) + 1)
    : null

  const progressByStatus: Record<string, number> = {
    searching: 12,
    offers: 24,
    assigned: 40,
    arriving: 55,
    arrived: 70,
    in_progress: 85,
    completed: 100,
    cancelled: 0,
  }

  const demoContact = (channel: string) => {
    toast(
      `${channel}: esta función es DEMO. En producción se integraría con el sistema de comunicación real.`,
      'info',
    )
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white/30">{trip.code}</span>
              <TripStatusBadge status={trip.status} />
            </div>
            <p className="mt-1.5 text-[11.5px] text-white/30">Creado {relativeTime(trip.createdAt)}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[17px] font-semibold tabular-nums text-white">
              {formatCOP(trip.finalFare ?? trip.agreedFare ?? trip.suggestedFare)}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-white/30">
              {trip.agreedFare ? 'Tarifa acordada' : 'Tarifa propuesta'}
            </p>
          </div>
        </div>
        <div className="mt-3">
          <TripStatusHint trip={trip} />
          <ProgressBar value={progressByStatus[trip.status] ?? 0} className="mt-3" />
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/[0.025] px-3 py-2">
          <span className="h-2 w-2 shrink-0 rounded-full border-2 border-lime" />
          <p className="min-w-0 flex-1 truncate text-[12px] text-white/65">{trip.origin.label}</p>
          <ArrowRight size={12} className="shrink-0 text-white/25" />
          <MapPin size={12} className="shrink-0 text-lime" />
          <p className="min-w-0 flex-1 truncate text-right text-[12px] text-white/65">{trip.destination.label}</p>
        </div>
      </div>

      {(trip.status === 'searching' || trip.status === 'offers') && (
        <div className="card">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-[15px] font-semibold text-white">
                {offers.length ? `${offers.length} oferta${offers.length > 1 ? 's' : ''} recibida${offers.length > 1 ? 's' : ''}` : 'Buscando conductores'}
              </h3>
              <p className="mt-0.5 text-[11.5px] text-white/35">
                {offers.length
                  ? 'Acepta la propuesta que prefieras o rechaza las que no te sirvan.'
                  : 'Los conductores cercanos están revisando tu tarifa.'}
              </p>
            </div>
            {!simulationRunning && (
              <Button size="sm" variant="secondary" icon={<Play size={13} />} onClick={onStartSimulation}>
                Simular
              </Button>
            )}
          </div>

          <div className="mt-3 space-y-2">
            {offers.map((offer) => {
              const offerDriver = state.drivers.find((d) => d.id === offer.driverId)
              const offerUser = offerDriver ? state.users.find((u) => u.id === offerDriver.userId) : undefined
              if (!offerDriver || !offerUser) return null
              return (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  trip={trip}
                  driver={offerDriver}
                  driverUser={offerUser}
                  vehicle={state.vehicles.find((v) => v.id === offerDriver.vehicleId)}
                  onAccept={() => onAcceptOffer(offer.id)}
                  onReject={() => onRejectOffer(offer.id)}
                  busy={busyOffer === offer.id}
                />
              )
            })}

            {offers.length === 0 && (
              <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-5">
                <Spinner />
                <div className="min-w-0">
                  <p className="text-[12.5px] font-medium text-white/70">Esperando ofertas…</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-white/30">
                    {simulationRunning
                      ? 'La simulación está activa: aparecerán ofertas automáticamente.'
                      : 'Pulsa “Simular” para que los conductores DEMO empiecen a enviar ofertas.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button variant="danger" size="sm" onClick={onCancel} icon={<X size={14} />}>
              Cancelar solicitud
            </Button>
          </div>
          <p className="mt-2.5 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-white/25">
            <Info size={11} className="mt-0.5 shrink-0" />
            Puedes rechazar todas las ofertas y esperar nuevas propuestas.
          </p>
        </div>
      )}

      {driver && driverUser && ['assigned', 'arriving', 'arrived', 'in_progress'].includes(trip.status) && (
        <div className="card">
          <div className="flex items-start gap-3">
            <Avatar user={driverUser} size={52} ring />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-white">
                {driverUser.firstName} {driverUser.lastName}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <Stars value={driver.rating} count={driver.ratingCount} size={12} />
                <span className="text-[11px] text-white/30">
                  {driver.approval === 'approved' ? 'Conductor verificado DEMO' : 'En revisión'}
                </span>
              </div>
              <p className="mt-1 truncate text-[11.5px] text-white/40">
                {vehicle ? `${vehicle.brand} ${vehicle.model} · ${vehicle.color}` : 'Vehículo CAVIO'}
              </p>
            </div>
            <span className="shrink-0 rounded-lg border border-white/15 bg-white/[0.06] px-2 py-1 text-[11px] font-semibold tracking-wider text-white/80">
              {vehicle?.plate ?? 'CAVIO'}
            </span>
          </div>

          {trip.status === 'arriving' && eta !== null && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-lime/15 bg-lime/[0.05] px-3 py-2">
              <Clock size={13} className="text-lime" />
              <p className="text-[12px] text-white/65">
                Llega en aproximadamente <span className="font-semibold text-lime">{eta} min</span>
              </p>
            </div>
          )}
          {trip.status === 'arrived' && (
            <div className="mt-3 rounded-xl border border-lime/20 bg-lime/[0.07] px-3 py-2.5">
              <p className="text-[12px] font-medium text-lime">Tu conductor ya está en el punto de recogida.</p>
              <p className="mt-0.5 text-[11px] text-white/35">Verifica la placa {vehicle?.plate} antes de subir.</p>
            </div>
          )}

          <div className="mt-3 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => demoContact('Llamada')}
              className="flex flex-col items-center gap-1 rounded-xl border border-white/[0.07] bg-white/[0.03] py-2.5 text-[10.5px] text-white/50 transition hover:bg-white/[0.06]"
            >
              <Phone size={15} className="text-lime/80" /> Llamar
            </button>
            <button
              type="button"
              onClick={() => demoContact('Mensaje')}
              className="flex flex-col items-center gap-1 rounded-xl border border-white/[0.07] bg-white/[0.03] py-2.5 text-[10.5px] text-white/50 transition hover:bg-white/[0.06]"
            >
              <MessageCircle size={15} className="text-lime/80" /> Mensaje
            </button>
            <button
              type="button"
              onClick={() => demoContact('Compartir viaje')}
              className="flex flex-col items-center gap-1 rounded-xl border border-white/[0.07] bg-white/[0.03] py-2.5 text-[10.5px] text-white/50 transition hover:bg-white/[0.06]"
            >
              <Shield size={15} className="text-lime/80" /> Compartir
            </button>
          </div>

          <div className="mt-3 rounded-xl bg-white/[0.02] px-3 py-2">
            <p className="text-[10.5px] leading-relaxed text-white/30">
              Los botones de llamada, mensaje y compartir son DEMO. No se realizan comunicaciones reales.
            </p>
          </div>

          {trip.status !== 'in_progress' && (
            <Button variant="ghost" size="sm" className="mt-2" onClick={onCancel} icon={<X size={14} />}>
              Cancelar viaje
            </Button>
          )}
          {trip.status === 'in_progress' && (
            <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
              <p className="text-[11px] leading-relaxed text-white/35">
                El conductor es quien inicia y finaliza el viaje. Puedes seguir el avance en el mapa y en la
                línea de tiempo.
              </p>
            </div>
          )}
        </div>
      )}

      {trip.status === 'completed' && (
        <div className="card">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lime/15 text-lime">
              <CheckCircle2 size={20} />
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-white">¡Llegaste a tu destino!</p>
              <p className="text-[11.5px] text-white/35">
                {formatDistance(trip.distanceKm)} · {formatDuration(trip.durationMin)} ·{' '}
                {formatCOP(trip.finalFare ?? trip.agreedFare ?? trip.suggestedFare)}
              </p>
            </div>
          </div>
          <Button className="mt-3" fullWidth onClick={onRate}>
            {trip.ratingId ? 'Ver calificación enviada' : 'Calificar a mi conductor'}
          </Button>
        </div>
      )}

      <div className="card">
        <h3 className="text-[14px] font-semibold text-white">Progreso del viaje</h3>
        <div className="mt-3">
          <TripStatusTimeline trip={trip} dense />
        </div>
      </div>
    </div>
  )
}
