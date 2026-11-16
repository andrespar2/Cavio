import { useMemo, useState } from 'react'
import { CalendarDays, Download, Info, TrendingUp, Wallet } from 'lucide-react'
import clsx from 'clsx'
import { useCavio } from '../../store/store'
import { getDriverStats, getTripsForDriver } from '../../store/selectors'
import { PageHeader } from '../../components/layout/PageHeader'
import { DemoBadge } from '../../components/Brand'
import { Button } from '../../components/ui/Button'
import { EmptyState, StatCard } from '../../components/ui/Display'
import { BarChart, HorizontalBars } from '../../components/ui/Charts'
import { formatCOP, formatDate } from '../../lib/format'
import { useToast } from '../../hooks/useToast'

// ============================================================
// CAVIO — Ganancias del conductor (DEMO)
// ============================================================

export function DriverEarnings() {
  const { state, currentDriver } = useCavio()
  const { toast } = useToast()
  const [period, setPeriod] = useState<7 | 14 | 30>(14)

  const driver = currentDriver
  const stats = driver ? getDriverStats(state, driver.id) : null
  const trips = driver ? getTripsForDriver(state, driver.id) : []
  const completed = trips.filter((t) => t.status === 'completed')
  const commissionPct = state.settings.commissionPct

  const series = useMemo(() => {
    const days: { label: string; value: number }[] = []
    for (let i = period - 1; i >= 0; i--) {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - i)
      const next = new Date(d)
      next.setDate(next.getDate() + 1)
      const value = completed
        .filter((t) => {
          const ts = new Date(t.finishedAt ?? t.createdAt).getTime()
          return ts >= d.getTime() && ts < next.getTime()
        })
        .reduce((acc, t) => acc + ((t.finalFare ?? t.agreedFare ?? 0) * (100 - commissionPct)) / 100, 0)
      days.push({
        label: new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short' }).format(d),
        value,
      })
    }
    return days
  }, [completed, commissionPct, period])

  const byCategory = useMemo(() => {
    const map = new Map<string, { label: string; value: number; color?: string }>()
    for (const trip of completed) {
      const category = state.settings.categories.find((c) => c.id === trip.category)
      const net = ((trip.finalFare ?? trip.agreedFare ?? 0) * (100 - commissionPct)) / 100
      const key = category?.id ?? 'other'
      const current = map.get(key)
      map.set(key, {
        label: category?.name.replace('CAVIO ', '') ?? key,
        value: (current?.value ?? 0) + net,
        color: category?.color,
      })
    }
    return Array.from(map.values()).sort((a, b) => b.value - a.value)
  }, [completed, commissionPct, state.settings.categories])

  const exportCsv = () => {
    if (!completed.length) {
      toast('Aún no hay viajes completados para exportar.', 'info')
      return
    }
    const header = ['Codigo', 'Fecha', 'Origen', 'Destino', 'Tarifa COP', 'Comision COP', 'Neto COP']
    const rows = completed.map((t) => {
      const fare = t.finalFare ?? t.agreedFare ?? 0
      return [
        t.code,
        new Date(t.finishedAt ?? t.createdAt).toLocaleString('es-CO'),
        t.origin.label,
        t.destination.label,
        String(fare),
        String(Math.round((fare * commissionPct) / 100)),
        String(Math.round((fare * (100 - commissionPct)) / 100)),
      ]
    })
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\r\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'cavio-ganancias.csv'
    link.click()
    URL.revokeObjectURL(url)
    toast('Ganancias exportadas en CSV.', 'success')
  }

  if (!driver || !stats) {
    return <EmptyState title="Perfil no disponible" description="Restaura los datos DEMO para ver tus ganancias." />
  }

  return (
    <div>
      <PageHeader
        title="Ganancias"
        subtitle="Tus ingresos netos DEMO después de la comisión de la plataforma."
        badge={<DemoBadge />}
        actions={
          <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={exportCsv}>
            Exportar CSV
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <StatCard label="Hoy" value={formatCOP(stats.today)} icon={<Wallet size={15} />} accent hint="Neto DEMO" />
        <StatCard label="Últimos 7 días" value={formatCOP(stats.week)} icon={<CalendarDays size={15} />} />
        <StatCard label="Este mes" value={formatCOP(stats.month)} icon={<TrendingUp size={15} />} />
        <StatCard label="Total histórico" value={formatCOP(stats.total)} icon={<Wallet size={15} />} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)]">
        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-[15px] font-semibold text-white">Ingresos netos por día</h2>
              <p className="text-[11px] text-white/30">Comisión aplicada: {commissionPct}%</p>
            </div>
            <div className="flex gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
              {([7, 14, 30] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPeriod(value)}
                  className={clsx(
                    'rounded-lg px-2.5 py-1 text-[10.5px] font-medium transition',
                    period === value ? 'bg-lime text-black' : 'text-white/45 hover:text-white',
                  )}
                >
                  {value} días
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <BarChart
              data={series}
              height={200}
              format={(v) => formatCOP(v)}
              primaryLabel="Ganancia neta DEMO"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="card">
            <h2 className="text-[14px] font-semibold text-white">Resumen de viajes</h2>
            <div className="mt-3 space-y-2 text-[12px]">
              <Row label="Completados" value={String(stats.completed)} />
              <Row label="Cancelados" value={String(stats.cancelled)} />
              <Row label="Total de viajes" value={String(stats.totalTrips)} />
              <Row label="Tarifa promedio" value={formatCOP(stats.averageFare)} />
              <div className="h-px bg-white/[0.06]" />
              <Row label="Ganancia neta total" value={formatCOP(stats.total)} strong />
            </div>
          </div>
          <div className="card">
            <h2 className="text-[14px] font-semibold text-white">Por categoría</h2>
            <div className="mt-3">
              {byCategory.length ? (
                <HorizontalBars data={byCategory} format={(v) => formatCOP(v)} />
              ) : (
                <p className="text-[11.5px] text-white/30">Aún no hay viajes completados.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-white">Detalle de viajes completados</h2>
          <span className="text-[11px] text-white/30">{completed.length} registros</span>
        </div>
        {completed.length === 0 ? (
          <EmptyState
            title="Sin viajes completados"
            description="Cuando completes tu primer viaje verás aquí el desglose de tarifa, comisión y ganancia neta."
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Viaje</th>
                  <th>Fecha</th>
                  <th>Ruta</th>
                  <th className="text-right">Tarifa</th>
                  <th className="text-right">Comisión</th>
                  <th className="text-right">Neto</th>
                </tr>
              </thead>
              <tbody>
                {completed.slice(0, 40).map((trip) => {
                  const fare = trip.finalFare ?? trip.agreedFare ?? 0
                  const commission = (fare * commissionPct) / 100
                  return (
                    <tr key={trip.id}>
                      <td className="whitespace-nowrap text-[11.5px] font-medium text-white/70">{trip.code}</td>
                      <td className="whitespace-nowrap text-[11.5px] text-white/45">
                        {formatDate(trip.finishedAt ?? trip.createdAt)}
                      </td>
                      <td className="max-w-[280px]">
                        <p className="truncate text-[11.5px] text-white/60">
                          {trip.origin.label} → {trip.destination.label}
                        </p>
                      </td>
                      <td className="text-right text-[11.5px] tabular-nums text-white/60">{formatCOP(fare)}</td>
                      <td className="text-right text-[11.5px] tabular-nums text-red-300/70">−{formatCOP(commission)}</td>
                      <td className="text-right text-[11.5px] font-semibold tabular-nums text-lime">
                        {formatCOP(fare - commission)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-4 flex items-start gap-1.5 rounded-xl bg-white/[0.025] px-3 py-2.5 text-[10.5px] leading-relaxed text-white/30">
        <Info size={12} className="mt-0.5 shrink-0" />
        Las ganancias se calculan con los viajes completados en el sistema DEMO y la comisión configurada por
        el administrador. No representan pagos reales.
      </p>
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={strong ? 'font-medium text-white/70' : 'text-white/40'}>{label}</span>
      <span className={strong ? 'font-semibold text-lime' : 'text-white/70'}>{value}</span>
    </div>
  )
}

