EDITAR SIEMPRE EL AGENTS.MD CON EL FIN DE MANTENER EL CONTEXTO DEL PROYECTO ACTUALIZADO Y LO MAS ENTENDIBLE POSIBLE PARA QUE LAS DEMAS IA´S O AGENTES PUEDAN REVISARLO Y AHORRAR TIEMPO AVERIGUANDO PARA QUE ES, COMO FUNCIONA O COMO ESTA HECHO

# AGENTS.md — CAVIO

> Memoria técnica permanente del proyecto. Última actualización: **2026-11-16**.
> Si eres un agente/IA: lee este archivo completo antes de modificar código.
> Después de cualquier cambio relevante, actualiza la sección correspondiente (especialmente
> "Cambios realizados", "Pruebas" y "Tareas pendientes").

---

## 1. Qué es CAVIO

CAVIO es una plataforma de movilidad **funcional y navegable** para Colombia (Bogotá como ciudad
DEMO) que conecta tres roles sobre un **mismo estado de aplicación**:

1. **Pasajero:** pide viajes, elige origen/destino, categoría, negocia la tarifa, recibe ofertas,
   sigue al conductor, califica y consulta historial/pagos DEMO.
2. **Conductor:** se registra, espera aprobación, activa disponibilidad, recibe solicitudes,
   acepta o contraoferta, gestiona las etapas del viaje y consulta ganancias.
3. **Administrador:** supervisa métricas, pasajeros, conductores, viajes, finanzas, configuración,
   auditoría y la simulación DEMO.

No es una maqueta estática: las acciones de un rol se reflejan en los demás porque todos leen y
escriben el mismo store persistente. **No hay backend**: la persistencia es local (`localStorage`)
y la sincronización entre perfiles ocurre dentro del mismo navegador (cambio de sesión o pestañas
del mismo origen). En producción se debe sustituir por API + base de datos + WebSockets.

Estado actual: **v1.0.0 — primera versión funcional** (web PWA + APK Android debug/release).

---

## 2. Tecnologías y por qué

| Capa | Tecnología | Motivo |
|---|---|---|
| UI | React 19 + TypeScript | Componentes reutilizables, tipado estricto y ecosistema maduro. |
| Build | Vite 7 | Desarrollo rápido, build estático listo para PWA y Capacitor. |
| Estilos | Tailwind CSS 3.4 + CSS propio | Sistema de diseño AMOLED, utilidades responsive y overrides de Leaflet. |
| Rutas | React Router 7 | Rutas anidadas y protección por rol. |
| Estado | Context + `useState` + mutaciones puras | Sin dependencias extra; fácil de migrar a Zustand/Redux/API. |
| Mapas | Leaflet 1.9 + OpenStreetMap | Sin API key, tiles reales, marcadores personalizados y control total. |
| Geocodificación | Nominatim (OSM) | Búsqueda de direcciones en español/Colombia sin clave. |
| Rutas | OSRM público | Distancia/duración reales; fallback DEMO si falla. |
| Iconos | Lucide React | Iconografía consistente y ligera. |
| PWA | `manifest.webmanifest` + `public/sw.js` | Instalación, caché básica y shell offline. |
| Android | Capacitor 7 + Android SDK 35 | Empaqueta la misma app web en APK sin duplicar código. |
| Gráficos | SVG/CSS propios | Sin dependencias pesadas; se adaptan a cualquier ancho. |

**No se usan claves privadas** en el frontend. Los servicios de mapas/rutas son públicos y tienen
límites de uso; si se cambia de proveedor, tocar `src/components/map/MapView.tsx` y
`src/services/geo.ts`, que son la capa de abstracción.

---

## 3. Arquitectura y estructura de carpetas

