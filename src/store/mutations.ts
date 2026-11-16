import type {
  AppNotification,
  AuditEntry,
  CavioState,
  DriverDocument,
  DriverProfile,
  Offer,
  Place,
  Rating,
  Trip,
  TripStatus,
  User,
  Vehicle,
  VehicleCategoryId,
} from '../types'
import { estimateFare, haversineKm, moveTowards, pointAlongRoute, syntheticRoute } from '../lib/geo'
import { TRIP_STATUS_LABEL } from '../lib/format'
import { isActiveTrip } from './selectors'

// ============================================================
// CAVIO — Mutaciones puras del estado DEMO
// Toda transición pasa por aquí para mantener coherencia entre roles.
// ============================================================

export function nowIso(): string {
  return new Date().toISOString()
}

const NOTIFICATION_LIMIT = 300
const AUDIT_LIMIT = 500
const LOG_LIMIT = 120

export function notify(
  state: CavioState,
  userId: string,
  title: string,
  message: string,
  kind: AppNotification['kind'],
  tripId?: string,
): CavioState {
  const notification: AppNotification = {
    id: `ntf_${Math.random().toString(36).slice(2, 9)}`,
    userId,
    title,
    message,
    createdAt: nowIso(),
    read: false,
    kind,
    tripId,
  }
  return {
    ...state,
    notifications: [notification, ...state.notifications].slice(0, NOTIFICATION_LIMIT),
  }
}

export function audit(
  state: CavioState,
  actor: User | undefined,
  action: string,
  description: string,
  type: AuditEntry['type'],
): CavioState {
  const entry: AuditEntry = {
    id: `aud_${Math.random().toString(36).slice(2, 9)}`,
    actorId: actor?.id ?? 'system',
    actorName: actor ? `${actor.firstName} ${actor.lastName}` : 'Sistema CAVIO',
    action,
    description,
    type,
    createdAt: nowIso(),
  }
  return { ...state, audit: [entry, ...state.audit].slice(0, AUDIT_LIMIT) }
}

export function simLog(
  state: CavioState,
  message: string,
  kind: 'info' | 'trip' | 'offer' | 'driver' | 'system' = 'info',
): CavioState {
  return {
    ...state,
    simulation: {
      ...state.simulation,
      log: [
        {
          id: `log_${Math.random().toString(36).slice(2, 9)}`,
          at: nowIso(),
          message,
          kind,
        },
        ...state.simulation.log,
      ].slice(0, LOG_LIMIT),
    },
  }
}

export function mapTrip(state: CavioState, tripId: string, update: (trip: Trip) => Trip): CavioState {
  return { ...state, trips: state.trips.map((t) => (t.id === tripId ? update(t) : t)) }
}

export function mapDriver(
  state: CavioState,
  driverId: string,
  update: (driver: DriverProfile) => DriverProfile,
): CavioState {
  return {
    ...state,
    drivers: state.drivers.map((d) => (d.id === driverId ? update(d) : d)),
  }
}

export function setDriverLocation(
  state: CavioState,
  driverId: string,
  location: { lat: number; lng: number },
  source: 'gps' | 'demo' = 'demo',
): CavioState {
  return mapDriver(state, driverId, (d) => ({
    ...d,
    location,
    locationSource: source,
    lastLocationAt: nowIso(),
  }))
}

function tripCode(state: CavioState): string {
  return `CV-${4920 + state.trips.length}`
}

// ------------------------------------------------------------
// Solicitudes
// ------------------------------------------------------------

export interface RequestTripInput {
  passengerId: string
  origin: Place
  destination: Place
  category: VehicleCategoryId
  offeredFare: number
  paymentMethod: Trip['paymentMethod']
  distanceKm: number
  durationMin: number
}

