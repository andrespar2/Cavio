import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import clsx from 'clsx'
import { WifiOff } from 'lucide-react'
import type { LatLng } from '../../types'

// ============================================================
// CAVIO — Mapa Leaflet + OpenStreetMap (tema oscuro CARTO)
// Capa de abstracción: si se cambia de proveedor, solo se toca aquí.
// ============================================================

export type MarkerKind = 'user' | 'driver' | 'origin' | 'destination' | 'pickup' | 'available'

export interface MapMarker extends LatLng {
  id: string
  kind: MarkerKind
  label?: string
}

interface MapViewProps {
  center: LatLng
  zoom?: number
  markers?: MapMarker[]
  route?: LatLng[]
  className?: string
  onMapClick?: (position: LatLng) => void
  fitSignature?: string
  focus?: (LatLng & { zoom?: number }) | null
  showRecenter?: boolean
  recenterTo?: LatLng | null
  interactive?: boolean
}

const ICONS: Record<MarkerKind, { size: number; html: string; className?: string }> = {
  user: {
    size: 20,
    html: '<span style="display:block;width:14px;height:14px;border-radius:999px;background:#C6F36B;border:3px solid #000;box-shadow:0 0 0 3px rgba(198,243,107,.28)"></span>',
    className: 'cv-marker cv-marker-pulse',
  },
  origin: {
    size: 24,
    html: '<span style="display:block;width:16px;height:16px;border-radius:999px;background:#0d0d0d;border:3px solid #C6F36B;box-shadow:0 0 0 4px rgba(198,243,107,.18)"></span>',
  },
  destination: {
    size: 34,
    html: '<span style="display:flex;width:30px;height:30px;align-items:center;justify-content:center;border-radius:999px;background:#C6F36B;color:#000;box-shadow:0 6px 16px rgba(0,0,0,.55)"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg></span>',
  },
  driver: {
    size: 38,
    html: '<span style="display:flex;width:34px;height:34px;align-items:center;justify-content:center;border-radius:12px;background:#0b0b0b;color:#C6F36B;border:2px solid rgba(198,243,107,.7);box-shadow:0 8px 20px rgba(0,0,0,.65)"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.6-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg></span>',
  },
  pickup: {
    size: 26,
    html: '<span style="display:flex;width:22px;height:22px;align-items:center;justify-content:center;border-radius:8px;background:#0d0d0d;color:#C6F36B;border:2px solid #C6F36B"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></span>',
  },
  available: {
    size: 22,
    html: '<span style="display:block;width:14px;height:14px;border-radius:6px;background:#5BC0EB;border:2px solid #000;box-shadow:0 0 0 3px rgba(91,192,235,.2)"></span>',
  },
}

function makeIcon(kind: MarkerKind, label?: string) {
  const config = ICONS[kind]
  return L.divIcon({
    className: config.className ?? 'cv-marker',
    html: `<div title="${(label ?? '').replace(/"/g, '&quot;')}">${config.html}</div>`,
    iconSize: [config.size, config.size],
    iconAnchor: [config.size / 2, config.size / 2],
  })
}

