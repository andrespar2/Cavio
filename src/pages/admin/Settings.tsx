import { useEffect, useState } from 'react'
import { Info, RefreshCw, Save, SlidersHorizontal, Sparkles, Wallet } from 'lucide-react'
import type { CategoryConfig } from '../../types'
import { useCavio } from '../../store/store'
import { PageHeader } from '../../components/layout/PageHeader'
import { DemoBadge } from '../../components/Brand'
import { Button } from '../../components/ui/Button'
import { Field, Input } from '../../components/ui/Field'
import { Toggle } from '../../components/ui/Display'
import { ConfirmDialog } from '../../components/ui/Modal'
import { formatCOP } from '../../lib/format'
import { useToast } from '../../hooks/useToast'

// ============================================================
// CAVIO — Configuración DEMO (administrador)
// ============================================================

export function AdminSettings() {
  const { state, updateSettings, restoreDemo } = useCavio()
  const { toast } = useToast()
  const settings = state.settings
  const [form, setForm] = useState({
    city: settings.city,
    commissionPct: String(settings.commissionPct),
    cancelFee: String(settings.cancelFee),
    supportPhone: settings.supportPhone,
    supportEmail: settings.supportEmail,
    autoOffers: settings.autoOffers,
    useRealLocation: settings.useRealLocation,
    simulationSpeed: String(settings.simulationSpeed),
  })
  const [categories, setCategories] = useState<CategoryConfig[]>(settings.categories.map((c) => ({ ...c })))
  const [saving, setSaving] = useState(false)
  const [restoreOpen, setRestoreOpen] = useState(false)

  useEffect(() => {
    setForm({
      city: settings.city,
      commissionPct: String(settings.commissionPct),
      cancelFee: String(settings.cancelFee),
      supportPhone: settings.supportPhone,
      supportEmail: settings.supportEmail,
      autoOffers: settings.autoOffers,
      useRealLocation: settings.useRealLocation,
      simulationSpeed: String(settings.simulationSpeed),
    })
    setCategories(settings.categories.map((c) => ({ ...c })))
  }, [settings])

  const updateCategory = (id: string, patch: Partial<CategoryConfig>) => {
    setCategories((prev) => prev.map((cat) => (cat.id === id ? { ...cat, ...patch } : cat)))
  }

  const save = () => {
    const commission = Number(form.commissionPct)
    const cancelFee = Number(form.cancelFee)
    const speed = Number(form.simulationSpeed)
    if (!Number.isFinite(commission) || commission < 0 || commission > 50) {
      toast('La comisión debe estar entre 0% y 50%.', 'error')
      return
    }
    if (!Number.isFinite(cancelFee) || cancelFee < 0) {
      toast('La tarifa de cancelación no puede ser negativa.', 'error')
      return
    }
    if (!Number.isFinite(speed) || speed < 0.5 || speed > 4) {
      toast('La velocidad de simulación debe estar entre 0.5 y 4.', 'error')
      return
    }
    if (!form.supportEmail.includes('@')) {
      toast('Escribe un correo de soporte válido.', 'error')
      return
    }
    for (const cat of categories) {
      if ([cat.baseFare, cat.perKm, cat.perMin, cat.minFare, cat.etaMin].some((v) => !Number.isFinite(v) || v < 0)) {
        toast(`Revisa las tarifas de ${cat.name}.`, 'error')
        return
      }
      if (cat.minFare < cat.baseFare) {
        toast(`La tarifa mínima de ${cat.name} no puede ser menor que la base.`, 'error')
        return
      }
    }
    setSaving(true)
    updateSettings({
      city: form.city.trim() || 'Bogotá',
      commissionPct: commission,
      cancelFee,
      supportPhone: form.supportPhone,
      supportEmail: form.supportEmail,
      autoOffers: form.autoOffers,
      useRealLocation: form.useRealLocation,
      simulationSpeed: speed,
      categories,
    })
    setSaving(false)
    toast('Configuración actualizada. Los cálculos usan los nuevos valores.', 'success')
  }

  return (
    <div>
      <PageHeader
        title="Configuración"
        subtitle="Parámetros DEMO de tarifas, comisión y simulación. Los cambios afectan los cálculos del sistema."
        badge={<DemoBadge />}
        actions={
          <Button size="sm" icon={<Save size={14} />} onClick={save} loading={saving}>
            Guardar configuración
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="space-y-4">
          <section className="card">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-white">
              <SlidersHorizontal size={15} className="text-lime" /> Parámetros generales
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Ciudad de operación" hint="Los mapas DEMO están centrados en Bogotá.">
                <Input value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} />
              </Field>
              <Field label="Comisión de la plataforma (%)" hint="Afecta ingresos y ganancias calculadas.">
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={50}
                  step={0.5}
                  value={form.commissionPct}
                  onChange={(e) => setForm((p) => ({ ...p, commissionPct: e.target.value }))}
                />
              </Field>
              <Field label="Tarifa de cancelación (COP)" hint="Informativa en este prototipo; no se cobra.">
                <Input
                  type="number"
                  min={0}
                  step={100}
                  value={form.cancelFee}
                  onChange={(e) => setForm((p) => ({ ...p, cancelFee: e.target.value }))}
                />
              </Field>
              <Field label="Correo de soporte">
                <Input
                  type="email"
                  value={form.supportEmail}
                  onChange={(e) => setForm((p) => ({ ...p, supportEmail: e.target.value }))}
                />
              </Field>
              <Field label="Teléfono de soporte">
                <Input
                  value={form.supportPhone}
                  onChange={(e) => setForm((p) => ({ ...p, supportPhone: e.target.value }))}
                />
              </Field>
              <Field label="Velocidad de simulación" hint="0.5× a 4×">
                <Input
                  type="number"
                  min={0.5}
                  max={4}
                  step={0.5}
                  value={form.simulationSpeed}
                  onChange={(e) => setForm((p) => ({ ...p, simulationSpeed: e.target.value }))}
                />
              </Field>
            </div>

            <div className="mt-4 space-y-2">
              <ToggleRow
                label="Ofertas automáticas en simulación"
                hint="Los conductores DEMO envían ofertas a solicitudes activas."
                checked={form.autoOffers}
                onChange={(value) => setForm((p) => ({ ...p, autoOffers: value }))}
              />
              <ToggleRow
                label="Permitir ubicación real del dispositivo"
                hint="Si está desactivado, la app usa ubicación DEMO. En producción se controlaría por permisos."
                checked={form.useRealLocation}
                onChange={(value) => setForm((p) => ({ ...p, useRealLocation: value }))}
              />
            </div>
          </section>

          <section className="card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold text-white">
                <Wallet size={15} className="text-lime" /> Tarifas por categoría (COP)
              </h2>
              <span className="text-[10px] text-white/25">Precios DEMO</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-white/30">
              Tarifa = base + (precio/km × distancia) + (precio/min × duración), con mínimo por categoría.
            </p>
            <div className="mt-3 space-y-3">
              {categories.map((cat) => (
                <div key={cat.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[13px] font-semibold text-white/85">{cat.name}</p>
                    <span className="chip">Cap. {cat.capacity}</span>
                  </div>
                  <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <MiniField label="Base">
                      <NumberInput value={cat.baseFare} onChange={(v) => updateCategory(cat.id, { baseFare: v })} />
                    </MiniField>
                    <MiniField label="Por km">
                      <NumberInput value={cat.perKm} onChange={(v) => updateCategory(cat.id, { perKm: v })} />
                    </MiniField>
                    <MiniField label="Por min">
                      <NumberInput value={cat.perMin} onChange={(v) => updateCategory(cat.id, { perMin: v })} />
                    </MiniField>
                    <MiniField label="Mínima">
                      <NumberInput value={cat.minFare} onChange={(v) => updateCategory(cat.id, { minFare: v })} />
                    </MiniField>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[10.5px]">
                    <span className="text-white/30">
                      ETA referencia: {cat.etaMin} min · Ejemplo 5 km / 15 min:{' '}
                      <span className="text-lime/80">
                        {formatCOP(Math.max(cat.minFare, cat.baseFare + cat.perKm * 5 + cat.perMin * 15))}
                      </span>
                    </span>
                    <label className="flex items-center gap-1.5 text-white/30">
                      ETA
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={cat.etaMin}
                        onChange={(e) => updateCategory(cat.id, { etaMin: Number(e.target.value) })}
                        className="w-14 rounded-lg border border-white/10 bg-[#111] px-2 py-1 text-right text-[11px] text-white"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <div className="card">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-white">
              <Sparkles size={15} className="text-lime" /> Simulación DEMO
            </h2>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-white/35">
              La simulación mueve conductores, genera ofertas automáticas y avanza los estados de los viajes.
              Puedes controlarla desde el panel de simulación.
            </p>
            <div className="mt-3 rounded-xl bg-white/[0.03] px-3 py-2.5 text-[11px] text-white/40">
              Estado actual:{' '}
              <span className={state.simulation.running ? 'text-lime' : 'text-white/60'}>
                {state.simulation.running ? 'En ejecución' : 'Detenida'}
              </span>{' '}
              · Velocidad {state.simulation.speed}×
            </div>
            <div className="mt-2 flex items-center gap-2 text-[10.5px] text-white/25">
              <Info size={11} />
              Los cambios de configuración se aplican a nuevos cálculos y viajes.
            </div>
          </div>

          <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-4">
            <h2 className="flex items-center gap-2 text-[14px] font-semibold text-white">
              <RefreshCw size={14} className="text-red-300" /> Restaurar datos DEMO
            </h2>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-white/40">
              Vuelve a los 20 pasajeros, 15 conductores y 40 viajes originales. Se perderán los cambios que
              hayas hecho en este dispositivo. La sesión actual se mantiene si la cuenta DEMO existe.
            </p>
            <Button variant="danger" size="sm" className="mt-3" onClick={() => setRestoreOpen(true)}>
              Restaurar datos iniciales
            </Button>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#0a0a0a] p-4">
            <p className="section-title">Notas técnicas</p>
            <ul className="mt-2 space-y-1.5 text-[10.5px] leading-relaxed text-white/30">
              <li>· Moneda fija: peso colombiano (COP).</li>
              <li>· Persistencia local en el navegador (localStorage).</li>
              <li>· Comisión aplicada sobre viajes completados.</li>
              <li>· No existen cobros ni transferencias reales.</li>
              <li>· Los cambios quedan registrados en auditoría.</li>
            </ul>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={restoreOpen}
        onClose={() => setRestoreOpen(false)}
        onConfirm={() => {
          restoreDemo()
          setRestoreOpen(false)
          toast('Datos DEMO restaurados a su estado inicial.', 'success')
        }}
        title="Restaurar todos los datos DEMO"
        description="Se eliminarán los viajes, cuentas y cambios locales que hayas creado. Esta acción no se puede deshacer."
        confirmLabel="Restaurar datos"
        danger
        requireReason
        reasonLabel="Escribe “restaurar” para confirmar"
        reasonPlaceholder="restaurar"
      />
    </div>
  )
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-white/75">{label}</p>
        <p className="mt-0.5 text-[10.5px] leading-relaxed text-white/30">{hint}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  )
}

function MiniField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[9.5px] uppercase tracking-wider text-white/30">{label}</span>
      {children}
    </label>
  )
}

function NumberInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <input
      type="number"
      min={0}
      step={100}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full min-w-0 rounded-lg border border-white/10 bg-[#101010] px-2 py-1.5 text-right text-[12px] tabular-nums text-white focus:border-lime/50 focus:outline-none"
    />
  )
}