export function requestTripMutation(
  state: CavioState,
  input: RequestTripInput,
): { state: CavioState; trip?: Trip; error?: string } {
  const passenger = state.users.find((u) => u.id === input.passengerId)
  if (!passenger) return { state, error: 'No encontramos tu cuenta.' }
  if (passenger.status === 'suspended') {
    return { state, error: 'Tu cuenta está suspendida. Contacta a soporte para más información.' }
  }
  const active = state.trips.find((t) => t.passengerId === input.passengerId && isActiveTrip(t))
  if (active) {
    return { state, error: 'Ya tienes un viaje activo. Termínalo o cancélalo antes de pedir otro.' }
  }
  const category = state.settings.categories.find((c) => c.id === input.category)
  if (!category) return { state, error: 'Categoría de vehículo no válida.' }
  if (input.offeredFare < 1000) {
    return { state, error: 'La tarifa propuesta debe ser de al menos $1.000 COP.' }
  }
  const suggestedFare = estimateFare(category, input.distanceKm, input.durationMin)
  if (input.offeredFare > suggestedFare * 4) {
    return { state, error: 'La tarifa propuesta es demasiado alta. Revisa el valor e inténtalo de nuevo.' }
  }
  if (haversineKm(input.origin, input.destination) < 0.15) {
    return { state, error: 'El origen y el destino deben ser diferentes.' }
  }

  const trip: Trip = {
    id: `trip_${Date.now().toString(36)}`,
    code: tripCode(state),
    passengerId: input.passengerId,
    origin: input.origin,
    destination: input.destination,
    category: input.category,
    suggestedFare,
    distanceKm: input.distanceKm,
    durationMin: input.durationMin,
    status: 'searching',
    paymentMethod: input.paymentMethod,
    createdAt: nowIso(),
    simulated: true,
  }

  let next: CavioState = { ...state, trips: [trip, ...state.trips] }
  next = notify(
    next,
    input.passengerId,
    'Solicitud creada',
    `Estamos buscando conductores de ${category.name} cerca de ${trip.origin.label}.`,
    'trip',
    trip.id,
  )
  next = simLog(next, `Nueva solicitud ${trip.code} · ${trip.origin.label} → ${trip.destination.label}`, 'trip')
  return { state: next, trip }
}

export function cancelTripMutation(
  state: CavioState,
  tripId: string,
  reason: string,
  actorRole: 'passenger' | 'driver' | 'admin',
): CavioState {
  const trip = state.trips.find((t) => t.id === tripId)
  if (!trip || !isActiveTrip(trip)) return state
  let next = mapTrip(state, tripId, (t) => ({
    ...t,
    status: 'cancelled',
    cancelledAt: nowIso(),
    cancelReason: reason,
    finalFare: undefined,
  }))
  next = {
    ...next,
    offers: next.offers.map((o) =>
      o.tripId === tripId && o.status === 'pending' ? { ...o, status: 'rejected' } : o,
    ),
  }
  if (trip.driverId) {
    next = mapDriver(next, trip.driverId, (d) => ({ ...d, available: true }))
    const driver = state.drivers.find((d) => d.id === trip.driverId)
    if (driver) {
      next = notify(
        next,
        driver.userId,
        'Viaje cancelado',
        `El viaje ${trip.code} fue cancelado. ${reason}`,
        'trip',
        tripId,
      )
    }
  }
  if (actorRole !== 'passenger') {
    next = notify(
      next,
      trip.passengerId,
      'Viaje cancelado',
      `Tu viaje ${trip.code} fue cancelado. ${reason}`,
      'trip',
      tripId,
    )
  }
  next = simLog(next, `Viaje ${trip.code} cancelado (${actorRole}).`, 'trip')
  return next
}

// ------------------------------------------------------------
// Ofertas y negociación
// ------------------------------------------------------------

