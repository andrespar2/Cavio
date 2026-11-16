import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  Car,
  ClipboardList,
  FlaskConical,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react'
import { useCavio } from '../../store/store'
import { getAdminMetrics, getDriverVehicle, getUser } from '../../store/selectors'
import { PageHeader } from '../../components/layout/PageHeader'
import { DemoBadge } from '../../components/Brand'
import { Button } from '../../components/ui/Button'
import { Avatar, ApprovalBadge, EmptyState, StatCard, TripStatusBadge } from '../../components/ui/Display'
import { BarChart, DonutChart, HorizontalBars, LineChart } from '../../components/ui/Charts'
import { formatCOP, formatCompactCOP, formatDateTimeShort, relativeTime } from '../../lib/format'

// ============================================================
// CAVIO — Dashboard del administrador
// ============================================================

export function AdminDashboard() {
  const { state, simulation } = useCavio()
  const metrics = getAdminMetrics(state)

  const pendingDrivers = state.drivers
    .filter((d) => d.approval === 'pending')
    .map((d) => ({ driver: d, user: getUser(state, d.userId), vehicle: getDriverVehicle(state, d.id) }))
    .filter((item) => item.user)

  const activeTrips = state.trips.filter((t) =>
    ['searching', 'offers', 'assigned', 'arriving', 'arrived', 'in_progress'].includes(t.status),
  )

  const recentAudit = state.audit.slice(0, 6)

  return (
    <div>
      <PageHeader
        title="Panel general"
        subtitle="Visión completa del ecosistema CAVIO con datos DEMO en tiempo real."
        badge={<DemoBadge />}
        actions={
          <>
            <Link to="/admin/simulacion">
              <Button variant="secondary" size="sm" icon={<FlaskConical size={14} />}>
                Simulación
              </Button>
            </Link>
            <Link to="/admin/conductores">
              <Button size="sm" icon={<UserCheck size={14} />}>
                Revisar conductores
              </Button>
            </Link>
          </>
        }
      />

      {metrics.pendingDrivers > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/[0.05] px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-400/10 text-amber-300">
              <UserCheck size={17} />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-white/85">
                {metrics.pendingDrivers} conductor{metrics.pendingDrivers === 1 ? '' : 'es'} pendiente{metrics.pendingDrivers === 1 ? '' : 's'} de aprobación
              </p>
              <p className="text-[11px] text-white/35">Revisa su documentación DEMO antes de habilitarlos.</p>
            </div>
          </div>
          <Link to="/admin/conductores" className="shrink-0">
            <Button size="sm" variant="secondary">
              Revisar ahora
            </Button>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Pasajeros" value={metrics.passengers} icon={<Users size={15} />} />
        <StatCard label="Conductores" value={metrics.drivers} icon={<Car size={15} />} hint={`${metrics.activeDrivers} aprobados`} />
        <StatCard label="En línea" value={metrics.onlineDrivers} icon={<Activity size={15} />} accent hint="Disponibles" />
        <StatCard label="Viajes" value={metrics.trips} icon={<ClipboardList size={15} />} hint={`${metrics.activeTrips} activos`} />
        <StatCard
          label="Volumen DEMO"
          value={formatCompactCOP(metrics.gmv)}
          icon={<Wallet size={15} />}
          hint={`${metrics.completedTrips} completados`}
        />
        <StatCard
          label="Ingreso plataforma"
          value={formatCompactCOP(metrics.platformRevenue)}
          icon={<TrendingUp size={15} />}
          hint={`Comisión ${state.settings.commissionPct}%`}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)]">
        <div className="space-y-4">
          <div className="card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-[15px] font-semibold text-white">Viajes por día</h2>
                <p className="text-[11px] text-white/30">Últimos 14 días · creados vs. completados</p>
              </div>
              <span className="text-[10.5px] text-white/25">Datos DEMO</span>
            </div>
            <div className="mt-4">
              <BarChart
                data={metrics.dailySeries.map((d) => ({ label: d.label, value: d.trips, secondary: d.completed }))}
                primaryLabel="Creados"
                secondaryLabel="Completados"
                height={180}
              />
            </div>
          </div>

          <div className="card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-[15px] font-semibold text-white">Volumen de viajes</h2>
                <p className="text-[11px] text-white/30">Valor total de viajes completados (COP)</p>
              </div>
              <span className="rounded-lg bg-lime/[0.08] px-2 py-1 text-[10.5px] text-lime">
                {formatCOP(metrics.gmv)}
              </span>
            </div>
            <div className="mt-3">
              <LineChart
                data={metrics.dailySeries.map((d) => ({ label: d.label, value: d.trips ? d.gmv : 0 }))}
                format={(v) => formatCompactCOP(v)}
                height={170}
              />
            </div>
          </div>

          <div className="card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[15px] font-semibold text-white">Viajes activos y solicitudes</h2>
              <Link to="/admin/viajes" className="text-[11.5px] font-medium text-lime hover:underline">
                Ver todos
              </Link>
            </div>
            <div className="mt-3 space-y-2">
              {activeTrips.length === 0 ? (
                <EmptyState
                  title="No hay viajes activos"
                  description="Cuando un pasajero solicite un viaje aparecerá aquí en tiempo real."
                  action={
                    <Button size="sm" variant="secondary" icon={<FlaskConical size={13} />} onClick={simulation.start}>
                      Iniciar simulación
                    </Button>
                  }
                />
              ) : (
                activeTrips.map((trip) => {
                  const passenger = getUser(state, trip.passengerId)
                  const driver = trip.driverId ? state.drivers.find((d) => d.id === trip.driverId) : undefined
                  const driverUser = driver ? getUser(state, driver.userId) : undefined
                  return (
                    <Link
                      key={trip.id}
                      to="/admin/viajes"
                      className="flex min-w-0 flex-wrap items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 transition hover:border-white/15"
                    >
                      <span className="text-[11px] font-semibold text-white/50">{trip.code}</span>
                      <TripStatusBadge status={trip.status} />
                      <span className="min-w-0 flex-1 truncate text-[11.5px] text-white/45">
                        {trip.origin.label} → {trip.destination.label}
                      </span>
                      <span className="hidden shrink-0 text-[10.5px] text-white/30 sm:inline">
                        {passenger?.firstName ?? 'Pasajero'} · {driverUser?.firstName ?? 'Sin conductor'}
                      </span>
                      <span className="shrink-0 text-[11.5px] font-medium tabular-nums text-lime">
                        {formatCOP(trip.agreedFare ?? trip.suggestedFare)}
                      </span>
                    </Link>
                  )
                })
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card">
            <h2 className="text-[15px] font-semibold text-white">Distribución por categoría</h2>
            <p className="text-[11px] text-white/30">Todos los viajes registrados</p>
            <div className="mt-4">
              <DonutChart
                data={metrics.categoryDistribution.map((c) => ({ label: c.name, value: c.count, color: c.color }))}
                centerLabel="viajes"
                centerValue={metrics.trips}
              />
            </div>
          </div>

          <div className="card">
            <h2 className="text-[15px] font-semibold text-white">Estados de los viajes</h2>
            <div className="mt-3">
              <HorizontalBars
                data={metrics.statusDistribution.map((s) => ({ label: s.label, value: s.count, color: s.color }))}
              />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[15px] font-semibold text-white">Aprobaciones pendientes</h2>
              <Link to="/admin/conductores" className="text-[11px] text-lime hover:underline">
                Gestionar
              </Link>
            </div>
            <div className="mt-3 space-y-2">
              {pendingDrivers.length === 0 ? (
                <p className="rounded-xl bg-white/[0.02] px-3 py-4 text-center text-[11.5px] text-white/30">
                  No hay solicitudes de conductores pendientes.
                </p>
              ) : (
                pendingDrivers.slice(0, 4).map(({ driver, user, vehicle }) => (
                  <div key={driver.id} className="flex min-w-0 items-center gap-2.5 rounded-xl bg-white/[0.025] px-3 py-2">
                    <Avatar user={user} size={30} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11.5px] font-medium text-white/80">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="truncate text-[10px] text-white/30">
                        {vehicle ? `${vehicle.brand} ${vehicle.model} · ${vehicle.plate}` : 'Sin vehículo'}
                      </p>
                    </div>
                    <ApprovalBadge approval={driver.approval} />
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[15px] font-semibold text-white">Actividad reciente</h2>
              <Link to="/admin/auditoria" className="text-[11px] text-lime hover:underline">
                Auditoría
              </Link>
            </div>
            <ul className="mt-3 space-y-2.5">
              {recentAudit.length === 0 ? (
                <li className="text-[11.5px] text-white/30">Sin registros.</li>
              ) : (
                recentAudit.map((entry) => (
                  <li key={entry.id} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-lime/50" />
                    <div className="min-w-0">
                      <p className="text-[11.5px] leading-snug text-white/65">{entry.action}</p>
                      <p className="truncate text-[10px] text-white/25">
                        {entry.actorName} · {relativeTime(entry.createdAt)}
                      </p>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Tasa de finalización', value: `${metrics.completionRate.toFixed(1)}%`, icon: TrendingUp },
          { label: 'Tasa de cancelación', value: `${metrics.cancellationRate.toFixed(1)}%`, icon: XCircle },
          { label: 'Ticket promedio', value: formatCOP(metrics.averageTicket), icon: Wallet },
          { label: 'Solicitudes pendientes', value: metrics.pendingRequests, icon: Activity },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-[#090909] px-4 py-3">
            <item.icon size={15} className="shrink-0 text-lime/70" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-white/30">{item.label}</p>
              <p className="truncate text-[13.5px] font-semibold text-white">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-[#080808] px-4 py-3">
        <p className="text-[11px] text-white/30">
          Última actualización de datos: {formatDateTimeShort(new Date().toISOString())} · Ciudad:{' '}
          {state.settings.city}
        </p>
        <Link to="/admin/finanzas" className="inline-flex items-center gap-1 text-[11.5px] font-medium text-lime hover:underline">
          Ver finanzas <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  )
}

