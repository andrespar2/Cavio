import { useRef, useState } from 'react'
import { Camera, CheckCircle2, LogOut, Mail, Phone, Shield, UserRound } from 'lucide-react'
import { useCavio } from '../../store/store'
import { getTripsForPassenger } from '../../store/selectors'
import type { User } from '../../types'
import { PageHeader } from '../../components/layout/PageHeader'
import { DemoBadge } from '../../components/Brand'
import { Avatar, StatCard, UserStatusBadge } from '../../components/ui/Display'
import { Button } from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Field'
import { formatDate } from '../../lib/format'
import { useToast } from '../../hooks/useToast'

// ============================================================
// CAVIO — Perfil del pasajero
// ============================================================

export function PassengerProfile() {
  const { state, currentUser, updateUser, logout } = useCavio()
  const { toast } = useToast()
  const [form, setForm] = useState<Partial<User>>({
    firstName: currentUser?.firstName,
    lastName: currentUser?.lastName,
    email: currentUser?.email,
    phone: currentUser?.phone,
    photoUrl: currentUser?.photoUrl,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  if (!currentUser) return null

  const trips = getTripsForPassenger(state, currentUser.id)
  const completed = trips.filter((t) => t.status === 'completed')
  const ratingsGiven = state.ratings.filter((r) => r.passengerId === currentUser.id)

  const set = (key: keyof User, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: '' }))
  }

  const handlePhoto = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast('Selecciona un archivo de imagen (JPG o PNG).', 'error')
      return
    }
    if (file.size > 1.5 * 1024 * 1024) {
      toast('La imagen debe pesar menos de 1.5 MB.', 'error')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setForm((prev) => ({ ...prev, photoUrl: String(reader.result) }))
      toast('Fotografía DEMO cargada. Recuerda guardar los cambios.', 'success')
    }
    reader.readAsDataURL(file)
  }

  const save = () => {
    const nextErrors: Record<string, string> = {}
    if (!form.firstName?.trim()) nextErrors.firstName = 'Escribe tu nombre.'
    if (!form.lastName?.trim()) nextErrors.lastName = 'Escribe tus apellidos.'
    if (!form.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) {
      nextErrors.email = 'Escribe un correo electrónico válido.'
    }
    if (!form.phone?.trim() || form.phone.replace(/\D/g, '').length < 10) {
      nextErrors.phone = 'Escribe un teléfono válido (mínimo 10 dígitos).'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) {
      toast('Revisa los campos marcados.', 'error')
      return
    }
    setSaving(true)
    const result = updateUser(currentUser.id, {
      firstName: form.firstName?.trim(),
      lastName: form.lastName?.trim(),
      email: form.email?.trim(),
      phone: form.phone?.trim(),
      photoUrl: form.photoUrl,
    })
    setSaving(false)
    if (!result.ok) {
      toast(result.error ?? 'No pudimos guardar los cambios.', 'error')
      return
    }
    toast('Perfil actualizado correctamente.', 'success')
  }

  return (
    <div>
      <PageHeader
        title="Mi perfil"
        subtitle="Tus datos personales y preferencias dentro de CAVIO."
        badge={<DemoBadge />}
        actions={
          <Button variant="secondary" size="sm" icon={<LogOut size={14} />} onClick={logout}>
            Cerrar sesión
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="card flex flex-col items-center text-center">
            <div className="relative">
              <Avatar user={{ ...currentUser, ...form } as User} size={86} ring />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border-2 border-black bg-lime text-black transition hover:bg-[#d3ff7f]"
                aria-label="Cambiar fotografía"
              >
                <Camera size={14} />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={(e) => handlePhoto(e.target.files?.[0])}
              />
            </div>
            <p className="mt-3 text-[16px] font-semibold text-white">
              {form.firstName} {form.lastName}
            </p>
            <p className="text-[12px] text-white/35">{form.email}</p>
            <div className="mt-2 flex items-center gap-2">
              <UserStatusBadge status={currentUser.status} />
              <span className="chip">Pasajero</span>
            </div>
            <p className="mt-3 text-[10.5px] text-white/25">
              Miembro desde {formatDate(currentUser.createdAt)}
            </p>
            <p className="mt-1 text-[10px] text-white/20">
              Fotografía y datos de demostración, sin información real.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <StatCard label="Viajes" value={trips.length} accent />
            <StatCard label="Completados" value={completed.length} />
            <StatCard label="Calificaciones" value={ratingsGiven.length} />
            <StatCard label="Estado" value={currentUser.status === 'active' ? 'Activo' : 'Suspendido'} />
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#0a0a0a] p-4">
            <p className="flex items-center gap-2 text-[12.5px] font-medium text-white/70">
              <Shield size={14} className="text-lime" /> Privacidad
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-white/30">
              Tus datos se guardan únicamente en este navegador. No se envían a servidores externos.
            </p>
          </div>
        </div>

        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[16px] font-semibold text-white">Datos personales</h2>
            <span className="text-[10.5px] text-white/25">Los cambios se guardan localmente</span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Nombre" required error={errors.firstName}>
              <Input
                value={form.firstName ?? ''}
                onChange={(e) => set('firstName', e.target.value)}
                icon={<UserRound size={15} />}
                autoComplete="given-name"
              />
            </Field>
            <Field label="Apellidos" required error={errors.lastName}>
              <Input
                value={form.lastName ?? ''}
                onChange={(e) => set('lastName', e.target.value)}
                icon={<UserRound size={15} />}
                autoComplete="family-name"
              />
            </Field>
            <Field label="Correo electrónico" required error={errors.email}>
              <Input
                type="email"
                value={form.email ?? ''}
                onChange={(e) => set('email', e.target.value)}
                icon={<Mail size={15} />}
                autoComplete="email"
              />
            </Field>
            <Field label="Teléfono" required error={errors.phone}>
              <Input
                type="tel"
                value={form.phone ?? ''}
                onChange={(e) => set('phone', e.target.value)}
                icon={<Phone size={15} />}
                autoComplete="tel"
                placeholder="+57 300 123 4567"
              />
            </Field>
            <Field label="Documento DEMO" hint="No se puede modificar en el prototipo.">
              <Input value={`${currentUser.documentType} ${currentUser.documentNumber}`} disabled />
            </Field>
            <Field label="Ciudad">
              <Input value={currentUser.city} disabled />
            </Field>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
            <p className="flex items-center gap-1.5 text-[11px] text-white/30">
              <CheckCircle2 size={12} className="text-lime/70" /> Validación básica activa
            </p>
            <Button onClick={save} loading={saving}>
              Guardar cambios
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