export function sendOfferMutation(
  state: CavioState,
  params: { tripId: string; driverId: string; amount: number; kind: 'accept' | 'counter'; message?: string },
): { state: CavioState; error?: string } {
  const trip = state.trips.find((t) => t.id === params.tripId)
  const driver = state.drivers.find((d) => d.id === params.driverId)
  if (!trip || !driver) return { state, error: 'La solicitud ya no está disponible.' }
  if (trip.status !== 'searching' && trip.status !== 'offers' && trip.status !== 'created') {
    return { state, error: 'Esta solicitud ya fue asignada a otro conductor.' }
  }
  if (driver.approval !== 'approved') {
    return { state, error: 'Tu cuenta debe estar aprobada para enviar ofertas.' }
  }
  const driverUser = state.users.find((u) => u.id === driver.userId)
  if (driverUser?.status === 'suspended') {
    return { state, error: 'Tu cuenta está suspendida.' }
  }
  if (!Number.isFinite(params.amount) || params.amount < 1000) {
    return { state, error: 'La oferta debe ser de al menos $1.000 COP.' }
  }
  if (params.amount > trip.suggestedFare * 4) {
    return { state, error: 'La oferta supera el límite permitido para esta solicitud.' }
  }

  const existing = state.offers.find(
    (o) => o.tripId === trip.id && o.driverId === driver.id && o.status === 'pending',
  )
  let offers: Offer[]
  if (existing) {
    offers = state.offers.map((o) =>
      o.id === existing.id
        ? { ...o, amount: params.amount, kind: params.kind, message: params.message, createdAt: nowIso() }
        : o,
    )
  } else {
    const offer: Offer = {
      id: `off_${Date.now().toString(36)}${Math.floor(Math.random() * 100)}`,
      tripId: trip.id,
      driverId: driver.id,
      amount: params.amount,
      kind: params.kind,
      status: 'pending',
      createdAt: nowIso(),
      message: params.message,
    }
    offers = [offer, ...state.offers]
  }
  let next: CavioState = {
    ...state,
    offers,
    trips: state.trips.map((t) =>
      t.id === trip.id && t.status === 'searching' ? { ...t, status: 'offers' as TripStatus } : t,
    ),
  }
  next = notify(
    next,
    trip.passengerId,
    params.kind === 'accept' ? 'Nueva oferta recibida' : 'Nueva contraoferta',
    `Un conductor de ${state.vehicles.find((v) => v.id === driver.vehicleId)?.brand ?? 'CAVIO'} propone $${params.amount.toLocaleString('es-CO')} para tu viaje ${trip.code}.`,
    'offer',
    trip.id,
  )
  next = simLog(
    next,
    `Oferta de ${driverUser?.firstName ?? 'conductor'} por $${params.amount.toLocaleString('es-CO')} en ${trip.code}.`,
    'offer',
  )
  return { state: next }
}

export function acceptOfferMutation(
  state: CavioState,
  offerId: string,
): { state: CavioState; error?: string } {
  const offer = state.offers.find((o) => o.id === offerId && o.status === 'pending')
  if (!offer) return { state, error: 'La oferta ya no está disponible.' }
  const trip = state.trips.find((t) => t.id === offer.tripId)
  const driver = state.drivers.find((d) => d.id === offer.driverId)
  if (!trip || !driver) return { state, error: 'No encontramos la solicitud.' }
  if (trip.status !== 'searching' && trip.status !== 'offers' && trip.status !== 'created') {
    return { state, error: 'La solicitud ya fue asignada.' }
  }
  if (driver.approval !== 'approved') return { state, error: 'El conductor no está habilitado.' }

  let next = mapTrip(state, trip.id, (t) => ({
    ...t,
    driverId: offer.driverId,
    agreedFare: offer.amount,
    status: 'assigned',
    assignedAt: nowIso(),
    simulated: true,
  }))
  next = {
    ...next,
    offers: next.offers.map((o) => {
      if (o.tripId !== trip.id) return o
      if (o.id === offer.id) return { ...o, status: 'accepted' }
      return o.status === 'pending' ? { ...o, status: 'rejected' } : o
    }),
  }
  next = mapDriver(next, driver.id, (d) => ({ ...d, available: false }))
  next = notify(
    next,
    trip.passengerId,
    'Conductor asignado',
    `Tu conductor va en camino a ${trip.origin.label}. Tarifa acordada: $${offer.amount.toLocaleString('es-CO')}.`,
    'trip',
    trip.id,
  )
  next = notify(
    next,
    driver.userId,
    'Viaje aceptado',
    `El pasajero aceptó tu oferta de $${offer.amount.toLocaleString('es-CO')} para el viaje ${trip.code}.`,
    'trip',
    trip.id,
  )
  next = simLog(next, `Oferta aceptada en ${trip.code} · tarifa $${offer.amount.toLocaleString('es-CO')}.`, 'trip')
  return { state: next }
}

