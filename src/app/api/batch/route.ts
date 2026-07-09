// Batch Tracker API
// Returns real-time batch status per product per date window, computed from live Supabase orders.

import { NextRequest, NextResponse } from 'next/server'
import { BATCH_MINIMUMS } from '@/lib/mockData'
import { getAdminClient } from '@/lib/supabase'
import { sendWhatsApp, sendEmail, EDZIBAN_CONFIG } from '@/lib/notifications'
import { checkLimit, deny, getClientIp } from '@/lib/rateLimit'
import { sanitizeEnum } from '@/lib/sanitize'

type BatchOrderRow = {
  id: string
  status: string
  requested_date: string
  order_items: { item_id: string; name: string; quantity: number }[]
}

const VALID_BATCH_ACTIONS = ['check_alerts'] as const

export interface BatchStatus {
  itemId: string
  name: string
  date: string
  ordered: number
  minimum: number
  orders: string[]
  reached: boolean
  percentFull: number
}

async function fetchLiveOrders(): Promise<BatchOrderRow[]> {
  const db = getAdminClient()
  const { data, error } = await db
    .from('orders')
    .select('id, status, requested_date, order_items(item_id, name, quantity)')
  if (error) throw error
  return data as BatchOrderRow[]
}

function computeBatches(orders: BatchOrderRow[]): BatchStatus[] {
  const map = new Map<string, BatchStatus>()

  for (const order of orders) {
    if (order.status === 'cancelled') continue
    for (const item of order.order_items) {
      if (!(item.item_id in BATCH_MINIMUMS)) continue
      const key = `${item.item_id}::${order.requested_date}`
      const existing = map.get(key)
      if (existing) {
        existing.ordered += item.quantity
        if (!existing.orders.includes(order.id)) existing.orders.push(order.id)
      } else {
        const min = BATCH_MINIMUMS[item.item_id]
        map.set(key, {
          itemId: item.item_id,
          name: item.name,
          date: order.requested_date,
          ordered: item.quantity,
          minimum: min,
          orders: [order.id],
          reached: false,
          percentFull: 0,
        })
      }
    }
  }

  return Array.from(map.values()).map(b => ({
    ...b,
    reached: b.ordered >= b.minimum,
    percentFull: Math.min(100, Math.round((b.ordered / b.minimum) * 100)),
  })).sort((a, b) => a.date.localeCompare(b.date))
}

export async function GET(req: NextRequest) {
  // 60 batch status fetches per IP per minute (OWASP A04)
  const rl = checkLimit(getClientIp(req) + ':batch-get', 60, 60 * 1000)
  if (!rl.allowed) return deny(rl)
  try {
    const orders = await fetchLiveOrders()
    const batches = computeBatches(orders)
    return NextResponse.json({ batches })
  } catch (e) {
    console.error('[BATCH GET]', e)
    return NextResponse.json({ error: 'Failed to fetch batch status' }, { status: 500 })
  }
}

// POST — trigger batch alerts (called by admin dashboard or a cron)
export async function POST(req: NextRequest) {
  // OWASP A05: Enforce JSON Content-Type
  if (!req.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 })
  }

  // 10 alert triggers per IP per minute (OWASP A04)
  const rl = checkLimit(getClientIp(req) + ':batch-post', 10, 60 * 1000)
  if (!rl.allowed) return deny(rl)

  const raw = await req.json()

  // OWASP A08: Only allow { action } — reject any other fields
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  const unexpected = Object.keys(raw as object).filter(k => k !== 'action')
  if (unexpected.length) {
    return NextResponse.json({ error: 'Unexpected field(s) in request' }, { status: 400 })
  }

  const action = sanitizeEnum((raw as { action: unknown }).action, VALID_BATCH_ACTIONS)
  if (!action) {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  const orders = await fetchLiveOrders()
  const batches = computeBatches(orders)
  const now = new Date()
  const alerts: string[] = []

  for (const batch of batches) {
    const pickupDate = new Date(batch.date)
    const hoursUntil = (pickupDate.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (batch.reached) {
      // Notify admin that minimum is reached (only fires once per batch in production)
      console.log(`[BATCH] ✅ ${batch.name} reached minimum for ${batch.date}: ${batch.ordered}/${batch.minimum}`)
      await sendWhatsApp(
        EDZIBAN_CONFIG.myWhatsapp,
        `✅ ${batch.name} minimum reached!\n${batch.ordered} ordered for ${batch.date}.\nTime to contact supplier.`,
        'admin'
      )
      await sendEmail(
        EDZIBAN_CONFIG.myEmail,
        `✅ Batch minimum reached: ${batch.name} – ${batch.date}`,
        `<p>Order minimum reached for <strong>${batch.name}</strong> on <strong>${batch.date}</strong>.</p><p>Total ordered: ${batch.ordered}/${batch.minimum}</p><p>Orders: ${batch.orders.join(', ')}</p>`,
        'admin'
      )
      alerts.push(`REACHED: ${batch.name} ${batch.date}`)

    } else if (hoursUntil <= 48 && hoursUntil > 0) {
      // 48hr warning — minimum not reached
      console.log(`[BATCH] ⚠️ ${batch.name} minimum NOT reached for ${batch.date}: ${batch.ordered}/${batch.minimum} (${Math.round(hoursUntil)}hrs away)`)
      await sendWhatsApp(
        EDZIBAN_CONFIG.myWhatsapp,
        `⚠️ ${batch.name} minimum NOT reached.\nOnly ${batch.ordered}/${batch.minimum} ordered for ${batch.date}.\nDecide: cancel or proceed?`,
        'admin'
      )
      alerts.push(`NOT REACHED: ${batch.name} ${batch.date}`)
    }
  }

  return NextResponse.json({ batches, alerts })
}
