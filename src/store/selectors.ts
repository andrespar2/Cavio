import type {
  AdminMetrics,
  AppNotification,
  CategoryConfig,
  CavioState,
  DriverProfile,
  DriverStats,
  Offer,
  Trip,
  TripStatus,
  User,
  Vehicle,
  VehicleCategoryId,
} from '../types'
import { isThisMonth, isToday, isWithinDays } from '../lib/utils'
import { TRIP_STATUS_LABEL } from '../lib/format'

// ============================================================
// CAVIO — Selectores y métricas derivadas
// ============================================================

export function getUser(state: CavioState, userId: string | undefined): User | undefined {
  if (!userId) return undefined
  return state.users.find((u) => u.id === userId)
}

export function getDriver(state: CavioState, driverId: string | undefined): DriverProfile | undefined {
  if (!driverId) return undefined
  return state.drivers.find((d) => d.id === driverId)
}

export function getDriverByUserId(state: CavioState, userId: string | undefined): DriverProfile | undefined {
  if (!userId) return undefined
  return state.drivers.find((d) => d.userId === userId)
}

export function getVehicle(state: CavioState, vehicleId: string | undefined): Vehicle | undefined {
  if (!vehicleId) return undefined
  return state.vehicles.find((v) => v.id === vehicleId)
}

export function getDriverVehicle(state: CavioState, driverId: string): Vehicle | undefined {
  const driver = getDriver(state, driverId)
  return driver ? getVehicle(state, driver.vehicleId) : undefined
}

export function getTrip(state: CavioState, tripId: string | undefined): Trip | undefined {
  if (!tripId) return undefined
  return state.trips.find((t) => t.id === tripId)
}

export function getOffersForTrip(state: CavioState, tripId: string): Offer[] {
  return state.offers
    .filter((o) => o.tripId === tripId && o.status === 'pending')
    .sort((a, b) => a.amount - b.amount)
}

