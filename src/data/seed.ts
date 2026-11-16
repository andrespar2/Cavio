import type {
  AppNotification,
  AuditEntry,
  CavioState,
  DriverDocument,
  DriverProfile,
  Offer,
  Rating,
  Trip,
  User,
  Vehicle,
} from '../types'
import { BOGOTA_CENTER, BOGOTA_PLACES, CATEGORY_DEFAULTS } from './places'
import { CATEGORY_NAMES, fullName } from '../lib/format'
import { estimateDurationMin, estimateFare, estimateRoadKm, syntheticRoute } from '../lib/geo'
import { mulberry32, pick, uid } from '../lib/utils'

// ============================================================
// CAVIO — Datos DEMO deterministas
// 20 pasajeros · 15 conductores · 40 viajes · ofertas, calificaciones y auditoría
// ============================================================

export const DEMO_EMAILS = {
  passenger: 'pasajero@cavio.co',
  driver: 'conductor@cavio.co',
  admin: 'admin@cavio.co',
} as const

export const DEMO_PASSWORD = 'cavio123'

const PASSENGER_NAMES: [string, string][] = [
  ['Camila', 'Restrepo'],
  ['Juan Pablo', 'Gómez'],
  ['Laura', 'Martínez'],
  ['Santiago', 'Rodríguez'],
  ['Valentina', 'López'],
  ['Andrés Felipe', 'Cárdenas'],
  ['Mariana', 'Torres'],
  ['Sebastián', 'Herrera'],
  ['Daniela', 'Vargas'],
  ['Felipe', 'Castillo'],
  ['Isabella', 'Moreno'],
  ['Mateo', 'Jiménez'],
  ['Sofía', 'Ramírez'],
  ['Nicolás', 'Suárez'],
  ['Gabriela', 'Ortiz'],
  ['Alejandro', 'Peña'],
  ['Manuela', 'Castro'],
  ['David', 'Rojas'],
  ['Carolina', 'Mendoza'],
  ['Julián', 'Navarro'],
]

const DRIVER_NAMES: [string, string][] = [
  ['Andrés', 'Molina'],
  ['Carlos', 'Pérez'],
  ['Jorge', 'Ramírez'],
  ['Luis Fernando', 'García'],
  ['Diego', 'Hernández'],
  ['Mauricio', 'Silva'],
  ['Óscar', 'Guerrero'],
  ['Ricardo', 'Vega'],
  ['Héctor', 'Salazar'],
  ['Fabio', 'Quintero'],
  ['Wilson', 'Duarte'],
  ['Édgar', 'Bermúdez'],
  ['Alexis', 'Cuellar'],
  ['Ramiro', 'Espitia'],
  ['Gonzalo', 'Pineda'],
]

const BRANDS: Record<string, { brand: string; model: string; colors: string[] }[]> = {
  economy: [
    { brand: 'Chevrolet', model: 'Spark GT', colors: ['Blanco', 'Rojo', 'Gris plata'] },
    { brand: 'Renault', model: 'Logan', colors: ['Blanco', 'Gris oscuro'] },
    { brand: 'Kia', model: 'Picanto', colors: ['Rojo', 'Blanco'] },
    { brand: 'Hyundai', model: 'Accent', colors: ['Gris plata', 'Negro'] },
  ],
  comfort: [
    { brand: 'Mazda', model: 'Mazda 2', colors: ['Azul', 'Gris'] },
    { brand: 'Chevrolet', model: 'Onix', colors: ['Blanco', 'Negro'] },
    { brand: 'Nissan', model: 'Versa', colors: ['Gris plata', 'Azul'] },
    { brand: 'Kia', model: 'Rio', colors: ['Rojo', 'Blanco'] },
  ],
  xl: [
    { brand: 'Toyota', model: 'Innova', colors: ['Gris plata', 'Blanco'] },
    { brand: 'Chevrolet', model: 'Spin', colors: ['Blanco', 'Gris'] },
    { brand: 'Renault', model: 'Duster', colors: ['Naranja', 'Gris'] },
  ],
  moto: [
    { brand: 'Bajaj', model: 'Boxer CT', colors: ['Negro', 'Rojo'] },
    { brand: 'Yamaha', model: 'FZ 2.0', colors: ['Azul', 'Negro'] },
  ],
}

