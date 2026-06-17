// Agent 3: Order Confirmed (admin decision)
// Fires when admin clicks "Confirm Order" in dashboard.
// Sends: customer SMS, customer email.

import { NextRequest, NextResponse } from 'next/server'
import { sendSMS, sendEmail, EDZIBAN_CONFIG, timeLabel } from '@/lib/notifications'
import { orderConfirmedEmail, OrderEmailData } from '@/lib/emailTemplates'
import { checkLimit, deny, getClientIp } from '@/lib/rateLimit'

// OWASP A08: Allowed keys for this notification payload (OrderEmailData + optional contact fields)
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

  const rl = checkLimit(getClientIp(req) + ':notif-confirmed', 60, 60 * 1000)
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

  const data: OrderEmailData = raw as OrderEmailData
  console.log(`\n========== ORDER CONFIRMED: ${data.orderNumber} ==========`)

  const itemsText = data.items.map(i => `${i.name} × ${i.quantity}`).join(', ')
  const fulfillDetail = data.fulfillmentType === 'delivery'
    ? `Delivery to ${data.address}`
    : `Pickup from ${EDZIBAN_CONFIG.pickupLocation}`

  const notifications = await Promise.all([

    // ── Customer SMS ────────────────────────────────────────────────────
    sendSMS(
      (data as OrderEmailData & { customerPhone?: string }).customerPhone ?? '',
      `Great news ${data.customerName}! Your Edziban order is CONFIRMED ✅\n` +
      `Order ${data.orderNumber}\n` +
      `${itemsText}\n` +
      `${data.requestedDate}, ${timeLabel(data.requestedTime)}\n` +
      `${fulfillDetail}\n` +
      `See you then! - Edziban 🇬🇭`,
      'customer'
    ),

    // ── Customer Email ───────────────────────────────────────────────────
    sendEmail(
      (data as OrderEmailData & { customerEmail?: string }).customerEmail ?? '',
      `Order ${data.orderNumber} confirmed – Edziban`,
      orderConfirmedEmail(data),
      'customer'
    ),

  ])

  console.log(`========== ORDER CONFIRMED COMPLETE ==========\n`)

  return NextResponse.json({ success: true, notifications })
}
