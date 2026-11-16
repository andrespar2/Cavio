import { Bike, Bus, Car, CarFront, type LucideIcon } from 'lucide-react'
import clsx from 'clsx'
import type { VehicleCategoryId } from '../../types'

const ICONS: Record<VehicleCategoryId, LucideIcon> = {
  economy: Car,
  comfort: CarFront,
  xl: Bus,
  moto: Bike,
}

export function CategoryIcon({
  category,
  size = 20,
  className,
}: {
  category: VehicleCategoryId
  size?: number
  className?: string
}) {
  const Icon = ICONS[category] ?? Car
  return <Icon size={size} className={clsx('shrink-0', className)} />
}

export function categoryMeta(id: VehicleCategoryId): { icon: LucideIcon } {
  return { icon: ICONS[id] ?? Car }
}
