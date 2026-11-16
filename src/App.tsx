import { useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { CavioProvider } from './store/store'
import { ToastProvider } from './hooks/useToast'
import { useSimulationEngine } from './hooks/useSimulationEngine'
import { ProtectedLayout } from './routes/ProtectedRoute'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { RegisterPassenger } from './pages/RegisterPassenger'
import { RegisterDriver } from './pages/RegisterDriver'
import { NotFound } from './pages/NotFound'
import { PassengerHome } from './pages/passenger/Home'
import { PassengerHistory } from './pages/passenger/History'
import { PassengerPayments } from './pages/passenger/Payments'
import { PassengerProfile } from './pages/passenger/Profile'
import { PassengerHelp } from './pages/passenger/Help'
import { DriverDashboard } from './pages/driver/Dashboard'
import { DriverRequests } from './pages/driver/Requests'
import { DriverEarnings } from './pages/driver/Earnings'
import { DriverHistory } from './pages/driver/History'
import { DriverProfilePage } from './pages/driver/Profile'
import { AdminDashboard } from './pages/admin/Dashboard'
import { AdminPassengers } from './pages/admin/Passengers'
import { AdminDrivers } from './pages/admin/Drivers'
import { AdminTrips } from './pages/admin/Trips'
import { AdminFinance } from './pages/admin/Finance'
import { AdminSettings } from './pages/admin/Settings'
import { AdminAudit } from './pages/admin/Audit'
import { AdminSimulation } from './pages/admin/Simulation'

// ============================================================
// CAVIO — Enrutador principal
// ============================================================

function SimulationRuntime() {
  useSimulationEngine()
  return null
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <CavioProvider>
          <SimulationRuntime />
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<RegisterPassenger />} />
            <Route path="/registro-conductor" element={<RegisterDriver />} />

            <Route element={<ProtectedLayout roles={['passenger']} />}>
              <Route path="/pasajero" element={<PassengerHome />} />
              <Route path="/pasajero/historial" element={<PassengerHistory />} />
              <Route path="/pasajero/pagos" element={<PassengerPayments />} />
              <Route path="/pasajero/perfil" element={<PassengerProfile />} />
              <Route path="/pasajero/ayuda" element={<PassengerHelp />} />
            </Route>

            <Route element={<ProtectedLayout roles={['driver']} />}>
              <Route path="/conductor" element={<DriverDashboard />} />
              <Route path="/conductor/solicitudes" element={<DriverRequests />} />
              <Route path="/conductor/ganancias" element={<DriverEarnings />} />
              <Route path="/conductor/historial" element={<DriverHistory />} />
              <Route path="/conductor/perfil" element={<DriverProfilePage />} />
            </Route>

            <Route element={<ProtectedLayout roles={['admin']} />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/pasajeros" element={<AdminPassengers />} />
              <Route path="/admin/conductores" element={<AdminDrivers />} />
              <Route path="/admin/viajes" element={<AdminTrips />} />
              <Route path="/admin/finanzas" element={<AdminFinance />} />
              <Route path="/admin/configuracion" element={<AdminSettings />} />
              <Route path="/admin/auditoria" element={<AdminAudit />} />
              <Route path="/admin/simulacion" element={<AdminSimulation />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </CavioProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
