import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  ChevronRight,
  FlaskConical,
  LogOut,
  MoreHorizontal,
  Pause,
  RefreshCw,
  Settings2,
  Sparkles,
  UserRound,
} from 'lucide-react'
import clsx from 'clsx'
import { useCavio } from '../../store/store'
import { getNotificationsForUser, getPendingRequestsForDriver, getOffersForTrip, getActiveTripForPassenger, getAdminMetrics } from '../../store/selectors'
import { NAV_BY_ROLE, ROLE_LABEL, isNavActive, HOME_BY_ROLE, type NavItem } from '../../routes/navigation'
import { Brand, DemoBadge } from '../Brand'
import { Avatar } from '../ui/Display'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { formatDateTimeShort, relativeTime } from '../../lib/format'
import { useInstallPrompt } from '../../hooks/useInstallPrompt'
import { useToast } from '../../hooks/useToast'

// ============================================================
// CAVIO — Layout principal adaptable
// · Escritorio: barra lateral fija
// · Móvil: barra inferior con áreas seguras
// ============================================================

export function AppShell({ children }: { children: ReactNode }) {
  const { state, currentUser, currentDriver, logout, markNotificationsRead, restoreDemo } = useCavio()
  const location = useLocation()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { canInstall, install } = useInstallPrompt()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const role = currentUser?.role ?? 'passenger'
  const nav = NAV_BY_ROLE[role]
  const mobileNav = nav.filter((item) => item.mobile)
  const extraNav = nav.filter((item) => !item.mobile)
  const notifications = currentUser ? getNotificationsForUser(state, currentUser.id) : []
  const unread = notifications.filter((n) => !n.read).length

  const activeTrip = currentUser && role === 'passenger' ? getActiveTripForPassenger(state, currentUser.id) : undefined
  const pendingOffers = activeTrip ? getOffersForTrip(state, activeTrip.id).length : 0
  const driverRequests =
    currentDriver && role === 'driver' ? getPendingRequestsForDriver(state, currentDriver.id).length : 0
  const pendingDrivers = role === 'admin' ? getAdminMetrics(state).pendingDrivers : 0

  const badgeFor = (item: NavItem): number => {
    if (item.to === '/pasajero' && pendingOffers) return pendingOffers
    if (item.to === '/conductor/solicitudes' && driverRequests) return driverRequests
    if (item.to === '/admin/conductores' && pendingDrivers) return pendingDrivers
    return 0
  }

  useEffect(() => {
    setMenuOpen(false)
    setMoreOpen(false)
    setNotificationsOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const match = [...nav].sort((a, b) => b.to.length - a.to.length).find((item) => isNavActive(location.pathname, item))
    document.title = match ? `${match.label} · CAVIO` : 'CAVIO — Movilidad inteligente'
  }, [location.pathname, nav])

  const handleLogout = () => {
    logout()
    toast('Sesión cerrada. ¡Hasta pronto!', 'info')
    navigate('/')
  }

  const handleRestore = () => {
    restoreDemo()
    setMoreOpen(false)
    toast('Datos DEMO restaurados correctamente.', 'success')
  }

  if (!currentUser) return <>{children}</>

  return (
    <div className="flex min-h-[100dvh] w-full">
      {/* ---------------- Barra lateral (escritorio) ---------------- */}
      <aside className="sticky top-0 hidden h-[100dvh] w-[268px] shrink-0 flex-col border-r border-white/[0.06] bg-[#050505]/95 px-4 py-6 lg:flex">
        <div className="px-2">
          <Brand size="md" to={HOME_BY_ROLE[role]} />
        </div>
        <div className="mt-3 flex items-center gap-2 px-2">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/55">
            {ROLE_LABEL[role]}
          </span>
          <DemoBadge />
        </div>

        <nav className="mt-7 flex-1 space-y-1 overflow-y-auto no-scrollbar" aria-label="Navegación principal">
          {nav.map((item) => {
            const badge = badgeFor(item)
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  clsx(
                    'group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[13.5px] font-medium transition-colors',
                    isActive
                      ? 'bg-lime/[0.11] text-lime'
                      : 'text-white/55 hover:bg-white/[0.05] hover:text-white/90',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon size={18} className={isActive ? 'text-lime' : 'text-white/45'} />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {badge > 0 && (
                      <span className="grid h-5 min-w-5 place-items-center rounded-full bg-lime px-1.5 text-[10.5px] font-bold text-black">
                        {badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        {state.simulation.running && (
          <Link
            to={role === 'admin' ? '/admin/simulacion' : HOME_BY_ROLE[role]}
            className="mb-3 flex items-center gap-2 rounded-2xl border border-lime/20 bg-lime/[0.07] px-3 py-2.5 text-[12px] text-lime"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-lime" />
            </span>
            <span className="flex-1">Simulación activa</span>
            <span className="text-[10px] uppercase tracking-wider text-lime/60">x{state.simulation.speed}</span>
          </Link>
        )}

        {canInstall && (
          <button
            type="button"
            onClick={() => void install()}
            className="mb-3 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[12px] text-white/60 transition hover:bg-white/[0.07] hover:text-white"
          >
            <Sparkles size={15} className="text-lime" />
            Instalar CAVIO
          </button>
        )}

        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar user={currentUser} size={38} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-white/90">
                {currentUser.firstName} {currentUser.lastName}
              </p>
              <p className="truncate text-[11px] text-white/35">{currentUser.email}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-white/35 transition hover:bg-white/10 hover:text-white"
              aria-label="Cerrar sesión"
            >
              <LogOut size={15} />
            </button>
          </div>
          {role === 'driver' && currentDriver && (
            <Link
              to="/conductor/perfil"
              className="mt-2.5 flex items-center justify-between rounded-xl bg-white/[0.04] px-2.5 py-2 text-[11px] text-white/45"
            >
              <span>{currentDriver.approval === 'approved' ? 'Conductor aprobado' : 'Revisión pendiente'}</span>
              <ChevronRight size={13} />
            </Link>
          )}
        </div>
      </aside>

      {/* ---------------- Contenido ---------------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-black/70 backdrop-blur-xl">
          <div className="mx-auto flex h-16 w-full max-w-[1500px] items-center gap-3 px-4 pt-[env(safe-area-inset-top,0px)] sm:px-6 lg:h-[70px] lg:px-8">
            <div className="lg:hidden">
              <Brand size="sm" to={HOME_BY_ROLE[role]} />
            </div>
            <div className="hidden min-w-0 items-center gap-2 lg:flex">
              <span className="truncate text-[13px] text-white/40">
                {ROLE_LABEL[role]} · {state.settings.city}
              </span>
              <span className="h-1 w-1 rounded-full bg-white/20" />
              <DemoBadge />
            </div>

            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              {state.simulation.running && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-lime/20 bg-lime/[0.08] px-2 py-1.5 text-[9.5px] font-semibold uppercase tracking-wider text-lime sm:px-2.5 sm:text-[10.5px]">
                  <Pause size={10} /> Sim x{state.simulation.speed}
                </span>
              )}
              <button
                type="button"
                onClick={() => setNotificationsOpen(true)}
                className="relative grid h-10 w-10 place-items-center rounded-xl text-white/60 transition hover:bg-white/[0.07] hover:text-white"
                aria-label={`Notificaciones${unread ? `, ${unread} sin leer` : ''}`}
              >
                <Bell size={19} />
                {unread > 0 && (
                  <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-lime px-1 text-[9px] font-bold text-black">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-full p-0.5 transition hover:opacity-90"
                  aria-label="Menú de cuenta"
                  aria-expanded={menuOpen}
                >
                  <Avatar user={currentUser} size={36} ring={menuOpen} />
                </button>
                {menuOpen && (
                  <>
                    <button
                      type="button"
                      className="fixed inset-0 z-40 cursor-default"
                      onClick={() => setMenuOpen(false)}
                      aria-label="Cerrar menú"
                      tabIndex={-1}
                    />
                    <div className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-2xl border border-white/10 bg-[#0e0e0e] shadow-glass animate-fade-up">
                      <div className="flex items-center gap-3 border-b border-white/[0.07] p-4">
                        <Avatar user={currentUser} size={40} />
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-white">
                            {currentUser.firstName} {currentUser.lastName}
                          </p>
                          <p className="truncate text-[11px] text-white/40">{currentUser.email}</p>
                        </div>
                      </div>
                      <div className="p-1.5">
                        <Link
                          to={role === 'admin' ? '/admin' : role === 'driver' ? '/conductor/perfil' : '/pasajero/perfil'}
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] text-white/70 hover:bg-white/[0.06]"
                        >
                          <UserRound size={15} /> Mi perfil
                        </Link>
                        {role === 'admin' && (
                          <Link
                            to="/admin/configuracion"
                            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] text-white/70 hover:bg-white/[0.06]"
                          >
                            <Settings2 size={15} /> Configuración
                          </Link>
                        )}
                        {role === 'admin' && (
                          <Link
                            to="/admin/simulacion"
                            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] text-white/70 hover:bg-white/[0.06]"
                          >
                            <FlaskConical size={15} /> Simulación DEMO
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false)
                            navigate('/')
                            setTimeout(() => logout(), 0)
                          }}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] text-white/70 hover:bg-white/[0.06]"
                        >
                          <RefreshCw size={15} /> Cambiar de perfil
                        </button>
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] text-red-300 hover:bg-red-500/10"
                        >
                          <LogOut size={15} /> Cerrar sesión
                        </button>
                      </div>
                      <div className="border-t border-white/[0.07] px-4 py-2.5">
                        <p className="text-[10px] leading-relaxed text-white/25">
                          Sesión DEMO · Los datos se guardan solo en este navegador.
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
          {children}
        </main>
      </div>

      {/* ---------------- Barra inferior (móvil/tablet) ---------------- */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.07] bg-black/85 backdrop-blur-2xl lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-label="Navegación inferior"
      >
        <div className="mx-auto flex h-[62px] w-full max-w-lg items-stretch px-1.5">
          {mobileNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                clsx(
                  'group relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 transition-colors',
                  isActive ? 'text-lime' : 'text-white/45 active:text-white/70',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className="relative">
                    <item.icon size={21} strokeWidth={isActive ? 2.3 : 1.9} />
                    {badgeFor(item) > 0 && (
                      <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-lime px-1 text-[9px] font-bold text-black">
                        {badgeFor(item)}
                      </span>
                    )}
                  </span>
                  <span className="max-w-full truncate text-[10px] font-medium leading-none">
                    {item.shortLabel ?? item.label}
                  </span>
                  {isActive && <span className="absolute -top-px h-[2px] w-6 rounded-full bg-lime" />}
                </>
              )}
            </NavLink>
          ))}
          {extraNav.length > 0 && (
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 text-white/45 active:text-white/70"
            >
              <MoreHorizontal size={21} />
              <span className="text-[10px] font-medium leading-none">Más</span>
            </button>
          )}
        </div>
      </nav>

      {/* ---------------- Notificaciones ---------------- */}
      <Modal
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        title="Notificaciones"
        description="Avisos de tus viajes y tu cuenta en este dispositivo."
        size="md"
        footer={
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] text-white/30">
              {notifications.length} aviso{notifications.length === 1 ? '' : 's'}
            </span>
            <Button
              size="sm"
              variant="secondary"
              disabled={!unread}
              onClick={() => currentUser && markNotificationsRead(currentUser.id)}
            >
              Marcar todo como leído
            </Button>
          </div>
        }
      >
        {notifications.length === 0 ? (
          <div className="py-10 text-center">
            <Bell size={26} className="mx-auto mb-3 text-white/25" />
            <p className="text-sm text-white/50">Aquí verás tus notificaciones.</p>
          </div>
        ) : (
          <ul className="space-y-2 py-1">
            {notifications.slice(0, 40).map((n) => (
              <li
                key={n.id}
                className={clsx(
                  'rounded-2xl border p-3.5',
                  n.read ? 'border-white/[0.05] bg-white/[0.015]' : 'border-lime/15 bg-lime/[0.045]',
                )}
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className={clsx(
                      'mt-1 h-2 w-2 shrink-0 rounded-full',
                      n.read ? 'bg-white/15' : 'bg-lime',
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <p className="text-[13px] font-semibold text-white/90">{n.title}</p>
                      <time className="text-[10.5px] text-white/30" title={formatDateTimeShort(n.createdAt)}>
                        {relativeTime(n.createdAt)}
                      </time>
                    </div>
                    <p className="mt-0.5 text-[12.5px] leading-relaxed text-white/45">{n.message}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      {/* ---------------- Menú "Más" (móvil) ---------------- */}
      <Modal
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title="Más opciones"
        description={role === 'admin' ? 'Gestión y herramientas de CAVIO.' : 'Accesos adicionales.'}
        size="sm"
      >
        <div className="space-y-1 pb-2">
          {extraNav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 rounded-2xl px-3 py-3 text-[13.5px] text-white/75 transition hover:bg-white/[0.06]"
            >
              <item.icon size={17} className="text-white/40" />
              <span className="flex-1">{item.label}</span>
              {badgeFor(item) > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-lime px-1.5 text-[10px] font-bold text-black">
                  {badgeFor(item)}
                </span>
              )}
              <ChevronRight size={14} className="text-white/25" />
            </Link>
          ))}
          <div className="my-2 h-px bg-white/[0.07]" />
          {canInstall && (
            <button
              type="button"
              onClick={() => void install()}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-[13.5px] text-white/75 hover:bg-white/[0.06]"
            >
              <Sparkles size={17} className="text-lime" />
              Instalar CAVIO en este dispositivo
            </button>
          )}
          {role === 'admin' && (
            <button
              type="button"
              onClick={handleRestore}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-[13.5px] text-white/75 hover:bg-white/[0.06]"
            >
              <RefreshCw size={17} className="text-white/40" />
              Restaurar datos DEMO
            </button>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-[13.5px] text-red-300 hover:bg-red-500/10"
          >
            <LogOut size={17} />
            Cerrar sesión
          </button>
          <div className="flex items-center gap-2 px-3 pt-2">
            <DemoBadge />
            <span className="text-[10.5px] text-white/25">Datos locales de demostración</span>
          </div>
        </div>
      </Modal>

      {/* Indicador flotante de simulación retirado: el estado se muestra en la cabecera. */}
    </div>
  )
}

