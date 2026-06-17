// Mock data — replace with Supabase queries when ready
// ADD SUPABASE HERE

export interface MenuItem {
  id: string
  name: string
  price: number
  unit: string
  serves: string // e.g. "feeds 20–25 guests"
  description: string
  emoji: string
  image?: string         // path relative to /public, e.g. '/images/menu/fried-rice.png'
  video?: string         // path relative to /public, e.g. '/videos/jollof.mp4'
  mediaPosition?: string // CSS object-position, defaults to 'center'
  mediaFit?: string      // CSS object-fit, defaults to 'cover'
  category: 'mains' | 'sides' | 'snacks' | 'drinks' | 'condiments'
  options?: string[]  // e.g. ['Goat', 'Beef'] — shown as a selector on the menu card
  supplierId: string
  supplierName: string
  supplierPayoutRate: number
  supplierCost?: number  // fixed wholesale cost — overrides supplierPayoutRate when set
}

export type OrderStatus = 'pending' | 'confirmed' | 'supplier_notified' | 'ready' | 'delivered' | 'reviewed' | 'in_progress' | 'cancelled'

export interface MockOrder {
  id: string
  customerName: string
  customerPhone: string
  customerEmail: string
  eventType: string
  guestCount: number
  items: { itemId: string; name: string; quantity: number; unitPrice: number }[]
  fulfillmentType: 'delivery' | 'pickup'
  address: string
  distanceRange: string
  requestedDate: string
  requestedTime: string
  specialInstructions: string
  subtotal: number
  serviceFee: number
  deliveryFee: number
  total: number
  commission: number
  supplierPayouts: { supplierId: string; supplierName: string; amount: number }[]
  status: OrderStatus
  supplierId: string
  createdAt: string
  adminNotes: string
  clientType: 'regular' | 'corporate'
  orgName?: string
  contactPerson?: string
  billingEmail?: string
  poNumber?: string
  requestInvoice?: boolean
}

// Minimum batch quantities per product before production is justified.
// Keys match MenuItem.id values.
export const BATCH_MINIMUMS: Record<string, number> = {
  'ice-kenkey': 10,
  'puff-puff':  20,
  'meat-pies':  10,
  'shito':       5,
}

export const MENU_ITEMS: MenuItem[] = [
  // ── Mains ──
  {
    id: 'jollof-rice',
    name: 'Jollof Rice',
    price: 135,
    unit: 'per full pan',
    serves: 'feeds 20–25 guests · ~$6 per person',
    description: 'Party jollof. Cooked in a big pot with tomatoes and peppers until the bottom catches and gets smoky. That part is not a mistake, that is the whole point.',
    emoji: '🍛',
    video: '/videos/jollof.mp4',
    category: 'mains',
    supplierId: 'supplier-1',
    supplierName: 'Auntie Naana Randolph',
    supplierPayoutRate: 0.7,
    supplierCost: 100,
  },
  {
    id: 'waakye',
    name: 'Waakye',
    price: 119,
    unit: 'per full tray',
    serves: 'feeds 20–25 guests · ~$5 per person',
    description: 'Rice and beans cooked together until they are one thing. Order it plain or go straight to the full package if you want the whole spread.',
    emoji: '🍱',
    video: '/videos/waakye.mp4',
    category: 'mains',
    supplierId: 'supplier-1',
    supplierName: 'Auntie Naana Randolph',
    supplierPayoutRate: 0.7,
  },
  {
    id: 'waakye-stew',
    name: 'Waakye Stew',
    price: 120,
    unit: 'per full tray',
    serves: 'serves 20–30 guests',
    description: 'Rich, slow-cooked tomato and meat stew made to go with waakye. Pairs perfectly with the rice and beans.',
    emoji: '🍲',
    category: 'sides',
    options: ['Goat', 'Beef'],
    video: '/videos/waakye-stew.mp4',
    supplierId: 'supplier-1',
    supplierName: 'Auntie Naana Randolph',
    supplierPayoutRate: 0.7,
  },
  {
    id: 'fried-chicken',
    name: 'Fried Chicken',
    price: 149,
    unit: 'per full tray',
    serves: 'feeds 20–25 guests · ~$7 per person',
    description: 'Marinated overnight. The spice goes into the meat, not just on the skin. Comes out crispy but not dry. That is the part people keep coming back for.',
    emoji: '🍗',
    video: '/videos/fried-chicken.mp4',
    category: 'sides',
    supplierId: 'supplier-1',
    supplierName: 'Auntie Naana Randolph',
    supplierPayoutRate: 0.7,
  },
  {
    id: 'fried-rice',
    name: 'Fried Rice',
    price: 119,
    unit: 'per full pan',
    serves: 'feeds 20–25 guests · ~$5 per person',
    description: 'Not Chinese takeout fried rice. Ghanaian style, heavier seasoning, different vegetables. Order it alongside the jollof if you want to give guests a choice.',
    emoji: '🍚',
    video: '/videos/fried-rice.mp4',
    category: 'mains',
    supplierId: 'supplier-1',
    supplierName: 'Auntie Naana Randolph',
    supplierPayoutRate: 0.7,
  },
  // ── Sides ──
  {
    id: 'tsofi',
    name: 'Tsofi (Chofi)',
    price: 199,
    unit: 'per full tray',
    serves: 'feeds 20–25 guests · ~$9 per person',
    description: 'Turkey tails marinated overnight and cooked over fire. The fat renders slow and the skin goes crispy. If your guests have never had tsofi, this is the one that converts people.',
    emoji: '🍗',
    video: '/videos/tsofi.mp4',
    category: 'sides',
    supplierId: 'supplier-1',
    supplierName: 'Auntie Naana Randolph',
    supplierPayoutRate: 0.7,
  },
  // ── Snacks ──
  {
    id: 'puff-puff',
    name: 'Bofrot',
    price: 119,
    unit: 'per full tray',
    serves: 'serves 25–30 guests · under $5 per person',
    description: 'Ghanaian fried dough, lightly sweet, made the day of. Best eaten warm. Kids go for these first. Then the adults finish what is left.',
    emoji: '🍩',
    category: 'snacks',
    video: '/videos/bofrot.mp4',
    supplierId: 'supplier-1',
    supplierName: 'Auntie Naana Randolph',
    supplierPayoutRate: 0.7,
  },
  {
    id: 'meat-pies',
    name: 'Meat Pies',
    price: 47.99,
    unit: 'per 24 pieces',
    serves: 'serves 24 guests · under $2 per piece',
    description: 'Shortcrust pastry with seasoned meat filling, baked until golden. The kind of thing people eat two of before the main food is even out.',
    emoji: '🥧',
    video: '/videos/meat-pies.mp4',
    category: 'snacks',
    supplierId: 'supplier-1',
    supplierName: 'Auntie Naana Randolph',
    supplierPayoutRate: 0.7,
  },
  // ── Drinks ──
  {
    id: 'ice-kenkey',
    name: 'Ice Kenkey',
    price: 69,
    unit: 'per batch',
    serves: 'serves 10–12 guests · ~$6 per person',
    description: 'Fermented corn, blended and served cold. Thick, slightly sour, nothing like it anywhere else. Coastal Ghanaians drink it all day. If your guests have never had it, they will be asking what it is.',
    emoji: '🥤',
    video: '/videos/ice-kenkey.mp4',
    category: 'drinks',
    supplierId: 'supplier-1',
    supplierName: 'Auntie Naana Randolph',
    supplierPayoutRate: 0.7,
  },
  {
    id: 'bb-cocktail',
    name: 'BB Cocktail de Fruits',
    price: 59,
    unit: 'per case (24 cans)',
    serves: 'serves 24 guests · under $2.50 per can',
    description: 'West African fruit cocktail, 24 cans per case. Strong fruit flavor, not too sweet. Good for guests who want something other than soda.',
    emoji: '🥤',
    category: 'drinks',
    video: '/videos/bb-cocktail.mp4',
    mediaPosition: '55% center',
    supplierId: 'supplier-1',
    supplierName: 'Auntie Naana Randolph',
    supplierPayoutRate: 0.7,
  },
  // ── Condiments ──
  {
    id: 'shito',
    name: 'Shito',
    price: 14.99,
    unit: 'per jar',
    serves: 'serves 8–10 guests',
    description: 'Black pepper sauce made with dried fish and shrimp. Ghanaians put it on everything. Order more than you think you need, it goes fast.',
    emoji: '🌶️',
    category: 'condiments',
    video: '/videos/shito.mp4',
    supplierId: 'supplier-1',
    supplierName: 'Auntie Naana Randolph',
    supplierPayoutRate: 0.7,
  },
]

