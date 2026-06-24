import { NextRequest, NextResponse } from 'next/server'
import { SquareClient, SquareEnvironment } from 'square'
import { randomUUID } from 'crypto'
import { getAdminClient } from '@/lib/supabase'
import { PLATES_MENU, calculatePlateDeliveryFee, calculateEstimatedMinutes } from '@/lib/platesMenu'
import { generateOrderNumber, getServiceFee } from '@/lib/utils'
import { sanitizeText, sanitizeEmail, sanitizePhone, sanitizeAmount, sanitizeEnum, VALID_FULFILLMENT_TYPES } from '@/lib/sanitize'
import { checkLimit, deny, getClientIp } from '@/lib/rateLimit'
import { sendSMS, sendEmail, EDZIBAN_CONFIG } from '@/lib/notifications'
import { orderReceivedEmail } from '@/lib/emailTemplates'

const KITCHEN_ADDRESS = 'Randolph, MA 02368'

const ALLOWED_TOP  = new Set(['sourceId', 'amount', 'order'])
const ALLOWED_ORDER = new Set([
  'customerName', 'customerPhone', 'customerEmail',
  'items', 'fulfillmentType', 'address',
  'subtotal', 'serviceFee', 'deliveryFee', 'total',
  'specialInstructions',
])
const ALLOWED_ITEM = new Set(['itemId', 'name', 'quantity', 'unitPrice'])

const square = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN!,
  environment: process.env.SQUARE_ENVIRONMENT === 'sandbox' ? SquareEnvironment.Sandbox : SquareEnvironment.Production,
})

async function resolveDeliveryFee(address: string): Promise<number> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  if (!apiKey) throw new Error('Maps API not configured')

  const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json')
  url.searchParams.set('origins', KITCHEN_ADDRESS)
  url.searchParams.set('destinations', address)
  url.searchParams.set('units', 'imperial')
  url.searchParams.set('key', apiKey)

  const r = await fetch(url.toString())
  const data = await r.json() as {
    status: string
    rows?: Array<{ elements: Array<{ status: string; distance: { value: number } }> }>
  }

  if (data.status !== 'OK' || data.rows?.[0]?.elements?.[0]?.status !== 'OK') {
    throw new Error('Could not verify delivery address')
  }

  const miles = data.rows![0].elements[0].distance.value / 1609.344
  return calculatePlateDeliveryFee(miles)
}

