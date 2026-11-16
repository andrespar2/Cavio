import { useMemo, useState } from 'react'
import { Download, Info, Settings2, TrendingUp, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { useCavio } from '../../store/store'
import { getDriverVehicle, getUser } from '../../store/selectors'
import { PageHeader } from '../../components/layout/PageHeader'
import { DemoBadge } from '../../components/Brand'
import { Button } from '../../components/ui/Button'
import { StatCard } from '../../components/ui/Display'
import { DonutChart, MoneyBars } from '../../components/ui/Charts'
import { formatCOP, formatCompactCOP } from '../../lib/format'
import { useToast } from '../../hooks/useToast'

// ============================================================
// CAVIO — Finanzas DEMO (administrador)
// ============================================================

type Period = 7 | 14 | 30 | 0

export function AdminFinance() {
  const { state } = useCavio()
  const { toast } = useToast()
  const [period, setPeriod] = useState<Period>(14)

  const completed = useMemo(
    () =>
      state.trips
        .filter((t) => t.status === 'completed')
        .filter((t) => {
          if (period === 0) return true
          return Date.now() - new Date(t.finishedAt ?? t.createdAt).getTime() <= period * 86400000
        }),
    [state.trips, period],
  )

  const commissionPct = state.settings.commissionPct
  const gmv = completed.reduce((acc, t) => acc + (t.finalFare ?? t.agreedFare ?? 0), 0)
  const revenue = (gmv * commissionPct) / 100
  const driverEarnings = gmv - revenue
  const avgTicket = completed.length ? gmv / completed.length : 0
  const averageCommission = completed.length ? revenue / completed.length : 0

  const series = useMemo(() => {
    const count = period === 0 ? 30 : period
    const days: { label: string; gmv: number; revenue: number }[] = []
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - i)
      const next = new Date(d)
      next.setDate(next.getDate() + 1)
      const dayTrips = completed.filter((t) => {
        const ts = new Date(t.finishedAt ?? t.createdAt).getTime()
        return ts >= d.getTime() && ts < next.getTime()
      })
      const dayGmv = dayTrips.reduce((acc, t) => acc + (t.finalFare ?? t.agreedFare ?? 0), 0)
      days.push({
        label: new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short' }).format(d),
        gmv: dayGmv,
        revenue: (dayGmv * commissionPct) / 100,
      })
    }
    return days
  }, [completed, commissionPct, period])

  const byCategory = useMemo(
    () =>
      state.settings.categories.map((cat) => {
        const trips = completed.filter((t) => t.category === cat.id)
        const amount = trips.reduce((acc, t) => acc + (t.finalFare ?? t.agreedFare ?? 0), 0)
        return { label: cat.name.replace('CAVIO ', ''), value: amount, color: cat.color }
      }),
    [completed, state.settings.categories],
  )

  const payouts = useMemo(() => {
    const map = new Map<string, { driverId: string; trips: number; gmv: number; commission: number; net: number }>()
    for (const trip of completed) {
      if (!trip.driverId) continue
      const fare = trip.finalFare ?? trip.agreedFare ?? 0
      const current = map.get(trip.driverId) ?? { driverId: trip.driverId, trips: 0, gmv: 0, commission: 0, net: 0 }
      current.trips += 1
      current.gmv += fare
      current.commission += (fare * commissionPct) / 100
      current.net += (fare * (100 - commissionPct)) / 100
      map.set(trip.driverId, current)
    }
    return Array.from(map.values())
      .map((row) => {
        const driver = state.drivers.find((d) => d.id === row.driverId)
        return { ...row, driver, user: driver ? getUser(state, driver.userId) : undefined, vehicle: driver ? getDriverVehicle(state, driver.id) : undefined }
      })
      .sort((a, b) => b.gmv - a.gmv)
  }, [completed, commissionPct, state])

  const exportCsv = () => {
    if (!completed.length) {
      toast('No hay viajes completados en el período.', 'info')
      return
    }
    const header = ['Codigo', 'Fecha', 'Categoria', 'Tarifa COP', 'Comision COP', 'Neto conductor COP']
    const rows = completed.map((t) => {
      const fare = t.finalFare ?? t.agreedFare ?? 0
      return [
        t.code,
        new Date(t.finishedAt ?? t.createdAt).toLocaleString('es-CO'),
        t.category,
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
    link.download = 'cavio-finanzas.csv'
    link.click()
    URL.revokeObjectURL(url)
    toast('Reporte financiero exportado.', 'success')
  }

  return (
    <div>
      <PageHeader
        title="Finanzas DEMO"
        subtitle="Volumen de viajes, comisión de la plataforma y liquidaciones simuladas."
        badge={<DemoBadge />}
        actions={
          <>
            <Link to="/admin/configuracion">
              <Button variant="secondary" size="sm" icon={<Settings2 size={14} />}>
                Comisión {commissionPct}%
              </Button>
            </Link>
            <Button size="sm" icon={<Download size={14} />} onClick={exportCsv}>
              Exportar
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1 sm:w-fit">
        {([
          { value: 7, label: '7 días' },
          { value: 14, label: '14 días' },
          { value: 30, label: '30 días' },
          { value: 0, label: 'Todo' },
        ] as const).map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setPeriod(option.value as Period)}
            className={clsx(
              'rounded-lg px-3 py-1.5 text-[11.5px] font-medium transition',
              period === option.value ? 'bg-lime text-black' : 'text-white/45 hover:text-white',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <StatCard label="Volumen de viajes" value={formatCompactCOP(gmv)} icon={<TrendingUp size={15} />} accent hint={`${completed.length} viajes`} />
        <StatCard label="Ingreso plataforma" value={formatCompactCOP(revenue)} icon={<Wallet size={15} />} hint={`${commissionPct}% de comisión`} />
        <StatCard label="Ganancias conductor" value={formatCompactCOP(driverEarnings)} icon={<Wallet size={15} />} hint="Neto DEMO" />
        <StatCard label="Ticket promedio" value={formatCOP(avgTicket)} icon={<TrendingUp size={15} />} hint={`Comisión media ${formatCOP(averageCommission)}`} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)]">
        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-[15px] font-semibold text-white">Volumen e ingreso por día</h2>
              <p className="text-[11px] text-white/30">Últimos {period === 0 ? 30 : period} días · COP</p>
            </div>
            <span className="text-[10.5px] text-white/25">Datos DEMO</span>
          </div>
          <div className="mt-4">
            <MoneyBars data={series} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="card">
            <h2 className="text-[15px] font-semibold text-white">Volumen por categoría</h2>
            <div className="mt-4">
              <DonutChart
                data={byCategory}
                centerLabel="COP"
                centerValue={formatCompactCOP(gmv)}
                format={(v) => formatCompactCOP(v)}
              />
            </div>
          </div>

          <div className="card">
            <p className="section-title mb-2">Distribución de comisiones</p>
            <div className="space-y-2 text-[12px]">
              <div className="flex justify-between gap-2">
                <span className="text-white/40">Volumen total</span>
                <span className="font-medium tabular-nums text-white/75">{formatCOP(gmv)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-white/40">Comisión plataforma ({commissionPct}%)</span>
                <span className="font-medium tabular-nums text-lime">{formatCOP(revenue)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-white/40">Ganancia conductores</span>
                <span className="font-medium tabular-nums text-white/75">{formatCOP(driverEarnings)}</span>
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-lime" style={{ width: `${commissionPct}%` }} />
            </div>
            <p className="mt-1.5 text-[10px] text-white/25">
              {commissionPct}% plataforma · {100 - commissionPct}% conductor
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[15px] font-semibold text-white">Liquidaciones DEMO por conductor</h2>
          <span className="text-[11px] text-white/30">{payouts.length} conductores con viajes</span>
        </div>
        <div className="space-y-2 md:hidden">
          {payouts.length === 0 ? (
            <p className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-6 text-center text-[11.5px] text-white/30">
              No hay viajes completados en el período seleccionado.
            </p>
          ) : (
            payouts.slice(0, 15).map((row) => (
              <div key={row.driverId} className="rounded-2xl border border-white/[0.07] bg-[#0a0a0a] p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-medium text-white/80">
                      {row.user ? `${row.user.firstName} ${row.user.lastName}` : 'Conductor'}
                    </p>
                    <p className="truncate text-[10.5px] text-white/30">
                      {row.vehicle ? `${row.vehicle.brand} ${row.vehicle.model} · ${row.vehicle.plate}` : '—'}
                    </p>
                  </div>
                  <span className="shrink-0 text-[13px] font-semibold tabular-nums text-lime">{formatCOP(row.net)}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-white/35">
                  <span>{row.trips} viajes</span>
                  <span>Volumen {formatCOP(row.gmv)}</span>
                  <span className="text-red-300/60">Comisión {formatCOP(row.commission)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="table-wrap hidden md:block">
          <table className="data-table min-w-[820px]">
            <thead>
              <tr>
                <th>Conductor</th>
                <th>Vehículo</th>
                <th className="text-right">Viajes</th>
                <th className="text-right">Volumen</th>
                <th className="text-right">Comisión</th>
                <th className="text-right">Neto conductor</th>
              </tr>
            </thead>
            <tbody>
              {payouts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[11.5px] text-white/30">
                    No hay viajes completados en el período seleccionado.
                  </td>
                </tr>
              ) : (
                payouts.map((row) => (
                  <tr key={row.driverId}>
                    <td className="max-w-[220px] truncate text-[11.5px] text-white/70">
                      {row.user ? `${row.user.firstName} ${row.user.lastName}` : 'Conductor'}
                    </td>
                    <td className="whitespace-nowrap text-[11px] text-white/40">
                      {row.vehicle ? `${row.vehicle.brand} ${row.vehicle.model} · ${row.vehicle.plate}` : '—'}
                    </td>
                    <td className="text-right text-[11.5px] text-white/55">{row.trips}</td>
                    <td className="text-right text-[11.5px] tabular-nums text-white/65">{formatCOP(row.gmv)}</td>
                    <td className="text-right text-[11.5px] tabular-nums text-red-300/70">{formatCOP(row.commission)}</td>
                    <td className="text-right text-[11.5px] font-semibold tabular-nums text-lime">{formatCOP(row.net)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-4 flex items-start gap-1.5 rounded-xl bg-white/[0.025] px-3 py-2.5 text-[10.5px] leading-relaxed text-white/30">
        <Info size={12} className="mt-0.5 shrink-0" />
        Reportes calculados a partir de los viajes completados del sistema DEMO. No existen cobros,
        transferencias ni liquidaciones reales. La comisión se configura desde Configuración.
      </p>
    </div>
  )
}

