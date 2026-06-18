export const ITEM_GRADIENTS: Record<string, string> = {
  'jollof-rice':   'linear-gradient(150deg, #C4622D 0%, #E07840 55%, #F0A560 100%)',
  'waakye':        'linear-gradient(150deg, #2D1F14 0%, #5A3D28 55%, #7A5840 100%)',
  'waakye-full':   'linear-gradient(150deg, #1A0F0A 0%, #3D2410 50%, #6B3D1A 100%)',
  'fried-chicken': 'linear-gradient(150deg, #B87820 0%, #D49A38 60%, #E8BE50 100%)',
  'puff-puff':     'linear-gradient(150deg, #C88830 0%, #DCA848 60%, #ECCC60 100%)',
  'meat-pies':     'linear-gradient(150deg, #8A3818 0%, #B85030 55%, #CC6840 100%)',
  'ice-kenkey':    'linear-gradient(150deg, #1A4060 0%, #2E6080 55%, #4A82A0 100%)',
  'shito':         'linear-gradient(150deg, #4A1010 0%, #881818 55%, #C02828 100%)',
}

export function getItemGradient(id: string): string {
  return ITEM_GRADIENTS[id] ?? 'linear-gradient(150deg, #C4622D, #E07840)'
}

export function getDeliveryFee(distanceRange: string): number {
  switch (distanceRange) {
    case '0-5':   return 15
    case '5-10':  return 25
    case '10-15': return 40
    case '15+':   return 60
    default:      return 0
  }
}

export function getServiceFee(subtotal: number, deliveryFee: number = 0): number {
  if (subtotal <= 1) return 0 // test mode — skip fees on $1 orders
  return Math.round(((subtotal + deliveryFee) * 0.026 + 0.10 + 4) * 100) / 100
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export function getMinOrderDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 5)
  return d.toISOString().split('T')[0]
}

export function generateOrderNumber(): string {
  return `EDZ-${Math.floor(100000 + Math.random() * 900000)}`
}

export function getTimeLabel(timeKey: string): string {
  const map: Record<string, string> = {
    morning:   'Morning (10am - 12pm)',
    afternoon: 'Afternoon (12pm - 4pm)',
    evening:   'Evening (4pm - 7pm)',
  }
  return map[timeKey] ?? timeKey
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending:           'Pending',
    confirmed:         'Confirmed',
    supplier_notified: 'Supplier Notified',
    ready:             'Ready',
    in_progress:       'In Progress',
    delivered:         'Delivered',
    reviewed:          'Reviewed',
    cancelled:         'Cancelled',
  }
  return map[status] ?? status
}

export function getStatusClass(status: string): string {
  const map: Record<string, string> = {
    pending:     'bg-yellow-100 text-yellow-800',
    confirmed:   'bg-blue-100 text-blue-800',
    in_progress: 'bg-orange-100 text-orange-800',
    delivered:   'bg-green-100 text-green-800',
    cancelled:   'bg-red-100 text-red-800',
  }
  return map[status] ?? 'bg-gray-100 text-gray-800'
}