export const MENU_CATEGORIES = [
  { key: 'mains',       label: 'Mains',       icon: '🍛' },
  { key: 'sides',       label: 'Sides',        icon: '🥣' },
  { key: 'snacks',      label: 'Snacks',       icon: '🥟' },
  { key: 'drinks',      label: 'Drinks',       icon: '🥤' },
  { key: 'condiments',  label: 'Condiments',   icon: '🌶️' },
] as const

export const EVENT_TYPES = [
  'Funeral / Memorial',
  'Birthday Party',
  'Wedding Reception',
  'Naming Ceremony',
  'Corporate Event',
  'Student Organization',
  'Other',
]

export const MOCK_SUPPLIERS = [
  { id: 'supplier-1', name: 'Auntie Naana Randolph', email: '', phone: '+16174174081', balance: 0 },
]

export const MOCK_ORDERS: MockOrder[] = [
  {
    id: 'EDZ-2026-0001',
    customerName: 'Kofi Mensah',
    customerPhone: '+16175550192',
    customerEmail: 'kofi.mensah@bostonuniversity.edu',
    eventType: 'Student Organization',
    guestCount: 80,
    items: [
      { itemId: 'jollof-rice',  name: 'Jollof Rice',   quantity: 2, unitPrice: 135 },
      { itemId: 'fried-chicken', name: 'Fried Chicken', quantity: 2, unitPrice: 149 },
      { itemId: 'puff-puff',    name: 'Bofrot',         quantity: 1, unitPrice: 119 },
      { itemId: 'shito',        name: 'Shito',          quantity: 4, unitPrice: 14.99 },
    ],
    fulfillmentType: 'delivery',
    address: '775 Commonwealth Ave, Boston, MA 02215',
    distanceRange: '5-10',
    requestedDate: '2026-06-28',
    requestedTime: 'afternoon',
    specialInstructions: 'Loading dock entrance on the side. Call 10 minutes before arrival.',
    subtotal: 897.96,
    serviceFee: 27.74,
    deliveryFee: 35,
    total: 960.70,
    commission: 192.14,
    supplierPayouts: [{ supplierId: 'supplier-1', supplierName: 'Auntie Naana Randolph', amount: 628.57 }],
    status: 'pending',
    supplierId: 'supplier-1',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    adminNotes: '',
    clientType: 'corporate',
    orgName: 'Boston University — GASA',
    contactPerson: 'Kofi Mensah',
    billingEmail: 'treasurer@bugasa.org',
    poNumber: 'PO-2026-0042',
    requestInvoice: true,
  },
]

export const COMMISSION_RATE = 0.2
