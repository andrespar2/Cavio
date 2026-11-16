<p align="center">
  <img src="public/icono-cavio.png" alt="CAVIO" width="120" />
</p>

<h1 align="center">CAVIO</h1>

<p align="center">
  <strong>Movilidad inteligente para pasajeros, conductores y administradores.</strong><br/>
  PWA + APK Android · React · TypeScript · Leaflet · AMOLED · Bogotá, Colombia 🇨🇴
</p>

---

## ¿Qué es CAVIO?

CAVIO es una aplicación de movilidad **funcional** inspirada en las mejores experiencias de viajes,
con identidad propia y estética AMOLED. Conecta a **pasajeros, conductores y administradores** en un
mismo ecosistema: una solicitud creada por un pasajero aparece para los conductores, una oferta
aceptada actualiza ambos perfiles y el administrador ve el viaje, las métricas y la auditoría.

Incluye negociación de tarifas, mapas reales, seguimiento del conductor, gestión de viajes,
ganancias, finanzas y un modo DEMO con simulación completa.

> **Importante:** es un prototipo avanzado. Pagos, llamadas, mensajes, documentos, soporte y
> sincronización entre dispositivos son DEMO o requieren integraciones de producción. No hay backend.

![Estado](https://img.shields.io/badge/versión-1.0.0-C6F36B?style=flat-square&labelColor=000000)
![Plataformas](https://img.shields.io/badge/web%20%2B%20Android-PWA%20%2F%20APK-C6F36B?style=flat-square&labelColor=000000)

---

## Funcionalidades

### Pasajero
- Mapa interactivo con ubicación real (permiso del navegador) o selección manual/DEMO.
- Origen/destino con búsqueda local + Nominatim, punto en el mapa y geocodificación inversa.
- Categorías **Economy, Comfort, XL y Moto** con precio, capacidad y ETA.
- **Negociación de tarifa**: sugerida editable, ofertas y contraofertas de conductores.
- Seguimiento del viaje, conductor, vehículo, placa y línea de tiempo de estados.
- Calificación, historial, exportación CSV, métodos de pago DEMO y centro de ayuda.

### Conductor
- Registro con vehículo, licencia y documentación DEMO.
- Estados de aprobación: pendiente, aprobado, rechazado, suspendido.
- Disponibilidad en línea, GPS real (si se concede) y solicitudes compatibles por categoría.
- Aceptar tarifa o **contraofertar** con mensaje.
- Gestión del viaje: en camino → llegó → iniciar → finalizar.
- Ganancias por día/semana/mes, comisión, historial y estadísticas.

### Administrador
- Dashboard con métricas y gráficos calculados desde los datos reales del sistema.
- Gestión de pasajeros y conductores: búsqueda, fichas, edición, aprobación, rechazo, suspensión.
- Gestión de viajes con detalle, filtros y cancelación auditada.
- Finanzas DEMO: volumen, comisión, ganancias y liquidaciones por conductor.
- Configuración de tarifas, comisión y simulación.
- Auditoría de acciones administrativas.
- Panel de simulación: pausa/continuar, velocidad, ofertas, movimiento y avance manual.

---

## Acceso DEMO

| Rol | Correo | Contraseña |
|---|---|---|
| Pasajero | `pasajero@cavio.co` | `cavio123` |
| Conductor | `conductor@cavio.co` | `cavio123` |
| Administrador | `admin@cavio.co` | `cavio123` |

También puedes entrar con un toque desde la landing o el login. El prototipo no almacena contraseñas.

**Flujo rápido recomendado**

1. Entra como **pasajero**, elige origen y destino y propone una tarifa.
2. Pulsa **Simular** para recibir ofertas de conductores DEMO.
3. Acepta una oferta y observa el seguimiento.
4. Cambia al perfil **conductor** para gestionar las etapas del viaje.
5. Entra como **administrador** y revisa el viaje, las métricas, la auditoría y la simulación.

Los datos se guardan en `localStorage`. Puedes restaurarlos desde **Admin → Configuración**.

---

## Inicio rápido (web)

Requisitos: Node.js 20+.

```bash
npm install
npm run dev
```

Abre **http://localhost:5173**.

Para probar en un dispositivo Android por USB:

```bash
adb reverse tcp:5173 tcp:5173
# abre http://localhost:5173 en el navegador del dispositivo
```

`localhost` es un contexto seguro y permite geolocalización. Por LAN con `http://IP` el navegador
bloquea la ubicación (la app ofrece alternativas manuales).

### Producción / PWA

```bash
npm run build
npm run preview     # http://localhost:4173
```

El build incluye manifest, iconos y service worker (instalable como PWA en navegadores compatibles).

---

## APK Android

El APK de la versión **1.0.0** está disponible en
[**GitHub Releases**](https://github.com/andrespar2/Cavio/releases/tag/v1.0.0).

- Archivo: `cavio-1.0.0.apk` (≈5,36 MB)
- SHA-256: `6E6C2698CBCF3FBCC3FC15FCC34193F55D7BC6257CA0E6F44F033F303974C244`
- `versionCode 1` · `versionName 1.0.0` · minSdk 23 · targetSdk 35

Para compilarlo:

```powershell
$env:JAVA_HOME="C:\ruta\a\jdk-21"
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT="$env:ANDROID_HOME"

npm run build
npx cap sync android
cd android
.\gradlew.bat assembleDebug "-Dorg.gradle.java.home=$env:JAVA_HOME"
```

- Requiere **JDK 21**, Android SDK 35 y build-tools 35.
- APK debug: `android/app/build/outputs/apk/debug/app-debug.apk`.
- Release: `.\gradlew.bat assembleRelease` y firmar con una keystore segura.
- El APK publicado está firmado con una keystore DEMO local (no incluida en el repositorio).

> En este equipo, Gradle global apunta a JDK 17; por eso se pasa `-Dorg.gradle.java.home` con JDK 21.

---

## Tecnologías

| Área | Tecnología |
|---|---|
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS 3.4 |
| Navegación | React Router 7 (rutas protegidas por rol) |
| Estado | Context + mutaciones puras + `localStorage` |
| Mapas | Leaflet 1.9 + OpenStreetMap |
| Geocoding / rutas | Nominatim + OSRM (con fallback DEMO) |
| Iconos | Lucide React |
| PWA | Manifest + service worker propio |
| Android | Capacitor 7 (minSdk 23, targetSdk 35) |

---

## Estructura del proyecto

```
src/
├─ components/    UI reutilizable, layout, mapa y gráficos
├─ features/      viajes, ofertas, timeline, calificación, vehículos
├─ pages/         pasajero, conductor y administrador
├─ store/         estado global, mutaciones y selectores
├─ services/      geocodificación y rutas (capa sustituible)
├─ hooks/         GPS, rutas, simulación, toasts y PWA
├─ data/          lugares de Bogotá y datos DEMO
├─ types/         modelos de dominio
└─ routes/        protección y navegación por rol
android/          proyecto Capacitor/Android
public/           icono oficial, iconos PWA, manifest y service worker
```

La documentación técnica completa (arquitectura, modelos, decisiones, pruebas y pendientes) está en
**[AGENTS.md](AGENTS.md)**.

---

## Diseño

- Estética **AMOLED** (`#000000`) con superficies oscuras y acento **verde lima `#C6F36B`**.
- Inspiración iOS: jerarquía, tarjetas, transiciones suaves, glass sutil y navegación inferior.
- Responsive real: probado de **320 px a 1440 px**, tablets, escritorio y orientación horizontal.
- Modales tipo bottom sheet, respeto de áreas seguras, teclado virtual y estados vacíos claros.
- Icono oficial de CAVIO en favicon, PWA, cabecera, Android y splash.

---

## Pruebas realizadas

- TypeScript sin errores y build de producción correcto.
- Verificación de scroll horizontal en 10 anchos y todas las rutas (sin desbordes).
- Pruebas en **Lenovo TB-7104F (Android 8.1)** vía ADB: flujo completo de pasajero, ofertas,
  seguimiento, calificación, permiso/denegación de ubicación, teclado, rotación y botón atrás.
- APK **debug y release** instalados y ejecutados en el dispositivo.
- PWA: manifest, iconos y service worker verificados; fallback de mapas sin conexión.
- Limitaciones de prueba documentadas: el equipo no tiene GPS ni Internet, por lo que no se pudo
  validar una lectura GPS física ni la instalación PWA desde Android.

Detalle completo en **[AGENTS.md § 14](AGENTS.md)**.

---

## Limitaciones conocidas

- Sin backend: estado local, sin sincronización entre dispositivos.
- Pagos, llamadas, mensajes, compartir, documentos y soporte son DEMO.
- Los mapas y la búsqueda remota necesitan Internet; sin red se usan estimaciones DEMO.
- La geolocalización en PWA no funciona en segundo plano.
- No hay autenticación de producción (contraseñas no almacenadas ni verificadas).

---

## Créditos y datos

- Mapa y datos geográficos: © [OpenStreetMap](https://www.openstreetmap.org/copyright).
- Geocodificación: [Nominatim](https://nominatim.org/).
- Rutas: [OSRM](https://project-osrm.org/).
- Icono: carpeta `Icono/` del repositorio.

Proyecto de demostración. No se utilizan datos personales reales ni se procesan pagos reales.