```
.
├─ AGENTS.md                 ← este archivo (memoria técnica)
├─ README.md                 ← guía de instalación/uso
├─ Icono/
│  └─ Icono de la app Cavio.png   ← ICONO OFICIAL (2380×2380, PNG)
├─ public/
│  ├─ icono-cavio.png        ← copia exacta del icono oficial
│  ├─ icons/                 ← derivados: 16, 32, 180, 192, 512, 1024 y maskable 512
│  ├─ manifest.webmanifest   ← PWA
│  └─ sw.js                  ← service worker (caché shell + estáticos)
├─ src/
│  ├─ main.tsx               ← bootstrap, Capacitor back button, registro SW
│  ├─ App.tsx                ← rutas y providers
│  ├─ index.css              ← tokens AMOLED, glass, Leaflet oscuro, utilidades
│  ├─ types/index.ts         ← modelos de dominio y tipos derivados
│  ├─ data/
│  │  ├─ places.ts           ← 28 lugares DEMO de Bogotá + tarifas por categoría
│  │  └─ seed.ts             ← datos DEMO deterministas (20/15/40) y cuentas demo
│  ├─ store/
│  │  ├─ store.tsx           ← contexto global, sesión, persistencia, acciones
│  │  ├─ mutations.ts        ← transiciones puras (viajes, ofertas, simulación…)
│  │  └─ selectors.ts        ← consultas y métricas derivadas
│  ├─ services/geo.ts        ← Nominatim, OSRM y fallback DEMO con caché
│  ├─ hooks/                 ← geolocalización, rutas, simulación, PWA, toasts
│  ├─ components/
│  │  ├─ Brand.tsx           ← marca + icono oficial
│  │  ├─ layout/             ← AppShell (sidebar/bottom nav), PageHeader
│  │  ├─ map/MapView.tsx     ← mapa Leaflet, marcadores, rutas, aviso offline
│  │  └─ ui/                 ← Button, Field, Modal, Display, Charts
│  ├─ features/
│  │  ├─ trips/              ← tarjetas, ofertas, timeline, rating, LocationPicker
│  │  └─ vehicles/           ← iconos de categorías
│  ├─ pages/
│  │  ├─ passenger/          ← Home, History, Payments, Profile, Help
│  │  ├─ driver/             ← Dashboard, Requests, Earnings, History, Profile
│  │  ├─ admin/              ← Dashboard, Passengers, Drivers, Trips, Finance,
│  │  │                        Settings, Audit, Simulation
│  │  ├─ Landing.tsx / Login.tsx / RegisterPassenger.tsx / RegisterDriver.tsx
│  │  └─ NotFound.tsx
│  └─ routes/                ← ProtectedRoute, navegación por rol
├─ android/                  ← proyecto Capacitor/Android (APK)
├─ scripts/                  ← utilidades de prueba ADB/CDP usadas en QA
├─ capacitor.config.ts
├─ vite.config.ts
└─ tailwind.config.js / postcss.config.js / tsconfig.json
```

Separación de responsabilidades:

- **UI** (`components`, `pages`) no contiene reglas de negocio.
- **Reglas/transiciones** viven en `store/mutations.ts`.
- **Consultas/métricas** en `store/selectors.ts`.
- **Servicios externos** en `services/`.
- **Persistencia/sesión** en `store/store.tsx`.
- **Simulación** se ejecuta en `hooks/useSimulationEngine.ts` y muta el store.

---

## 4. Instalación, ejecución y compilación

### Requisitos

- Node.js **20+** (probado con 24.21.0).
- npm 10+.
- Para APK: JDK **21** + Android SDK (platform 35, build-tools 35.0.0) + Gradle wrapper.

### Web

```powershell
npm install
npm run dev        # http://localhost:5173 (host 0.0.0.0 para probar en LAN)
npm run build      # TypeScript + Vite → dist/
npm run preview    # http://localhost:4173 con la build de producción
npm run lint       # solo comprobación TypeScript
```

### Android / APK

```powershell
# Variables de entorno (PowerShell)
$env:JAVA_HOME="C:\ruta\a\jdk-21"
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT="$env:ANDROID_HOME"

npm run build
npx cap sync android
cd android
.\gradlew.bat assembleDebug "-Dorg.gradle.java.home=$env:JAVA_HOME"
```

> **Importante:** en este equipo el `~/.gradle/gradle.properties` global apunta a un JDK 17 de
> otro proyecto. Capacitor 7 exige Java 21 (`invalid source release: 21`). Por eso se pasa
> `-Dorg.gradle.java.home=...` explícitamente. No se debe hardcodear esa ruta en el repo.

Artefacto debug: `android/app/build/outputs/apk/debug/app-debug.apk`.
Artefacto release sin firmar: `android/app/build/outputs/apk/release/app-release-unsigned.apk`.

Firma usada para el release v1.0.0 (DEMO):

```powershell
$sdk="$env:LOCALAPPDATA\Android\Sdk\build-tools\35.0.0"
& "$sdk\zipalign.exe" -f -p 4 app-release-unsigned.apk cavio-aligned.apk
& "$sdk\apksigner.bat" sign --ks <keystore-demo> --ks-key-alias cavio `
  --ks-pass pass:<password> --key-pass pass:<password> `
  --out cavio-1.0.0.apk cavio-aligned.apk
```