export async function POST(req: NextRequest) {
  if (!req.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 })
  }

  const ip = getClientIp(req)
  const ipRl = checkLimit(ip + ':plates-payment', 5, 10 * 60 * 1000)
  if (!ipRl.allowed) return deny(ipRl)

  const raw = await req.json().catch(() => null)
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const unexpected = Object.keys(raw as object).filter(k => !ALLOWED_TOP.has(k))
  if (unexpected.length) return NextResponse.json({ error: 'Invalid request structure' }, { status: 400 })

  const { sourceId, amount, order } = raw as { sourceId: unknown; amount: unknown; order: unknown }

  if (!sourceId || !amount) return NextResponse.json({ error: 'Missing sourceId or amount' }, { status: 400 })
  if (typeof order !== 'object' || order === null) return NextResponse.json({ error: 'Invalid order' }, { status: 400 })

  const unexpectedOrder = Object.keys(order as object).filter(k => !ALLOWED_ORDER.has(k))
  if (unexpectedOrder.length) return NextResponse.json({ error: 'Invalid order structure' }, { status: 400 })

  const o = order as Record<string, unknown>
  if (!Array.isArray(o.items)) return NextResponse.json({ error: 'items must be an array' }, { status: 400 })

  for (const item of o.items as unknown[]) {
    if (typeof item !== 'object' || item === null) return NextResponse.json({ error: 'Invalid item' }, { status: 400 })
    const badKey = Object.keys(item as object).find(k => !ALLOWED_ITEM.has(k))
    if (badKey) return NextResponse.json({ error: 'Invalid item structure' }, { status: 400 })
  }

  const clean = {
    customerName:        sanitizeText(o.customerName, 100),
    customerPhone:       sanitizePhone(o.customerPhone),
    customerEmail:       sanitizeEmail(o.customerEmail),
    fulfillmentType:     sanitizeEnum(o.fulfillmentType, VALID_FULFILLMENT_TYPES) ?? 'pickup',
    address:             sanitizeText(o.address, 300),
    specialInstructions: sanitizeText(o.specialInstructions, 500),
    subtotal:            sanitizeAmount(o.subtotal),
    deliveryFee:         sanitizeAmount(o.deliveryFee),
    serviceFee:          sanitizeAmount(o.serviceFee),
    total:               sanitizeAmount(o.total),
    items: (o.items as Array<Record<string, unknown>>).slice(0, 20).map(i => ({
      itemId:    sanitizeText(i.itemId, 60),
      name:      sanitizeText(i.name, 100),
      quantity:  Math.max(1, Math.min(99, parseInt(String(i.quantity), 10) || 1)),
      unitPrice: sanitizeAmount(i.unitPrice),
    })).filter(i => i.itemId && i.name),
  }

  if (!clean.customerName || !clean.customerEmail || clean.items.length === 0) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (clean.fulfillmentType === 'delivery' && !clean.address) {
    return NextResponse.json({ error: 'Delivery address is required' }, { status: 400 })
  }

  // Server-side price verification
  const unknownItem = clean.items.find(i => !PLATES_MENU.find(m => m.id === i.itemId))
  if (unknownItem) return NextResponse.json({ error: 'Unrecognized item' }, { status: 400 })

  const serverSubtotal = Math.round(
    clean.items.reduce((sum, item) => {
      const menuItem = PLATES_MENU.find(m => m.id === item.itemId)!
      return sum + menuItem.price * item.quantity
    }, 0) * 100
  ) / 100

  let serverDeliveryFee = 0
  if (clean.fulfillmentType === 'delivery') {
    try {
      serverDeliveryFee = await resolveDeliveryFee(clean.address)
    } catch (e) {
      console.error('[PLATES-PAYMENT] Delivery fee error:', e)
      return NextResponse.json({ error: 'Could not verify delivery address' }, { status: 422 })
    }
  }

  const serverServiceFee = getServiceFee(serverSubtotal, serverDeliveryFee)
  const serverTotal = Math.round((serverSubtotal + serverServiceFee + serverDeliveryFee) * 100) / 100

  const clientAmount = sanitizeAmount(amount)
  if (Math.abs(clientAmount - serverTotal) > 0.02) {
    console.warn(`[SECURITY] Plates price mismatch — client: $${clientAmount}, server: $${serverTotal}, IP: ${ip}`)
    return NextResponse.json({ error: 'Payment amount does not match order total' }, { status: 400 })
  }

  const userRl = checkLimit('u:' + clean.customerEmail + ':plates-payment', 3, 60 * 60 * 1000)
  if (!userRl.allowed) return deny(userRl)

  try {
    const response = await square.payments.create({
      sourceId: String(sourceId),
      idempotencyKey: randomUUID(),
      amountMoney: {
        amount: BigInt(Math.round(serverTotal * 100)),
        currency: 'USD',
      },
      locationId: process.env.SQUARE_LOCATION_ID!,
      note: `Edziban plate order — ${clean.customerName}`,
      statementDescriptionIdentifier: 'KD Capital Holdings',
    })

    const paymentId = response.payment?.id ?? null
    const orderNumber = generateOrderNumber()
    const today = new Date().toISOString().split('T')[0]

    const db = getAdminClient()
    await db.from('orders').insert({
      id: orderNumber,
      customer_name: clean.customerName,
      customer_phone: clean.customerPhone,
      customer_email: clean.customerEmail,
      event_type: 'plate',
      guest_count: 1,
      fulfillment_type: clean.fulfillmentType,
      address: clean.address,
      distance_range: '',
      requested_date: today,
      requested_time: 'asap',
      special_instructions: clean.specialInstructions,
      subtotal: serverSubtotal,
      processing_fee: serverServiceFee,
      delivery_fee: serverDeliveryFee,
      total: serverTotal,
      commission: serverTotal,
      status: 'pending',
      payment_id: paymentId,
    }).then(({ error: e }) => { if (e) console.error('[DB] Plate order save error:', e.message) })

    await db.from('order_items').insert(
      clean.items.map(i => ({
        order_id: orderNumber,
        item_id: i.itemId,
        name: i.name,
        quantity: i.quantity,
        unit_price: PLATES_MENU.find(m => m.id === i.itemId)?.price ?? i.unitPrice,
      }))
    ).then(({ error: e }) => { if (e) console.error('[DB] Plate items save error:', e.message) })

    const itemsText = clean.items.map(i => `${i.name} × ${i.quantity}`).join(', ')
    const emailData = {
      orderNumber,
      customerName: clean.customerName,
      items: clean.items.map(i => ({
        name: i.name,
        quantity: i.quantity,
        unitPrice: PLATES_MENU.find(m => m.id === i.itemId)?.price ?? i.unitPrice,
      })),
      subtotal: serverSubtotal,
      serviceFee: serverServiceFee,
      deliveryFee: serverDeliveryFee,
      total: serverTotal,
      fulfillmentType: clean.fulfillmentType as 'pickup' | 'delivery',
      address: clean.address,
      requestedDate: today,
      requestedTime: 'asap',
      specialInstructions: clean.specialInstructions,
      eventType: 'plate',
    }

    const estimatedMins = clean.fulfillmentType === 'delivery'
      ? `, ~${calculateEstimatedMinutes(serverDeliveryFee === 2.99 ? 2 : (serverDeliveryFee - 2.99) / 0.50 + 3)} min`
      : ''

    await Promise.all([
      sendSMS(
        EDZIBAN_CONFIG.myPhone,
        `NEW PLATE ORDER ${orderNumber} — ${clean.customerName}. ${itemsText}. Total: $${serverTotal.toFixed(2)}. ${clean.fulfillmentType === 'delivery' ? `Delivery to ${clean.address}` : 'Pickup'}.`,
        'admin',
        orderNumber,
      ),
      sendEmail(
        clean.customerEmail,
        `Order ${orderNumber} confirmed – Edziban`,
        orderReceivedEmail(emailData),
        'customer',
        orderNumber,
      ),
      sendEmail(
        process.env.ADMIN_EMAIL ?? EDZIBAN_CONFIG.myEmail,
        `New plate order ${orderNumber} from ${clean.customerName}`,
        orderReceivedEmail({ ...emailData, customerName: `${clean.customerName} (Admin Copy)` }),
        'admin',
        orderNumber,
      ),
      ...(clean.customerPhone ? [sendSMS(
        clean.customerPhone,
        `Edziban: Hi ${clean.customerName}, your order ${orderNumber} is confirmed! ${itemsText}. Total: $${serverTotal.toFixed(2)}. ${clean.fulfillmentType === 'delivery' ? `Delivering to you${estimatedMins}.` : `Pickup from ${EDZIBAN_CONFIG.pickupLocation}.`}`,
        'customer',
        orderNumber,
      )] : []),
    ]).catch(e => console.error('[PLATES-PAYMENT] Notification error:', e))

    return NextResponse.json({ success: true, orderNumber, paymentId })
  } catch (error: unknown) {
    const err = error as { message?: string; errors?: unknown }
    console.error('[PLATES-PAYMENT] Square error:', err?.message, JSON.stringify(err?.errors ?? error))
    return NextResponse.json({ error: 'Payment could not be processed. Please try again.' }, { status: 500 })
  }
}
