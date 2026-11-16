// ============================================================
// CAVIO — Modelos de dominio
// ============================================================

export type Role = 'passenger' | 'driver' | 'admin'

export type UserStatus = 'active' | 'suspended'

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'suspended'

export type VehicleCategoryId = 'economy' | 'comfort' | 'xl' | 'moto'

export type TripStatus =
  | 'created'
  | 'searching'
  | 'offers'
  | 'assigned'
  | 'arriving'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'expired'

export type PaymentMethod = 'cash' | 'card' | 'nequi' | 'daviplata'

export interface LatLng {
  lat: number
  lng: number
}

export interface Place extends LatLng {
  label: string
  address?: string
}

export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  documentType: 'CC' | 'CE' | 'PAS'
  documentNumber: string
  role: Role
  status: UserStatus
  createdAt: string
  photoUrl?: string
  city: string
}

export interface Vehicle {
  id: string
  driverId: string
  category: VehicleCategoryId
  brand: string
  model: string
  year: number
  color: string
  plate: string
  capacity: number
}

export type DocumentKind =
  | 'licencia'
  | 'soat'
  | 'tecnomecanica'
  | 'tarjeta_propiedad'
  | 'antecedentes'

export interface DriverDocument {
  id: string
  kind: DocumentKind
  name: string
  status: 'cargado' | 'pendiente'
  uploadedAt?: string
  fileName?: string
}

export interface DriverProfile {
  id: string
  userId: string
  approval: ApprovalStatus
  available: boolean
  rating: number
  ratingCount: number
  vehicleId: string
  licenseNumber: string
  licenseCategory: string
  licenseExpiry: string
  documents: DriverDocument[]
  location: LatLng
  lastLocationAt: string
  locationSource: 'gps' | 'demo'
  reviewNote?: string
  createdAt: string
}

export interface Offer {
  id: string
  tripId: string
  driverId: string
  amount: number
  kind: 'accept' | 'counter'
  status: OfferStatus
  createdAt: string
  message?: string
}

export interface Rating {
  id: string
  tripId: string
  passengerId: string
  driverId: string
  score: number
  comment?: string
  createdAt: string
}

export interface AuditEntry {
  id: string
  actorId: string
  actorName: string
  action: string
  description: string
  type: 'driver' | 'passenger' | 'trip' | 'settings' | 'finance' | 'auth' | 'system'
  createdAt: string
}

export interface Trip {
  id: string
  code: string
  passengerId: string
  driverId?: string
  origin: Place
  destination: Place
  category: VehicleCategoryId
  suggestedFare: number
  agreedFare?: number
  finalFare?: number
  distanceKm: number
  durationMin: number
  status: TripStatus
  paymentMethod: PaymentMethod
  createdAt: string
  assignedAt?: string
  startedAt?: string
  finishedAt?: string
  cancelledAt?: string
  cancelReason?: string
  route?: LatLng[]
  ratingId?: string
  simulated?: boolean
}

export interface CategoryConfig {
  id: VehicleCategoryId
  name: string
  description: string
  capacity: number
  baseFare: number
  perKm: number
  perMin: number
  minFare: number
  etaMin: number
  icon: string
  color: string
}

export interface AppSettings {
  city: string
  center: LatLng
  currency: 'COP'
  commissionPct: number
  categories: CategoryConfig[]
  cancelFee: number
  demoMode: boolean
  autoOffers: boolean
  simulationSpeed: number
  useRealLocation: boolean
  supportPhone: string
  supportEmail: string
}

export interface Session {
  userId: string
  role: Role
  loginAt: string
  demo: boolean
}

export interface SimulationState {
  running: boolean
  autoAdvance: boolean
  speed: number
  ticks: number
  lastTickAt: string | null
  timers: Record<string, number>
  log: SimulationLogEntry[]
}

export interface SimulationLogEntry {
  id: string
  at: string
  message: string
  kind: 'info' | 'trip' | 'offer' | 'driver' | 'system'
}

export interface AppNotification {
  id: string
  userId: string
  title: string
  message: string
  createdAt: string
  read: boolean
  tripId?: string
  kind: 'trip' | 'offer' | 'account' | 'system'
}

export interface CavioState {
  version: number
  users: User[]
  drivers: DriverProfile[]
  vehicles: Vehicle[]
  trips: Trip[]
  offers: Offer[]
  ratings: Rating[]
  audit: AuditEntry[]
  settings: AppSettings
  session: Session | null
  simulation: SimulationState
  notifications: AppNotification[]
}

// ============================================================
// Vistas derivadas
// ============================================================

export interface DriverStats {
  today: number
  week: number
  month: number
  total: number
  completed: number
  cancelled: number
  totalTrips: number
  averageFare: number
  commissionPct: number
  netEarnings: number
}

export interface AdminMetrics {
  passengers: number
  drivers: number
  activeDrivers: number
  onlineDrivers: number
  pendingDrivers: number
  suspendedUsers: number
  trips: number
  completedTrips: number
  activeTrips: number
  cancelledTrips: number
  gmv: number
  platformRevenue: number
  driverEarnings: number
  pendingRequests: number
  averageTicket: number
  completionRate: number
  cancellationRate: number
  dailySeries: { date: string; label: string; trips: number; completed: number; cancelled: number; gmv: number; revenue: number }[]
  categoryDistribution: { category: VehicleCategoryId; name: string; count: number; color: string }[]
  statusDistribution: { status: TripStatus; label: string; count: number; color: string }[]
}