// ------------------------------------------------------------
// Transiciones de viaje
// ------------------------------------------------------------

export function rejectOfferMutation(state: CavioState, offerId: string): CavioState {
  return {
    ...state,
    offers: state.offers.map((o) => (o.id === offerId ? { ...o, status: 'rejected' } : o)),
  }
}

export const NEXT_STATUS: Partial<Record<TripStatus, TripStatus>> = {
  assigned: 'arriving',
  arriving: 'arrived',
  arrived: 'in_progress',
  in_progress: 'completed',
}

export function advanceTripMutation(state: CavioState, tripId: string): CavioState {
  const trip = state.trips.find((t) => t.id === tripId)
  if (!trip) return state
  const nextStatus = NEXT_STATUS[trip.status]
  if (!nextStatus) return state

  if (nextStatus === 'completed') return completeTripMutation(state, tripId)

  let next = mapTrip(state, tripId, (t) => {
    const patch: Partial<Trip> = { status: nextStatus }
    if (nextStatus === 'in_progress') patch.startedAt = nowIso()
    if (nextStatus === 'arrived') patch.startedAt = undefined
    return { ...t, ...patch }
  })

  if (trip.driverId) {
    if (nextStatus === 'arrived') {
      next = setDriverLocation(next, trip.driverId, trip.origin, 'demo')
    }
    if (nextStatus === 'in_progress') {
      next = setDriverLocation(next, trip.driverId, trip.origin, 'demo')
    }
  }

  const messages: Record<string, string> = {
    arriving: 'Tu conductor va en camino al punto de recogida.',
    arrived: 'Tu conductor llegó al punto de recogida.',
    in_progress: 'El viaje ha comenzado. ¡Buen camino!',
  }
  next = notify(
    next,
    trip.passengerId,
    `Viaje ${trip.code}`,
    messages[nextStatus] ?? 'Tu viaje cambió de estado.',
    'trip',
    trip.id,
  )
  const driver = state.drivers.find((d) => d.id === trip.driverId)
  if (driver) {
    next = notify(
      next,
      driver.userId,
      `Viaje ${trip.code}`,
      nextStatus === 'arriving'
        ? 'Dirígete al punto de recogida.'
        : nextStatus === 'arrived'
          ? 'Marcaste que llegaste. Espera al pasajero.'
          : 'Has iniciado el viaje.',
      'trip',
      trip.id,
    )
  }
  next = simLog(next, `Viaje ${trip.code}: ${TRIP_STATUS_LABEL[nextStatus].toLowerCase()}.`, 'trip')
  return next
}

export function completeTripMutation(state: CavioState, tripId: string): CavioState {
  const trip = state.trips.find((t) => t.id === tripId)
  if (!trip || trip.status !== 'in_progress') return state
  const fare = trip.agreedFare ?? trip.suggestedFare
  let next = mapTrip(state, tripId, (t) => ({
    ...t,
    status: 'completed',
    finalFare: fare,
    finishedAt: nowIso(),
  }))
  if (trip.driverId) {
    next = mapDriver(next, trip.driverId, (d) => ({ ...d, available: true }))
    next = setDriverLocation(next, trip.driverId, trip.destination, 'demo')
    const driver = state.drivers.find((d) => d.id === trip.driverId)
    if (driver) {
      next = notify(
        next,
        driver.userId,
        'Viaje completado',
        `Completaste el viaje ${trip.code}. Recibirás $${fare.toLocaleString('es-CO')} (antes de comisión).`,
        'trip',
        trip.id,
      )
    }
  }
  next = notify(
    next,
    trip.passengerId,
    'Viaje finalizado',
    `Llegaste a tu destino. Total del viaje: $${fare.toLocaleString('es-CO')}. Califica a tu conductor.`,
    'trip',
    trip.id,
  )
  next = simLog(next, `Viaje ${trip.code} finalizado · $${fare.toLocaleString('es-CO')}.`, 'trip')
  return next
}