El keystore **no se versiona** (ruta local temporal). El APK publicado en GitHub Releases está
firmado con ese keystore DEMO. Para producción: crear una keystore segura, no compartirla y usar
Play App Signing.

### Dispositivo Android (pruebas con la build web)

```powershell
adb devices
adb reverse tcp:5173 tcp:5173
adb shell am start -a android.intent.action.VIEW -d "http://localhost:5173"
```

`localhost` es contexto seguro y permite geolocalización (mejor que la IP LAN por HTTP).

---

## 5. Variables de entorno

La app **no requiere variables de entorno** para funcionar.

- Los servicios externos usan endpoints públicos: `tile.openstreetmap.org`,
  `nominatim.openstreetmap.org`, `router.project-osrm.org`.
- No hay claves API en el código.
- Si en el futuro se usa un proveedor con clave (Google Maps, Mapbox…), crear `VITE_*` y documentar
  en `README.md`; nunca commitear secretos.
- Configuración funcional (comisión, tarifas, soporte, simulación) vive en
  `CavioState.settings` y se edita desde **Admin → Configuración**.
- La ciudad/centro por defecto está en `src/data/places.ts` (`BOGOTA_CENTER`) y en el seed.

---

## 6. Autenticación, sesión y permisos

### Cuentas DEMO (seed)

| Rol | Correo | Contraseña |
|---|---|---|
| Pasajero | `pasajero@cavio.co` | `cavio123` (DEMO) |
| Conductor | `conductor@cavio.co` | `cavio123` (DEMO) |
| Administrador | `admin@cavio.co` | `cavio123` (DEMO) |

- El login valida formato de correo y contraseña de **mínimo 4 caracteres**; no compara contra una
  contraseña almacenada. **No se guardan contraseñas** en el estado.
- `loginDemo(role)` permite entrar en un toque desde Landing/Login.
- El registro de pasajero crea `role=passenger`, estado activo y sesión.
- El registro de conductor crea usuario + perfil `approval=pending`, vehículo y documentos; inicia
  sesión pero **no puede conectarse** hasta que un administrador lo apruebe.
- La sesión (`session`) se persiste en `localStorage` (`cavio.state.v1`) y sobrevive a recargas.
- `ProtectedLayout` (`src/routes/ProtectedRoute.tsx`):
  - Sin sesión → `/login`.
  - Rol incorrecto → redirige al home de su rol. **No basta cambiar la URL.**
- Funciones de cuenta: editar perfil, foto DEMO (data URL), suspender/reactivar desde admin.
- Un pasajero suspendido no puede crear solicitudes; un conductor suspendido no recibe solicitudes.
- Al suspender un conductor/pasajero con viaje activo, el viaje se cancela y se notifica.
- Auditoría: aprobaciones, rechazos, suspensiones, cambios de configuración y cancelaciones
  administrativas.

---

## 7. Modelos y relaciones (`src/types/index.ts`)

```
User 1—1 DriverProfile 1—1 Vehicle
User(role=passenger) 1—N Trip
DriverProfile 1—N Trip
Trip 1—N Offer
Trip 1—1 Rating
User/Admin 1—N AuditEntry
User 1—N AppNotification
CavioState 1—1 AppSettings / Session / SimulationState
```

Campos principales:

- **User:** id, nombre, apellidos, email, teléfono, documento DEMO, rol, estado, createdAt, foto.
- **DriverProfile:** userId, approval (`pending|approved|rejected|suspended`), available, rating,
  ratingCount, vehicleId, licencia, documentos, ubicación y fuente (`gps|demo`), reviewNote.
- **Vehicle:** categoría (`economy|comfort|xl|moto`), marca, modelo, año, color, placa, capacidad.
- **Trip:** código, pasajero, conductor, origen/destino (`Place`), categoría, tarifa sugerida /
  acordada / final, distancia, duración, estado, fechas, ruta, método de pago, `simulated`.
- **Offer:** viaje, conductor, monto, tipo (`accept|counter`), estado, mensaje, fecha.
- **Rating:** viaje, pasajero, conductor, puntuación 1–5, comentario.
- **AuditEntry:** actor, acción, descripción, tipo, fecha.
- **AppSettings:** ciudad, centro, comisión %, categorías/tarifas, cancelFee, autoOffers,
  simulationSpeed, useRealLocation, soporte.

