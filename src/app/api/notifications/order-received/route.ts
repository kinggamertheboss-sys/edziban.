// Agent 1: Order Received
// Fires the moment a customer submits an order.
// Sends: customer SMS, customer email, admin WhatsApp, admin email.

import { NextRequest, NextResponse } from 'next/server'
import { sendSMS, sendEmail, sendWhatsApp, EDZIBAN_CONFIG, timeLabel } from '@/lib/notifications'
import { orderReceivedEmail } from '@/lib/emailTemplates'
import { checkLimit, deny, getClientIp } from '@/lib/rateLimit'
import { sanitizePhone } from '@/lib/sanitize'

// OWASP A08: Exact set of allowed top-level keys for this payload
const ALLOWED_KEYS = new Set([
  'orderNumber', 'customerName', 'customerPhone', 'customerEmail',
  'items', 'subtotal', 'serviceFee', 'deliveryFee', 'total',
  'fulfillmentType', 'address', 'requestedDate', 'requestedTime', 'specialInstructions',
])
// OWASP A08: Allowed keys within each item object
const ALLOWED_ITEM_KEYS = new Set(['name', 'quantity', 'unitPrice'])

export interface OrderReceivedPayload {
  orderNumber: string
  customerName: string
  customerPhone: string
  customerEmail: string
  items: Array<{ name: string; quantity: number; unitPrice: number }>
  subtotal: number
  serviceFee: number
  deliveryFee: number
  total: number
  fulfillmentType: 'pickup' | 'delivery'
  address?: string
  requestedDate: string
  requestedTime: string
  specialInstructions?: string
}

export async function POST(req: NextRequest) {
  // OWASP A05: Enforce JSON Content-Type
  if (!req.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 })
  }

  // IP limit: 10 per hour (fires once per order) (OWASP A04)
  const ipRl = checkLimit(getClientIp(req) + ':notif-received', 10, 60 * 60 * 1000)
  if (!ipRl.allowed) return deny(ipRl)

  const raw = await req.json()

  // OWASP A08: Reject unknown top-level fields
  if (typeof raw !== 'object' || raw === null) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const unexpectedKeys = Object.keys(raw as object).filter(k => !ALLOWED_KEYS.has(k))
  if (unexpectedKeys.length) {
    return NextResponse.json({ error: 'Invalid request structure' }, { status: 400 })
  }

  // OWASP A08: Reject unknown fields in each item
  const items = (raw as OrderReceivedPayload).items
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

  const data: OrderReceivedPayload = raw as OrderReceivedPayload

  // User limit: 5 notification fires per phone per hour (prevents spamming one customer)
  const phone = sanitizePhone(data.customerPhone)
  if (phone) {
    const userRl = checkLimit('u:' + phone + ':notif-received', 5, 60 * 60 * 1000)
    if (!userRl.allowed) return deny(userRl)
  }
  console.log(`\n========== ORDER RECEIVED: ${data.orderNumber} ==========`)

  const itemsText = data.items.map(i => `${i.name} × ${i.quantity}`).join(', ')
  const fulfillDetail = data.fulfillmentType === 'delivery'
    ? `Delivery to ${data.address}`
    : `Pickup from ${EDZIBAN_CONFIG.pickupLocation}`

  const notifications = await Promise.all([

    // ── Customer SMS ────────────────────────────────────────────────────
    sendSMS(
      data.customerPhone,
      `Edziban: Hi ${data.customerName}, order received. ${itemsText}. Total: $${data.total.toFixed(2)}. ${data.fulfillmentType === 'delivery' ? 'Delivery' : 'Pickup'} on ${data.requestedDate}. We confirm within 24hrs.`,
      'customer'
    ),

    // ── Customer Email ───────────────────────────────────────────────────
    sendEmail(
      data.customerEmail,
      `Order ${data.orderNumber} received – Edziban`,
      orderReceivedEmail(data),
      'customer'
    ),

    // ── Admin SMS ───────────────────────────────────────────────────────
    sendSMS(
      EDZIBAN_CONFIG.myPhone,
      `NEW ORDER ${data.orderNumber} — ${data.customerName}. ${itemsText}. Total: $${data.total.toFixed(2)}. ${data.fulfillmentType === 'delivery' ? `Delivery to ${data.address}` : 'Pickup'}. ${data.requestedDate} ${timeLabel(data.requestedTime)}.`,
      'admin'
    ),

    // ── Admin WhatsApp (via Make.com) ────────────────────────────────────
    sendWhatsApp(
      EDZIBAN_CONFIG.myWhatsapp,
      `🇬🇭 NEW ORDER ${data.orderNumber}\n` +
      `Customer: ${data.customerName}\n` +
      `Phone: ${data.customerPhone}\n` +
      `Email: ${data.customerEmail}\n` +
      `Items: ${itemsText}\n` +
      `Total: $${data.total.toFixed(2)}\n` +
      `Type: ${data.fulfillmentType}\n` +
      (data.address ? `Address: ${data.address}\n` : '') +
      `Date: ${data.requestedDate}, ${timeLabel(data.requestedTime)}\n` +
      (data.specialInstructions ? `Notes: ${data.specialInstructions}` : ''),
      'admin'
    ),

    // ── Admin Email ──────────────────────────────────────────────────────
    sendEmail(
      EDZIBAN_CONFIG.myEmail,
      `New order ${data.orderNumber} from ${data.customerName}`,
      orderReceivedEmail({ ...data, customerName: `${data.customerName} (Admin Copy)` }),
      'admin'
    ),
  ])

  console.log(`========== ORDER RECEIVED COMPLETE ==========\n`)

  return NextResponse.json({ success: true, notifications, orderNumber: data.orderNumber })
}
