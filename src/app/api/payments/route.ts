import { NextRequest, NextResponse } from 'next/server'
import { SquareClient, SquareEnvironment } from 'square'
import { randomUUID } from 'crypto'
import { getAdminClient } from '@/lib/supabase'
import { MENU_ITEMS } from '@/lib/mockData'
import { generateOrderNumber, getDeliveryFee, getServiceFee, getTimeLabel } from '@/lib/utils'
import {
  sanitizeText, sanitizeEmail, sanitizePhone, sanitizeInt,
  sanitizeAmount, sanitizeEnum, sanitizeDate,
  VALID_FULFILLMENT_TYPES, VALID_TIMES, VALID_DISTANCE_RANGES,
} from '@/lib/sanitize'
import { checkLimit, deny, getClientIp } from '@/lib/rateLimit'
import { checkRequiredEnv } from '@/lib/envCheck'
import { sendSMS, sendEmail, sendWhatsApp, EDZIBAN_CONFIG } from '@/lib/notifications'
import { orderReceivedEmail } from '@/lib/emailTemplates'

// OWASP A08: Declare the exact set of allowed keys at each nesting level.
// Any request body containing keys outside these sets is rejected with 400.
const ALLOWED_TOP   = new Set(['sourceId', 'amount', 'currency', 'order'])
const ALLOWED_ORDER = new Set([
  'customerName', 'customerPhone', 'customerEmail', 'eventType', 'guestCount',
  'items', 'fulfillmentType', 'address', 'distanceRange', 'requestedDate',
  'requestedTime', 'specialInstructions', 'subtotal', 'serviceFee', 'deliveryFee', 'total',
  'clientType', 'orgName', 'contactPerson', 'billingEmail', 'poNumber', 'requestInvoice',
])
const ALLOWED_ITEM  = new Set(['itemId', 'name', 'quantity', 'unitPrice'])

const client = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN!,
  environment: process.env.SQUARE_ENVIRONMENT === 'sandbox' ? SquareEnvironment.Sandbox : SquareEnvironment.Production,
})

export interface PaymentPayload {
  sourceId: string
  amount: number
  currency?: string
  // Full order data — saved to DB after payment succeeds
  order: {
    customerName: string
    customerPhone: string
    customerEmail: string
    eventType: string
    guestCount: number
    items: { itemId: string; name: string; quantity: number; unitPrice: number }[]
    fulfillmentType: 'pickup' | 'delivery'
    address: string
    distanceRange: string
    requestedDate: string
    requestedTime: string
    specialInstructions: string
    subtotal: number
    serviceFee: number
    deliveryFee: number
    total: number
  }
}