Estados de viaje (`TripStatus`): `created → searching → offers → assigned → arriving → arrived →
in_progress → completed` y `cancelled` en cualquier punto activo. Los cambios actualizan historial,
métricas, notificaciones y ganancias derivadas.

---

## 8. Funcionamiento por módulo

### Pasajero (`/pasajero`)

- Mapa Leaflet central, GPS real si hay permiso, marcadores de origen/destino/conductores.
- Selector de ubicación con búsqueda local (28 sitios de Bogotá), Nominatim remoto, punto en el mapa
  y geocodificación inversa. Si no hay red/GPS, se puede elegir manualmente o usar ubicación DEMO.
- Categorías Economy/Comfort/XL/Moto con precio estimado, capacidad y ETA.
- Tarifa sugerida editable (±$500) con validaciones (mínimo, máximo 4× sugerida).
- Creación de solicitud, recepción/aceptación/rechazo de ofertas y contraofertas.
- Seguimiento: estado, timeline, conductor, vehículo, placa, ETA, llamada/mensaje/compartir (DEMO).
- Finalización + calificación (1–5 + comentario) que actualiza el rating del conductor.
- Historial con filtros/búsqueda, totales y exportación CSV.
- Pagos DEMO (efectivo/tarjeta/Nequi/Daviplata) con preferencia guardada; no hay cobros.
- Ayuda con FAQ, radicado de soporte local y enlaces de instalación PWA.

### Conductor (`/conductor`)

- Pantalla de estado si está pendiente/rechazado/suspendido, con checklist y documentación.
- Disponibilidad ON/OFF (solo aprobados). Al activarse comparte ubicación real (si hay permiso) o usa
  la última ubicación DEMO.
- Solicitudes compatibles con su categoría; aceptar tarifa o contraofertar con mensaje.
- Viaje activo con acción por etapa: **Iniciar camino → Llegué → Iniciar viaje → Finalizar**.
- Ganancias: hoy/semana/mes/total, comisión, promedio, viajes completados/cancelados, gráfico y CSV.
- Historial, perfil editable, vehículo, documentos DEMO (solo nombres de archivo), calificación.

### Administrador (`/admin`)

- Dashboard con métricas calculadas del seed/estado (pasajeros, conductores, viajes, GMV, ingresos,
  comisión, solicitudes), gráficos de 14 días, categorías, estados y aprobaciones pendientes.
- Pasajeros: búsqueda por nombre/documento/email/teléfono, filtro por estado, ficha editable,
  suspensión/reactivación con motivo, historial.
- Conductores: búsqueda, filtros por aprobación, ficha con vehículo/documentos/viajes/ganancias,
  aprobar, rechazar (con motivo), suspender, reactivar. La aprobación habilita al conductor.
- Viajes: búsqueda, filtros por estado/categoría, detalle completo, cancelación con motivo y CSV.
- Finanzas: períodos 7/14/30/todo, volumen, comisión, ganancias de conductores, liquidaciones por
  conductor y desglose por categoría; todo derivado de viajes completados.
- Configuración: comisión, cancelFee, ciudad, soporte, autoOfertas, ubicación real, velocidad de
  simulación y tarifas por categoría; afecta cálculos futuros y queda auditado.
- Auditoría: búsqueda/filtro por tipo, agrupación por día, exportación.
- Simulación: controles, mapa de conductores, viajes activos, avance manual, log y restauración.

---

## 9. Mapas y geolocalización

- **Leaflet + OpenStreetMap** con filtro CSS oscuro (`.leaflet-tile-pane`). No se usa CARTO ni
  proveedores con API key. Si los tiles fallan, el mapa muestra un aviso "Mapas sin conexión" y
  conserva marcadores/rutas DEMO.
- Marcadores personalizados (`divIcon`): usuario, conductor, origen, destino, pickup y disponibles.
- `MapView` abstrae el proveedor y expone: `markers`, `route`, `onMapClick`, `focus`, `fitSignature`,
  recenter. El ajuste de bounds ignora marcadores de conductores disponibles para no alejar el zoom.
- **Geolocalización real** (`src/hooks/useGeolocation.ts`):
  `getCurrentPosition` + `watchPosition` + `clearWatch`; timeout 14 s; errores de permiso, GPS
  apagado, no disponible, timeout, contexto inseguro y navegador incompatible.
  - Si se deniega: no se bloquea la app; se ofrece elegir origen manual o ubicación DEMO.
  - Se limpia el watcher al desmontar.
  - Requiere **HTTPS o localhost**. En LAN por HTTP el navegador la bloquea (se muestra aviso).
