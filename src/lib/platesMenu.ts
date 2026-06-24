export interface PlateItem {
  id: string
  name: string
  description: string
  price: number
  category: string
  available: boolean
  gradient: string
}

export const PLATE_CATEGORIES = ['Rice Dishes', 'Sides & Extras'] as const

export const PLATES_MENU: PlateItem[] = [
  {
    id: 'jollof-rice-plate',
    name: 'Jollof Rice',
    description: 'Smoky party jollof with chicken or beef — the real deal.',
    price: 18.00,
    category: 'Rice Dishes',
    available: true,
    gradient: 'linear-gradient(150deg, #C4622D 0%, #E07840 55%, #F0A560 100%)',
  },
  {
    id: 'waakye-plate',
    name: 'Waakye',
    description: 'Rice and beans with spaghetti, boiled egg, fried fish, and shito.',
    price: 17.00,
    category: 'Rice Dishes',
    available: true,
    gradient: 'linear-gradient(150deg, #2D1F14 0%, #5A3D28 55%, #7A5840 100%)',
  },
  {
    id: 'fried-rice-plate',
    name: 'Fried Rice',
    description: 'Ghanaian fried rice with vegetables and your choice of protein.',
    price: 17.00,
    category: 'Rice Dishes',
    available: true,
    gradient: 'linear-gradient(150deg, #B87820 0%, #D49A38 60%, #E8BE50 100%)',
  },
  {
    id: 'kontomire-plate',
    name: 'Kontomire Stew & Rice',
    description: 'Creamy cocoyam leaf stew with white rice and fried plantain.',
    price: 16.00,
    category: 'Rice Dishes',
    available: false,
    gradient: 'linear-gradient(150deg, #1A3A1A 0%, #2E6030 55%, #4A8040 100%)',
  },
]

export function calculatePlateDeliveryFee(miles: number): number {
  const BASE_FEE = 2.99
  const BASE_MILES = 3
  const PER_MILE = 0.50
  const MAX_FEE = 7.99
  if (miles <= BASE_MILES) return BASE_FEE
  const fee = BASE_FEE + (miles - BASE_MILES) * PER_MILE
  return Math.min(MAX_FEE, Math.round(fee * 100) / 100)
}

export function calculateEstimatedMinutes(miles: number): number {
  return Math.round(15 + miles * 2)
}