export function rateTripMutation(
  state: CavioState,
  tripId: string,
  score: number,
  comment: string,
): CavioState {
  const trip = state.trips.find((t) => t.id === tripId)
  if (!trip || trip.status !== 'completed' || !trip.driverId) return state
  if (trip.ratingId) return state
  const rating: Rating = {
    id: `rat_${Date.now().toString(36)}`,
    tripId,
    passengerId: trip.passengerId,
    driverId: trip.driverId,
    score: Math.min(5, Math.max(1, score)),
    comment: comment.trim() || undefined,
    createdAt: nowIso(),
  }
  let next: CavioState = {
    ...state,
    ratings: [rating, ...state.ratings],
  }
  next = mapTrip(next, tripId, (t) => ({ ...t, ratingId: rating.id }))
  next = mapDriver(next, trip.driverId, (d) => ({
    ...d,
    rating: Number(((d.rating * d.ratingCount + rating.score) / (d.ratingCount + 1)).toFixed(2)),
    ratingCount: d.ratingCount + 1,
  }))
  const driver = state.drivers.find((d) => d.id === trip.driverId)
  if (driver) {
    next = notify(
      next,
      driver.userId,
      'Nueva calificación',
      `Recibiste ${rating.score} estrellas por el viaje ${trip.code}.`,
      'account',
      tripId,
    )
  }
  return next
}

// ------------------------------------------------------------
// Conductores, usuarios y administración
// ------------------------------------------------------------

export function setDriverApprovalMutation(
  state: CavioState,
  actor: User | undefined,
  driverId: string,
  approval: DriverProfile['approval'],
  note?: string,
): CavioState {
  const driver = state.drivers.find((d) => d.id === driverId)
  if (!driver) return state
  const user = state.users.find((u) => u.id === driver.userId)

  let next = mapDriver(state, driverId, (d) => ({
    ...d,
    approval,
    available: approval === 'approved' ? d.available : false,
    reviewNote: note,
  }))

  if (user) {
    next = {
      ...next,
      users: next.users.map((u) =>
        u.id === user.id
          ? {
              ...u,
              status: approval === 'approved' ? 'active' : approval === 'suspended' ? 'suspended' : u.status,
            }
          : u,
      ),
    }
    next = notify(
      next,
      user.id,
      approval === 'approved'
        ? '¡Tu cuenta fue aprobada!'
        : approval === 'pending'
          ? 'Tu registro está en revisión'
          : approval === 'rejected'
            ? 'Registro rechazado'
            : 'Cuenta suspendida',
      approval === 'approved'
        ? 'Ya puedes activar tu disponibilidad y recibir solicitudes.'
        : note || 'Revisa la documentación de tu perfil o contacta a soporte.',
      'account',
    )
    next = audit(
      next,
      actor,
      approval === 'approved'
        ? 'Conductor aprobado'
        : approval === 'rejected'
          ? 'Conductor rechazado'
          : approval === 'suspended'
            ? 'Conductor suspendido'
            : 'Conductor en revisión',
      `${user.firstName} ${user.lastName} · ${note || 'Cambio de estado de aprobación.'}`,
      'driver',
    )
  }

  if (approval !== 'approved') {
    next = {
      ...next,
      offers: next.offers.map((o) =>
        o.driverId === driverId && o.status === 'pending' ? { ...o, status: 'rejected' } : o,
      ),
    }
    const activeTrip = next.trips.find((t) => t.driverId === driverId && isActiveTrip(t))
    if (activeTrip) {
      next = cancelTripMutation(next, activeTrip.id, 'El conductor ya no está disponible.', 'admin')
    }
  }
  return next
}