- **Rutas**: OSRM público si hay red; si falla se usa `demoRoute()` (Haversine × 1.32) marcada como
  `source: 'demo'`. La UI muestra "OSRM" o "DEMO" en el resumen.
- **Geocodificación**: Nominatim con sesgo a Bogotá, `accept-language=es` y caché en memoria. Si
  falla, quedan los lugares locales y el punto en el mapa.
- **APK**: `AndroidManifest.xml` declara `ACCESS_FINE_LOCATION`/`ACCESS_COARSE_LOCATION` y
  `windowSoftInputMode=adjustResize`. Capacitor gestiona el prompt nativo de geolocalización del
  WebView. El equipo de pruebas no tiene GPS/red, por lo que la ubicación real no pudo validarse
  físicamente (ver pruebas).
- **Privacidad**: la ubicación solo se comparte mientras el conductor está disponible o en viaje.
  No se envía a ningún backend; el mapa sí solicita tiles a OSM.

---

## 10. Modo DEMO, simulación y sincronización

- Datos iniciales deterministas en `src/data/seed.ts`: **20 pasajeros, 15 conductores, 40 viajes**,
  ofertas, calificaciones, documentos, auditoría y notificaciones. Incluye viajes históricos,
  2 activos y 2 solicitudes pendientes con ofertas.
- Persistencia: `localStorage['cavio.state.v1']` (debounce 250 ms). Al recargar se restaura estado y
  sesión. Si el JSON falla o la versión no coincide, se regenera el seed.
- Sincronización:
  - Mismo estado global para los tres roles.
  - Pestañas del mismo navegador: evento `storage` (con guarda contra ecos para evitar bucles).
  - Cambio de perfil demo en la misma pestaña: lectura inmediata del mismo store.
  - **No hay sincronización entre dispositivos** (no hay backend/WebSockets). Documentado.
- Simulación (`useSimulationEngine`, 1 tick/s cuando `running`):
  - Genera ofertas automáticas a solicitudes sin conductor (máx. 3, cada 3 ticks, según categoría y
    disponibilidad) y notifica al pasajero.
  - Mueve conductores hacia el origen; avanza `assigned→arriving→arrived→in_progress→completed`.
  - En `in_progress` interpola la ruta en ~30 ticks (comprimido) y completa el viaje.
  - Velocidad 0.5×/1×/2×/4×; pausa/continuar; contadores y timers persistentes.
  - Avance manual por viaje disponible en Admin → Simulación y desde el panel del conductor.
- Restaurar datos: Admin → Configuración/Simulación, o menú "Más". Vuelve al seed (mantiene sesión
  si la cuenta demo existe).
- Los pagos, llamadas, mensajes, compartir viaje, documentos, soporte y comisiones son **DEMO**.
  No se ejecutan transacciones ni comunicaciones reales.

---

## 11. Rutas principales

| Ruta | Pantalla |
|---|---|
| `/` | Landing + acceso DEMO |
| `/login`, `/registro`, `/registro-conductor` | Autenticación/registro |
| `/pasajero` | Home: mapa, solicitud, ofertas, seguimiento |
| `/pasajero/historial`, `/pagos`, `/perfil`, `/ayuda` | Módulos del pasajero |
| `/conductor` | Panel: disponibilidad, solicitudes, viaje activo, resumen |
| `/conductor/solicitudes`, `/ganancias`, `/historial`, `/perfil` | Módulos del conductor |
| `/admin` | Dashboard |
| `/admin/pasajeros`, `/conductores`, `/viajes` | Gestión |
| `/admin/finanzas`, `/configuracion`, `/auditoria`, `/simulacion` | Administración |
| `*` | 404 |

Navegación: sidebar fija en `lg` (≥1024 px), bottom nav en móvil/tablet (<1024), con badge de
pendientes. Admin tiene "Más" para accesos secundarios. El botón físico "atrás" de Android navega
dentro de la SPA o cierra la app (`@capacitor/app`).

---

## 12. Diseño, responsive y accesibilidad

- Tokens AMOLED: `#000000`, `#050505`, `#0A0A0A`, `#111111`, `#202020`, `#777777`, `#E8E8E8`,
  `#FFFFFF`, lima `#C6F36B`. Glass sutil con `backdrop-filter`, bordes 1 px y sombras profundas.
- Tipografía del sistema, `clamp()` para títulos, `min-w-0` + `truncate`/`overflow-wrap` en textos,
  grid/flex fluidos, sin anchos fijos que desborden.
