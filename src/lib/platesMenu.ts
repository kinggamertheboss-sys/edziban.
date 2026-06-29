export interface PlateItem {
  id: string
  name: string
  description: string
  price: number
  category: string
  available: boolean
  gradient: string
  customizable?: boolean
  video?: string
}

export const PLATE_CATEGORIES = ['Rice Dishes', 'Sides & Extras'] as const

export const PLATES_MENU: PlateItem[] = [
  {
    id: 'jollof-build-plate',
    name: 'Build Your Jollof Plate',
    description: 'Jollof rice, 2 pieces of chicken, your choice of shito or stew. Add plantain, egg, salad, and more.',
    price: 15.00,
    category: 'Rice Dishes',
    available: true,
    gradient: 'linear-gradient(150deg, #C4622D 0%, #E07840 55%, #F0A560 100%)',
    customizable: true,
    video: '/videos/jollof.mp4',
  },
  // ── Jollof add-ons (hidden from grid — verified server-side) ──
  {
    id: 'jollof-addon-plantain',
    name: 'Fried Plantain',
    description: 'Sweet fried plantains, golden and crispy.',
    price: 2.00,
    category: 'Jollof Add-ons',
    available: true,
    gradient: 'linear-gradient(150deg, #B87820 0%, #D49A38 60%, #E8BE50 100%)',
  },
  {
    id: 'jollof-addon-salad',
    name: 'Ghana Salad',
    description: 'Fresh Ghana salad.',
    price: 2.00,
    category: 'Jollof Add-ons',
    available: true,
    gradient: 'linear-gradient(150deg, #1A3A1A 0%, #2E6030 55%, #4A8040 100%)',
  },
  {
    id: 'jollof-addon-egg',
    name: 'Boiled Egg',
    description: 'One boiled egg served on the side.',
    price: 1.00,
    category: 'Jollof Add-ons',
    available: true,
    gradient: 'linear-gradient(150deg, #B8A028 0%, #D0C050 60%, #E0D878 100%)',
  },
  {
    id: 'jollof-addon-sauce',
    name: 'Extra Shito or Stew',
    description: 'Extra sauce on the side.',
    price: 1.00,
    category: 'Jollof Add-ons',
    available: true,
    gradient: 'linear-gradient(150deg, #8B1A1A 0%, #B83028 55%, #D04838 100%)',
  },
  {
    id: 'jollof-addon-chicken',
    name: 'Extra Chicken',
    description: 'One extra piece of chicken.',
    price: 4.00,
    category: 'Jollof Add-ons',
    available: true,
    gradient: 'linear-gradient(150deg, #7A4010 0%, #A85E28 55%, #C07840 100%)',
  },
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
    id: 'test-plate',
    name: 'Test Item — Remove After Testing',
    description: 'For checkout testing only. $1.00.',
    price: 1.00,
    category: 'Rice Dishes',
    available: true,
    gradient: 'linear-gradient(150deg, #4A4A4A 0%, #6A6A6A 55%, #8A8A8A 100%)',
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

export function getPlatesServiceFee(subtotal: number, deliveryFee: number = 0): number {
  const base = subtotal + deliveryFee
  return Math.round((base * 0.029 + 0.30) * 100) / 100
}

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
