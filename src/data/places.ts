import type { CategoryConfig, Place } from '../types'

// ============================================================
// CAVIO — Lugares DEMO en Bogotá, Colombia
// ============================================================

export const BOGOTA_CENTER = { lat: 4.6533, lng: -74.0836 }

export const BOGOTA_PLACES: Place[] = [
  { label: 'Parque de la 93', address: 'Cra. 11 #93-40, Bogotá', lat: 4.6768, lng: -74.0487 },
  { label: 'Zona T', address: 'Cll. 85 con Cra. 13, Bogotá', lat: 4.6669, lng: -74.0531 },
  { label: 'Centro Comercial Andino', address: 'Cra. 11 #82-71, Bogotá', lat: 4.6667, lng: -74.0556 },
  { label: 'Chapinero Alto', address: 'Cll. 60 #2-20, Bogotá', lat: 4.656, lng: -74.057 },
  { label: 'Usaquén', address: 'Cll. 119 #5-15, Bogotá', lat: 4.6951, lng: -74.0308 },
  { label: 'Centro Comercial Unicentro', address: 'Cra. 15 #123-30, Bogotá', lat: 4.701, lng: -74.0433 },
  { label: 'Aeropuerto El Dorado', address: 'Cll. 26 #103-9, Bogotá', lat: 4.7016, lng: -74.1469 },
  { label: 'Centro Mayor', address: 'Cll. 38A Sur #34-82, Bogotá', lat: 4.5753, lng: -74.105 },
  { label: 'Plaza de Bolívar', address: 'Cll. 10 #8-16, Bogotá', lat: 4.5981, lng: -74.0758 },
  { label: 'Museo del Oro', address: 'Cra. 6 #15-88, Bogotá', lat: 4.6019, lng: -74.0721 },
  { label: 'La Candelaria', address: 'Cll. 11 #4-21, Bogotá', lat: 4.5964, lng: -74.073 },
  { label: 'Santuario de Monserrate', address: 'Cra. 2 Este #21-48, Bogotá', lat: 4.6057, lng: -74.0553 },
  { label: 'Corferias', address: 'Cra. 37 #24-67, Bogotá', lat: 4.6291, lng: -74.0893 },
  { label: 'Estadio El Campín', address: 'Cra. 30 #57-60, Bogotá', lat: 4.6459, lng: -74.0775 },
  { label: 'Universidad Nacional', address: 'Cra. 45 #26-85, Bogotá', lat: 4.638, lng: -74.084 },
  { label: 'Salitre Plaza', address: 'Cra. 68 #24-79, Bogotá', lat: 4.6572, lng: -74.101 },
  { label: 'Gran Estación', address: 'Av. Cll. 26 #62-47, Bogotá', lat: 4.6497, lng: -74.1024 },
  { label: 'Parque Simón Bolívar', address: 'Cra. 48 #63-20, Bogotá', lat: 4.6583, lng: -74.093 },
  { label: 'Calle 85', address: 'Cll. 85 #12-40, Bogotá', lat: 4.666, lng: -74.05 },
  { label: 'Cedritos', address: 'Cll. 140 #9-20, Bogotá', lat: 4.718, lng: -74.03 },
  { label: 'Suba Centro', address: 'Cll. 145 #91-20, Bogotá', lat: 4.741, lng: -74.083 },
  { label: 'Kennedy Central', address: 'Cll. 40 Sur #79-20, Bogotá', lat: 4.628, lng: -74.15 },
  { label: 'Restrepo', address: 'Cll. 18 Sur #20-30, Bogotá', lat: 4.575, lng: -74.11 },
  { label: 'Galerías', address: 'Cll. 53 #24-10, Bogotá', lat: 4.642, lng: -74.07 },
  { label: 'Parkway', address: 'Cll. 41 #17-20, Bogotá', lat: 4.63, lng: -74.075 },
  { label: 'Teusaquillo', address: 'Cll. 34 #17-40, Bogotá', lat: 4.634, lng: -74.08 },
  { label: 'Terminal Salitre', address: 'Cll. 23 #69-90, Bogotá', lat: 4.6543, lng: -74.1142 },
  { label: 'Clínica Shaio', address: 'Cra. 50 #124-30, Bogotá', lat: 4.7075, lng: -74.0528 },
]

export const CATEGORY_DEFAULTS: CategoryConfig[] = [
  {
    id: 'economy',
    name: 'CAVIO Economy',
    description: 'La opción más eficiente para moverte por la ciudad.',
    capacity: 4,
    baseFare: 3500,
    perKm: 1200,
    perMin: 180,
    minFare: 4500,
    etaMin: 4,
    icon: 'car',
    color: '#C6F36B',
  },
  {
    id: 'comfort',
    name: 'CAVIO Comfort',
    description: 'Más espacio y comodidad para trayectos tranquilos.',
    capacity: 4,
    baseFare: 4800,
    perKm: 1550,
    perMin: 240,
    minFare: 6200,
    etaMin: 6,
    icon: 'car-front',
    color: '#8FD3FF',
  },
  {
    id: 'xl',
    name: 'CAVIO XL',
    description: 'Hasta 6 pasajeros. Ideal para grupos y equipaje.',
    capacity: 6,
    baseFare: 6500,
    perKm: 2050,
    perMin: 300,
    minFare: 8900,
    etaMin: 8,
    icon: 'bus',
    color: '#FFC46B',
  },
  {
    id: 'moto',
    name: 'CAVIO Moto',
    description: 'Rápido y ágil para evitar el tráfico. Un pasajero.',
    capacity: 1,
    baseFare: 2200,
    perKm: 800,
    perMin: 110,
    minFare: 3000,
    etaMin: 3,
    icon: 'bike',
    color: '#FF8FA3',
  },
]

export const PAYMENT_METHODS = [
  { id: 'cash', label: 'Efectivo', hint: 'Paga al conductor en efectivo' },
  { id: 'card', label: 'Tarjeta', hint: 'Simulación de pago con tarjeta' },
  { id: 'nequi', label: 'Nequi', hint: 'Simulación de pago con Nequi' },
  { id: 'daviplata', label: 'Daviplata', hint: 'Simulación de pago con Daviplata' },
] as const