- Áreas seguras: `env(safe-area-inset-*)` en header, bottom nav y modales; `viewport-fit=cover`.
- Teclado: `interactive-widget=resizes-content` + `visualViewport` en `Modal` para que el footer sea
  visible con el teclado; `adjustResize` en Android.
- Modales: bottom sheet en móvil, diálogo centrado en escritorio, scroll interno, cierre con
  backdrop/Escape, bloqueo de scroll.
- Tablas admin: scroll horizontal con columna de acciones sticky; en <768 px se convierten en
  tarjetas para no ocultar acciones.
- Gráficos: grid `minmax(0,1fr)` y SVG responsive; no generan scroll horizontal.
- Accesibilidad básica: roles/aria-labels, foco visible, toasts `aria-live`, botones con texto,
  estados vacíos claros, contraste alto.
- `prefers-reduced-motion` desactiva animaciones.
- Pantalla de arranque crítica en `index.html` (icono + marca + punto pulsante) para evitar el
  flash negro mientras el WebView/bundle carga; el contenido principal no depende de animaciones de
  entrada para ser visible.

---

## 13. Icono oficial y PWA

**Archivo fuente (no inventar rutas):** `Icono/Icono de la app Cavio.png` (2380×2380, PNG).

Integraciones:

- `public/icono-cavio.png` → marca en Landing/Login/sidebar (`src/components/Brand.tsx`).
- `public/icons/favicon-16.png`, `favicon-32.png` → favicons.
- `public/icons/apple-touch-icon.png` (180) → iOS.
- `public/icons/icon-192.png`, `icon-512.png`, `icon-1024.png` → PWA.
- `public/icons/icon-maskable-512.png` → icono maskable con padding seguro.
- `public/manifest.webmanifest` → nombre, colores, standalone, shortcuts, iconos.
- Android: `android/app/src/main/res/mipmap-*/ic_launcher*.png`,
  `ic_launcher_foreground.png` (adaptive), splash en `drawable-*`, fondo `#000000`.
- Todos los derivados conservan proporción; no se redibujó ni deformó el icono.

PWA:

- `sw.js`: precache del shell e iconos; navegación network-first con fallback a `index.html`;
  estáticos cache-first. No intercepta tiles/geocoding externos.
- Se registra solo en web de producción y **no** dentro de Capacitor.
- Instalación desde navegadores compatibles (botón "Instalar CAVIO" o menú del navegador).
- Limitaciones: sin GPS en segundo plano, sin push real, sin sincronización multidispositivo.

---

## 14. Pruebas realizadas (2026-11-16)

### Compilación

- `npx tsc --noEmit` → **sin errores**.
- `npm run build` → **OK** (Vite 7, ~784 kB JS / 67 kB CSS; warning de tamaño aceptado).
- `npm run preview` → **OK**; manifest 200, iconos 200, service worker registrado en `/`.

### Responsive (navegador Chromium/Playwright)

Anchos probados: **320, 360, 390, 412, 480, 600, 768, 1024, 1280, 1440 px** (y 800 px en tablet
físico). Rutas probadas: públicas, pasajero, conductor y administrador.

- `document.documentElement.scrollWidth <= innerWidth` en todas las rutas probadas (sin scroll
  horizontal accidental).
- Correcciones aplicadas durante QA:
  - Gráficos de barras generaban 653 px de ancho en 320 px → grid `minmax(0,1fr)`.
  - Etiquetas de StatCard se partían ("CONDUCTORE S") → tipografía/espaciado ajustados.
  - Tablas admin ocultaban acciones en móvil → tarjetas responsive y acciones sticky.
  - Modales quedaban bajo el teclado → `interactive-widget` + `visualViewport`.
  - Mapas sin red mostraban solo negro → aviso de conexión.
  - Píldora flotante de simulación tapaba tarjetas → indicador movido a la cabecera.
  - Textos de documentos largos se truncaban → `overflow-wrap:anywhere`.
  - Se reordenó el layout de pasajero/conductor a dos columnas desde 768 px.
- Capturas revisadas en 320, 390, 800, 1280 y 1440.

### ADB / dispositivo real

- `adb devices` → `HA0XEB9N device`.
- Modelo: **Lenovo TB-7104F**; Android **8.1.0**; `wm size` **600×1024**; densidad física **160**
  con override **120**; viewport CSS resultante **800×1197**, DPR 0.75.
