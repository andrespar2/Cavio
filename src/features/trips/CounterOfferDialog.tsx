import { useEffect, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import type { Trip } from '../../types'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { formatCOP } from '../../lib/format'
import { useToast } from '../../hooks/useToast'

// ============================================================
// CAVIO — Contraoferta del conductor
// ============================================================

export function CounterOfferDialog({
  open,
  onClose,
  trip,
  initialAmount,
  onSend,
  busy,
}: {
  open: boolean
  onClose: () => void
  trip: Trip | null
  initialAmount?: number
  onSend: (amount: number, message: string) => void
  busy?: boolean
}) {
  const { toast } = useToast()
  const [amount, setAmount] = useState(0)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (open && trip) {
      setAmount(initialAmount ?? trip.suggestedFare)
      setMessage('')
    }
  }, [open, trip, initialAmount])

  if (!trip) return null
  const min = 1000
  const max = trip.suggestedFare * 4
  const difference = amount - trip.suggestedFare

  const send = () => {
    if (!Number.isFinite(amount) || amount < min) {
      toast(`La oferta debe ser de al menos ${formatCOP(min)}.`, 'error')
      return
    }
    if (amount > max) {
      toast('La oferta supera el máximo permitido para esta solicitud.', 'error')
      return
    }
    onSend(Math.round(amount), message.trim())
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Enviar contraoferta"
      description={`${trip.code} · ${trip.origin.label} → ${trip.destination.label}`}
      size="sm"
      footer={
        <Button fullWidth size="lg" onClick={send} loading={busy}>
          Enviar oferta de {formatCOP(amount)}
        </Button>
      }
    >
      <div className="space-y-4 pb-2">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5 text-center">
          <p className="text-[10.5px] uppercase tracking-wider text-white/30">Tarifa sugerida por el pasajero</p>
          <p className="mt-0.5 text-[20px] font-semibold text-white">{formatCOP(trip.suggestedFare)}</p>
        </div>

        <div>
          <label htmlFor="counter-amount" className="field-label">
            Tu propuesta (COP)
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAmount((v) => Math.max(min, v - 500))}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.05] transition hover:bg-white/10"
              aria-label="Disminuir oferta"
            >
              <Minus size={16} />
            </button>
            <input
              id="counter-amount"
              type="number"
              inputMode="numeric"
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value))}
              min={min}
              max={max}
              step={100}
              className="input-base text-center text-lg font-semibold tabular-nums"
            />
            <button
              type="button"
              onClick={() => setAmount((v) => Math.min(max, v + 500))}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.05] transition hover:bg-white/10"
              aria-label="Aumentar oferta"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[trip.suggestedFare, Math.round((trip.suggestedFare * 1.05) / 100) * 100, Math.round((trip.suggestedFare * 1.1) / 100) * 100].map(
              (value, index) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAmount(value)}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10.5px] text-white/50 transition hover:border-lime/30 hover:text-lime"
                >
                  {index === 0 ? 'Sugerida' : index === 1 ? '+5%' : '+10%'} · {formatCOP(value)}
                </button>
              ),
            )}
          </div>
          <p className="mt-2 text-[11px] text-white/35">
            {difference > 0
              ? `Estás pidiendo ${formatCOP(difference)} más que la tarifa propuesta.`
              : difference < 0
                ? `Estás ofreciendo ${formatCOP(Math.abs(difference))} menos que la tarifa propuesta.`
                : 'Estás aceptando exactamente la tarifa propuesta.'}
          </p>
        </div>

        <div>
          <label htmlFor="counter-message" className="field-label">
            Mensaje (opcional)
          </label>
          <textarea
            id="counter-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            maxLength={140}
            placeholder="Ej.: Estoy a 3 minutos del punto de recogida."
            className="input-base resize-none"
          />
          <p className="mt-1 text-right text-[10px] text-white/25">{message.length}/140</p>
        </div>

        <p className="rounded-xl bg-white/[0.03] px-3 py-2 text-[10.5px] leading-relaxed text-white/30">
          El pasajero verá tu oferta y decidirá si la acepta. Si acepta, el viaje se asigna automáticamente.
        </p>
      </div>
    </Modal>
  )
}