const CATEGORY_POOL: ('economy' | 'comfort' | 'xl' | 'moto')[] = [
  'economy',
  'economy',
  'economy',
  'economy',
  'economy',
  'comfort',
  'comfort',
  'comfort',
  'comfort',
  'xl',
  'xl',
  'xl',
  'moto',
  'moto',
  'economy',
]

const PLATE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'

function plate(rand: () => number): string {
  const l = () => PLATE_LETTERS[Math.floor(rand() * PLATE_LETTERS.length)]
  const d = () => Math.floor(rand() * 10)
  return `${l()}${l()}${l()}${d()}${d()}${d()}`
}

function phone(rand: () => number): string {
  const prefix = pick(rand, ['300', '301', '310', '312', '315', '320', '321', '350'])
  const rest = String(Math.floor(rand() * 10_000_000)).padStart(7, '0')
  return `+57 ${prefix} ${rest.slice(0, 3)} ${rest.slice(3)}`
}

function documentNumber(rand: () => number): string {
  return String(1_000_000_000 + Math.floor(rand() * 100_000_000))
}

function ago(days: number, hours = 0): string {
  return new Date(Date.now() - days * 86400000 - hours * 3600000).toISOString()
}

function makeDocuments(rand: () => number, approved: boolean): DriverDocument[] {
  const base: { kind: DriverDocument['kind']; name: string }[] = [
    { kind: 'licencia', name: 'Licencia de conducción' },
    { kind: 'soat', name: 'SOAT vigente' },
    { kind: 'tecnomecanica', name: 'Revisión tecnomecánica' },
    { kind: 'tarjeta_propiedad', name: 'Tarjeta de propiedad' },
    { kind: 'antecedentes', name: 'Certificado de antecedentes' },
  ]
  return base.map((doc) => ({
    id: uid('doc'),
    kind: doc.kind,
    name: doc.name,
    status: approved || rand() > 0.5 ? 'cargado' : 'pendiente',
    uploadedAt: ago(Math.floor(rand() * 30) + 2, Math.floor(rand() * 10)),
    fileName: `${doc.kind}-demo.pdf`,
  }))
}