- Navegador: **Brave 134** (Chromium) vía `adb reverse tcp:5173 tcp:5173`, `http://localhost:5173`.
- El dispositivo **no tiene salida a Internet**: `ping 8.8.8.8` → "Network is unreachable". Los
  tiles de OSM, Nominatim y OSRM no cargan; se validó el fallback (mapa oscuro con marcadores,
  aviso "Mapas sin conexión", rutas y tarifas DEMO).
- Brave tenía el modo nocturno forzado y oscurecía los botones lima; se desactivó por CDP
  (`Emulation.setAutoDarkModeOverride`) para validar el color real (`#C6F36B`). Es un ajuste del
  navegador, no un bug de CAVIO.
- Flujo probado en el dispositivo:
  - Landing → "Probar como pasajero" → Home.
  - Origen por GPS emulado (CDP) y por búsqueda; destino "Aeropuerto El Dorado".
  - Ruta/tarifa sugerida ($29.000 con red simulada; $14.800 en modo DEMO sin red).
  - Creación de solicitud, ofertas automáticas de simulación, aceptación.
  - Seguimiento, avance hasta finalizar y calificación automática.
  - Permiso de ubicación nativo: se mostró el diálogo de Android; **rechazo** verificado con banner
    y opción "Usar ubicación DEMO".
  - Teclado Gboard: el modal se ajusta sobre el teclado y "Confirmar destino" queda visible.
  - Objetivos táctiles principales ≥40–52 px; único enlace pequeño "Usar sugerida" ampliado a 38 px
    de alto con padding.
  - Rotación horizontal forzada (`user_rotation=1`): landing y layouts sin solapamientos; se
    restauró a 0.
- APK:
  - **debug** instalado y probado.
  - **release 1.0.0** firmado, instalado tras desinstalar el debug; arranca correctamente.
  - `versionCode=1`, `versionName=1.0.0`, minSdk 23, targetSdk 35; firma válida (SHA-256
    `a1c46861…`).
  - Botón físico atrás: de `/pasajero` vuelve a `/` sin cerrar la app.
  - Aviso de mapas sin conexión visible.

### Geolocalización

- Permiso concedido (emulado en web/tablet vía CDP): origen "Mi ubicación actual".
- Permiso denegado (CDP `Browser.setPermission denied` y diálogo nativo de Android): banner,
  reintento y alternativa manual/DEMO.
- Sin GPS/red real en el equipo: **no se pudo validar una lectura GPS física**; se documenta como
  limitación. El manejo de errores sí quedó probado.

### Pendiente de prueba

- Instalación PWA real desde Chrome Android (el equipo no tiene red) y auditoría Lighthouse.
- GPS real en un dispositivo con hardware y red.
- Rotación automática real (el equipo tiene auto-rotación desactivada; se forzó por ADB).
- Pruebas E2E automatizadas permanentes/CI.
- Lectores de pantalla (solo revisión básica de accesibilidad).

---

## 15. Problemas conocidos y limitaciones

1. **Sin backend**: no hay multiusuario real ni sincronización entre dispositivos; los datos viven
   en el navegador. Limpiar datos del sitio borra todo.
2. **Pagos, llamadas, mensajes, compartir, documentos y soporte son DEMO**. No hay integraciones.
3. **Geolocalización**: requiere HTTPS/localhost; en PWA no funciona en segundo plano. En el APK,
   si el usuario deniega el permiso, se usa la alternativa manual/DEMO.
4. **Mapas externos**: OSM/Nominatim/OSRM dependen de Internet y de sus políticas de uso; sin red no
   hay tiles ni búsqueda remota. No hay clave API ni SLA.
5. **Conductores y pasajeros del seed** no tienen sesión/contraseña propia (solo las 3 cuentas demo).
   La simulación los usa como actores automáticos; no se pueden encarnar sin editar el seed.
6. **Simulación comprimida**: los tiempos/velocidades no representan tráfico real.
7. **APK release firmado con keystore DEMO** no versionado. Para actualizaciones de producción se
   necesita conservar una keystore segura.
8. **JDK/Gradle**: el entorno global de este equipo apunta a JDK 17; sin el override `-D` el build
   de Capacitor 7 falla. Documentado arriba.
9. **Bundle grande** (~784 kB) por Leaflet y datos; se puede dividir con lazy routes si se requiere.
10. **Brave/Chrome Android "modo oscuro forzado"** puede oscurecer el lima si el usuario lo activa;
    no es un defecto del CSS (se comprobó el color computado).
