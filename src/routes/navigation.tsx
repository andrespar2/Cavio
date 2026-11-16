import {
  ClipboardList,
  CreditCard,
  FlaskConical,
  History,
  House,
  LayoutDashboard,
  LifeBuoy,
  Route,
  Settings,
  ShieldCheck,
  TrendingUp,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import type { Role } from '../types'

// ============================================================
// CAVIO — Navegación por rol
// ============================================================

export interface NavItem {
  to: string
  label: string
  shortLabel?: string
  icon: LucideIcon
  end?: boolean
  mobile?: boolean
}

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  passenger: [
    { to: '/pasajero', label: 'Inicio', icon: House, end: true, mobile: true },
    { to: '/pasajero/historial', label: 'Mis viajes', shortLabel: 'Viajes', icon: History, mobile: true },
    { to: '/pasajero/pagos', label: 'Pagos', icon: CreditCard, mobile: true },
    { to: '/pasajero/perfil', label: 'Perfil', icon: UserRound, mobile: true },
    { to: '/pasajero/ayuda', label: 'Ayuda', icon: LifeBuoy },
  ],
  driver: [
    { to: '/conductor', label: 'Panel', icon: LayoutDashboard, end: true, mobile: true },
    { to: '/conductor/solicitudes', label: 'Solicitudes', shortLabel: 'Solicitudes', icon: Route, mobile: true },
    { to: '/conductor/ganancias', label: 'Ganancias', icon: Wallet, mobile: true },
    { to: '/conductor/historial', label: 'Historial', icon: ClipboardList },
    { to: '/conductor/perfil', label: 'Perfil y vehículo', shortLabel: 'Perfil', icon: UserRound, mobile: true },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true, mobile: true },
    { to: '/admin/conductores', label: 'Conductores', shortLabel: 'Conductores', icon: Users, mobile: true },
    { to: '/admin/viajes', label: 'Viajes', icon: Route, mobile: true },
    { to: '/admin/finanzas', label: 'Finanzas', icon: TrendingUp, mobile: true },
    { to: '/admin/pasajeros', label: 'Pasajeros', icon: UserRound },
    { to: '/admin/configuracion', label: 'Configuración', icon: Settings },
    { to: '/admin/auditoria', label: 'Auditoría', icon: ShieldCheck },
    { to: '/admin/simulacion', label: 'Simulación', icon: FlaskConical },
  ],
}

export const ROLE_LABEL: Record<Role, string> = {
  passenger: 'Pasajero',
  driver: 'Conductor',
  admin: 'Administrador',
}

export const HOME_BY_ROLE: Record<Role, string> = {
  passenger: '/pasajero',
  driver: '/conductor',
  admin: '/admin',
}

export function isNavActive(pathname: string, item: NavItem): boolean {
  if (item.end) return pathname === item.to
  return pathname === item.to || pathname.startsWith(`${item.to}/`)
}
