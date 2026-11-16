import { Star } from 'lucide-react'
import { useState } from 'react'
import type { Trip } from '../../types'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { RatingInput, Stars } from '../../components/ui/Display'
import { useCavio } from '../../store/store'
import { formatCOP, formatDistance, formatDuration } from '../../lib/format'
import { useToast } from '../../hooks/useToast'

// ============================================================
// CAVIO — Calificación posterior al viaje
// ============================================================

export function RatingDialog({
  open,
  trip,
  onClose,
}: {
  open: boolean
  trip: Trip | null
  onClose: () => void
}) {
  const { state, rateTrip } = useCavio()
  const { toast } = useToast()
  const [score, setScore] = useState(5)
  const [comment, setComment] = useState('')
  const [sending, setSending] = useState(false)

  if (!trip) return null
  const driver = state.drivers.find((d) => d.id === trip.driverId)
  const driverUser = driver ? state.users.find((u) => u.id === driver.userId) : undefined

  const handleSubmit = () => {
    setSending(true)
    const result = rateTrip(trip.id, score, comment)
    setSending(false)
    if (result.ok) {
      toast('¡Gracias por calificar a tu conductor!', 'success')
      setComment('')
      setScore(5)
      onClose()
    } else {
      toast(result.error ?? 'No pudimos guardar tu calificación.', 'error')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="¿Cómo estuvo tu viaje?"
      description={`Viaje ${trip.code} · ${formatDistance(trip.distanceKm)} · ${formatDuration(trip.durationMin)}`}
      size="sm"
      footer={
        <Button fullWidth size="lg" onClick={handleSubmit} loading={sending} disabled={Boolean(trip.ratingId)}>
          {trip.ratingId ? 'Viaje ya calificado' : 'Enviar calificación'}
        </Button>
      }
    >
      <div className="pb-2">
        {driverUser && (
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="text-center">
              <p className="text-[14px] font-semibold text-white">
                {driverUser.firstName} {driverUser.lastName}
              </p>
              <p className="mt-0.5 text-[11.5px] text-white/35">Tu conductor</p>
              <div className="mt-1 flex justify-center">
                <Stars value={driver?.rating ?? 5} size={12} />
              </div>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-center">
          <p className="mb-2 text-[12px] text-white/40">Califica tu experiencia</p>
          <RatingInput value={score} onChange={setScore} />
          <p className="mt-2 text-[12px] text-white/50">
            {score === 5 ? '¡Excelente!' : score === 4 ? 'Muy bueno' : score === 3 ? 'Aceptable' : 'Podemos mejorar'}
          </p>
        </div>

        <div className="mt-4">
          <label htmlFor="rating-comment" className="field-label">
            Comentario (opcional)
          </label>
          <textarea
            id="rating-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            maxLength={240}
            placeholder="Cuéntanos cómo fue tu experiencia…"
            className="input-base resize-none"
          />
          <p className="mt-1 text-right text-[10.5px] text-white/25">{comment.length}/240</p>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-white/[0.03] px-2 py-2">
            <p className="text-[10px] uppercase tracking-wider text-white/30">Tarifa</p>
            <p className="mt-0.5 truncate text-[12.5px] font-semibold text-white">
              {formatCOP(trip.finalFare ?? trip.agreedFare ?? trip.suggestedFare)}
            </p>
          </div>
          <div className="rounded-xl bg-white/[0.03] px-2 py-2">
            <p className="text-[10px] uppercase tracking-wider text-white/30">Distancia</p>
            <p className="mt-0.5 truncate text-[12.5px] font-semibold text-white">{formatDistance(trip.distanceKm)}</p>
          </div>
          <div className="rounded-xl bg-white/[0.03] px-2 py-2">
            <p className="text-[10px] uppercase tracking-wider text-white/30">Duración</p>
            <p className="mt-0.5 truncate text-[12.5px] font-semibold text-white">{formatDuration(trip.durationMin)}</p>
          </div>
        </div>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-[10.5px] text-white/25">
          <Star size={10} /> Las calificaciones DEMO se guardan localmente.
        </p>
      </div>
    </Modal>
  )
}
