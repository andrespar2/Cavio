import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  Car,
  CheckCircle2,
  ChevronRight,
  Download,
  MapPin,
  Navigation,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Wallet,
} from 'lucide-react'
import type { Role } from '../types'
import { useCavio } from '../store/store'
import { Brand, DemoBadge } from '../components/Brand'
import { Button } from '../components/ui/Button'
import { Avatar, Stars } from '../components/ui/Display'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { useToast } from '../hooks/useToast'
import { HOME_BY_ROLE } from '../routes/navigation'
import { formatCOP } from '../lib/format'

// ============================================================
// CAVIO — Pantalla de bienvenida
// ============================================================

const DEMO_PROFILES: { role: Role; title: string; description: string; icon: typeof Car; accent: string }[] = [
  {
    role: 'passenger',
    title: 'Pasajero',
    description: 'Pide viajes, negocia la tarifa y sigue a tu conductor.',
    icon: Navigation,
    accent: '#C6F36B',
  },
  {
    role: 'driver',
    title: 'Conductor',
    description: 'Recibe solicitudes, contraoferta y gestiona tus ganancias.',
    icon: Car,
    accent: '#8FD3FF',
  },
  {
    role: 'admin',
    title: 'Administrador',
    description: 'Supervisa usuarios, viajes, finanzas y simulación.',
    icon: ShieldCheck,
    accent: '#FFC46B',
  },
]

