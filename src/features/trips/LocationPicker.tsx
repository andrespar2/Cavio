import { useEffect, useMemo, useRef, useState } from 'react'
import { Crosshair, Loader2, MapPin, Navigation, Search } from 'lucide-react'
import type { Place } from '../../types'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { MapView } from '../../components/map/MapView'
import { BOGOTA_CENTER } from '../../data/places'
import { useGeolocation, geoErrorMessage } from '../../hooks/useGeolocation'
import { geocode, reverseGeocode, searchLocalPlaces } from '../../services/geo'

// ============================================================
// CAVIO — Selector de origen / destino
// Búsqueda local + Nominatim + punto en el mapa + GPS real
// ============================================================

export function LocationPicker({
  open,
  onClose,
  onSelect,
  title,
  subtitle,
  kind = 'origen',
}: {
  open: boolean
  onClose: () => void
  onSelect: (place: Place) => void
  title: string
  subtitle?: string
  kind?: 'origen' | 'destino'
}) {
  const geo = useGeolocation()
  const [query, setQuery] = useState('')
  const [remote, setRemote] = useState<Place[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<Place | null>(null)
  const [focus, setFocus] = useState<(Place & { zoom?: number }) | null>(null)
  const [resolving, setResolving] = useState(false)
  const timer = useRef<number | null>(null)
  const geoHandled = useRef(false)

  const localResults = useMemo(() => searchLocalPlaces(query), [query])

  useEffect(() => {
    if (!open) {
      setQuery('')
      setRemote([])
      setSelected(null)
      setFocus(null)
      geoHandled.current = false
    }
  }, [open])

  // Búsqueda remota con debounce
  useEffect(() => {
    if (!open) return
    if (timer.current) window.clearTimeout(timer.current)
    if (query.trim().length < 3) {
      setRemote([])
      setSearching(false)
      return
    }
    setSearching(true)
    timer.current = window.setTimeout(async () => {
      const results = await geocode(query)
      setRemote(results)
      setSearching(false)
    }, 500)
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [query, open])

  // Resultado de geolocalización
  useEffect(() => {
    if (!geo.position || geoHandled.current) return
    geoHandled.current = true
    const position = geo.position
    const provisional: Place = {
      label: 'Mi ubicación actual',
      address: `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`,
      lat: position.lat,
      lng: position.lng,
    }
    setSelected(provisional)
    setFocus(provisional)
    void reverseGeocode(position).then((place) => {
      if (place) {
        setSelected({ ...place, label: place.label || 'Mi ubicación actual' })
        setFocus({ ...place })
      }
    })
  }, [geo.position])

  const handleMapClick = async (position: { lat: number; lng: number }) => {
    const provisional: Place = {
      label: 'Punto seleccionado',
      address: `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`,
      ...position,
    }
    setSelected(provisional)
    setResolving(true)
    const place = await reverseGeocode(position)
    setResolving(false)
    if (place) setSelected(place)
  }

  const choose = (place: Place) => {
    setSelected(place)
    setFocus({ ...place })
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  }

  const confirm = () => {
    if (!selected) return
    onSelect(selected)
    onClose()
  }

  const merged = [...localResults]
  for (const place of remote) {
    if (!merged.some((p) => p.label.toLowerCase() === place.label.toLowerCase())) merged.push(place)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={subtitle ?? 'Busca una dirección o elige un punto en el mapa.'}
      size="lg"
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-w-0 truncate text-[11.5px] text-white/35">
            {selected ? (
              <>
                <span className="text-lime">{kind === 'origen' ? 'Origen' : 'Destino'}:</span> {selected.label}
              </>
            ) : (
              'Ningún punto seleccionado'
            )}
          </p>
          <Button onClick={confirm} disabled={!selected} className="shrink-0">
            Confirmar {kind}
          </Button>
        </div>
      }
    >
      <div className="space-y-3 pb-2">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar dirección, lugar o zona…"
            className="input-base pl-10 pr-10"
            autoComplete="off"
            inputMode="search"
            aria-label="Buscar dirección"
          />
          {searching && (
            <Loader2 size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-lime/70" />
          )}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<Crosshair size={14} className="text-lime" />}
            onClick={geo.request}
            loading={geo.status === 'requesting'}
            className="justify-start"
          >
            Usar mi ubicación actual
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Navigation size={14} className="text-lime" />}
            onClick={() => setFocus({ ...BOGOTA_CENTER, label: 'Centro de Bogotá', zoom: 13 })}
            className="justify-start"
          >
            Ver centro de Bogotá
          </Button>
        </div>

        {['denied', 'insecure', 'unavailable', 'timeout', 'unsupported'].includes(geo.status) && (
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2 text-[11.5px] leading-relaxed text-amber-200/80">
            {geoMessage(geo.status, geo.error)}
          </div>
        )}

        <div className="h-[190px] overflow-hidden rounded-2xl border border-white/[0.08] sm:h-[220px]">
          <MapView
            center={selected ?? BOGOTA_CENTER}
            zoom={14}
            focus={focus}
            markers={
              selected
                ? [{ id: 'picked', kind: kind === 'origen' ? 'origin' : 'destination', lat: selected.lat, lng: selected.lng, label: selected.label }]
                : []
            }
            onMapClick={(position) => void handleMapClick(position)}
          />
        </div>
        <p className="flex items-center justify-between gap-2 text-[10.5px] text-white/25">
          <span className="inline-flex items-center gap-1">
            <MapPin size={10} /> Toca el mapa para ajustar el punto.
          </span>
          {resolving && (
            <span className="inline-flex items-center gap-1 text-lime/60">
              <Loader2 size={10} className="animate-spin" /> Buscando dirección…
            </span>
          )}
        </p>

        <div className="max-h-[220px] space-y-1 overflow-y-auto pr-1">
          {query.trim().length === 0 && (
            <p className="section-title mb-1.5 px-1">Lugares frecuentes en Bogotá</p>
          )}
          {merged.length === 0 && query.trim().length >= 3 && !searching && (
            <p className="rounded-xl bg-white/[0.03] px-3 py-4 text-center text-[12px] text-white/35">
              No encontramos coincidencias. Prueba con otra dirección o toca el mapa.
            </p>
          )}
          {merged.map((place, index) => (
            <button
              key={`${place.label}-${index}`}
              type="button"
              onClick={() => choose(place)}
              className="flex w-full min-w-0 items-start gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/[0.05]"
            >
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/[0.05] text-white/40">
                <MapPin size={14} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-white/85">{place.label}</span>
                {place.address && (
                  <span className="mt-0.5 block truncate text-[11px] text-white/30">{place.address}</span>
                )}
              </span>
            </button>
          ))}
          {query.trim().length === 0 && (
            <p className="px-1 pt-2 text-[10.5px] leading-relaxed text-white/25">
              Las búsquedas usan OpenStreetMap/Nominatim. Si no hay conexión, puedes elegir un punto en el mapa.
            </p>
          )}
          {geocodeFailMessage(remote.length, searching, query) && (
            <p className="px-1 text-[10.5px] text-white/25">
              {geocodeFailMessage(remote.length, searching, query)}
            </p>
          )}
        </div>
      </div>
    </Modal>
  )
}

function geoMessage(status: string, error: string | null): string {
  if (error) return error
  return geoErrorMessage(status as never)
}

function geocodeFailMessage(remoteCount: number, searching: boolean, query: string): string | null {
  if (query.trim().length >= 3 && remoteCount === 0 && !searching) {
    return 'Los resultados en línea no están disponibles ahora. Usa los lugares sugeridos o el mapa.'
  }
  return null
}