export function MapView({
  center,
  zoom = 13,
  markers = [],
  route,
  className,
  onMapClick,
  fitSignature,
  focus,
  showRecenter = false,
  recenterTo,
  interactive = true,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const tileRef = useRef<L.TileLayer | null>(null)
  const markerLayer = useRef<L.LayerGroup | null>(null)
  const routeLayer = useRef<L.LayerGroup | null>(null)
  const markerMap = useRef<Map<string, L.Marker>>(new Map())
  const clickRef = useRef(onMapClick)
  const sizesRef = useRef<string>('')
  const [tilesFailed, setTilesFailed] = useState(false)

  clickRef.current = onMapClick

  // Inicialización
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, {
      center: [center.lat, center.lng],
      zoom,
      zoomControl: false,
      attributionControl: true,
      preferCanvas: true,
      dragging: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      touchZoom: interactive,
      boxZoom: false,
      keyboard: interactive,
    })
    tileRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      subdomains: 'abc',
      maxZoom: 19,
      minZoom: 3,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>',
    }).addTo(map)
    tileRef.current.on('tileerror', () => setTilesFailed(true))
    tileRef.current.on('tileload', () => setTilesFailed(false))
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    markerLayer.current = L.layerGroup().addTo(map)
    routeLayer.current = L.layerGroup().addTo(map)

    map.on('click', (event: L.LeafletMouseEvent) => {
      clickRef.current?.({ lat: event.latlng.lat, lng: event.latlng.lng })
    })

    const observer = new ResizeObserver(() => {
      map.invalidateSize({ animate: false })
    })
    observer.observe(containerRef.current)

    mapRef.current = map

    return () => {
      observer.disconnect()
      map.remove()
      mapRef.current = null
      tileRef.current = null
      markerLayer.current = null
      routeLayer.current = null
      markerMap.current.clear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Actualizar interactividad
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const handlers = [
      map.dragging,
      map.scrollWheelZoom,
      map.doubleClickZoom,
      map.touchZoom,
      map.keyboard,
    ]
    for (const handler of handlers) {
      if (!handler) continue
      if (interactive) handler.enable()
      else handler.disable()
    }
  }, [interactive])

  // Marcadores con actualización incremental
  useEffect(() => {
    const layer = markerLayer.current
    if (!layer) return
    const current = markerMap.current
    const nextIds = new Set(markers.map((m) => m.id))

    for (const [id, marker] of current) {
      if (!nextIds.has(id)) {
        marker.remove()
        current.delete(id)
      }
    }

    for (const item of markers) {
      const existing = current.get(item.id)
      if (existing) {
        existing.setLatLng([item.lat, item.lng])
        if (item.label) existing.setTooltipContent(item.label)
      } else {
        const marker = L.marker([item.lat, item.lng], {
          icon: makeIcon(item.kind, item.label),
          keyboard: false,
          zIndexOffset: item.kind === 'driver' ? 600 : item.kind === 'user' ? 500 : 300,
        })
        if (item.label) {
          marker.bindTooltip(item.label, {
            direction: 'top',
            offset: [0, -16],
            className: 'cv-tooltip',
            opacity: 0.95,
          })
        }
        marker.addTo(layer)
        current.set(item.id, marker)
      }
    }

    const signature = markers
      .filter((m) => m.kind === 'origin' || m.kind === 'destination' || m.kind === 'pickup')
      .map((m) => `${m.kind}:${m.lat.toFixed(4)}:${m.lng.toFixed(4)}`)
      .join('|')
    if (fitSignature !== undefined && sizesRef.current !== `${fitSignature}|${signature}`) {
      sizesRef.current = `${fitSignature}|${signature}`
      const fitMarkers = markers.filter((m) =>
        ['origin', 'destination', 'pickup', 'user'].includes(m.kind),
      )
      const focusMarkers = fitMarkers.length ? fitMarkers : markers
      if (focusMarkers.length === 1) {
        mapRef.current?.setView([focusMarkers[0].lat, focusMarkers[0].lng], Math.max(zoom, 14), { animate: true })
      } else if (focusMarkers.length > 1) {
        const bounds = L.latLngBounds(focusMarkers.map((m) => [m.lat, m.lng] as [number, number]))
        mapRef.current?.fitBounds(bounds, { padding: [48, 48], maxZoom: 16, animate: true })
      }
    }
  }, [markers, fitSignature, zoom])

  // Ruta
  useEffect(() => {
    const layer = routeLayer.current
    if (!layer) return
    layer.clearLayers()
    if (!route || route.length < 2) return
    const points = route.map((p) => [p.lat, p.lng] as [number, number])
    L.polyline(points, { color: '#000000', weight: 8, opacity: 0.55, lineCap: 'round' }).addTo(layer)
    L.polyline(points, { color: '#C6F36B', weight: 4, opacity: 0.95, lineCap: 'round' }).addTo(layer)
  }, [route])

  // Enfoque programático
  useEffect(() => {
    if (!focus || !mapRef.current) return
    mapRef.current.flyTo([focus.lat, focus.lng], focus.zoom ?? 15, { duration: 0.7 })
  }, [focus])

  const handleRecenter = () => {
    if (!mapRef.current || !recenterTo) return
    mapRef.current.flyTo([recenterTo.lat, recenterTo.lng], 15, { duration: 0.6 })
  }

  return (
    <div className={clsx('relative h-full w-full overflow-hidden', className)}>
      <div ref={containerRef} className="h-full w-full" role="application" aria-label="Mapa interactivo de CAVIO" />
      {showRecenter && recenterTo && (
        <button
          type="button"
          onClick={handleRecenter}
          className="absolute bottom-4 left-4 z-[500] grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-[#111]/95 text-lime shadow-soft backdrop-blur-md transition hover:bg-[#1a1a1a]"
          aria-label="Centrar en mi ubicación"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="8" />
            <circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none" />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3" strokeLinecap="round" />
          </svg>
        </button>
      )}
      {tilesFailed && (
        <div className="pointer-events-none absolute inset-x-3 bottom-14 z-[500] flex justify-center">
          <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-amber-400/20 bg-black/85 px-3 py-1.5 text-[10.5px] text-amber-200/80 backdrop-blur-md">
            <WifiOff size={12} className="shrink-0" />
            Mapas sin conexión
          </span>
        </div>
      )}
    </div>
  )
}