export function Landing() {
  const navigate = useNavigate()
  const { loginDemo, state } = useCavio()
  const { toast } = useToast()
  const { canInstall, installed, install } = useInstallPrompt()

  const enterDemo = (role: Role) => {
    const result = loginDemo(role)
    if (!result.ok) {
      toast(result.error ?? 'No pudimos iniciar el perfil DEMO.', 'error')
      return
    }
    toast(`Entraste como ${DEMO_PROFILES.find((p) => p.role === role)?.title ?? 'DEMO'}.`, 'success')
    navigate(HOME_BY_ROLE[role])
  }

  const demoDriver = state.drivers.find((d) => d.approval === 'approved' && d.available)
  const driverUser = demoDriver ? state.users.find((u) => u.id === demoDriver.userId) : undefined
  const driverVehicle = demoDriver ? state.vehicles.find((v) => v.id === demoDriver.vehicleId) : undefined

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden">
      {/* Fondos decorativos */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-lime/[0.09] blur-[130px]" />
        <div className="absolute -left-40 top-1/3 h-[420px] w-[420px] rounded-full bg-lime/[0.04] blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]" />
      </div>

      <header className="safe-top mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-5 sm:px-6">
        <Brand size="md" />
        <div className="flex items-center gap-2">
          <DemoBadge className="hidden sm:inline-flex" />
          <Link to="/login">
            <Button variant="secondary" size="sm">
              Iniciar sesión
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
        {/* HERO */}
        <section className="grid items-center gap-10 pt-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-8 lg:pt-14">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-lime/20 bg-lime/[0.06] px-3 py-1.5 text-[11px] font-medium text-lime/90">
              <Sparkles size={12} /> Movilidad inteligente en Colombia
            </div>
            <h1 className="mt-4 text-balance text-[clamp(2.3rem,7vw,4.3rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-white">
              Tu viaje.
              <br />
              Tu tarifa.
              <br />
              <span className="text-lime">Tu CAVIO.</span>
            </h1>
            <p className="mt-5 max-w-xl text-[clamp(0.95rem,1.6vw,1.08rem)] leading-relaxed text-white/50">
              La plataforma que conecta pasajeros y conductores con mapas en tiempo real, negociación de
              tarifas y una experiencia pensada para sentirse segura desde el primer toque.
            </p>

            <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
              <Button size="lg" onClick={() => enterDemo('passenger')} icon={<Navigation size={18} />}>
                Probar como pasajero
              </Button>
              <Link to="/login" className="sm:w-auto">
                <Button size="lg" variant="secondary" className="w-full" icon={<ArrowRight size={17} />}>
                  Iniciar sesión
                </Button>
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11.5px] text-white/35">
              <span className="inline-flex items-center gap-1.5">
                <BadgeCheck size={13} className="text-lime/70" /> 3 perfiles conectados
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={13} className="text-lime/70" /> Mapas reales
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Wallet size={13} className="text-lime/70" /> Tarifas en COP
              </span>
            </div>
          </div>

          {/* Mockup de aplicación */}
          <div className="relative mx-auto w-full max-w-[360px] lg:max-w-[390px]">
            <div className="absolute -inset-6 -z-10 rounded-[48px] bg-lime/[0.05] blur-3xl" />
            <div className="rounded-[38px] border border-white/10 bg-[#050505] p-2.5 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.9)]">
              <div className="overflow-hidden rounded-[30px] border border-white/[0.06] bg-[#080808]">
                <div className="relative h-[250px] overflow-hidden bg-[#0b0f0a]">
                  <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(28deg,rgba(198,243,107,.06)_1px,transparent_1px),linear-gradient(118deg,rgba(255,255,255,.05)_1px,transparent_1px)] [background-size:46px_46px,74px_74px]" />
                  <svg className="absolute inset-0 h-full w-full" viewBox="0 0 360 250" fill="none" preserveAspectRatio="none">
                    <path d="M20 210 C 90 150, 120 190, 180 120 S 300 70, 340 30" stroke="#C6F36B" strokeWidth="3.5" strokeLinecap="round" opacity="0.9" />
                    <path d="M20 210 C 90 150, 120 190, 180 120 S 300 70, 340 30" stroke="#000" strokeWidth="8" strokeLinecap="round" opacity="0.4" />
                    <circle cx="20" cy="210" r="6" fill="#C6F36B" stroke="#000" strokeWidth="3" />
                    <circle cx="180" cy="120" r="12" fill="#0d0d0d" stroke="#C6F36B" strokeWidth="2" />
                    <path d="M174 120h12M180 114v12" stroke="#C6F36B" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="340" cy="30" r="7" fill="#C6F36B" stroke="#000" strokeWidth="3" />
                  </svg>
                  <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/70 px-2.5 py-1 text-[9px] text-white/60 backdrop-blur">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime" /> Conductor en camino
                  </div>
                </div>

                <div className="space-y-3 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">
                      CAVIO Economy
                    </span>
                    <span className="rounded-full border border-lime/20 bg-lime/[0.08] px-2 py-0.5 text-[9px] font-medium text-lime">
                      Oferta
                    </span>
                  </div>
                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar user={driverUser} size={34} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11.5px] font-medium text-white/90">
                          {driverUser ? `${driverUser.firstName} ${driverUser.lastName}` : 'Conductor CAVIO'}
                        </p>
                        <div className="flex items-center gap-1.5 text-[9px] text-white/35">
                          <Stars value={demoDriver?.rating ?? 4.9} size={8} showValue={false} />
                          <span className="truncate">
                            {driverVehicle ? `${driverVehicle.brand} ${driverVehicle.model}` : 'Vehículo CAVIO'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[13px] font-semibold text-white">{formatCOP(13700)}</p>
                        <p className="text-[8.5px] text-white/30">tu tarifa</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-lime px-3 py-2.5 text-[11px] font-semibold text-black">
                    <CheckCircle2 size={14} /> Aceptar viaje
                  </div>
                  <div className="flex gap-2">
                    {['Economy', 'Comfort', 'XL', 'Moto'].map((label, i) => (
                      <span
                        key={label}
                        className={
                          i === 0
                            ? 'flex-1 rounded-lg border border-lime/30 bg-lime/[0.08] py-1.5 text-center text-[8.5px] text-lime'
                            : 'flex-1 rounded-lg border border-white/[0.07] bg-white/[0.02] py-1.5 text-center text-[8.5px] text-white/30'
                        }
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -right-3 top-24 hidden rounded-2xl border border-white/10 bg-[#0d0d0d]/95 px-3 py-2 shadow-soft backdrop-blur-md sm:block">
              <div className="flex items-center gap-1.5">
                <Star size={11} className="fill-lime text-lime" />
                <span className="text-[10px] font-semibold text-white">4.9</span>
              </div>
              <p className="mt-0.5 text-[8px] text-white/30">Calificación DEMO</p>
            </div>
            <div className="absolute -left-4 -bottom-3 hidden rounded-2xl border border-white/10 bg-[#0d0d0d]/95 px-3 py-2 shadow-soft backdrop-blur-md sm:block">
              <p className="text-[9px] text-white/30">Llega en</p>
              <p className="text-[12px] font-semibold text-lime">3 min</p>
            </div>
          </div>
        </section>

        {/* CARACTERÍSTICAS */}
        <section className="mt-16 grid gap-2.5 sm:grid-cols-3">
          {[
            {
              icon: Wallet,
              title: 'Negocia tu tarifa',
              text: 'Propón el precio y recibe ofertas o contraofertas de conductores cercanos.',
            },
            {
              icon: MapPin,
              title: 'Sigue tu viaje',
              text: 'Mapa, ruta y estado del viaje actualizados en toda la aplicación.',
            },
            {
              icon: ShieldCheck,
              title: 'Información clara',
              text: 'Conoce al conductor, el vehículo y la placa antes de subir.',
            },
          ].map((feature) => (
            <div key={feature.title} className="rounded-3xl border border-white/[0.07] bg-[#090909]/80 p-5">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-lime/[0.1] text-lime">
                <feature.icon size={19} />
              </span>
              <p className="mt-3 text-[14px] font-semibold text-white">{feature.title}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-white/40">{feature.text}</p>
            </div>
          ))}
        </section>

        {/* PERFILES DEMO */}
        <section className="mt-16">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-lime/70">Acceso DEMO</p>
              <h2 className="mt-1 text-[clamp(1.5rem,3vw,2rem)] font-semibold text-white">Explora los tres perfiles</h2>
              <p className="mt-1 max-w-xl text-[12.5px] leading-relaxed text-white/40">
                Entra con un toque y comprueba cómo se sincronizan pasajero, conductor y administrador sobre
                los mismos datos.
              </p>
            </div>
            <span className="text-[10.5px] text-white/25">Sesión guardada en este navegador</span>
          </div>

          <div className="grid gap-2.5 md:grid-cols-3">
            {DEMO_PROFILES.map((profile) => (
              <div
                key={profile.role}
                className="group flex flex-col rounded-3xl border border-white/[0.07] bg-gradient-to-b from-[#0d0d0d] to-[#070707] p-5 transition hover:border-white/[0.14]"
              >
                <div className="flex items-start justify-between">
                  <span
                    className="grid h-11 w-11 place-items-center rounded-2xl"
                    style={{ background: `${profile.accent}15`, color: profile.accent }}
                  >
                    <profile.icon size={20} />
                  </span>
                  <ChevronRight size={16} className="text-white/20 transition group-hover:translate-x-0.5 group-hover:text-white/50" />
                </div>
                <p className="mt-4 text-[15px] font-semibold text-white">{profile.title}</p>
                <p className="mt-1 flex-1 text-[12px] leading-relaxed text-white/40">{profile.description}</p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-4 justify-between"
                  onClick={() => enterDemo(profile.role)}
                >
                  Entrar como {profile.title.toLowerCase()}
                  <ArrowRight size={14} />
                </Button>
              </div>
            ))}
          </div>
        </section>

        {/* CÓMO FUNCIONA */}
        <section className="mt-16 rounded-[32px] border border-white/[0.07] bg-[#080808]/80 p-6 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-[clamp(1.3rem,2.6vw,1.7rem)] font-semibold text-white">Así funciona CAVIO</h2>
              <p className="mt-1 text-[12.5px] text-white/40">Un mismo viaje, conectado en todo el ecosistema.</p>
            </div>
            <Link to="/registro" className="text-[12px] font-medium text-lime hover:underline">
              Crear cuenta de pasajero
            </Link>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { n: '01', t: 'Elige tu ruta', d: 'Ubicación real, búsqueda o punto en el mapa.' },
              { n: '02', t: 'Propón tu tarifa', d: 'Ajusta el precio sugerido en pesos colombianos.' },
              { n: '03', t: 'Elige una oferta', d: 'Acepta, rechaza o espera contraofertas.' },
              { n: '04', t: 'Sigue el viaje', d: 'Estados, mapa, historial y calificación.' },
            ].map((step) => (
              <div key={step.n} className="min-w-0">
                <p className="text-[11px] font-semibold tracking-[0.18em] text-lime/60">{step.n}</p>
                <p className="mt-1.5 text-[13.5px] font-medium text-white/90">{step.t}</p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-white/35">{step.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* INSTALACIÓN */}
        <section className="mt-10 flex flex-col items-center justify-between gap-4 rounded-3xl border border-lime/15 bg-lime/[0.04] p-6 sm:flex-row sm:p-7">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[14px] font-semibold text-white">
              <Download size={16} className="text-lime" /> Lleva CAVIO contigo
            </p>
            <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-white/40">
              Instala CAVIO como aplicación web progresiva (PWA) desde un navegador compatible. La
              geolocalización requiere HTTPS o localhost.
            </p>
          </div>
          <Button
            variant={canInstall ? 'primary' : 'secondary'}
            size="md"
            disabled={!canInstall && !installed}
            onClick={() => void install()}
            className="w-full shrink-0 sm:w-auto"
          >
            {installed ? 'Aplicación instalada' : canInstall ? 'Instalar CAVIO' : 'Usa el menú del navegador'}
          </Button>
        </section>

        <section className="mt-10 grid gap-2.5 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/[0.07] bg-[#080808] p-4">
            <p className="flex items-center gap-2 text-[12.5px] font-medium text-white/70">
              <Users size={14} className="text-lime" /> Pasajeros y conductores
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-white/30">
              Crea una cuenta DEMO como pasajero o solicita registro como conductor. Los conductores nuevos
              quedan pendientes de aprobación del administrador.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to="/registro">
                <Button size="sm" variant="secondary">
                  Registro de pasajero
                </Button>
              </Link>
              <Link to="/registro-conductor">
                <Button size="sm" variant="ghost">
                  Registro de conductor
                </Button>
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-white/[0.07] bg-[#080808] p-4">
            <p className="flex items-center gap-2 text-[12.5px] font-medium text-white/70">
              <Star size={14} className="text-lime" /> Prototipo transparente
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-white/30">
              CAVIO es una demostración funcional: mapas y datos reales de OpenStreetMap, pagos, documentos,
              llamadas y seguimiento en segundo plano son simulados o requieren integración de producción.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.06] py-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 text-center sm:flex-row sm:px-6 sm:text-left">
          <Brand size="sm" />
          <p className="text-[10.5px] leading-relaxed text-white/25">
            CAVIO · Prototipo DEMO · Bogotá, Colombia · {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  )
}
