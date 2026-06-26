import { NextRequest, NextResponse } from 'next/server'
import { sendSMS, sendEmail, EDZIBAN_CONFIG } from '@/lib/notifications'
import { orderDeliveredEmail, OrderEmailData } from '@/lib/emailTemplates'
import { checkLimit, deny, getClientIp } from '@/lib/rateLimit'

const ALLOWED_KEYS = new Set([
  'orderNumber', 'customerName', 'customerPhone', 'customerEmail',
  'items', 'subtotal', 'serviceFee', 'deliveryFee', 'total',
  'fulfillmentType', 'address', 'requestedDate', 'requestedTime', 'specialInstructions', 'eventType',
])
const ALLOWED_ITEM_KEYS = new Set(['name', 'quantity', 'unitPrice'])

export async function POST(req: NextRequest) {
  if (!req.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 })
  }

  const rl = checkLimit(getClientIp(req) + ':notif-delivered', 60, 60 * 1000)
  if (!rl.allowed) return deny(rl)

  const raw = await req.json()

  if (typeof raw !== 'object' || raw === null) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const unexpected = Object.keys(raw as object).filter(k => !ALLOWED_KEYS.has(k))
  if (unexpected.length) {
    return NextResponse.json({ error: 'Invalid request structure' }, { status: 400 })
  }
  const items = (raw as OrderEmailData).items
  if (!Array.isArray(items)) {
    return NextResponse.json({ error: 'items must be an array' }, { status: 400 })
  }
  for (const item of items) {
    if (typeof item !== 'object' || item === null) {
      return NextResponse.json({ error: 'Invalid item' }, { status: 400 })
    }
    const unexpectedItem = Object.keys(item as object).filter(k => !ALLOWED_ITEM_KEYS.has(k))
    if (unexpectedItem.length) {
      return NextResponse.json({ error: 'Invalid item structure' }, { status: 400 })
    }
  }

  const data = raw as OrderEmailData & { customerPhone: string; customerEmail: string }
  console.log(`\n========== ORDER DELIVERED: ${data.orderNumber} ==========`)

  const isPickup = data.fulfillmentType === 'pickup'
  const smsText = isPickup
    ? `Edziban: Your order ${data.orderNumber} has been picked up. Enjoy your food! A review request is coming shortly — thank you for choosing us.`
    : `Edziban: Your order ${data.orderNumber} has been delivered. Enjoy your food! A review request is coming shortly — thank you for choosing us. — ${EDZIBAN_CONFIG.website}`

  const notifications = await Promise.all([
    sendSMS(data.customerPhone, smsText, 'customer', data.orderNumber),
    sendEmail(
      data.customerEmail,
      `Your Edziban order has been ${isPickup ? 'picked up' : 'delivered'} – ${data.orderNumber}`,
      orderDeliveredEmail(data),
      'customer',
      data.orderNumber,
    ),
  ])

  console.log(`========== ORDER DELIVERED COMPLETE ==========\n`)

  return NextResponse.json({ success: true, notifications })
}