export function setUserStatusMutation(
  state: CavioState,
  actor: User | undefined,
  userId: string,
  status: User['status'],
  reason: string,
): CavioState {
  const user = state.users.find((u) => u.id === userId)
  if (!user) return state
  let next: CavioState = {
    ...state,
    users: state.users.map((u) => (u.id === userId ? { ...u, status } : u)),
    drivers: state.drivers.map((d) => {
      if (d.userId !== userId) return d
      return {
        ...d,
        available: status === 'active' ? d.available : false,
        approval:
          status === 'suspended'
            ? 'suspended'
            : d.approval === 'suspended'
              ? 'approved'
              : d.approval,
      }
    }),
  }
  next = notify(
    next,
    userId,
    status === 'suspended' ? 'Cuenta suspendida' : 'Cuenta reactivada',
    reason,
    'account',
  )
  next = audit(
    next,
    actor,
    status === 'suspended' ? 'Cuenta suspendida' : 'Cuenta reactivada',
    `${user.firstName} ${user.lastName} (${user.role === 'passenger' ? 'pasajero' : 'conductor'}) · ${reason}`,
    user.role === 'driver' ? 'driver' : 'passenger',
  )
  const activeTrip = next.trips.find((t) => t.passengerId === userId && isActiveTrip(t))
  if (status === 'suspended' && activeTrip) {
    next = cancelTripMutation(next, activeTrip.id, 'La cuenta del pasajero fue suspendida.', 'admin')
  }
  return next
}

export function setDriverAvailabilityMutation(
  state: CavioState,
  driverId: string,
  available: boolean,
): { state: CavioState; error?: string } {
  const driver = state.drivers.find((d) => d.id === driverId)
  if (!driver) return { state, error: 'No encontramos tu perfil de conductor.' }
  if (available && driver.approval !== 'approved') {
    return { state, error: 'Tu cuenta debe estar aprobada para recibir solicitudes.' }
  }
  const user = state.users.find((u) => u.id === driver.userId)
  if (available && user?.status === 'suspended') {
    return { state, error: 'Tu cuenta está suspendida. Contacta a soporte.' }
  }
  if (available && state.trips.some((t) => t.driverId === driverId && isActiveTrip(t))) {
    return { state, error: 'Termina el viaje activo antes de cambiar tu disponibilidad.' }
  }
  let next = mapDriver(state, driverId, (d) => ({ ...d, available }))
  next = simLog(
    next,
    `Conductor ${available ? 'disponible' : 'desconectado'} para recibir solicitudes.`,
    'driver',
  )
  return { state: next }
}

export function updateDriverDocumentsMutation(
  state: CavioState,
  driverId: string,
  documents: DriverDocument[],
): CavioState {
  return mapDriver(state, driverId, (d) => ({ ...d, documents }))
}

export function updateVehicleMutation(
  state: CavioState,
  driverId: string,
  patch: Partial<Vehicle>,
): CavioState {
  const driver = state.drivers.find((d) => d.id === driverId)
  if (!driver) return state
  return {
    ...state,
    vehicles: state.vehicles.map((v) => (v.id === driver.vehicleId ? { ...v, ...patch } : v)),
  }
}

// ------------------------------------------------------------
// Simulación DEMO
// ------------------------------------------------------------

const OFFER_DELAY_SECONDS = 4
const MAX_PENDING_OFFERS = 3
const ROUTE_TICKS = 30