11. **PWA install prompt** depende del navegador; el botón se deshabilita si no está disponible.
12. No se implementó recuperación de contraseña real (solo acceso demo).

---

## 16. Decisiones técnicas importantes

- **Un solo store + mutaciones puras** para garantizar coherencia entre roles y facilitar el futuro
  reemplazo por API/WebSocket.
- **Persistencia versionada** (`cavio.state.v1`) con validación y regeneración del seed.
- **localStorage + storage event** en lugar de un servidor para el alcance DEMO.
- **Leaflet con OSM y filtro CSS** en vez de tiles oscuros con API key; más portable y sin secretos.
- **Fallback explícito** de rutas/tarifas (marcado DEMO) en vez de inventar datos exactos.
- **Tailwind + tokens propios** para consistencia; gráficos propios para evitar dependencias.
- **Capacitor** para reutilizar la PWA en Android sin mantener dos interfaces.
- **Validaciones en UI y en mutaciones** (doble capa) para evitar estados inconsistentes.
- **Rutas protegidas por rol** en un layout que envuelve las páginas.
- **Icono oficial** copiado y derivado por herramientas, nunca redibujado.

---

## 17. Cambios realizados

### 2026-11-16 — v1.0.0 (primera versión funcional)

- Inspección del repositorio vacío, icono oficial y dispositivo ADB.
- Arquitectura React/TS/Vite/Tailwind + Leaflet + PWA + Capacitor.
- Sistema de diseño AMOLED, glass, responsive, modales, toasts y componentes reutilizables.
- Autenticación DEMO por rol, registro de pasajero/conductor, rutas protegidas y sesión persistente.
- Módulo pasajero completo: mapa, GPS, búsqueda, tarifas, negociación, ofertas, seguimiento, rating,
  historial, pagos DEMO y ayuda.
- Módulo conductor: aprobación, disponibilidad, solicitudes, contraofertas, gestión de viaje,
  ganancias, historial y perfil/vehículo/documentos.
- Módulo admin: dashboard con gráficos reales, pasajeros, conductores, viajes, finanzas,
  configuración, auditoría y simulación.
- Seed 20/15/40, simulación con ofertas/movimiento/avance, persistencia y restauración.
- PWA (manifest, iconos, service worker), icono oficial integrado.
- APK Android debug y release firmado; back button nativo; permisos de ubicación.
- Pantalla de arranque crítica y ajuste del teclado en modales.
- Correcciones de responsive/overflow, teclado, tablas y mapas sin conexión.
- Documentación: README + AGENTS.md.

---

## 18. Tareas pendientes / próximos pasos

1. Backend real (API REST/GraphQL + PostgreSQL) y autenticación con contraseñas hasheadas/JWT.
2. Tiempo real con WebSockets para ofertas, estados y ubicación entre dispositivos.
3. Pagos reales (pasarela), verificación de documentos y antecedentes.
4. Notificaciones push y seguimiento GPS en segundo plano (nativo).
5. Proveedor de mapas/rutas con SLA y claves gestionadas en servidor.
6. Tests E2E (Playwright) y unitarios de mutaciones; CI/CD.
7. Code splitting/lazy routes, optimización de imágenes y auditoría Lighthouse.
8. Revisión de accesibilidad con lectores de pantalla y navegación por teclado.
9. Keystore de producción + Play App Signing; versionado y pipeline de APK/AAB.
10. Internacionalización (es-CO inicial) y multi-ciudad/multi-país.
11. Panel de soporte real y moderación de reportes.
12. Analítica de producto y métricas operativas.

---

## 19. Comandos rápidos / troubleshooting

| Síntoma | Solución |
|---|---|
| `invalid source release: 21` | Usar JDK 21 y `-Dorg.gradle.java.home=<jdk21>` (el global apunta a 17). |
| Mapa negro | Sin Internet o tiles bloqueados; ver aviso "Mapas sin conexión". |
| GPS no disponible en LAN | Usar `localhost` + `adb reverse` o HTTPS. |
| Datos raros/rotos | Admin → Configuración → Restaurar datos DEMO (o borrar `cavio.state.v1`). |
| APK no instala sobre otro | Desinstalar la versión previa si cambió la firma. |
| Botones lima oscuros en Android | Desactivar "modo oscuro forzado/noche" del navegador. |
| Service worker viejo | `Ctrl+Shift+R` o borrar datos del sitio; el SW usa `cavio-v1`. |

**Fin del documento. Mantener actualizado.**
