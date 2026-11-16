import { useMemo, useState } from 'react'
import { Download, Search, ShieldCheck } from 'lucide-react'
import clsx from 'clsx'
import type { AuditEntry } from '../../types'
import { useCavio } from '../../store/store'
import { PageHeader } from '../../components/layout/PageHeader'
import { DemoBadge } from '../../components/Brand'
import { Button } from '../../components/ui/Button'
import { EmptyState } from '../../components/ui/Display'
import { SearchInput, Select } from '../../components/ui/Field'
import { formatDateTimeShort } from '../../lib/format'
import { humanDay } from '../../lib/utils'
import { useToast } from '../../hooks/useToast'

// ============================================================
// CAVIO — Auditoría de acciones administrativas
// ============================================================

const TYPE_META: Record<AuditEntry['type'], { label: string; color: string }> = {
  driver: { label: 'Conductores', color: 'bg-sky-400/10 text-sky-300 border-sky-400/20' },
  passenger: { label: 'Pasajeros', color: 'bg-indigo-400/10 text-indigo-200 border-indigo-400/20' },
  trip: { label: 'Viajes', color: 'bg-lime/10 text-lime border-lime/25' },
  settings: { label: 'Configuración', color: 'bg-amber-400/10 text-amber-200 border-amber-400/20' },
  finance: { label: 'Finanzas', color: 'bg-emerald-400/10 text-emerald-200 border-emerald-400/20' },
  auth: { label: 'Sesión', color: 'bg-white/10 text-white/55 border-white/15' },
  system: { label: 'Sistema', color: 'bg-white/10 text-white/55 border-white/15' },
}

export function AdminAudit() {
  const { state } = useCavio()
  const { toast } = useToast()
  const [query, setQuery] = useState('')
  const [type, setType] = useState<'all' | AuditEntry['type']>('all')
  const [limit, setLimit] = useState(20)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return state.audit
      .filter((entry) => (type === 'all' ? true : entry.type === type))
      .filter(
        (entry) =>
          !q ||
          entry.action.toLowerCase().includes(q) ||
          entry.description.toLowerCase().includes(q) ||
          entry.actorName.toLowerCase().includes(q),
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [state.audit, query, type])

  const grouped = useMemo(() => {
    const map = new Map<string, AuditEntry[]>()
    for (const entry of filtered.slice(0, limit)) {
      const key = humanDay(entry.createdAt)
      const list = map.get(key) ?? []
      list.push(entry)
      map.set(key, list)
    }
    return Array.from(map.entries())
  }, [filtered, limit])

  const exportCsv = () => {
    if (!filtered.length) {
      toast('No hay registros para exportar.', 'info')
      return
    }
    const header = ['Fecha', 'Usuario', 'Acción', 'Descripción', 'Tipo']
    const rows = filtered.map((e) => [
      new Date(e.createdAt).toLocaleString('es-CO'),
      e.actorName,
      e.action,
      e.description,
      e.type,
    ])
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\r\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'cavio-auditoria.csv'
    link.click()
    URL.revokeObjectURL(url)
    toast('Auditoría exportada.', 'success')
  }

  return (
    <div>
      <PageHeader
        title="Auditoría"
        subtitle="Registro de acciones administrativas y eventos relevantes del sistema."
        badge={<DemoBadge />}
        actions={
          <Button variant="secondary" size="sm" icon={<Download size={14} />} onClick={exportCsv}>
            Exportar
          </Button>
        }
      />

      <div className="mb-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_200px]">
        <SearchInput value={query} onChange={setQuery} placeholder="Buscar acción, descripción o responsable" />
        <Select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          <option value="all">Todos los tipos</option>
          {Object.entries(TYPE_META).map(([value, meta]) => (
            <option key={value} value={value}>
              {meta.label}
            </option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={22} />}
          title="Sin registros de auditoría"
          description="Las aprobaciones, suspensiones y cambios de configuración aparecerán aquí."
        />
      ) : (
        <div className="space-y-5">
          {grouped.map(([day, entries]) => (
            <div key={day}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/30">{day}</p>
              <div className="space-y-1.5">
                {entries.map((entry) => {
                  const meta = TYPE_META[entry.type]
                  return (
                    <div
                      key={entry.id}
                      className="flex flex-wrap items-start gap-3 rounded-2xl border border-white/[0.06] bg-[#0a0a0a] px-4 py-3"
                    >
                      <span className={clsx('mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[9.5px] font-medium', meta.color)}>
                        {meta.label}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] font-medium text-white/80">{entry.action}</p>
                        <p className="mt-0.5 text-[11.5px] leading-relaxed text-white/40">{entry.description}</p>
                        <p className="mt-1 text-[10px] text-white/25">
                          {entry.actorName} · {formatDateTimeShort(entry.createdAt)}
                        </p>
                      </div>
                      <ShieldCheck size={14} className="mt-0.5 shrink-0 text-white/15" />
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
          {filtered.length > limit && (
            <div className="flex justify-center">
              <Button variant="secondary" size="sm" onClick={() => setLimit((v) => v + 20)}>
                Ver más registros ({filtered.length - limit})
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

