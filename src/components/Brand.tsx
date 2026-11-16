import { Link } from 'react-router-dom'
import clsx from 'clsx'

// ============================================================
// CAVIO — Marca e identidad visual
// Icono oficial: /public/icono-cavio.png (carpeta Icono del repositorio)
// ============================================================

export function Brand({
  size = 'md',
  showWordmark = true,
  to = '/',
  className,
}: {
  size?: 'sm' | 'md' | 'lg'
  showWordmark?: boolean
  to?: string
  className?: string
}) {
  const dimensions = size === 'sm' ? 30 : size === 'lg' ? 64 : 40
  const titleSize = size === 'sm' ? 'text-[15px]' : size === 'lg' ? 'text-3xl' : 'text-lg'

  const content = (
    <span className={clsx('inline-flex min-w-0 items-center gap-2.5', className)}>
      <img
        src="/icono-cavio.png"
        alt="Icono oficial de CAVIO"
        width={dimensions}
        height={dimensions}
        className="shrink-0 object-contain"
        style={{ width: dimensions, height: dimensions }}
      />
      {showWordmark && (
        <span className={clsx('font-semibold tracking-[0.12em] text-white', titleSize)}>CAVIO</span>
      )}
    </span>
  )

  if (!to) return content
  return (
    <Link to={to} className="inline-flex max-w-full items-center" aria-label="CAVIO — Inicio">
      {content}
    </Link>
  )
}

export function DemoBadge({ label = 'Modo DEMO', className }: { label?: string; className?: string }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border border-lime/25 bg-lime/[0.08] px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-lime/90',
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-lime" />
      {label}
    </span>
  )
}