export async function POST(req: NextRequest) {
  // OWASP A05: Verify required env vars are present before processing any payment
  checkRequiredEnv()

  // OWASP A05: Enforce JSON Content-Type to prevent content-sniffing attacks
  if (!req.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 })
  }

  const isDev = process.env.NODE_ENV === 'development'
  // IP limit: 5 attempts per 10 min in prod, 50 in dev for testing (OWASP A04)
  const ip = getClientIp(req)
  const ipRl = checkLimit(ip + ':payments', isDev ? 50 : 5, 10 * 60 * 1000)
  if (!ipRl.allowed) return deny(ipRl)

  try {
    const raw = await req.json()

    // OWASP A08: Reject unexpected top-level fields before any processing
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const unexpectedTop = Object.keys(raw as object).filter(k => !ALLOWED_TOP.has(k))
    if (unexpectedTop.length) {
      return NextResponse.json({ error: 'Invalid request structure' }, { status: 400 })
    }

    const body = raw as PaymentPayload
    const { sourceId, amount, currency = 'USD', order } = body

    if (!sourceId || !amount) {
      return NextResponse.json({ error: 'Missing sourceId or amount' }, { status: 400 })
    }

    // OWASP A08: Reject unexpected fields in the order object
    if (typeof order !== 'object' || order === null) {
      return NextResponse.json({ error: 'Invalid order data' }, { status: 400 })
    }
    const unexpectedOrder = Object.keys(order as object).filter(k => !ALLOWED_ORDER.has(k))
    if (unexpectedOrder.length) {
      return NextResponse.json({ error: 'Invalid order structure' }, { status: 400 })
    }

    // OWASP A08: Reject unexpected fields in each line item
    if (!Array.isArray(order.items)) {
      return NextResponse.json({ error: 'items must be an array' }, { status: 400 })
    }
    for (const item of order.items) {
      if (typeof item !== 'object' || item === null) {
        return NextResponse.json({ error: 'Invalid item in order' }, { status: 400 })
      }
      const unexpectedItem = Object.keys(item as object).filter(k => !ALLOWED_ITEM.has(k))
      if (unexpectedItem.length) {
        return NextResponse.json({ error: 'Invalid item structure' }, { status: 400 })
      }
    }

    // ── Sanitize all order fields ─────────────────────────────────────────
    const rawOrder = order as typeof order & {
      clientType?: string; orgName?: string; contactPerson?: string;
      billingEmail?: string; poNumber?: string; requestInvoice?: unknown
    }
    const clean = {
      customerName:        sanitizeText(order.customerName, 100),
      customerPhone:       sanitizePhone(order.customerPhone),
      customerEmail:       sanitizeEmail(order.customerEmail),
      eventType:           sanitizeText(order.eventType, 100),
      guestCount:          sanitizeInt(order.guestCount, 1, 10_000),
      fulfillmentType:     sanitizeEnum(order.fulfillmentType, VALID_FULFILLMENT_TYPES) ?? 'pickup',
      address:             sanitizeText(order.address, 300),
      distanceRange:       sanitizeEnum(order.distanceRange, VALID_DISTANCE_RANGES) ?? '',
      requestedDate:       sanitizeDate(order.requestedDate),
      requestedTime:       sanitizeEnum(order.requestedTime, VALID_TIMES) ?? 'morning',
      specialInstructions: sanitizeText(order.specialInstructions, 500),
      subtotal:            sanitizeAmount(order.subtotal),
      serviceFee:          sanitizeAmount(order.serviceFee),
      deliveryFee:         sanitizeAmount(order.deliveryFee),
      total:               sanitizeAmount(order.total),
      clientType:          sanitizeEnum(rawOrder.clientType, ['regular', 'corporate'] as const) ?? 'regular',
      orgName:             sanitizeText(rawOrder.orgName, 200),
      contactPerson:       sanitizeText(rawOrder.contactPerson, 100),
      billingEmail:        sanitizeEmail(rawOrder.billingEmail),
      poNumber:            sanitizeText(rawOrder.poNumber, 100),
      requestInvoice:      rawOrder.requestInvoice === true,
      items: (Array.isArray(order.items) ? order.items : []).slice(0, 50).map(i => ({
        itemId:    sanitizeText(i.itemId, 60),
        name:      sanitizeText(i.name, 100),
        quantity:  sanitizeInt(i.quantity, 1, 999),
        unitPrice: sanitizeAmount(i.unitPrice),
      })).filter(i => i.itemId && i.name),
    }

    if (!clean.customerName || !clean.customerEmail || clean.items.length === 0 || !clean.requestedDate) {
      return NextResponse.json({ error: 'Invalid order data' }, { status: 400 })
    }

    // ── Server-side price verification (OWASP A04 — Insecure Design) ─────
    // Never trust the client-sent amount. Recalculate from authoritative menu
    // prices and reject if the numbers don't match. This closes price manipulation:
    // a customer changing amount=150 to amount=0.01 in DevTools is caught here.

    // Reject any item not in our menu (strip --Variant suffix for option variants like waakye-stew--Goat)
    const baseId = (itemId: string) => itemId.split('--')[0]
    const unknownItem = clean.items.find(i => !MENU_ITEMS.find(m => m.id === baseId(i.itemId)))
    if (unknownItem) {
      return NextResponse.json({ error: 'Unrecognized item in order' }, { status: 400 })
    }

    const serverSubtotal = Math.round(
      clean.items.reduce((sum, item) => {
        const menuItem = MENU_ITEMS.find(m => m.id === baseId(item.itemId))!
        return sum + menuItem.price * item.quantity
      }, 0) * 100
    ) / 100

    const serverDeliveryFee = clean.fulfillmentType === 'delivery' ? getDeliveryFee(clean.distanceRange) : 0
    const serverServiceFee  = getServiceFee(serverSubtotal, serverDeliveryFee)
    const serverTotal       = Math.round((serverSubtotal + serverServiceFee + serverDeliveryFee) * 100) / 100

    // Allow $0.02 tolerance for floating-point rounding between client and server
    if (Math.abs(amount - serverTotal) > 0.02) {
      console.warn(`[SECURITY] Price mismatch — client: $${amount}, server: $${serverTotal}, IP: ${ip}`)
      // OWASP A09: Alert admin of a potential price-manipulation attempt
      sendWhatsApp(
        EDZIBAN_CONFIG.myWhatsapp,
        `SECURITY ALERT: Price manipulation attempt detected.\nClient sent: $${amount}\nServer calculated: $${serverTotal}\nIP: ${ip}\nItems: ${(clean.items ?? []).map((i: { name: string; quantity: number }) => `${i.name} x${i.quantity}`).join(', ')}`,
        'admin'
      ).catch(() => {})
      return NextResponse.json({ error: 'Payment amount does not match order total' }, { status: 400 })
    }

    // User limit: 3 attempts per email per hour in prod, 50 in dev (catches multi-IP abuse)
    const userRl = checkLimit('u:' + clean.customerEmail + ':payments', isDev ? 50 : 3, 60 * 60 * 1000)
    if (!userRl.allowed) return deny(userRl)

    // ── Process Square payment ────────────────────────────────────────────
    const response = await client.payments.create({
      sourceId,
      idempotencyKey: randomUUID(),
      amountMoney: {
        // Use server-calculated total — never the client-sent amount
        amount: BigInt(Math.round(serverTotal * 100)),
        currency: (currency ?? 'USD') as 'USD',
      },
      locationId: process.env.SQUARE_LOCATION_ID!,
      note: `Edziban order — ${clean.customerName}`,
    })

    const p = response.payment
    const paymentId = p?.id ?? null

    // ── Compute supplier payouts ──────────────────────────────────────────
    const payoutMap = new Map<string, { supplierId: string; supplierName: string; amount: number }>()
    for (const item of clean.items) {
      const menuItem = MENU_ITEMS.find(m => m.id === baseId(item.itemId))
      if (!menuItem) continue
      const costPerUnit = menuItem.supplierCost ?? (menuItem.price * menuItem.supplierPayoutRate)
      const payout = Math.round(item.quantity * costPerUnit * 100) / 100
      const existing = payoutMap.get(menuItem.supplierId)
      if (existing) {
        existing.amount = Math.round((existing.amount + payout) * 100) / 100
      } else {
        payoutMap.set(menuItem.supplierId, {
          supplierId: menuItem.supplierId,
          supplierName: menuItem.supplierName,
          amount: payout,
        })
      }
    }
    const supplierPayouts = Array.from(payoutMap.values())

    // Owner commission = everything left after paying suppliers and Square.
    // Delivery fee and $4 flat markup are 100% owner income (single-person business).
    const squareFee = Math.round(((serverSubtotal + serverDeliveryFee) * 0.026 + 0.10) * 100) / 100
    const supplierPayoutsTotal = supplierPayouts.reduce((s, p) => s + p.amount, 0)
    const commission = Math.round((serverTotal - supplierPayoutsTotal - squareFee) * 100) / 100

    // ── Save order to Supabase ────────────────────────────────────────────
    const orderNumber = generateOrderNumber()
    const db = getAdminClient()

    const baseInsert = {
      id: orderNumber,
      customer_name: clean.customerName,
      customer_phone: clean.customerPhone,
      customer_email: clean.customerEmail,
      event_type: clean.eventType,
      guest_count: clean.guestCount,
      fulfillment_type: clean.fulfillmentType,
      address: clean.address,
      distance_range: clean.distanceRange,
      requested_date: clean.requestedDate,
      requested_time: clean.requestedTime,
      special_instructions: clean.specialInstructions,
      subtotal: serverSubtotal,
      processing_fee: serverServiceFee,
      delivery_fee: serverDeliveryFee,
      total: serverTotal,
      commission,
      status: 'pending',
      payment_id: paymentId,
    }

    let { error: orderError } = await db.from('orders').insert({
      ...baseInsert,
      client_type: clean.clientType,
      org_name: clean.orgName,
      contact_person: clean.contactPerson,
      billing_email: clean.billingEmail,
      po_number: clean.poNumber,
      request_invoice: clean.requestInvoice,
    })

    // If corporate columns don't exist yet, fall back to base insert so the order still saves
    if (orderError?.message?.includes("column") || orderError?.message?.includes("schema cache")) {
      console.warn('[DB] Corporate columns missing — saving without them. Run the ALTER TABLE migration.')
      const { error: fallbackError } = await db.from('orders').insert(baseInsert)
      orderError = fallbackError ?? null
    }

    if (orderError) {
      console.error('[DB] Failed to save order:', orderError?.message ?? orderError?.code ?? JSON.stringify(orderError))
      // Payment succeeded — still return success so customer isn't left hanging
      // The order number is returned so notifications can still fire
    } else {
      // Save line items
      await db.from('order_items').insert(
        clean.items.map(i => {
          const mi = MENU_ITEMS.find(m => m.id === baseId(i.itemId))
          return {
            order_id: orderNumber,
            item_id: i.itemId,
            name: i.name,
            quantity: i.quantity,
            unit_price: mi?.price ?? i.unitPrice,
          }
        })
      )

      // Save supplier payouts
      if (supplierPayouts.length > 0) {
        await db.from('order_payouts').insert(
          supplierPayouts.map(sp => ({
            order_id: orderNumber,
            supplier_id: sp.supplierId,
            supplier_name: sp.supplierName,
            amount: sp.amount,
          }))
        )
      }
    }

    // ── Fire order-received notifications server-side ─────────────────────
    // Running server-side means the notification endpoint no longer needs to be
    // publicly accessible, closing the notification spam vector.
    const itemsText = clean.items.map(i => `${i.name} × ${i.quantity}`).join(', ')
    const emailData = {
      orderNumber,
      customerName:  clean.customerName,
      items:         clean.items.map(i => ({ name: i.name, quantity: i.quantity, unitPrice: MENU_ITEMS.find(m => m.id === baseId(i.itemId))?.price ?? i.unitPrice })),
      subtotal:      serverSubtotal,
      serviceFee:    serverServiceFee,
      deliveryFee:   serverDeliveryFee,
      total:         serverTotal,
      fulfillmentType: clean.fulfillmentType as 'pickup' | 'delivery',
      address:       clean.address,
      requestedDate: clean.requestedDate,
      requestedTime: clean.requestedTime,
      specialInstructions: clean.specialInstructions,
      eventType:     clean.eventType,
    }

    Promise.all([
      sendSMS(
        clean.customerPhone,
        `Edziban: Hi ${clean.customerName}, order received. ${itemsText}. Total: $${serverTotal.toFixed(2)}. ${clean.fulfillmentType === 'delivery' ? 'Delivery' : 'Pickup'} on ${clean.requestedDate}. We confirm within 24hrs.`,
        'customer'
      ),
      sendEmail(
        clean.customerEmail,
        `Order ${orderNumber} received – Edziban`,
        orderReceivedEmail(emailData),
        'customer'
      ),
      sendWhatsApp(
        EDZIBAN_CONFIG.myWhatsapp,
        `NEW ORDER ${orderNumber}\nCustomer: ${clean.customerName}\nPhone: ${clean.customerPhone}\nItems: ${itemsText}\nTotal: $${serverTotal.toFixed(2)}\nType: ${clean.fulfillmentType}\n${clean.address ? `Address: ${clean.address}\n` : ''}Date: ${clean.requestedDate}, ${getTimeLabel(clean.requestedTime)}${clean.specialInstructions ? `\nNotes: ${clean.specialInstructions}` : ''}`,
        'admin'
      ),
      sendEmail(
        EDZIBAN_CONFIG.myEmail,
        `New order ${orderNumber} from ${clean.customerName}`,
        orderReceivedEmail({ ...emailData, customerName: `${clean.customerName} (Admin Copy)` }),
        'admin'
      ),
    ]).catch(e => console.error('[PAYMENT] Notification error (non-fatal):', e))

    return NextResponse.json({
      success: true,
      paymentId,
      orderNumber,
      status: p?.status,
    })
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string; errors?: unknown; body?: unknown }
    console.error('[SQUARE] Payment error — statusCode:', err?.statusCode)
    console.error('[SQUARE] Payment error — message:', err?.message)
    console.error('[SQUARE] Payment error — errors:', JSON.stringify(err?.errors ?? err?.body ?? error))
    return NextResponse.json({ error: 'Payment could not be processed. Please try again.' }, { status: 500 })
  }
}
