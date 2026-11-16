import type { ReactNode } from 'react'
import clsx from 'clsx'

export function PageHeader({
  title,
  subtitle,
  actions,
  badge,
  className,
}: {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  badge?: ReactNode
  className?: string
}) {
  return (
    <div className={clsx('mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-3', className)}>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-[clamp(1.4rem,3.2vw,2rem)] font-semibold leading-tight tracking-tight text-white">
            {title}
          </h1>
          {badge}
        </div>
        {subtitle && (
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-white/40">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
