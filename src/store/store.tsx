import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type {
  AppSettings,
  CavioState,
  DriverDocument,
  DriverProfile,
  Role,
  Session,
  Trip,
  User,
  Vehicle,
  VehicleCategoryId,
} from '../types'
import { createSeedState, DEMO_PASSWORD, DEMO_EMAILS } from '../data/seed'
import { getDriverByUserId, getUser } from './selectors'
import {
  acceptOfferMutation,
  advanceTripMutation,
  audit,
  cancelTripMutation,
  notify,
  nowIso,
  rateTripMutation,
  rejectOfferMutation,
  requestTripMutation,
  sendOfferMutation,
  setDriverApprovalMutation,
  setDriverAvailabilityMutation,
  setDriverLocation,
  setUserStatusMutation,
  simulationTickMutation,
  updateDriverDocumentsMutation,
  updateVehicleMutation,
  type RequestTripInput,
} from './mutations'
import { uid } from '../lib/utils'

// ============================================================
// CAVIO — Store global DEMO
// Persistencia local + sincronización entre pestañas + sesión
// ============================================================

const STORAGE_KEY = 'cavio.state.v1'

export interface ActionResult {
  ok: boolean
  error?: string
}

export interface PassengerRegistration {
  firstName: string
  lastName: string
  email: string
  phone: string
  documentType: User['documentType']
  documentNumber: string
  password: string
}

export interface DriverRegistration extends PassengerRegistration {
  vehicleCategory: VehicleCategoryId
  brand: string
  model: string
  year: number
  color: string
  plate: string
  licenseNumber: string
  licenseCategory: string
  documents?: Partial<Record<DriverDocument['kind'], string>>
}

interface CavioContextValue {
  state: CavioState
  currentUser: User | null
  currentDriver: DriverProfile | null
  login: (email: string, password: string) => ActionResult
  loginDemo: (role: Role) => ActionResult
  logout: () => void
  registerPassenger: (input: PassengerRegistration) => ActionResult
  registerDriver: (input: DriverRegistration) => ActionResult
  updateUser: (userId: string, patch: Partial<User>) => ActionResult
  requestTrip: (input: Omit<RequestTripInput, 'passengerId'> & { passengerId: string }) => {
    ok: boolean
    trip?: Trip
    error?: string
  }
  cancelTrip: (tripId: string, reason: string, role: 'passenger' | 'driver' | 'admin') => ActionResult
  sendOffer: (params: {
    tripId: string
    driverId: string
    amount: number
    kind: 'accept' | 'counter'
    message?: string
  }) => ActionResult
  acceptOffer: (offerId: string) => ActionResult
  rejectOffer: (offerId: string) => ActionResult
  advanceTrip: (tripId: string) => ActionResult
  rateTrip: (tripId: string, score: number, comment: string) => ActionResult
  setDriverAvailability: (driverId: string, available: boolean) => ActionResult
  updateDriverLocation: (
    driverId: string,
    location: { lat: number; lng: number },
    source?: 'gps' | 'demo',
  ) => void
  setDriverApproval: (
    driverId: string,
    approval: DriverProfile['approval'],
    note?: string,
  ) => ActionResult
  setUserStatus: (userId: string, status: User['status'], reason: string) => ActionResult
  updateSettings: (patch: Partial<AppSettings>) => ActionResult
  updateVehicle: (driverId: string, patch: Partial<Vehicle>) => ActionResult
  updateDocuments: (driverId: string, documents: DriverDocument[]) => ActionResult
  markNotificationsRead: (userId: string) => void
  restoreDemo: () => void
  simulation: {
    start: () => void
    pause: () => void
    resume: () => void
    reset: () => void
    setSpeed: (speed: number) => void
    toggleAutoAdvance: () => void
    tick: () => void
    advanceTrip: (tripId: string) => void
  }
}

const CavioContext = createContext<CavioContextValue | null>(null)

