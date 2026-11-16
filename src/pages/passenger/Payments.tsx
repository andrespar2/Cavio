import { useEffect, useState } from 'react'
import { Banknote, Check, CreditCard, Info, Shield, Smartphone, Wallet } from 'lucide-react'
import clsx from 'clsx'
import type { PaymentMethod } from '../../types'
import { useCavio } from '../../store/store'
import { getTripsForPassenger } from '../../store/selectors'
import { PAYMENT_METHODS } from '../../data/places'
import { PageHeader } from '../../components/layout/PageHeader'
import { DemoBadge } from '../../components/Brand'
import { Button } from '../../components/ui/Button'
import { StatCard } from '../../components/ui/Display'
import { formatCOP } from '../../lib/format'
import { useToast } from '../../hooks/useToast'

// ============================================================
// CAVIO — Métodos de pago DEMO del pasajero
// No se procesan pagos ni se almacenan datos financieros reales.
// ============================================================

const ICONS: Record<PaymentMethod, typeof Wallet> = {
  cash: Banknote,
  card: CreditCard,
  nequi: Smartphone,
  daviplata: Wallet,
}

const DESCRIPTIONS: Record<PaymentMethod, { title: string; detail: string }> = {
  cash: { title: 'Efectivo', detail: 'Paga directamente al conductor al finalizar.' },
  card: { title: 'Tarjeta de crédito', detail: 'Visa •••• 4242 (DEMO)' },
  nequi: { title: 'Nequi', detail: 'Cuenta ••• 310 (DEMO)' },
  daviplata: { title: 'Daviplata', detail: 'Cuenta ••• 320 (DEMO)' },
}

export function PassengerPayments() {
  const { state, currentUser } = useCavio()
  const { toast } = useToast()
  const [selected, setSelected] = useState<PaymentMethod>('cash')
  const storageKey = `cavio.payment.${currentUser?.id ?? 'demo'}`

  useEffect(() => {
    const saved = localStorage.getItem(storageKey) as PaymentMethod | null
    if (saved && PAYMENT_METHODS.some((m) => m.id === saved)) setSelected(saved)
  }, [storageKey])

  const trips = currentUser ? getTripsForPassenger(state, currentUser.id) : []
  const completed = trips.filter((t) => t.status === 'completed')
  const total = completed.reduce((acc, t) => acc + (t.finalFare ?? t.agreedFare ?? 0), 0)
  const average = completed.length ? total / completed.length : 0

  const save = () => {
    localStorage.setItem(storageKey, selected)
    toast('Método de pago DEMO guardado para tus próximos viajes.', 'success')
  }

  return (
    <div>
      <PageHeader
        title="Pagos"
        subtitle="Tus métodos de pago de demostración. Ningún cobro es real."
        badge={<DemoBadge label="Pagos DEMO" />}
      />

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <StatCard label="Viajes pagados" value={completed.length} icon={<CreditCard size={15} />} accent />
        <StatCard label="Total acumulado" value={formatCOP(total)} icon={<Wallet size={15} />} />
        <StatCard label="Ticket promedio" value={formatCOP(average)} icon={<Banknote size={15} />} />
        <StatCard label="Métodos" value={PAYMENT_METHODS.length} icon={<Smartphone size={15} />} hint="Todos DEMO" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-2.5">
          <p className="section-title">Selecciona tu método preferido</p>
          {PAYMENT_METHODS.map((method) => {
            const Icon = ICONS[method.id]
            const active = selected === method.id
            return (
              <button
                key={method.id}
                type="button"
                onClick={() => setSelected(method.id)}
                aria-pressed={active}
                className={clsx(
                  'flex w-full min-w-0 items-center gap-3 rounded-2xl border p-4 text-left transition',
                  active
                    ? 'border-lime/40 bg-lime/[0.06]'
                    : 'border-white/[0.07] bg-[#0a0a0a] hover:border-white/15 hover:bg-[#101010]',
                )}
              >
                <span
                  className={clsx(
                    'grid h-10 w-10 shrink-0 place-items-center rounded-xl',
                    active ? 'bg-lime/15 text-lime' : 'bg-white/[0.05] text-white/45',
                  )}
                >
                  <Icon size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-medium text-white/90">{DESCRIPTIONS[method.id].title}</span>
                  <span className="mt-0.5 block text-[11.5px] text-white/35">{DESCRIPTIONS[method.id].detail}</span>
                </span>
                <span
                  className={clsx(
                    'grid h-6 w-6 shrink-0 place-items-center rounded-full border',
                    active ? 'border-lime bg-lime text-black' : 'border-white/20 text-transparent',
                  )}
                >
                  <Check size={13} strokeWidth={3} />
                </span>
              </button>
            )
          })}
          <Button onClick={save} className="mt-1" fullWidth>
            Guardar preferencia
          </Button>
        </div>

        <div className="space-y-3">
          <div className="card">
            <p className="flex items-center gap-2 text-[13px] font-medium text-white/85">
              <Shield size={15} className="text-lime" /> Pagos seguros
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-white/40">
              CAVIO aún no procesa pagos reales. Esta sección permite probar cómo se elegiría un método de
              pago en la aplicación final.
            </p>
            <div className="mt-3 rounded-xl border border-amber-400/15 bg-amber-400/[0.05] p-3">
              <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-amber-100/60">
                <Info size={12} className="mt-0.5 shrink-0" />
                No se solicitan ni almacenan números de tarjeta, CVV, claves ni datos financieros reales.
              </p>
            </div>
          </div>

          <div className="card">
            <p className="section-title">Resumen de pagos DEMO</p>
            <ul className="mt-3 space-y-2 text-[12px]">
              {PAYMENT_METHODS.map((method) => {
                const count = completed.filter((t) => t.paymentMethod === method.id).length
                const amount = completed
                  .filter((t) => t.paymentMethod === method.id)
                  .reduce((acc, t) => acc + (t.finalFare ?? t.agreedFare ?? 0), 0)
                return (
                  <li key={method.id} className="flex items-center justify-between gap-3">
                    <span className="text-white/45">{method.label}</span>
                    <span className="text-right text-white/70">
                      {formatCOP(amount)} <span className="text-white/25">· {count}</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
