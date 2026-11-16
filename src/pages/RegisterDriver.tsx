import { useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Bike,
  Bus,
  Car,
  CarFront,
  CheckCircle2,
  FileText,
  Mail,
  Phone,
  ShieldCheck,
  Upload,
  UserRound,
} from 'lucide-react'
import clsx from 'clsx'
import type { DriverDocument, User, VehicleCategoryId } from '../types'
import { useCavio } from '../store/store'
import { Brand } from '../components/Brand'
import { Button } from '../components/ui/Button'
import { Checkbox, Field, Input, Select } from '../components/ui/Field'
import { HOME_BY_ROLE } from '../routes/navigation'
import { useToast } from '../hooks/useToast'
import { formatCOP } from '../lib/format'

// ============================================================
// CAVIO — Registro de conductor (DEMO)
// ============================================================

const CATEGORIES: { id: VehicleCategoryId; label: string; icon: typeof Car; capacity: number }[] = [
  { id: 'economy', label: 'Economy', icon: Car, capacity: 4 },
  { id: 'comfort', label: 'Comfort', icon: CarFront, capacity: 4 },
  { id: 'xl', label: 'XL', icon: Bus, capacity: 6 },
  { id: 'moto', label: 'Moto', icon: Bike, capacity: 1 },
]

const DOCUMENTS: { kind: DriverDocument['kind']; label: string; hint: string }[] = [
  { kind: 'licencia', label: 'Licencia de conducción', hint: 'Frente y reverso (DEMO)' },
  { kind: 'soat', label: 'SOAT vigente', hint: 'Documento en PDF o imagen' },
  { kind: 'tecnomecanica', label: 'Revisión tecnomecánica', hint: 'Vigente para el vehículo' },
  { kind: 'tarjeta_propiedad', label: 'Tarjeta de propiedad', hint: 'A nombre del conductor' },
  { kind: 'antecedentes', label: 'Antecedentes', hint: 'Certificado de antecedentes' },
]