function loadState(): CavioState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createSeedState()
    const parsed = JSON.parse(raw) as CavioState
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.users)) return createSeedState()
    const state: CavioState = { ...createSeedState(), ...parsed }
    if (state.session && !state.users.some((u) => u.id === state.session?.userId)) {
      state.session = null
    }
    if (!state.simulation.timers) state.simulation.timers = {}
    return state
  } catch {
    return createSeedState()
  }
}

export function CavioProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CavioState>(loadState)
  const stateRef = useRef(state)
  stateRef.current = state
  const lastWritten = useRef<string | null>(null)
  const saveTimer = useRef<number | null>(null)

  // Persistencia local con debounce
  useEffect(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      try {
        const raw = JSON.stringify(state)
        lastWritten.current = raw
        localStorage.setItem(STORAGE_KEY, raw)
      } catch {
        /* almacenamiento no disponible */
      }
    }, 250)
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
    }
  }, [state])

  // Sincronización entre pestañas del mismo navegador
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return
      if (event.newValue === lastWritten.current) return
      try {
        const incoming = JSON.parse(event.newValue) as CavioState
        if (incoming?.version === 1) {
          lastWritten.current = event.newValue
          setState(incoming)
        }
      } catch {
        /* ignorar payload inválido */
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setSession = useCallback((session: Session | null) => {
    setState((s) => ({ ...s, session }))
  }, [])

  const login = useCallback((email: string, password: string): ActionResult => {
    const current = stateRef.current
    const normalized = email.trim().toLowerCase()
    if (!normalized) return { ok: false, error: 'Escribe tu correo electrónico.' }
    if (password.trim().length < 4) {
      return { ok: false, error: 'La contraseña DEMO debe tener al menos 4 caracteres.' }
    }
    const user = current.users.find((u) => u.email.toLowerCase() === normalized)
    if (!user) {
      return { ok: false, error: 'No encontramos una cuenta con ese correo. Regístrate o usa un perfil DEMO.' }
    }
    if (user.status === 'suspended') {
      return { ok: false, error: 'Esta cuenta está suspendida. Contacta a soporte CAVIO para más información.' }
    }
    setSession({ userId: user.id, role: user.role, loginAt: nowIso(), demo: true })
    return { ok: true }
  }, [setSession])

  const loginDemo = useCallback((role: Role): ActionResult => {
    const current = stateRef.current
    const email = DEMO_EMAILS[role]
    const user = current.users.find((u) => u.email.toLowerCase() === email)
    if (!user) return { ok: false, error: 'La cuenta DEMO no está disponible. Restaura los datos iniciales.' }
    setSession({ userId: user.id, role, loginAt: nowIso(), demo: true })
    return { ok: true }
  }, [setSession])

  const logout = useCallback(() => {
    setSession(null)
  }, [setSession])

  const requireEmailAvailable = useCallback((email: string): string | null => {
    const exists = stateRef.current.users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())
    return exists ? 'Ya existe una cuenta con ese correo electrónico.' : null
  }, [])

  const registerPassenger = useCallback((input: PassengerRegistration): ActionResult => {
    const emailError = requireEmailAvailable(input.email)
    if (emailError) return { ok: false, error: emailError }
    const user: User = {
      id: `usr_${uid('p')}`,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone.trim(),
      documentType: input.documentType,
      documentNumber: input.documentNumber.trim(),
      role: 'passenger',
      status: 'active',
      createdAt: nowIso(),
      city: 'Bogotá',
    }
    setState((s) => {
      let next: CavioState = { ...s, users: [...s.users, user] }
      next = notify(
        next,
        user.id,
        '¡Bienvenido a CAVIO!',
        'Tu cuenta DEMO está lista. Pide tu primer viaje y descubre la negociación de tarifas.',
        'account',
      )
      next = audit(next, user, 'Pasajero registrado', `${user.firstName} ${user.lastName} creó una cuenta DEMO.`, 'passenger')
      next = {
        ...next,
        session: { userId: user.id, role: 'passenger', loginAt: nowIso(), demo: true },
      }
      return next
    })
    return { ok: true }
  }, [requireEmailAvailable])

  const registerDriver = useCallback((input: DriverRegistration): ActionResult => {
    const emailError = requireEmailAvailable(input.email)
    if (emailError) return { ok: false, error: emailError }
    const userId = `usr_${uid('d')}`
    const driverId = `drv_${uid('new')}`
    const user: User = {
      id: userId,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone.trim(),
      documentType: input.documentType,
      documentNumber: input.documentNumber.trim(),
      role: 'driver',
      status: 'active',
      createdAt: nowIso(),
      city: 'Bogotá',
    }
    const vehicle: Vehicle = {
      id: `veh_${uid('new')}`,
      driverId: userId,
      category: input.vehicleCategory,
      brand: input.brand.trim(),
      model: input.model.trim(),
      year: input.year,
      color: input.color.trim(),
      plate: input.plate.trim().toUpperCase(),
      capacity: input.vehicleCategory === 'xl' ? 6 : input.vehicleCategory === 'moto' ? 1 : 4,
    }
    const docs: DriverDocument[] = [
      { id: uid('doc'), kind: 'licencia', name: 'Licencia de conducción', status: 'cargado', fileName: input.documents?.licencia },
      { id: uid('doc'), kind: 'soat', name: 'SOAT vigente', status: 'cargado', fileName: input.documents?.soat },
      { id: uid('doc'), kind: 'tecnomecanica', name: 'Revisión tecnomecánica', status: 'cargado', fileName: input.documents?.tecnomecanica },
      { id: uid('doc'), kind: 'tarjeta_propiedad', name: 'Tarjeta de propiedad', status: 'cargado', fileName: input.documents?.tarjeta_propiedad },
      { id: uid('doc'), kind: 'antecedentes', name: 'Certificado de antecedentes', status: 'pendiente', fileName: input.documents?.antecedentes },
    ]
    const driver: DriverProfile = {
      id: driverId,
      userId,
      approval: 'pending',
      available: false,
      rating: 5,
      ratingCount: 0,
      vehicleId: vehicle.id,
      licenseNumber: input.licenseNumber.trim(),
      licenseCategory: input.licenseCategory.trim(),
      licenseExpiry: new Date(Date.now() + 365 * 86400000).toISOString(),
      documents: docs,
      location: stateRef.current.settings.center,
      lastLocationAt: nowIso(),
      locationSource: 'demo',
      createdAt: nowIso(),
    }
    setState((s) => {
      let next: CavioState = {
        ...s,
        users: [...s.users, user],
        drivers: [...s.drivers, driver],
        vehicles: [...s.vehicles, vehicle],
      }
      next = notify(
        next,
        userId,
        'Registro recibido',
        'Tu documentación DEMO está en revisión. Un administrador la validará pronto.',
        'account',
      )
      next = audit(next, user, 'Registro de conductor', `${user.firstName} ${user.lastName} solicitó registro como conductor.`, 'driver')
      for (const admin of next.users.filter((u) => u.role === 'admin')) {
        next = notify(
          next,
          admin.id,
          'Nuevo conductor pendiente',
          `${user.firstName} ${user.lastName} envió su documentación para revisión.`,
          'account',
        )
      }
      next = {
        ...next,
        session: { userId, role: 'driver', loginAt: nowIso(), demo: true },
      }
      return next
    })
    return { ok: true }
  }, [requireEmailAvailable])

  const updateUser = useCallback((userId: string, patch: Partial<User>): ActionResult => {
    const current = stateRef.current
    if (patch.email) {
      const email = patch.email.trim().toLowerCase()
      const duplicate = current.users.some((u) => u.id !== userId && u.email.toLowerCase() === email)
      if (duplicate) return { ok: false, error: 'Ese correo ya está registrado en otra cuenta.' }
      patch = { ...patch, email }
    }
    setState((s) => ({
      ...s,
      users: s.users.map((u) => (u.id === userId ? { ...u, ...patch } : u)),
    }))
    return { ok: true }
  }, [])

  const requestTrip = useCallback(
    (input: Omit<RequestTripInput, 'passengerId'> & { passengerId: string }) => {
      const result = requestTripMutation(stateRef.current, input)
      if (result.error || !result.trip) return { ok: false, error: result.error }
      setState(result.state)
      return { ok: true, trip: result.trip }
    },
    [],
  )

  const cancelTrip = useCallback(
    (tripId: string, reason: string, role: 'passenger' | 'driver' | 'admin'): ActionResult => {
      setState((s) => cancelTripMutation(s, tripId, reason, role))
      return { ok: true }
    },
    [],
  )

  const sendOffer = useCallback(
    (params: {
      tripId: string
      driverId: string
      amount: number
      kind: 'accept' | 'counter'
      message?: string
    }): ActionResult => {
      const result = sendOfferMutation(stateRef.current, params)
      if (result.error) return { ok: false, error: result.error }
      setState(result.state)
      return { ok: true }
    },
    [],
  )

  const acceptOffer = useCallback((offerId: string): ActionResult => {
    const result = acceptOfferMutation(stateRef.current, offerId)
    if (result.error) return { ok: false, error: result.error }
    setState(result.state)
    return { ok: true }
  }, [])

  const advanceTrip = useCallback((tripId: string): ActionResult => {
    setState((s) => advanceTripMutation(s, tripId))
    return { ok: true }
  }, [])

  const rejectOffer = useCallback((offerId: string): ActionResult => {
    setState((s) => rejectOfferMutation(s, offerId))
    return { ok: true }
  }, [])

  const rateTrip = useCallback((tripId: string, score: number, comment: string): ActionResult => {
    setState((s) => rateTripMutation(s, tripId, score, comment))
    return { ok: true }
  }, [])

  const setDriverAvailability = useCallback((driverId: string, available: boolean): ActionResult => {
    const result = setDriverAvailabilityMutation(stateRef.current, driverId, available)
    if (result.error) return { ok: false, error: result.error }
    setState(result.state)
    return { ok: true }
  }, [])

  const updateDriverLocation = useCallback(
    (driverId: string, location: { lat: number; lng: number }, source: 'gps' | 'demo' = 'gps') => {
      setState((s) => setDriverLocation(s, driverId, location, source))
    },
    [],
  )

  const setDriverApproval = useCallback(
    (driverId: string, approval: DriverProfile['approval'], note?: string): ActionResult => {
      const current = stateRef.current
      const actor = current.session ? getUser(current, current.session.userId) : undefined
      setState((s) => setDriverApprovalMutation(s, actor, driverId, approval, note))
      return { ok: true }
    },
    [],
  )

  const setUserStatus = useCallback(
    (userId: string, status: User['status'], reason: string): ActionResult => {
      const current = stateRef.current
      const actor = current.session ? getUser(current, current.session.userId) : undefined
      setState((s) => setUserStatusMutation(s, actor, userId, status, reason))
      return { ok: true }
    },
    [],
  )

  const updateSettings = useCallback((patch: Partial<AppSettings>): ActionResult => {
    const current = stateRef.current
    const actor = current.session ? getUser(current, current.session.userId) : undefined
    setState((s) => {
      let next: CavioState = { ...s, settings: { ...s.settings, ...patch } }
      next = audit(
        next,
        actor,
        'Configuración actualizada',
        Object.keys(patch).join(', '),
        'settings',
      )
      return next
    })
    return { ok: true }
  }, [])

  const updateVehicle = useCallback((driverId: string, patch: Partial<Vehicle>): ActionResult => {
    setState((s) => updateVehicleMutation(s, driverId, patch))
    return { ok: true }
  }, [])

  const updateDocuments = useCallback(
    (driverId: string, documents: DriverDocument[]): ActionResult => {
      setState((s) => updateDriverDocumentsMutation(s, driverId, documents))
      return { ok: true }
    },
    [],
  )

  const markNotificationsRead = useCallback((userId: string) => {
    setState((s) => ({
      ...s,
      notifications: s.notifications.map((n) => (n.userId === userId ? { ...n, read: true } : n)),
    }))
  }, [])

  const restoreDemo = useCallback(() => {
    const current = stateRef.current
    const session = current.session
    const fresh = createSeedState()
    const user = session ? fresh.users.find((u) => u.id === session.userId) : undefined
    fresh.session = session && user ? session : null
    setState(fresh)
  }, [])

  const simulation = useMemo(
    () => ({
      start: () =>
        setState((s) => {
          if (s.simulation.running) return s
          const next = {
            ...s,
            simulation: { ...s.simulation, running: true, lastTickAt: nowIso() },
          }
          return {
            ...next,
            simulation: {
              ...next.simulation,
              log: [
                {
                  id: `log_${Date.now()}`,
                  at: nowIso(),
                  message: 'Simulación iniciada.',
                  kind: 'system' as const,
                },
                ...next.simulation.log,
              ].slice(0, 120),
            },
          }
        }),
      pause: () =>
        setState((s) => ({
          ...s,
          simulation: { ...s.simulation, running: false },
        })),
      resume: () =>
        setState((s) => ({
          ...s,
          simulation: { ...s.simulation, running: true, lastTickAt: nowIso() },
        })),
      reset: () =>
        setState((s) => ({
          ...s,
          simulation: {
            ...s.simulation,
            running: false,
            ticks: 0,
            timers: {},
            lastTickAt: null,
            log: [
              {
                id: `log_${Date.now()}`,
                at: nowIso(),
                message: 'Contadores de simulación reiniciados.',
                kind: 'system',
              },
            ],
          },
        })),
      setSpeed: (speed: number) =>
        setState((s) => ({
          ...s,
          simulation: { ...s.simulation, speed: Math.min(4, Math.max(0.5, speed)) },
        })),
      toggleAutoAdvance: () =>
        setState((s) => ({
          ...s,
          simulation: { ...s.simulation, autoAdvance: !s.simulation.autoAdvance },
        })),
      tick: () =>
        setState((s) => {
          if (!s.simulation.running) return s
          return simulationTickMutation(s, s.simulation.speed)
        }),
      advanceTrip: (tripId: string) => setState((s) => advanceTripMutation(s, tripId)),
    }),
    [],
  )

  const currentUser = state.session ? getUser(state, state.session.userId) ?? null : null
  const currentDriver = currentUser ? getDriverByUserId(state, currentUser.id) ?? null : null

  const value = useMemo<CavioContextValue>(
    () => ({
      state,
      currentUser,
      currentDriver,
      login,
      loginDemo,
      logout,
      registerPassenger,
      registerDriver,
      updateUser,
      requestTrip,
      cancelTrip,
      sendOffer,
      acceptOffer,
      rejectOffer,
      advanceTrip,
      rateTrip,
      setDriverAvailability,
      updateDriverLocation,
      setDriverApproval,
      setUserStatus,
      updateSettings,
      updateVehicle,
      updateDocuments,
      markNotificationsRead,
      restoreDemo,
      simulation,
    }),
    [
      state,
      currentUser,
      currentDriver,
      login,
      loginDemo,
      logout,
      registerPassenger,
      registerDriver,
      updateUser,
      requestTrip,
      cancelTrip,
      sendOffer,
      acceptOffer,
      rejectOffer,
      advanceTrip,
      rateTrip,
      setDriverAvailability,
      updateDriverLocation,
      setDriverApproval,
      setUserStatus,
      updateSettings,
      updateVehicle,
      updateDocuments,
      markNotificationsRead,
      restoreDemo,
      simulation,
    ],
  )

  return <CavioContext.Provider value={value}>{children}</CavioContext.Provider>
}

export function useCavio(): CavioContextValue {
  const ctx = useContext(CavioContext)
  if (!ctx) throw new Error('useCavio debe usarse dentro de <CavioProvider>')
  return ctx
}

/** Indica si el usuario autenticado tiene el rol indicado. */
export function useRoleGuard(role: Role): boolean {
  const { currentUser } = useCavio()
  return currentUser?.role === role
}

export { DEMO_PASSWORD, DEMO_EMAILS }