export function getTripsForPassenger(state: CavioState, passengerId: string): Trip[] {
  return state.trips
    .filter((t) => t.passengerId === passengerId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function getTripsForDriver(state: CavioState, driverId: string): Trip[] {
  return state.trips
    .filter((t) => t.driverId === driverId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export const ACTIVE_STATUSES: TripStatus[] = [
  'created',
  'searching',
  'offers',
  'assigned',
  'arriving',
  'arrived',
  'in_progress',
]

export function isActiveTrip(trip: Trip): boolean {
  return ACTIVE_STATUSES.includes(trip.status)
}

export function getActiveTripForPassenger(state: CavioState, passengerId: string): Trip | undefined {
  return state.trips
    .filter((t) => t.passengerId === passengerId && isActiveTrip(t))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
}

export function getActiveTripForDriver(state: CavioState, driverId: string): Trip | undefined {
  return state.trips.find((t) => t.driverId === driverId && isActiveTrip(t))
}

export function getPendingRequestsForDriver(state: CavioState, driverId: string): Trip[] {
  const driver = getDriver(state, driverId)
  if (!driver) return []
  const vehicle = getVehicle(state, driver.vehicleId)
  return state.trips
    .filter(
      (t) =>
        (t.status === 'searching' || t.status === 'offers' || t.status === 'created') &&
        !t.driverId &&
        t.passengerId !== driver.userId &&
        (!vehicle || t.category === vehicle.category),
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function getCategory(state: CavioState, id: VehicleCategoryId): CategoryConfig {
  return state.settings.categories.find((c) => c.id === id) ?? state.settings.categories[0]
}

export function getDriverStats(state: CavioState, driverId: string): DriverStats {
  const trips = getTripsForDriver(state, driverId)
  const completed = trips.filter((t) => t.status === 'completed')
  const cancelled = trips.filter((t) => t.status === 'cancelled')
  const commissionPct = state.settings.commissionPct
  const net = (t: Trip) => ((t.finalFare ?? t.agreedFare ?? 0) * (100 - commissionPct)) / 100

  const sumWhere = (list: Trip[], predicate: (t: Trip) => boolean) =>
    list.filter(predicate).reduce((acc, t) => acc + net(t), 0)

  const grossTotal = completed.reduce((acc, t) => acc + (t.finalFare ?? t.agreedFare ?? 0), 0)

  return {
    today: sumWhere(completed, (t) => isToday(t.finishedAt ?? t.createdAt)),
    week: sumWhere(completed, (t) => isWithinDays(t.finishedAt ?? t.createdAt, 7)),
    month: sumWhere(completed, (t) => isThisMonth(t.finishedAt ?? t.createdAt)),
    total: completed.reduce((acc, t) => acc + net(t), 0),
    completed: completed.length,
    cancelled: cancelled.length,
    totalTrips: trips.length,
    averageFare: completed.length ? grossTotal / completed.length : 0,
    commissionPct,
    netEarnings: completed.reduce((acc, t) => acc + net(t), 0),
  }
}

export function getAdminMetrics(state: CavioState): AdminMetrics {
  const passengers = state.users.filter((u) => u.role === 'passenger')
  const driverUsers = state.users.filter((u) => u.role === 'driver')
  const drivers = state.drivers
  const activeDrivers = drivers.filter((d) => d.approval === 'approved')
  const onlineDrivers = drivers.filter(
    (d) => d.approval === 'approved' && d.available && !getActiveTripForDriver(state, d.id),
  )
  const pendingDrivers = drivers.filter((d) => d.approval === 'pending')
  const suspendedUsers = state.users.filter((u) => u.status === 'suspended')
  const completed = state.trips.filter((t) => t.status === 'completed')
  const cancelled = state.trips.filter((t) => t.status === 'cancelled')
  const activeTrips = state.trips.filter(isActiveTrip)
  const gmv = completed.reduce((acc, t) => acc + (t.finalFare ?? t.agreedFare ?? 0), 0)
  const platformRevenue = (gmv * state.settings.commissionPct) / 100

  const days = 14
  const dailySeries: AdminMetrics['dailySeries'] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const next = new Date(d)
    next.setDate(next.getDate() + 1)
    const inRange = state.trips.filter((t) => {
      const ts = new Date(t.createdAt).getTime()
      return ts >= d.getTime() && ts < next.getTime()
    })
    const done = inRange.filter((t) => t.status === 'completed')
    const gmvDay = done.reduce((acc, t) => acc + (t.finalFare ?? t.agreedFare ?? 0), 0)
    dailySeries.push({
      date: d.toISOString(),
      label: new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short' }).format(d),
      trips: inRange.length,
      completed: done.length,
      cancelled: inRange.filter((t) => t.status === 'cancelled').length,
      gmv: gmvDay,
      revenue: (gmvDay * state.settings.commissionPct) / 100,
    })
  }

  const categoryDistribution = state.settings.categories.map((c) => ({
    category: c.id,
    name: c.name.replace('CAVIO ', ''),
    count: state.trips.filter((t) => t.category === c.id).length,
    color: c.color,
  }))

  const statusOrder: TripStatus[] = [
    'searching',
    'offers',
    'assigned',
    'arriving',
    'arrived',
    'in_progress',
    'completed',
    'cancelled',
  ]
  const statusColors: Record<TripStatus, string> = {
    created: '#777777',
    searching: '#FFC46B',
    offers: '#C6F36B',
    assigned: '#8FD3FF',
    arriving: '#8FD3FF',
    arrived: '#5BC0EB',
    in_progress: '#9B8CFF',
    completed: '#C6F36B',
    cancelled: '#FF6B6B',
  }
  const statusDistribution = statusOrder
    .map((status) => ({
      status,
      label: TRIP_STATUS_LABEL[status],
      count: state.trips.filter((t) => t.status === status).length,
      color: statusColors[status],
    }))
    .filter((s) => s.count > 0)

  return {
    passengers: passengers.length,
    drivers: driverUsers.length,
    activeDrivers: activeDrivers.length,
    onlineDrivers: onlineDrivers.length,
    pendingDrivers: pendingDrivers.length,
    suspendedUsers: suspendedUsers.length,
    trips: state.trips.length,
    completedTrips: completed.length,
    activeTrips: activeTrips.length,
    cancelledTrips: cancelled.length,
    gmv,
    platformRevenue,
    driverEarnings: gmv - platformRevenue,
    pendingRequests: state.trips.filter((t) => t.status === 'searching' || t.status === 'offers').length,
    averageTicket: completed.length ? gmv / completed.length : 0,
    completionRate: state.trips.length ? (completed.length / state.trips.length) * 100 : 0,
    cancellationRate: state.trips.length ? (cancelled.length / state.trips.length) * 100 : 0,
    dailySeries,
    categoryDistribution,
    statusDistribution,
  }
}

export function getNotificationsForUser(state: CavioState, userId: string): AppNotification[] {
  return state.notifications
    .filter((n) => n.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function userDisplayName(state: CavioState, userId: string | undefined): string {
  const user = getUser(state, userId)
  return user ? `${user.firstName} ${user.lastName}` : 'Usuario'
}