function buildSeed(): CavioState {
  const rand = mulberry32(20261116)
  const users: User[] = []
  const drivers: DriverProfile[] = []
  const vehicles: Vehicle[] = []
  const trips: Trip[] = []
  const offers: Offer[] = []
  const ratings: Rating[] = []
  const audit: AuditEntry[] = []
  const notifications: AppNotification[] = []

  // ---------- Administrador ----------
  const admin: User = {
    id: 'usr_admin',
    firstName: 'Valeria',
    lastName: 'Cárdenas',
    email: DEMO_EMAILS.admin,
    phone: '+57 320 555 0199',
    documentType: 'CC',
    documentNumber: '1018455322',
    role: 'admin',
    status: 'active',
    createdAt: ago(180),
    city: 'Bogotá',
  }
  users.push(admin)

  // ---------- Pasajeros ----------
  const passengerIds: string[] = []
  PASSENGER_NAMES.forEach(([firstName, lastName], i) => {
    const id = i === 0 ? 'usr_passenger_demo' : `usr_p${String(i + 1).padStart(2, '0')}`
    const created = ago(2 + Math.floor(rand() * 150))
    users.push({
      id,
      firstName,
      lastName,
      email: i === 0 ? DEMO_EMAILS.passenger : `${firstName.toLowerCase().replace(/\s+/g, '.')}.${lastName.toLowerCase().replace(/\s+/g, '')}@example.com`,
      phone: phone(rand),
      documentType: 'CC',
      documentNumber: documentNumber(rand),
      role: 'passenger',
      status: i === 17 ? 'suspended' : 'active',
      createdAt: created,
      city: 'Bogotá',
    })
    passengerIds.push(id)
  })

  // ---------- Conductores ----------
  const approvedStatuses: ('approved' | 'pending' | 'rejected' | 'suspended')[] = [
    'approved', 'approved', 'approved', 'approved', 'approved', 'approved',
    'approved', 'approved', 'approved', 'approved', 'approved', 'approved',
    'pending', 'rejected', 'suspended',
  ]

  DRIVER_NAMES.forEach(([firstName, lastName], i) => {
    const userId = i === 0 ? 'usr_driver_demo' : `usr_d${String(i + 1).padStart(2, '0')}`
    const category = CATEGORY_POOL[i]
    const brandInfo = pick(rand, BRANDS[category])
    const approval = approvedStatuses[i]
    const isDemo = i === 0

    users.push({
      id: userId,
      firstName,
      lastName,
      email: isDemo
        ? DEMO_EMAILS.driver
        : `${firstName.toLowerCase().replace(/\s+/g, '.')}.${lastName.toLowerCase().replace(/\s+/g, '')}@example.com`,
      phone: phone(rand),
      documentType: 'CC',
      documentNumber: documentNumber(rand),
      role: 'driver',
      status: approval === 'suspended' ? 'suspended' : 'active',
      createdAt: ago(10 + Math.floor(rand() * 200)),
      city: 'Bogotá',
    })

    const vehicle: Vehicle = {
      id: `veh_${String(i + 1).padStart(2, '0')}`,
      driverId: userId,
      category,
      brand: isDemo ? 'Chevrolet' : brandInfo.brand,
      model: isDemo ? 'Onix' : brandInfo.model,
      year: 2016 + Math.floor(rand() * 8),
      color: isDemo ? 'Gris plata' : pick(rand, brandInfo.colors),
      plate: isDemo ? 'CAV123' : plate(rand),
      capacity: CATEGORY_DEFAULTS.find((c) => c.id === category)?.capacity ?? 4,
    }
    vehicles.push(vehicle)

    const approved = approval === 'approved'
    const location = isDemo
      ? { lat: 4.6621, lng: -74.0578 }
      : {
          lat: BOGOTA_CENTER.lat + (rand() - 0.5) * 0.12,
          lng: BOGOTA_CENTER.lng + (rand() - 0.5) * 0.14,
        }

    drivers.push({
      id: `drv_${String(i + 1).padStart(2, '0')}`,
      userId,
      approval,
      available: approved && (isDemo ? true : i < 7),
      rating: Number((4.55 + rand() * 0.45).toFixed(2)),
      ratingCount: 24 + Math.floor(rand() * 380),
      vehicleId: vehicle.id,
      licenseNumber: `LC-${Math.floor(rand() * 9000000 + 1000000)}`,
      licenseCategory: category === 'moto' ? 'A2' : 'B1',
      licenseExpiry: new Date(Date.now() + (120 + Math.floor(rand() * 900)) * 86400000).toISOString(),
      documents: makeDocuments(rand, approved),
      location,
      lastLocationAt: ago(0, 1),
      locationSource: 'demo',
      reviewNote: approval === 'rejected' ? 'Documentación del vehículo incompleta.' : undefined,
      createdAt: ago(12 + Math.floor(rand() * 200)),
    })
  })

  const approvedDriverIds = drivers.filter((d) => d.approval === 'approved').map((d) => d.id)
  const categoryOfDriver = (driverId: string) =>
    vehicles.find((v) => v.driverId === drivers.find((d) => d.id === driverId)!.userId)?.category ??
    'economy'

  // ---------- Viajes históricos ----------
  const HISTORY_COUNT = 36
  for (let i = 0; i < HISTORY_COUNT; i++) {
    const isDemoPassengerTrip = i < 6
    const passengerId = isDemoPassengerTrip ? 'usr_passenger_demo' : pick(rand, passengerIds.slice(1))
    const driverId = pick(rand, approvedDriverIds)
    const category = categoryOfDriver(driverId)
    const origin = pick(rand, BOGOTA_PLACES)
    let destination = pick(rand, BOGOTA_PLACES)
    while (destination.label === origin.label) destination = pick(rand, BOGOTA_PLACES)
    const distanceKm = Number(estimateRoadKm(origin, destination).toFixed(1))
    const durationMin = estimateDurationMin(distanceKm)
    const categoryConfig = CATEGORY_DEFAULTS.find((c) => c.id === category)!
    const suggestedFare = estimateFare(categoryConfig, distanceKm, durationMin)
    const days = isDemoPassengerTrip ? i + 1 : Math.floor(rand() * 21)
    const hours = Math.floor(rand() * 12)
    const createdAt = ago(days, hours)
    const cancelled = !isDemoPassengerTrip && rand() < 0.14
    const fare = suggestedFare + (rand() < 0.3 ? Math.round((rand() * 3000 - 1000) / 100) * 100 : 0)
    const status = cancelled ? 'cancelled' : 'completed'
    const finished = new Date(new Date(createdAt).getTime() + durationMin * 60000)
    const trip: Trip = {
      id: `trip_hist_${String(i + 1).padStart(2, '0')}`,
      code: `CV-${String(4820 + i)}`,
      passengerId,
      driverId,
      origin,
      destination,
      category,
      suggestedFare,
      agreedFare: cancelled ? undefined : Math.max(3000, fare),
      finalFare: cancelled ? undefined : Math.max(3000, fare),
      distanceKm,
      durationMin,
      status,
      paymentMethod: pick(rand, ['cash', 'card', 'nequi', 'daviplata'] as const),
      createdAt,
      assignedAt: createdAt,
      startedAt: new Date(new Date(createdAt).getTime() + 4 * 60000).toISOString(),
      finishedAt: cancelled ? undefined : finished.toISOString(),
      cancelledAt: cancelled ? new Date(new Date(createdAt).getTime() + 6 * 60000).toISOString() : undefined,
      cancelReason: cancelled ? 'El pasajero canceló la solicitud.' : undefined,
      route: syntheticRoute(origin, destination, 12),
    }
    trips.push(trip)

    if (status === 'completed') {
      const rating: Rating = {
        id: `rat_${String(i + 1).padStart(2, '0')}`,
        tripId: trip.id,
        passengerId,
        driverId,
        score: rand() < 0.82 ? 5 : rand() < 0.7 ? 4 : 3,
        comment:
          rand() < 0.45
            ? pick(rand, [
                'Excelente servicio, muy amable.',
                'Llegó rápido y el carro estaba impecable.',
                'Muy buena conversación y manejo seguro.',
                'Todo bien, gracias.',
                'Puntual y respetuoso.',
              ])
            : undefined,
        createdAt: finished.toISOString(),
      }
      ratings.push(rating)
      trip.ratingId = rating.id
    }
  }

  // ---------- Viajes activos ----------
  const active1Driver = approvedDriverIds[1]
  const active1Origin = BOGOTA_PLACES[3]
  const active1Dest = BOGOTA_PLACES[16]
  const active1Distance = Number(estimateRoadKm(active1Origin, active1Dest).toFixed(1))
  const active1Duration = estimateDurationMin(active1Distance)
  const active1Fare = estimateFare(
    CATEGORY_DEFAULTS.find((c) => c.id === categoryOfDriver(active1Driver))!,
    active1Distance,
    active1Duration,
  )
  const activeTripStart = new Date(Date.now() - 9 * 60000).toISOString()
  trips.push({
    id: 'trip_active_01',
    code: 'CV-4901',
    passengerId: passengerIds[4],
    driverId: active1Driver,
    origin: active1Origin,
    destination: active1Dest,
    category: categoryOfDriver(active1Driver),
    suggestedFare: active1Fare,
    agreedFare: active1Fare,
    distanceKm: active1Distance,
    durationMin: active1Duration,
    status: 'in_progress',
    paymentMethod: 'cash',
    createdAt: new Date(Date.now() - 22 * 60000).toISOString(),
    assignedAt: new Date(Date.now() - 20 * 60000).toISOString(),
    startedAt: activeTripStart,
    route: syntheticRoute(active1Origin, active1Dest, 20),
    simulated: true,
  })

  const active2Driver = approvedDriverIds[2]
  const active2Origin = BOGOTA_PLACES[6]
  const active2Dest = BOGOTA_PLACES[1]
  const active2Distance = Number(estimateRoadKm(active2Origin, active2Dest).toFixed(1))
  const active2Duration = estimateDurationMin(active2Distance)
  const active2Fare = estimateFare(
    CATEGORY_DEFAULTS.find((c) => c.id === categoryOfDriver(active2Driver))!,
    active2Distance,
    active2Duration,
  )
  trips.push({
    id: 'trip_active_02',
    code: 'CV-4902',
    passengerId: passengerIds[7],
    driverId: active2Driver,
    origin: active2Origin,
    destination: active2Dest,
    category: categoryOfDriver(active2Driver),
    suggestedFare: active2Fare,
    agreedFare: active2Fare + 1200,
    distanceKm: active2Distance,
    durationMin: active2Duration,
    status: 'arriving',
    paymentMethod: 'nequi',
    createdAt: new Date(Date.now() - 8 * 60000).toISOString(),
    assignedAt: new Date(Date.now() - 6 * 60000).toISOString(),
    route: syntheticRoute(active2Origin, active2Dest, 20),
    simulated: true,
  })

  // ---------- Solicitudes pendientes ----------
  const pendingSpecs = [
    { passenger: passengerIds[2], origin: BOGOTA_PLACES[4], dest: BOGOTA_PLACES[0], category: 'economy' as const, status: 'offers' as const, minutes: 4 },
    { passenger: passengerIds[9], origin: BOGOTA_PLACES[24], dest: BOGOTA_PLACES[15], category: 'economy' as const, status: 'searching' as const, minutes: 2 },
  ]
  pendingSpecs.forEach((spec, idx) => {
    const distanceKm = Number(estimateRoadKm(spec.origin, spec.dest).toFixed(1))
    const durationMin = estimateDurationMin(distanceKm)
    const cfg = CATEGORY_DEFAULTS.find((c) => c.id === spec.category)!
    trips.push({
      id: `trip_pending_${idx + 1}`,
      code: `CV-${4910 + idx}`,
      passengerId: spec.passenger,
      origin: spec.origin,
      destination: spec.dest,
      category: spec.category,
      suggestedFare: estimateFare(cfg, distanceKm, durationMin),
      distanceKm,
      durationMin,
      status: spec.status,
      paymentMethod: 'cash',
      createdAt: new Date(Date.now() - spec.minutes * 60000).toISOString(),
      simulated: true,
    })
  })

  // Ofertas sobre la solicitud con estado "offers"
  const offerDrivers = approvedDriverIds.slice(3, 6)
  offerDrivers.forEach((driverId, idx) => {
    const pendingTrip = trips.find((t) => t.id === 'trip_pending_1')!
    offers.push({
      id: `off_${idx + 1}`,
      tripId: pendingTrip.id,
      driverId,
      amount: pendingTrip.suggestedFare + (idx === 1 ? 2000 : idx === 2 ? 1500 : 0),
      kind: idx === 0 ? 'accept' : 'counter',
      status: 'pending',
      createdAt: new Date(Date.now() - (3 - idx) * 60000).toISOString(),
      message: idx === 1 ? 'Estoy a 5 minutos del punto de recogida.' : undefined,
    })
  })

  // Oferta del conductor demo sobre la segunda solicitud (para que vea el flujo)
  const pendingTrip2 = trips.find((t) => t.id === 'trip_pending_2')!
  offers.push({
    id: 'off_demo_pending',
    tripId: pendingTrip2.id,
    driverId: 'drv_01',
    amount: pendingTrip2.suggestedFare,
    kind: 'accept',
    status: 'pending',
    createdAt: new Date(Date.now() - 40000).toISOString(),
  })
  pendingTrip2.status = 'offers'

  // ---------- Auditoría ----------
  const auditSpecs: { action: string; description: string; type: AuditEntry['type']; days: number }[] = [
    { action: 'Conductor aprobado', description: `Se aprobó el registro de ${fullName(DRIVER_NAMES[1][0], DRIVER_NAMES[1][1])}.`, type: 'driver', days: 1 },
    { action: 'Configuración actualizada', description: 'Se actualizó la comisión de la plataforma al 18%.', type: 'settings', days: 2 },
    { action: 'Conductor suspendido', description: `Se suspendió a ${fullName(DRIVER_NAMES[14][0], DRIVER_NAMES[14][1])} por documentos vencidos.`, type: 'driver', days: 3 },
    { action: 'Pasajero suspendido', description: 'Se suspendió una cuenta de pasajero por reportes reiterados.', type: 'passenger', days: 5 },
    { action: 'Conductor rechazado', description: `Se rechazó el registro de ${fullName(DRIVER_NAMES[13][0], DRIVER_NAMES[13][1])}: falta la tecnomecánica.`, type: 'driver', days: 6 },
    { action: 'Tarifas actualizadas', description: 'Se ajustó la tarifa base de CAVIO Economy a $3.500.', type: 'settings', days: 8 },
    { action: 'Viaje cancelado', description: 'Se registró la cancelación del viaje CV-4851 por parte del pasajero.', type: 'trip', days: 9 },
    { action: 'Conductor aprobado', description: 'Se aprobó el registro de un nuevo conductor de CAVIO XL.', type: 'driver', days: 12 },
    { action: 'Comisión revisada', description: 'Revisión mensual de la comisión de la plataforma.', type: 'finance', days: 20 },
  ]
  auditSpecs.forEach((spec, idx) => {
    audit.push({
      id: `aud_seed_${idx}`,
      actorId: admin.id,
      actorName: fullName(admin.firstName, admin.lastName),
      action: spec.action,
      description: spec.description,
      type: spec.type,
      createdAt: ago(spec.days, idx + 1),
    })
  })

  // ---------- Notificaciones ----------
  notifications.push(
    {
      id: 'notif_1',
      userId: 'usr_passenger_demo',
      title: 'Bienvenida a CAVIO',
      message: 'Explora los viajes DEMO y descubre cómo funciona la negociación de tarifas.',
      createdAt: ago(0, 2),
      read: false,
      kind: 'system',
    },
    {
      id: 'notif_2',
      userId: 'usr_driver_demo',
      title: 'Conductor aprobado',
      message: 'Tu cuenta ya está habilitada. Activa tu disponibilidad para recibir solicitudes.',
      createdAt: ago(1, 4),
      read: false,
      kind: 'account',
    },
  )

  return {
    version: 1,
    users,
    drivers,
    vehicles,
    trips,
    offers,
    ratings,
    audit,
    settings: {
      city: 'Bogotá',
      center: BOGOTA_CENTER,
      currency: 'COP',
      commissionPct: 18,
      categories: CATEGORY_DEFAULTS.map((c) => ({ ...c })),
      cancelFee: 2000,
      demoMode: true,
      autoOffers: true,
      simulationSpeed: 1,
      useRealLocation: true,
      supportPhone: '+57 601 555 0100',
      supportEmail: 'soporte@cavio.co',
    },
    session: null,
    simulation: {
      running: false,
      autoAdvance: true,
      speed: 1,
      ticks: 0,
      lastTickAt: null,
      timers: {},
      log: [
        {
          id: 'log_seed',
          at: ago(0, 1),
          message: 'Datos DEMO inicializados (20 pasajeros, 15 conductores, 40 viajes).',
          kind: 'system',
        },
      ],
    },
    notifications,
  }
}

/** Estado inicial con datos DEMO. */
export function createSeedState(): CavioState {
  return buildSeed()
}

export function categoryLabel(id: string): string {
  return CATEGORY_NAMES[id as keyof typeof CATEGORY_NAMES] ?? id
}
