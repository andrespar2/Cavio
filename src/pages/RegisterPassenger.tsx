import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2, Mail, Phone, ShieldCheck, UserRound } from 'lucide-react'
import type { User } from '../types'
import { useCavio } from '../store/store'
import { Brand } from '../components/Brand'
import { Button } from '../components/ui/Button'
import { Checkbox, Field, Input, Select } from '../components/ui/Field'
import { HOME_BY_ROLE } from '../routes/navigation'
import { useToast } from '../hooks/useToast'

// ============================================================
// CAVIO — Registro de pasajero (DEMO)
// ============================================================

export function RegisterPassenger() {
  const { currentUser, registerPassenger } = useCavio()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    documentType: 'CC' as User['documentType'],
    documentNumber: '',
    password: '',
    confirm: '',
  })
  const [accepted, setAccepted] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  if (currentUser) return <Navigate to={HOME_BY_ROLE[currentUser.role]} replace />

  const set = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: '' }))
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (form.firstName.trim().length < 2) next.firstName = 'Escribe tu nombre.'
    if (form.lastName.trim().length < 2) next.lastName = 'Escribe tus apellidos.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) next.email = 'Escribe un correo válido.'
    if (form.phone.replace(/\D/g, '').length < 10) next.phone = 'Escribe un teléfono de mínimo 10 dígitos.'
    if (form.documentNumber.replace(/\D/g, '').length < 6) next.documentNumber = 'Documento DEMO de mínimo 6 dígitos.'
    if (form.password.length < 6) next.password = 'La contraseña DEMO debe tener mínimo 6 caracteres.'
    if (form.password !== form.confirm) next.confirm = 'Las contraseñas no coinciden.'
    if (!accepted) next.accepted = 'Debes aceptar los términos del prototipo.'
    setErrors(next)
    if (Object.keys(next).length) return

    setBusy(true)
    const result = registerPassenger({
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone,
      documentType: form.documentType,
      documentNumber: form.documentNumber,
      password: form.password,
    })
    setBusy(false)
    if (!result.ok) {
      toast(result.error ?? 'No pudimos crear tu cuenta.', 'error')
      return
    }
    toast('¡Cuenta creada! Bienvenido a CAVIO.', 'success')
    navigate('/pasajero')
  }

  return (
    <div className="min-h-[100dvh]">
      <div className="safe-top mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <Brand size="sm" />
        <Link to="/login">
          <Button variant="ghost" size="sm" icon={<ArrowLeft size={14} />}>
            Volver a iniciar sesión
          </Button>
        </Link>
      </div>

      <main className="mx-auto w-full max-w-5xl px-4 pb-14 pt-4 sm:px-6">
        <div className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-lime/70">Cuenta DEMO de pasajero</p>
          <h1 className="mt-1.5 text-[clamp(1.6rem,4vw,2.2rem)] font-semibold tracking-tight text-white">
            Crea tu cuenta CAVIO
          </h1>
          <p className="mt-1.5 max-w-xl text-[12.5px] leading-relaxed text-white/40">
            Solo necesitamos datos básicos de demostración. Puedes usar información ficticia; no publiques
            datos personales reales.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <form onSubmit={submit} className="card space-y-4" noValidate>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nombre" required error={errors.firstName}>
                <Input
                  value={form.firstName}
                  onChange={(e) => set('firstName', e.target.value)}
                  icon={<UserRound size={15} />}
                  placeholder="Camila"
                  autoComplete="given-name"
                />
              </Field>
              <Field label="Apellidos" required error={errors.lastName}>
                <Input
                  value={form.lastName}
                  onChange={(e) => set('lastName', e.target.value)}
                  placeholder="Restrepo"
                  autoComplete="family-name"
                />
              </Field>
              <Field label="Correo electrónico" required error={errors.email}>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  icon={<Mail size={15} />}
                  placeholder="tu.correo@ejemplo.com"
                  autoComplete="email"
                />
              </Field>
              <Field label="Teléfono" required error={errors.phone}>
                <Input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  icon={<Phone size={15} />}
                  placeholder="+57 300 123 4567"
                  autoComplete="tel"
                />
              </Field>
              <Field label="Tipo de documento">
                <Select
                  value={form.documentType}
                  onChange={(e) => set('documentType', e.target.value)}
                >
                  <option value="CC">Cédula de ciudadanía</option>
                  <option value="CE">Cédula de extranjería</option>
                  <option value="PAS">Pasaporte</option>
                </Select>
              </Field>
              <Field label="Número de documento DEMO" required error={errors.documentNumber}>
                <Input
                  value={form.documentNumber}
                  onChange={(e) => set('documentNumber', e.target.value)}
                  inputMode="numeric"
                  placeholder="1020304050"
                />
              </Field>
              <Field label="Contraseña DEMO" required error={errors.password} hint="Mínimo 6 caracteres. No se almacena.">
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </Field>
              <Field label="Confirmar contraseña" required error={errors.confirm}>
                <Input
                  type="password"
                  value={form.confirm}
                  onChange={(e) => set('confirm', e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </Field>
            </div>

            <div>
              <Checkbox
                checked={accepted}
                onChange={(value) => {
                  setAccepted(value)
                  setErrors((prev) => ({ ...prev, accepted: '' }))
                }}
                label="Acepto las condiciones del prototipo CAVIO"
                hint="Entiendo que es una demostración, que los datos son ficticios y que no se realizan pagos reales."
              />
              {errors.accepted && <p className="mt-1.5 text-xs text-red-300">{errors.accepted}</p>}
            </div>

            <Button type="submit" size="lg" fullWidth loading={busy} icon={<ArrowRight size={17} />}>
              Crear cuenta y entrar
            </Button>
            <p className="text-center text-[11px] text-white/30">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="link">
                Inicia sesión
              </Link>
            </p>
          </form>

          <aside className="space-y-3">
            <div className="rounded-2xl border border-white/[0.07] bg-[#0a0a0a] p-4">
              <p className="flex items-center gap-2 text-[12.5px] font-medium text-white/70">
                <ShieldCheck size={14} className="text-lime" /> Cuenta segura por diseño
              </p>
              <ul className="mt-2.5 space-y-2 text-[11.5px] leading-relaxed text-white/35">
                {[
                  'La contraseña no se guarda en el prototipo.',
                  'Los datos quedan solo en este navegador.',
                  'Puedes restaurar los datos DEMO desde administración.',
                  'El acceso a cada panel está protegido por rol.',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-1.5">
                    <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-lime/60" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-[#0a0a0a] p-4">
              <p className="text-[12.5px] font-medium text-white/70">¿Quieres conducir con CAVIO?</p>
              <p className="mt-1 text-[11px] leading-relaxed text-white/30">
                Regístrate como conductor y envía tu documentación DEMO. Un administrador revisará tu perfil.
              </p>
              <Link to="/registro-conductor" className="mt-2.5 block">
                <Button variant="secondary" size="sm" fullWidth>
                  Registro de conductor
                </Button>
              </Link>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
