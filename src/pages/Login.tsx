import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck, Sparkles } from 'lucide-react'
import type { Role } from '../types'
import { useCavio, DEMO_PASSWORD } from '../store/store'
import { DEMO_EMAILS } from '../data/seed'
import { Brand, DemoBadge } from '../components/Brand'
import { Button } from '../components/ui/Button'
import { Field, Input } from '../components/ui/Field'
import { Avatar } from '../components/ui/Display'
import { HOME_BY_ROLE, ROLE_LABEL } from '../routes/navigation'
import { useToast } from '../hooks/useToast'

// ============================================================
// CAVIO — Inicio de sesión (DEMO)
// ============================================================

const QUICK: { role: Role; email: string }[] = [
  { role: 'passenger', email: DEMO_EMAILS.passenger },
  { role: 'driver', email: DEMO_EMAILS.driver },
  { role: 'admin', email: DEMO_EMAILS.admin },
]

export function Login() {
  const { state, currentUser, login, loginDemo } = useCavio()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [busy, setBusy] = useState(false)

  if (currentUser) return <Navigate to={HOME_BY_ROLE[currentUser.role]} replace />

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault()
    const nextErrors: typeof errors = {}
    if (!email.trim()) nextErrors.email = 'Escribe tu correo electrónico.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) nextErrors.email = 'El correo no parece válido.'
    if (password.trim().length < 4) nextErrors.password = 'Escribe tu contraseña DEMO (mínimo 4 caracteres).'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    setBusy(true)
    const result = login(email, password)
    setBusy(false)
    if (!result.ok) {
      toast(result.error ?? 'No pudimos iniciar sesión.', 'error')
      return
    }
    const user = state.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
    toast(`¡Bienvenido de nuevo, ${user?.firstName ?? 'viajero'}!`, 'success')
    navigate(user ? HOME_BY_ROLE[user.role] : '/')
  }

  const quickAccess = (role: Role) => {
    const user = state.users.find((u) => u.email === DEMO_EMAILS[role])
    if (!user) {
      toast('La cuenta DEMO no está disponible. Restaura los datos desde el panel administrador.', 'error')
      return
    }
    const result = loginDemo(role)
    if (!result.ok) {
      toast(result.error ?? 'No pudimos entrar al perfil DEMO.', 'error')
      return
    }
    toast(`Sesión DEMO iniciada como ${ROLE_LABEL[role]}.`, 'success')
    navigate(HOME_BY_ROLE[role])
  }

  return (
    <div className="min-h-[100dvh] lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* Panel de marca */}
      <div className="relative hidden overflow-hidden border-r border-white/[0.06] p-10 lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-24 top-1/4 h-[460px] w-[460px] rounded-full bg-lime/[0.07] blur-[120px]" />
          <div className="absolute inset-0 opacity-[0.14] [background-image:linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
        </div>
        <Brand size="lg" />
        <div className="max-w-md">
          <DemoBadge />
          <h1 className="mt-4 text-balance text-4xl font-semibold leading-[1.06] tracking-tight text-white xl:text-[2.8rem]">
            Bienvenido de nuevo a <span className="text-lime">CAVIO</span>.
          </h1>
          <p className="mt-4 text-[13.5px] leading-relaxed text-white/45">
            Un mismo ecosistema para pasajeros, conductores y administradores. Tus cambios se reflejan al
            instante en toda la aplicación DEMO.
          </p>
          <ul className="mt-6 space-y-2.5">
            {[
              'Sesión persistente en este navegador',
              'Rutas protegidas por rol',
              'Datos DEMO que puedes restaurar',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 text-[12px] text-white/45">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-lime/10 text-lime">
                  <ShieldCheck size={11} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[10.5px] leading-relaxed text-white/25">
          Prototipo funcional. No se usan credenciales reales ni se procesan pagos.
        </p>
      </div>

      {/* Formulario */}
      <div className="flex min-h-[100dvh] flex-col">
        <div className="safe-top flex items-center justify-between px-5 pt-5 lg:hidden">
          <Brand size="sm" />
          <Link to="/">
            <Button variant="ghost" size="sm" icon={<ArrowLeft size={14} />}>
              Inicio
            </Button>
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10 sm:px-8 lg:py-14">
          <div className="mb-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-lime/70">Acceso DEMO</p>
            <h2 className="mt-1.5 text-[clamp(1.6rem,4vw,2rem)] font-semibold tracking-tight text-white">
              Inicia sesión
            </h2>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/40">
              Usa una cuenta de demostración o tus datos registrados en este dispositivo.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-3.5" noValidate>
            <Field label="Correo electrónico" required error={errors.email}>
              <Input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setErrors((prev) => ({ ...prev, email: '' }))
                }}
                icon={<Mail size={16} />}
                placeholder="tucorreo@ejemplo.com"
                autoComplete="email"
                inputMode="email"
              />
            </Field>
            <Field
              label="Contraseña DEMO"
              required
              error={errors.password}
              hint={`En el prototipo la contraseña demo es ${DEMO_PASSWORD}. No se almacena.`}
            >
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setErrors((prev) => ({ ...prev, password: '' }))
                  }}
                  icon={<Lock size={16} />}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-white/35 hover:bg-white/10 hover:text-white"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </Field>

            <Button type="submit" size="lg" fullWidth loading={busy} icon={<ArrowRight size={17} />}>
              Entrar a CAVIO
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-white/[0.07]" />
            <span className="text-[10px] uppercase tracking-wider text-white/25">o entra con un perfil DEMO</span>
            <span className="h-px flex-1 bg-white/[0.07]" />
          </div>

          <div className="grid gap-2">
            {QUICK.map(({ role, email: demoEmail }) => {
              const user = state.users.find((u) => u.email === demoEmail)
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => quickAccess(role)}
                  className="flex w-full min-w-0 items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3 text-left transition hover:border-lime/25 hover:bg-lime/[0.04]"
                >
                  <Avatar user={user} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-white/85">{ROLE_LABEL[role]}</span>
                    <span className="block truncate text-[11px] text-white/30">{demoEmail}</span>
                  </span>
                  <span className="shrink-0 rounded-lg border border-lime/20 bg-lime/[0.07] px-2 py-1 text-[10px] font-medium text-lime">
                    Entrar
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5">
            <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-white/60">
              <Sparkles size={12} className="text-lime" /> ¿Primera vez aquí?
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-white/30">
              Crea una cuenta DEMO de pasajero o registra tu vehículo como conductor. Los conductores nuevos
              requieren aprobación del administrador.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <Link to="/registro">
                <Button size="sm" variant="secondary">
                  Crear cuenta
                </Button>
              </Link>
              <Link to="/registro-conductor">
                <Button size="sm" variant="ghost">
                  Ser conductor
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
