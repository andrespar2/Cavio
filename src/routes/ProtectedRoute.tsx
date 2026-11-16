import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { Role } from '../types'
import { useCavio } from '../store/store'
import { AppShell } from '../components/layout/AppShell'
import { HOME_BY_ROLE } from './navigation'

// ============================================================
// CAVIO — Protección de rutas por rol
// ============================================================

export function ProtectedLayout({ roles }: { roles: Role[] }) {
  const { currentUser } = useCavio()
  const location = useLocation()

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (!roles.includes(currentUser.role)) {
    return <Navigate to={HOME_BY_ROLE[currentUser.role]} replace />
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

export function PublicOnly({ children }: { children: React.ReactNode }) {
  const { currentUser } = useCavio()
  if (currentUser) return <Navigate to={HOME_BY_ROLE[currentUser.role]} replace />
  return <>{children}</>
}
