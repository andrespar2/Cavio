import { Star } from 'lucide-react'
import clsx from 'clsx'
import type { ReactNode } from 'react'
import type { ApprovalStatus, DriverProfile, TripStatus, User } from '../../types'
import { TRIP_STATUS_COLOR, TRIP_STATUS_LABEL, formatCOP, initials } from '../../lib/format'

// ============================================================
// CAVIO — Componentes de presentación reutilizables
// ============================================================

export function Avatar({
  user,
  size = 44,
  className,
  ring = false,
}: {
  user?: Pick<User, 'firstName' | 'lastName' | 'photoUrl'> | null
  size?: number
  className?: string
  ring?: boolean
}) {
  const name = user ? `${user.firstName}${user.lastName}` : 'CAVIO'
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) % 360
  const gradient = `linear-gradient(145deg, hsl(${hash} 45% 28%), hsl(${(hash + 50) % 360} 55% 14%))`

  return (
    <span
      className={clsx(
        'relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 font-semibold text-white/90',
        ring && 'ring-2 ring-lime/50 ring-offset-2 ring-offset-black',
        className,
      )}
      style={{ width: size, height: size, background: gradient, fontSize: Math.max(11, size * 0.34) }}
      aria-hidden={!user}
    >
      {user?.photoUrl ? (
        <img src={user.photoUrl} alt="" className="h-full w-full object-cover" />
      ) : user ? (
        initials(user.firstName, user.lastName)
      ) : (
        'C'
      )}
    </span>
  )
}

export function Spinner({ label, fullPage = false }: { label?: string; fullPage?: boolean }) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center gap-3 text-center',
        fullPage ? 'min-h-[60dvh]' : 'py-10',
      )}
      role="status"
      aria-live="polite"
    >
      <span className="relative grid h-12 w-12 place-items-center">
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-white/10 border-t-lime" />
        <span className="h-1.5 w-1.5 rounded-full bg-lime" />
      </span>
      {label && <p className="text-sm text-white/45">{label}</p>}
    </div>
  )
}

export function TripStatusBadge({ status, className }: { status: TripStatus; className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none',
        TRIP_STATUS_COLOR[status],
        className,
      )}
    >
      <span className="truncate">{TRIP_STATUS_LABEL[status]}</span>
    </span>
  )
}

const APPROVAL_META: Record<ApprovalStatus, { label: string; className: string }> = {
  pending: { label: 'Pendiente', className: 'bg-amber-400/10 text-amber-300 border-amber-400/20' },
  approved: { label: 'Aprobado', className: 'bg-lime/10 text-lime border-lime/25' },
  rejected: { label: 'Rechazado', className: 'bg-red-500/10 text-red-300 border-red-500/20' },
  suspended: { label: 'Suspendido', className: 'bg-red-500/10 text-red-300 border-red-500/25' },
}

export function ApprovalBadge({ approval }: { approval: ApprovalStatus }) {
  const meta = APPROVAL_META[approval]
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none',
        meta.className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {meta.label}
    </span>
  )
}

export function UserStatusBadge({ status }: { status: User['status'] }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none',
        status === 'active'
          ? 'bg-lime/10 text-lime border-lime/25'
          : 'bg-red-500/10 text-red-300 border-red-500/25',
      )}
    >
      {status === 'active' ? 'Activo' : 'Suspendido'}
    </span>
  )
}

export function Stars({
  value,
  count,
  size = 13,
  showValue = true,
}: {
  value: number
  count?: number
  size?: number
  showValue?: boolean
}) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap" aria-label={`Calificación ${value} de 5`}>
      <Star size={size} className="fill-lime text-lime" />
      {showValue && <span className="text-[12.5px] font-semibold text-white/90">{value.toFixed(1)}</span>}
      {count !== undefined && <span className="text-[11.5px] text-white/35">({count})</span>}
    </span>
  )
}

export function RatingInput({
  value,
  onChange,
  size = 34,
}: {
  value: number
  onChange: (value: number) => void
  size?: number
}) {
  return (
    <div className="flex items-center justify-center gap-2" role="radiogroup" aria-label="Calificación">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} estrella${star > 1 ? 's' : ''}`}
          onClick={() => onChange(star)}
          className="tap rounded-xl p-1.5 transition-transform hover:scale-110 active:scale-95"
        >
          <Star
            size={size}
            className={star <= value ? 'fill-lime text-lime' : 'fill-white/5 text-white/25'}
          />
        </button>
      ))}
    </div>
  )
}

export function StatCard({
  label,
  value,
  icon,
  hint,
  trend,
  accent = false,
  className,
}: {
  label: string
  value: ReactNode
  icon?: ReactNode
  hint?: string
  trend?: { value: string; positive?: boolean }
  accent?: boolean
  className?: string
}) {
  return (
    <div
      className={clsx(
        'min-w-0 rounded-2xl border p-4 transition-colors sm:p-5',
        accent
          ? 'border-lime/20 bg-gradient-to-br from-lime/[0.12] to-transparent'
          : 'border-white/[0.07] bg-[#0b0b0b]',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-[10.5px] font-medium uppercase leading-snug tracking-[0.05em] text-white/40">
          {label}
        </p>
        {icon && (
          <span
            className={clsx(
              'grid h-7 w-7 shrink-0 place-items-center rounded-xl',
              accent ? 'bg-lime/15 text-lime' : 'bg-white/[0.05] text-white/50',
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <p className="mt-2 break-words text-[clamp(1.25rem,2.4vw,1.75rem)] font-semibold leading-tight text-white">
        {value}
      </p>
      {(hint || trend) && (
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {trend && (
            <span className={clsx('text-xs font-semibold', trend.positive ? 'text-lime' : 'text-red-300')}>
              {trend.value}
            </span>
          )}
          {hint && <span className="text-[11.5px] text-white/35">{hint}</span>}
        </div>
      )}
    </div>
  )
}

export function SectionHeader({
  title,
  description,
  action,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={clsx('flex flex-wrap items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <h2 className="text-[17px] font-semibold leading-tight text-white sm:text-lg">{title}</h2>
        {description && <p className="mt-0.5 text-[12.5px] leading-snug text-white/40">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.015] px-6 py-10 text-center">
      {icon && (
        <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.05] text-white/40">
          {icon}
        </span>
      )}
      <p className="text-[15px] font-semibold text-white/85">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-white/40">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const pct = Math.min(100, Math.max(0, value))
  return (
    <div className={clsx('h-1.5 w-full overflow-hidden rounded-full bg-white/10', className)}>
      <div className="h-full rounded-full bg-lime transition-all duration-500" style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative h-7 w-[46px] shrink-0 rounded-full border transition-colors disabled:opacity-40',
        checked ? 'border-lime/40 bg-lime' : 'border-white/15 bg-white/10',
      )}
    >
      <span
        className={clsx(
          'absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full transition-all',
          checked ? 'left-[22px] bg-black' : 'left-[3px] bg-white/70',
        )}
      />
    </button>
  )
}

export function Money({
  value,
  className,
  strike,
}: {
  value: number
  className?: string
  strike?: boolean
}) {
  return (
    <span className={clsx('tabular-nums', strike && 'text-white/35 line-through', className)}>
      {formatCOP(value)}
    </span>
  )
}

export function DriverChip({ driver, user }: { driver: DriverProfile; user?: User }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Avatar user={user} size={28} />
      <span className="truncate text-xs text-white/60">{user?.firstName ?? 'Conductor'}</span>
      <Stars value={driver.rating} size={11} showValue={false} />
    </div>
  )
}