export function simulationTickMutation(state: CavioState, speed: number): CavioState {
  const ticks = state.simulation.ticks + 1
  let next: CavioState = {
    ...state,
    simulation: { ...state.simulation, ticks, lastTickAt: nowIso() },
  }
  const timers: Record<string, number> = { ...state.simulation.timers }

  // Ofertas automáticas para solicitudes sin conductor
  if (state.settings.autoOffers) {
    const pending = next.trips.filter(
      (t) => (t.status === 'searching' || t.status === 'offers') && !t.driverId,
    )
    for (const trip of pending) {
      const ageSeconds = (Date.now() - new Date(trip.createdAt).getTime()) / 1000
      if (ageSeconds < OFFER_DELAY_SECONDS) continue
      const pendingOffers = next.offers.filter((o) => o.tripId === trip.id && o.status === 'pending')
      if (pendingOffers.length >= MAX_PENDING_OFFERS) continue
      if (ticks % 3 !== 0) continue
      const candidateDrivers = next.drivers.filter(
        (d) =>
          d.approval === 'approved' &&
          d.available &&
          !next.trips.some((t) => t.driverId === d.id && isActiveTrip(t)) &&
          !pendingOffers.some((o) => o.driverId === d.id) &&
          next.vehicles.find((v) => v.id === d.vehicleId)?.category === trip.category,
      )
      if (!candidateDrivers.length) continue
      const driver = candidateDrivers[Math.floor(Math.random() * candidateDrivers.length)]
      const variant = Math.random()
      const amount =
        variant < 0.45
          ? trip.suggestedFare
          : variant < 0.8
            ? Math.round((trip.suggestedFare * (1.03 + Math.random() * 0.12)) / 100) * 100
            : Math.round((trip.suggestedFare * (0.95 + Math.random() * 0.04)) / 100) * 100
      const offer: Offer = {
        id: `off_auto_${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`,
        tripId: trip.id,
        driverId: driver.id,
        amount,
        kind: amount <= trip.suggestedFare ? 'accept' : 'counter',
        status: 'pending',
        createdAt: nowIso(),
        message: amount > trip.suggestedFare ? 'Incluye tiempo de espera en el punto.' : undefined,
      }
      next = { ...next, offers: [offer, ...next.offers] }
      next = mapTrip(next, trip.id, (t) => (t.status === 'searching' ? { ...t, status: 'offers' } : t))
      const driverUser = next.users.find((u) => u.id === driver.userId)
      next = notify(
        next,
        trip.passengerId,
        amount > trip.suggestedFare ? 'Nueva contraoferta' : 'Nueva oferta',
        `${driverUser?.firstName ?? 'Un conductor'} propone $${amount.toLocaleString('es-CO')} para tu viaje ${trip.code}.`,
        'offer',
        trip.id,
      )
      next = simLog(
        next,
        `Oferta automática de ${driverUser?.firstName ?? 'conductor'} en ${trip.code} · $${amount.toLocaleString('es-CO')}.`,
        'offer',
      )
    }
  }

  // Movimiento de conductores y avance automático de estados
  if (state.simulation.autoAdvance) {
    for (const trip of next.trips) {
      if (!trip.driverId || !isActiveTrip(trip)) continue
      const driver = next.drivers.find((d) => d.id === trip.driverId)
      if (!driver) continue
      const timer = (timers[trip.id] ?? 0) + speed
      timers[trip.id] = timer

      if (trip.status === 'assigned') {
        if (timer >= 2) next = advanceTripMutation(next, trip.id)
      } else if (trip.status === 'arriving') {
        const distance = haversineKm(driver.location, trip.origin)
        const step = 0.22 * speed
        const nextLocation = moveTowards(driver.location, trip.origin, step)
        next = setDriverLocation(next, driver.id, distance <= step ? trip.origin : nextLocation, 'demo')
        if (distance <= step + 0.03) {
          next = advanceTripMutation(next, trip.id)
          timers[trip.id] = 0
        }
      } else if (trip.status === 'arrived') {
        if (timer >= 3) {
          next = advanceTripMutation(next, trip.id)
          timers[trip.id] = 0
        }
      } else if (trip.status === 'in_progress') {
        const progress = Math.min(1, timer / ROUTE_TICKS)
        const route = trip.route ?? syntheticRoute(trip.origin, trip.destination, 28)
        next = setDriverLocation(next, driver.id, pointAlongRoute(route, progress), 'demo')
        if (progress >= 1) {
          next = completeTripMutation(next, trip.id)
          delete timers[trip.id]
        }
      }
    }
  }

  next = { ...next, simulation: { ...next.simulation, timers } }
  return next
}