export function RegisterDriver() {
  const { currentUser, registerDriver } = useCavio()
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
    vehicleCategory: 'economy' as VehicleCategoryId,
    brand: '',
    model: '',
    year: String(new Date().getFullYear() - 3),
    color: '',
    plate: '',
    licenseNumber: '',
    licenseCategory: 'B1',
  })
  const [documents, setDocuments] = useState<Partial<Record<DriverDocument['kind'], string>>>({})
  const [accepted, setAccepted] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  if (currentUser) return <Navigate to={HOME_BY_ROLE[currentUser.role]} replace />

  const set = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: '' }))
  }

  const setDocument = (kind: DriverDocument['kind'], file: File | undefined) => {
    if (!file) return
    if (file.size > 3 * 1024 * 1024) {
      toast('El archivo DEMO debe pesar menos de 3 MB.', 'error')
      return
    }
    setDocuments((prev) => ({ ...prev, [kind]: file.name }))
    toast('Archivo DEMO seleccionado. Solo se guarda el nombre, no el contenido.', 'success')
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (form.firstName.trim().length < 2) next.firstName = 'Escribe tu nombre.'
    if (form.lastName.trim().length < 2) next.lastName = 'Escribe tus apellidos.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) next.email = 'Escribe un correo válido.'
    if (form.phone.replace(/\D/g, '').length < 10) next.phone = 'Escribe un teléfono de mínimo 10 dígitos.'
    if (form.documentNumber.replace(/\D/g, '').length < 6) next.documentNumber = 'Documento DEMO inválido.'
    if (form.password.length < 6) next.password = 'Mínimo 6 caracteres.'
    if (form.password !== form.confirm) next.confirm = 'Las contraseñas no coinciden.'
    if (form.brand.trim().length < 2) next.brand = 'Escribe la marca del vehículo.'
    if (form.model.trim().length < 1) next.model = 'Escribe el modelo.'
    const year = Number(form.year)
    if (!year || year < 2000 || year > new Date().getFullYear() + 1) next.year = 'Año no válido.'
    if (form.color.trim().length < 2) next.color = 'Escribe el color.'
    if (!/^[A-Za-z]{3}\d{3}$/.test(form.plate.trim())) next.plate = 'Formato de placa: ABC123.'
    if (form.licenseNumber.trim().length < 4) next.licenseNumber = 'Número de licencia DEMO inválido.'
    if (!accepted) next.accepted = 'Debes aceptar las condiciones del prototipo.'
    setErrors(next)
    if (Object.keys(next).length) {
      toast('Revisa los campos marcados antes de continuar.', 'error')
      return
    }

    setBusy(true)
    const result = registerDriver({
      ...form,
      year,
      documents,
    })
    setBusy(false)
    if (!result.ok) {
      toast(result.error ?? 'No pudimos completar el registro.', 'error')
      return
    }
    toast('Registro enviado. Tu cuenta quedó pendiente de aprobación.', 'success')
    navigate('/conductor')
  }

  const selectedCategory = CATEGORIES.find((c) => c.id === form.vehicleCategory)!

  return (
    <div className="min-h-[100dvh]">
      <div className="safe-top mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Brand size="sm" />
        <Link to="/login">
          <Button variant="ghost" size="sm" icon={<ArrowLeft size={14} />}>
            Volver a iniciar sesión
          </Button>
        </Link>
      </div>

      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-4 sm:px-6">
        <div className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-lime/70">Registro de conductor DEMO</p>
          <h1 className="mt-1.5 text-[clamp(1.6rem,4vw,2.2rem)] font-semibold tracking-tight text-white">
            Conduce con CAVIO
          </h1>
          <p className="mt-1.5 max-w-2xl text-[12.5px] leading-relaxed text-white/40">
            Completa tu perfil y la información de tu vehículo. Un administrador revisará tu registro y
            deberá aprobarlo antes de que puedas recibir solicitudes.
          </p>
        </div>

        <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]" noValidate>
          <div className="space-y-4">
            <section className="card">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold text-white">
                <UserRound size={16} className="text-lime" /> Datos personales
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="Nombre" required error={errors.firstName}>
                  <Input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder="Andrés" />
                </Field>
                <Field label="Apellidos" required error={errors.lastName}>
                  <Input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} placeholder="Molina" />
                </Field>
                <Field label="Correo electrónico" required error={errors.email}>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    icon={<Mail size={15} />}
                    placeholder="conductor@ejemplo.com"
                  />
                </Field>
                <Field label="Teléfono" required error={errors.phone}>
                  <Input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    icon={<Phone size={15} />}
                    placeholder="+57 300 123 4567"
                  />
                </Field>
                <Field label="Tipo de documento">
                  <Select value={form.documentType} onChange={(e) => set('documentType', e.target.value)}>
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
                <Field label="Contraseña DEMO" required error={errors.password} hint="No se almacena.">
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                    placeholder="••••••••"
                  />
                </Field>
                <Field label="Confirmar contraseña" required error={errors.confirm}>
                  <Input
                    type="password"
                    value={form.confirm}
                    onChange={(e) => set('confirm', e.target.value)}
                    placeholder="••••••••"
                  />
                </Field>
              </div>
            </section>

            <section className="card">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold text-white">
                <Car size={16} className="text-lime" /> Tu vehículo
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {CATEGORIES.map((cat) => {
                  const active = form.vehicleCategory === cat.id
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => set('vehicleCategory', cat.id)}
                      className={clsx(
                        'flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 text-[11.5px] transition',
                        active
                          ? 'border-lime/45 bg-lime/[0.08] text-lime'
                          : 'border-white/[0.07] bg-white/[0.02] text-white/45 hover:border-white/15',
                      )}
                    >
                      <cat.icon size={18} />
                      <span className="font-medium">{cat.label}</span>
                      <span className="text-[9.5px] text-white/25">{cat.capacity} pas.</span>
                    </button>
                  )
                })}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="Marca" required error={errors.brand}>
                  <Input value={form.brand} onChange={(e) => set('brand', e.target.value)} placeholder="Chevrolet" />
                </Field>
                <Field label="Modelo" required error={errors.model}>
                  <Input value={form.model} onChange={(e) => set('model', e.target.value)} placeholder="Onix" />
                </Field>
                <Field label="Año" required error={errors.year}>
                  <Input
                    type="number"
                    value={form.year}
                    onChange={(e) => set('year', e.target.value)}
                    min={2000}
                    max={new Date().getFullYear() + 1}
                    inputMode="numeric"
                  />
                </Field>
                <Field label="Color" required error={errors.color}>
                  <Input value={form.color} onChange={(e) => set('color', e.target.value)} placeholder="Gris plata" />
                </Field>
                <Field label="Placa DEMO" required error={errors.plate} hint="Formato ABC123.">
                  <Input
                    value={form.plate}
                    onChange={(e) => set('plate', e.target.value.toUpperCase())}
                    placeholder="CAV123"
                    maxLength={6}
                    className="uppercase tracking-[0.12em]"
                  />
                </Field>
                <Field label="Capacidad" hint="Definida por la categoría seleccionada.">
                  <Input value={`${selectedCategory.capacity} pasajeros`} disabled />
                </Field>
                <Field label="Número de licencia" required error={errors.licenseNumber}>
                  <Input
                    value={form.licenseNumber}
                    onChange={(e) => set('licenseNumber', e.target.value)}
                    placeholder="LC-1234567"
                  />
                </Field>
                <Field label="Categoría de licencia">
                  <Select value={form.licenseCategory} onChange={(e) => set('licenseCategory', e.target.value)}>
                    <option value="A1">A1 — Motocicleta</option>
                    <option value="A2">A2 — Motocicleta</option>
                    <option value="B1">B1 — Automóvil</option>
                    <option value="C1">C1 — Camioneta</option>
                  </Select>
                </Field>
              </div>
            </section>

            <section className="card">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold text-white">
                <FileText size={16} className="text-lime" /> Documentación DEMO
              </h2>
              <p className="mt-1 text-[11.5px] leading-relaxed text-white/35">
                Solo se guarda el nombre del archivo en este dispositivo; nunca se sube su contenido a un
                servidor. Puedes continuar sin adjuntar archivos: se registrarán como documentación DEMO.
              </p>
              <div className="mt-3 space-y-2">
                {DOCUMENTS.map((doc) => (
                  <div
                    key={doc.kind}
                    className="flex flex-wrap items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 sm:flex-nowrap"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.05] text-white/40">
                      <FileText size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium leading-snug text-white/75 [overflow-wrap:anywhere]">{doc.label}</p>
                      <p className="text-[10.5px] leading-snug text-white/30 [overflow-wrap:anywhere]">
                        {documents[doc.kind] ?? doc.hint}
                      </p>
                    </div>
                    <input
                      ref={(el) => {
                        fileRefs.current[doc.kind] = el
                      }}
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => setDocument(doc.kind, e.target.files?.[0])}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="shrink-0"
                      icon={<Upload size={13} />}
                      onClick={() => fileRefs.current[doc.kind]?.click()}
                    >
                      {documents[doc.kind] ? 'Cambiar' : 'Adjuntar'}
                    </Button>
                  </div>
                ))}
              </div>
            </section>

            <div className="card">
              <Checkbox
                checked={accepted}
                onChange={(value) => {
                  setAccepted(value)
                  setErrors((prev) => ({ ...prev, accepted: '' }))
                }}
                label="Acepto las condiciones del prototipo y declaro que la información es ficticia"
                hint="Entiendo que el registro queda pendiente de aprobación y que no se realizarán pagos reales."
              />
              {errors.accepted && <p className="mt-1.5 text-xs text-red-300">{errors.accepted}</p>}
              <Button type="submit" size="lg" fullWidth className="mt-3" loading={busy} icon={<ArrowRight size={17} />}>
                Enviar registro para revisión
              </Button>
            </div>
          </div>

          <aside className="space-y-3">
            <div className="rounded-2xl border border-lime/15 bg-lime/[0.045] p-4">
              <p className="flex items-center gap-2 text-[12.5px] font-medium text-lime">
                <ShieldCheck size={14} /> Revisión de administrador
              </p>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-white/40">
                Tu cuenta se crea en estado <span className="text-amber-200/80">Pendiente</span>. Hasta que sea
                aprobada no podrás activar la disponibilidad ni recibir solicitudes.
              </p>
              <ul className="mt-2.5 space-y-1.5 text-[11px] text-white/35">
                {[
                  'Podrás iniciar sesión y revisar tu perfil.',
                  'El administrador puede aprobar, rechazar o suspender.',
                  'Recibirás una notificación con el resultado.',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-1.5">
                    <CheckCircle2 size={11} className="mt-0.5 shrink-0 text-lime/60" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-[#0a0a0a] p-4">
              <p className="text-[12.5px] font-medium text-white/70">Resumen de tu vehículo</p>
              <div className="mt-2.5 space-y-1.5 text-[11.5px]">
                <div className="flex justify-between gap-2">
                  <span className="text-white/35">Categoría</span>
                  <span className="text-white/70">{selectedCategory.label}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-white/35">Vehículo</span>
                  <span className="max-w-[60%] truncate text-right text-white/70">
                    {form.brand || '—'} {form.model}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-white/35">Placa</span>
                  <span className="tracking-wider text-white/70">{form.plate || '—'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-white/35">Capacidad</span>
                  <span className="text-white/70">{selectedCategory.capacity} pasajeros</span>
                </div>
              </div>
              <div className="mt-3 rounded-xl bg-white/[0.03] px-3 py-2">
                <p className="text-[10px] uppercase tracking-wider text-white/25">Comisión plataforma</p>
                <p className="text-[13px] font-semibold text-white">
                  {formatCOP(0)} <span className="text-[10.5px] font-normal text-white/35">en el prototipo, configurable desde administración</span>
                </p>
              </div>
            </div>

            <p className="px-1 text-[10.5px] leading-relaxed text-white/25">
              No uses documentos reales. Este registro es una simulación y no sustituye una verificación legal
              de identidad, licencia o vehículo.
            </p>
          </aside>
        </form>
      </main>
    </div>
  )
}
