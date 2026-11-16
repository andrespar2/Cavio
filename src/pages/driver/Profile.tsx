import { useRef, useState } from 'react'
import { BadgeCheck, Car, CheckCircle2, FileText, LogOut, Mail, MapPin, Phone, ShieldCheck, Upload, UserRound } from 'lucide-react'
import clsx from 'clsx'
import type { User, Vehicle } from '../../types'
import { useCavio } from '../../store/store'
import { getCategory, getDriverStats } from '../../store/selectors'
import { PageHeader } from '../../components/layout/PageHeader'
import { DemoBadge } from '../../components/Brand'
import { ApprovalBadge, Avatar, StatCard, UserStatusBadge } from '../../components/ui/Display'
import { Button } from '../../components/ui/Button'
import { Field, Input, Select } from '../../components/ui/Field'
import { formatCOP, formatDate, relativeTime } from '../../lib/format'
import { useToast } from '../../hooks/useToast'

// ============================================================
// CAVIO — Perfil, vehículo y documentos del conductor
// ============================================================

export function DriverProfilePage() {
  const { state, currentUser, currentDriver, updateUser, updateVehicle, updateDocuments, logout } = useCavio()
  const { toast } = useToast()
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [savingPersonal, setSavingPersonal] = useState(false)
  const [savingVehicle, setSavingVehicle] = useState(false)

  if (!currentUser || !currentDriver) {
    return <p className="py-10 text-center text-sm text-white/40">No encontramos tu perfil de conductor.</p>
  }

  const vehicle = state.vehicles.find((v) => v.id === currentDriver.vehicleId)
  const category = vehicle ? getCategory(state, vehicle.category) : null
  const stats = getDriverStats(state, currentDriver.id)

  const [personal, setPersonal] = useState({
    firstName: currentUser.firstName,
    lastName: currentUser.lastName,
    email: currentUser.email,
    phone: currentUser.phone,
    photoUrl: currentUser.photoUrl,
  })
  const [vehicleForm, setVehicleForm] = useState({
    brand: vehicle?.brand ?? '',
    model: vehicle?.model ?? '',
    color: vehicle?.color ?? '',
    plate: vehicle?.plate ?? '',
    year: vehicle?.year ?? new Date().getFullYear() - 3,
    category: vehicle?.category ?? 'economy',
  })

  const savePersonal = () => {
    if (personal.firstName.trim().length < 2 || personal.lastName.trim().length < 2) {
      toast('Revisa tu nombre y apellidos.', 'error')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(personal.email)) {
      toast('Escribe un correo válido.', 'error')
      return
    }
    setSavingPersonal(true)
    const result = updateUser(currentUser.id, {
      firstName: personal.firstName.trim(),
      lastName: personal.lastName.trim(),
      email: personal.email.trim(),
      phone: personal.phone.trim(),
      photoUrl: personal.photoUrl,
    })
    setSavingPersonal(false)
    if (!result.ok) toast(result.error ?? 'No pudimos guardar los cambios.', 'error')
    else toast('Datos personales actualizados.', 'success')
  }

  const saveVehicle = () => {
    if (!vehicle) return
    if (!/^[A-Za-z]{3}\d{3}$/.test(vehicleForm.plate.trim())) {
      toast('La placa debe tener el formato ABC123.', 'error')
      return
    }
    if (vehicleForm.brand.trim().length < 2 || vehicleForm.model.trim().length < 1) {
      toast('Completa la marca y el modelo.', 'error')
      return
    }
    setSavingVehicle(true)
    const patch: Partial<Vehicle> = {
      brand: vehicleForm.brand.trim(),
      model: vehicleForm.model.trim(),
      color: vehicleForm.color.trim(),
      plate: vehicleForm.plate.trim().toUpperCase(),
      year: Number(vehicleForm.year),
      category: vehicleForm.category,
      capacity: vehicleForm.category === 'xl' ? 6 : vehicleForm.category === 'moto' ? 1 : 4,
    }
    updateVehicle(currentDriver.id, patch)
    setSavingVehicle(false)
    toast('Información del vehículo actualizada.', 'success')
  }

  const handleDocument = (kind: string, file: File | undefined) => {
    if (!file) return
    if (file.size > 3 * 1024 * 1024) {
      toast('El archivo debe pesar menos de 3 MB.', 'error')
      return
    }
    const documents = currentDriver.documents.map((doc) =>
      doc.kind === kind
        ? { ...doc, status: 'cargado' as const, fileName: file.name, uploadedAt: new Date().toISOString() }
        : doc,
    )
    updateDocuments(currentDriver.id, documents)
    toast('Documento DEMO actualizado (solo se guarda el nombre).', 'success')
  }

  const handlePhoto = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast('Selecciona una imagen.', 'error')
      return
    }
    if (file.size > 1.5 * 1024 * 1024) {
      toast('La imagen debe pesar menos de 1.5 MB.', 'error')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setPersonal((prev) => ({ ...prev, photoUrl: String(reader.result) }))
    reader.readAsDataURL(file)
  }

  const loadedDocs = currentDriver.documents.filter((d) => d.status === 'cargado').length

  return (
    <div>
      <PageHeader
        title="Perfil y vehículo"
        subtitle="Administra tus datos, tu vehículo y tu documentación DEMO."
        badge={<DemoBadge />}
        actions={
          <Button variant="secondary" size="sm" icon={<LogOut size={14} />} onClick={logout}>
            Cerrar sesión
          </Button>
        }
      />

      {currentDriver.approval !== 'approved' && (
        <div
          className={clsx(
            'mb-4 rounded-2xl border p-4',
            currentDriver.approval === 'pending'
              ? 'border-amber-400/20 bg-amber-400/[0.05]'
              : 'border-red-500/20 bg-red-500/[0.05]',
          )}
        >
          <div className="flex flex-wrap items-center gap-2">
            <ApprovalBadge approval={currentDriver.approval} />
            <p className="text-[13px] font-medium text-white/80">
              {currentDriver.approval === 'pending'
                ? 'Tu registro está pendiente de aprobación.'
                : currentDriver.approval === 'rejected'
                  ? 'Tu registro fue rechazado.'
                  : 'Tu cuenta está suspendida.'}
            </p>
          </div>
          <p className="mt-1 text-[11.5px] leading-relaxed text-white/40">
            {currentDriver.reviewNote ??
              'Completa tu documentación y espera la revisión del administrador. Mientras tanto no podrás recibir solicitudes.'}
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="card text-center">
            <div className="flex justify-center">
              <div className="relative">
                <Avatar user={{ ...currentUser, ...personal } as User} size={82} ring />
                <label className="absolute -bottom-1 -right-1 grid h-8 w-8 cursor-pointer place-items-center rounded-full border-2 border-black bg-lime text-black">
                  <Upload size={13} />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handlePhoto(e.target.files?.[0])}
                  />
                </label>
              </div>
            </div>
            <p className="mt-3 text-[15px] font-semibold text-white">
              {personal.firstName} {personal.lastName}
            </p>
            <p className="text-[11.5px] text-white/35">{personal.email}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-1.5">
              <ApprovalBadge approval={currentDriver.approval} />
              <UserStatusBadge status={currentUser.status} />
            </div>
            <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-white/35">
              <BadgeCheck size={12} className="text-lime" /> Conductor CAVIO
            </div>
            <p className="mt-2 text-[10px] text-white/20">Miembro desde {formatDate(currentDriver.createdAt)}</p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <StatCard label="Viajes" value={stats.completed} accent />
            <StatCard label="Ganancia neta" value={formatCOP(stats.total)} />
            <StatCard label="Documentos" value={`${loadedDocs}/${currentDriver.documents.length}`} />
            <StatCard label="Calificación" value={`${currentDriver.rating.toFixed(1)} ★`} />
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#0a0a0a] p-4">
            <p className="flex items-center gap-2 text-[12.5px] font-medium text-white/70">
              <ShieldCheck size={14} className="text-lime" /> Ubicación
            </p>
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-white/35">
              <MapPin size={11} /> {currentDriver.location.lat.toFixed(4)}, {currentDriver.location.lng.toFixed(4)}
            </p>
            <p className="mt-1 text-[10.5px] text-white/25">
              Fuente: {currentDriver.locationSource === 'gps' ? 'GPS real' : 'DEMO'} · {relativeTime(currentDriver.lastLocationAt)}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <section className="card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold text-white">
                <UserRound size={15} className="text-lime" /> Datos personales
              </h2>
              <span className="text-[10px] text-white/25">Datos DEMO</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Nombre">
                <Input value={personal.firstName} onChange={(e) => setPersonal((p) => ({ ...p, firstName: e.target.value }))} />
              </Field>
              <Field label="Apellidos">
                <Input value={personal.lastName} onChange={(e) => setPersonal((p) => ({ ...p, lastName: e.target.value }))} />
              </Field>
              <Field label="Correo electrónico">
                <Input
                  type="email"
                  value={personal.email}
                  onChange={(e) => setPersonal((p) => ({ ...p, email: e.target.value }))}
                  icon={<Mail size={14} />}
                />
              </Field>
              <Field label="Teléfono">
                <Input
                  type="tel"
                  value={personal.phone}
                  onChange={(e) => setPersonal((p) => ({ ...p, phone: e.target.value }))}
                  icon={<Phone size={14} />}
                />
              </Field>
              <Field label="Documento (no editable)">
                <Input value={`${currentUser.documentType} ${currentUser.documentNumber}`} disabled />
              </Field>
              <Field label="Número de licencia (no editable)">
                <Input value={currentDriver.licenseNumber} disabled />
              </Field>
            </div>
            <div className="mt-4 flex justify-end">
              <Button size="sm" onClick={savePersonal} loading={savingPersonal}>
                Guardar datos
              </Button>
            </div>
          </section>

          <section className="card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold text-white">
                <Car size={15} className="text-lime" /> Vehículo
              </h2>
              {category && <span className="chip">{category.name}</span>}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Marca">
                <Input value={vehicleForm.brand} onChange={(e) => setVehicleForm((p) => ({ ...p, brand: e.target.value }))} />
              </Field>
              <Field label="Modelo">
                <Input value={vehicleForm.model} onChange={(e) => setVehicleForm((p) => ({ ...p, model: e.target.value }))} />
              </Field>
              <Field label="Color">
                <Input value={vehicleForm.color} onChange={(e) => setVehicleForm((p) => ({ ...p, color: e.target.value }))} />
              </Field>
              <Field label="Placa">
                <Input
                  value={vehicleForm.plate}
                  onChange={(e) => setVehicleForm((p) => ({ ...p, plate: e.target.value.toUpperCase() }))}
                  maxLength={6}
                  className="uppercase tracking-wider"
                />
              </Field>
              <Field label="Año">
                <Input
                  type="number"
                  value={vehicleForm.year}
                  onChange={(e) => setVehicleForm((p) => ({ ...p, year: Number(e.target.value) }))}
                  min={2000}
                  max={new Date().getFullYear() + 1}
                />
              </Field>
              <Field label="Categoría">
                <Select
                  value={vehicleForm.category}
                  onChange={(e) => setVehicleForm((p) => ({ ...p, category: e.target.value as typeof vehicleForm.category }))}
                >
                  {state.settings.categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-[10.5px] text-white/25">
                Capacidad: {vehicleForm.category === 'xl' ? 6 : vehicleForm.category === 'moto' ? 1 : 4} pasajeros
              </p>
              <Button size="sm" onClick={saveVehicle} loading={savingVehicle}>
                Guardar vehículo
              </Button>
            </div>
          </section>

          <section className="card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold text-white">
                <FileText size={15} className="text-lime" /> Documentación DEMO
              </h2>
              <span className="text-[10px] text-white/25">{loadedDocs}/{currentDriver.documents.length} cargados</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-white/30">
              Solo se almacena el nombre del archivo. La aprobación final la realiza un administrador.
            </p>
            <div className="mt-3 space-y-2">
              {currentDriver.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex flex-wrap items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
                >
                  <span
                    className={clsx(
                      'grid h-8 w-8 shrink-0 place-items-center rounded-lg',
                      doc.status === 'cargado' ? 'bg-lime/10 text-lime' : 'bg-amber-400/10 text-amber-300',
                    )}
                  >
                    {doc.status === 'cargado' ? <CheckCircle2 size={14} /> : <FileText size={14} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium text-white/75">{doc.name}</p>
                    <p className="truncate text-[10.5px] text-white/30">
                      {doc.fileName ?? (doc.status === 'cargado' ? 'Documento DEMO registrado' : 'Pendiente de carga')}
                      {doc.uploadedAt ? ` · ${formatDate(doc.uploadedAt)}` : ''}
                    </p>
                  </div>
                  <input
                    ref={(el) => {
                      fileRefs.current[doc.kind] = el
                    }}
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => handleDocument(doc.kind, e.target.files?.[0])}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    className="shrink-0"
                    icon={<Upload size={12} />}
                    onClick={() => fileRefs.current[doc.kind]?.click()}
                  >
                    {doc.status === 'cargado' ? 'Actualizar' : 'Cargar'}
                  </Button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

