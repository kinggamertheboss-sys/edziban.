// Agent 5: Order Ready for Pickup / Delivery
// Fires when admin clicks "Mark Ready" in dashboard.
// Sends: customer SMS, customer email.

import { NextRequest, NextResponse } from 'next/server'
import { sendSMS, sendEmail, EDZIBAN_CONFIG, timeLabel } from '@/lib/notifications'
import { orderReadyEmail, OrderEmailData } from '@/lib/emailTemplates'
import { checkLimit, deny, getClientIp } from '@/lib/rateLimit'

// OWASP A08: Allowed keys for this notification payload
const ALLOWED_KEYS = new Set([
  'orderNumber', 'customerName', 'customerPhone', 'customerEmail',
  'items', 'subtotal', 'serviceFee', 'deliveryFee', 'total',
  'fulfillmentType', 'address', 'requestedDate', 'requestedTime', 'specialInstructions', 'eventType',
])
const ALLOWED_ITEM_KEYS = new Set(['name', 'quantity', 'unitPrice'])

export async function POST(req: NextRequest) {
  // OWASP A05: Enforce JSON Content-Type
  if (!req.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 })
  }

  const rl = checkLimit(getClientIp(req) + ':notif-ready', 60, 60 * 1000)
  if (!rl.allowed) return deny(rl)

  const raw = await req.json()

  // OWASP A08: Reject unknown fields
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

  const data: OrderEmailData & { customerPhone: string; customerEmail: string } = raw as OrderEmailData & { customerPhone: string; customerEmail: string }
  console.log(`\n========== ORDER READY: ${data.orderNumber} ==========`)

  const isPickup = data.fulfillmentType === 'pickup'
  const isPlate = (data as OrderEmailData & { eventType?: string }).eventType === 'plate'

  const customerSMS = isPlate
    ? isPickup
      ? `Edziban: Your order ${data.orderNumber} is ready for pickup! Head to ${EDZIBAN_CONFIG.pickupLocation}. See you soon!`
      : `Edziban: Your order ${data.orderNumber} is on its way to you now! We'll be there shortly.`
    : isPickup
      ? `Your Edziban order is ready! Head to ${EDZIBAN_CONFIG.pickupLocation} anytime between ${timeLabel(data.requestedTime)}. Order: ${data.orderNumber} - Edziban`
      : `Your Edziban order is on its way! Estimated arrival: ${timeLabel(data.requestedTime)} today. Order: ${data.orderNumber} - Edziban`

  const notifications = await Promise.all([

    // ── Customer SMS ────────────────────────────────────────────────────
    sendSMS(data.customerPhone, customerSMS, 'customer'),

    // ── Customer Email ───────────────────────────────────────────────────
    sendEmail(
      data.customerEmail,
      isPickup
        ? `Your Edziban order is ready for pickup! – ${data.orderNumber}`
        : `Your Edziban order is on its way! – ${data.orderNumber}`,
      orderReadyEmail(data),
      'customer',
      data.orderNumber,
    ),

  ])

  console.log(`========== ORDER READY COMPLETE ==========\n`)

  return NextResponse.json({ success: true, notifications })
}
