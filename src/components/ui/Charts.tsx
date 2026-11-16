import clsx from 'clsx'
import type { ReactNode } from 'react'
import { formatCompactCOP, formatNumber } from '../../lib/format'

// ============================================================
// CAVIO — Gráficos SVG/CSS ligeros (sin dependencias externas)
// ============================================================

export interface ChartDatum {
  label: string
  value: number
  secondary?: number
  color?: string
}

export function BarChart({
  data,
  height = 170,
  format = (v: number) => formatNumber(v),
  secondaryLabel,
  primaryLabel,
  className,
}: {
  data: ChartDatum[]
  height?: number
  format?: (value: number) => string
  secondaryLabel?: string
  primaryLabel?: string
  className?: string
}) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.value, d.secondary ?? 0)))
  return (
    <div className={clsx('w-full min-w-0', className)}>
      {(primaryLabel || secondaryLabel) && (
        <div className="mb-3 flex flex-wrap items-center gap-4 text-[11px] text-white/45">
          {primaryLabel && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-lime" /> {primaryLabel}
            </span>
          )}
          {secondaryLabel && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-white/25" /> {secondaryLabel}
            </span>
          )}
        </div>
      )}
      <div
        className="grid w-full items-end gap-1.5 overflow-hidden sm:gap-2"
        style={{ height, gridTemplateColumns: `repeat(${Math.max(data.length, 1)}, minmax(0, 1fr))` }}
      >
        {data.map((datum, i) => {
          const h = (datum.value / max) * 100
          const hs = datum.secondary !== undefined ? (datum.secondary / max) * 100 : 0
          return (
            <div key={`${datum.label}-${i}`} className="group flex h-full min-w-0 flex-col justify-end">
              <div className="relative flex h-full items-end justify-center gap-[2px]">
                <div
                  className="w-full max-w-[16px] rounded-t-md bg-lime/85 transition-all duration-500 group-hover:bg-lime"
                  style={{ height: `${Math.max(h, datum.value > 0 ? 3 : 0)}%` }}
                  title={`${datum.label}: ${format(datum.value)}`}
                />
                {datum.secondary !== undefined && (
                  <div
                    className="w-full max-w-[16px] rounded-t-md bg-white/20 transition-all duration-500 group-hover:bg-white/30"
                    style={{ height: `${Math.max(hs, datum.secondary > 0 ? 3 : 0)}%` }}
                    title={`${datum.label}: ${format(datum.secondary)}`}
                  />
                )}
              </div>
              <span className="mt-2 block truncate text-center text-[9px] leading-tight text-white/35 sm:text-[10px]">
                {datum.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function LineChart({
  data,
  height = 190,
  format = (v: number) => formatNumber(v),
  color = '#C6F36B',
}: {
  data: ChartDatum[]
  height?: number
  format?: (value: number) => string
  color?: string
}) {
  const width = 640
  const padding = { top: 18, right: 12, bottom: 26, left: 12 }
  const innerW = width - padding.left - padding.right
  const innerH = 200 - padding.top - padding.bottom
  const max = Math.max(1, ...data.map((d) => d.value))
  const stepX = data.length > 1 ? innerW / (data.length - 1) : innerW
  const points = data.map((d, i) => ({
    x: padding.left + i * stepX,
    y: padding.top + innerH - (d.value / max) * innerH,
    datum: d,
  }))
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const area = `${line} L${padding.left + innerW},${padding.top + innerH} L${padding.left},${padding.top + innerH} Z`

  return (
    <div className="w-full min-w-0">
      <svg
        viewBox={`0 0 ${width} 200`}
        className="w-full overflow-visible"
        style={{ height }}
        role="img"
        aria-label="Gráfico de evolución"
      >
        <defs>
          <linearGradient id="cavio-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line
            key={t}
            x1={padding.left}
            x2={width - padding.right}
            y1={padding.top + innerH * t}
            y2={padding.top + innerH * t}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
        ))}
        <path d={area} fill="url(#cavio-area)" />
        <path d={line} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3.2" fill="#000" stroke={color} strokeWidth="2" />
            <title>{`${p.datum.label}: ${format(p.datum.value)}`}</title>
          </g>
        ))}
        {points
          .filter((_, i) => data.length <= 6 || i % Math.ceil(data.length / 5) === 0)
          .map((p, i) => (
            <text
              key={`label-${i}`}
              x={p.x}
              y={196}
              textAnchor="middle"
              fill="rgba(255,255,255,0.32)"
              fontSize="10"
            >
              {p.datum.label}
            </text>
          ))}
      </svg>
    </div>
  )
}

export function DonutChart({
  data,
  size = 150,
  centerLabel,
  centerValue,
  format = (v: number) => formatNumber(v),
}: {
  data: ChartDatum[]
  size?: number
  centerLabel?: string
  centerValue?: ReactNode
  format?: (v: number) => string
}) {
  const total = data.reduce((acc, d) => acc + d.value, 0)
  let acc = 0
  const stops = data.map((d, i) => {
    const start = total ? (acc / total) * 100 : 0
    acc += d.value
    const end = total ? (acc / total) * 100 : 0
    return `${d.color ?? ['#C6F36B', '#8FD3FF', '#FFC46B', '#FF8FA3'][i % 4]} ${start}% ${end}%`
  })
  const gradient = total ? `conic-gradient(${stops.join(', ')})` : 'conic-gradient(#222 0% 100%)'

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
      <div
        className="relative grid shrink-0 place-items-center rounded-full"
        style={{ width: size, height: size, background: gradient }}
      >
        <div className="grid place-items-center rounded-full bg-[#0b0b0b] text-center" style={{ width: size * 0.66, height: size * 0.66 }}>
          <div>
            <p className="text-lg font-semibold leading-none text-white">{centerValue ?? format(total)}</p>
            {centerLabel && <p className="mt-1 text-[10px] uppercase tracking-wider text-white/35">{centerLabel}</p>}
          </div>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-2">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center justify-between gap-3 text-[12.5px]">
            <span className="flex min-w-0 items-center gap-2 text-white/60">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: d.color ?? ['#C6F36B', '#8FD3FF', '#FFC46B', '#FF8FA3'][i % 4] }}
              />
              <span className="truncate">{d.label}</span>
            </span>
            <span className="shrink-0 font-medium tabular-nums text-white/80">{format(d.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function HorizontalBars({
  data,
  format = (v: number) => formatNumber(v),
}: {
  data: ChartDatum[]
  format?: (v: number) => string
}) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <ul className="space-y-3">
      {data.map((d, i) => (
        <li key={d.label}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-[12.5px]">
            <span className="truncate text-white/60">{d.label}</span>
            <span className="shrink-0 font-medium tabular-nums text-white/80">{format(d.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(d.value / max) * 100}%`,
                background: d.color ?? ['#C6F36B', '#8FD3FF', '#FFC46B', '#FF8FA3'][i % 4],
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

export function MoneyBars({ data }: { data: { label: string; gmv: number; revenue: number }[] }) {
  return (
    <BarChart
      data={data.map((d) => ({ label: d.label, value: d.gmv, secondary: d.revenue }))}
      format={(v) => formatCompactCOP(v)}
      primaryLabel="Volumen de viajes"
      secondaryLabel="Ingreso plataforma"
      height={180}
    />
  )
}
