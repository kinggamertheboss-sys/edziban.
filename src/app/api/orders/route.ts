import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import type { MockOrder, OrderStatus } from '@/lib/mockData'
import { checkLimit, deny, getClientIp } from '@/lib/rateLimit'

type DbRow = {
  id: string
  customer_name: string
  customer_phone: string
  customer_email: string
  event_type: string
  guest_count: number
  fulfillment_type: string
  address: string
  distance_range: string
  requested_date: string
  requested_time: string
  special_instructions: string
  subtotal: number
  processing_fee: number
  delivery_fee: number
  total: number
  commission: number
  status: string
  payment_id: string | null
  created_at: string
  order_items: { item_id: string; name: string; quantity: number; unit_price: number }[]
  order_payouts: { supplier_id: string; supplier_name: string; amount: number }[]
}

function toMockOrder(row: DbRow): MockOrder {
  return {
    id: row.id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email,
    eventType: row.event_type ?? '',
    guestCount: row.guest_count ?? 0,
    items: row.order_items.map(i => ({
      itemId: i.item_id,
      name: i.name,
      quantity: i.quantity,
      unitPrice: Number(i.unit_price),
    })),
    fulfillmentType: row.fulfillment_type as 'delivery' | 'pickup',
    address: row.address ?? '',
    distanceRange: row.distance_range ?? '',
    requestedDate: row.requested_date,
    requestedTime: row.requested_time,
    specialInstructions: row.special_instructions ?? '',
    subtotal: Number(row.subtotal),
    serviceFee: Number(row.processing_fee),
    deliveryFee: Number(row.delivery_fee),
    total: Number(row.total),
    commission: Number(row.commission),
    supplierPayouts: row.order_payouts.map(p => ({
      supplierId: p.supplier_id,
      supplierName: p.supplier_name,
      amount: Number(p.amount),
    })),
    status: row.status as OrderStatus,
    supplierId: row.order_payouts[0]?.supplier_id ?? '',
    createdAt: row.created_at,
    adminNotes: (row as DbRow & { admin_notes?: string }).admin_notes ?? '',
    clientType: ((row as DbRow & { client_type?: string }).client_type as 'corporate') ?? 'regular',
    orgName: (row as DbRow & { org_name?: string }).org_name ?? undefined,
    contactPerson: (row as DbRow & { contact_person?: string }).contact_person ?? undefined,
    billingEmail: (row as DbRow & { billing_email?: string }).billing_email ?? undefined,
    poNumber: (row as DbRow & { po_number?: string }).po_number ?? undefined,
    requestInvoice: (row as DbRow & { request_invoice?: boolean }).request_invoice ?? undefined,
  }
}

export async function GET(req: NextRequest) {
  const rl = checkLimit(getClientIp(req) + ':orders-get', 120, 60 * 1000)
  if (!rl.allowed) return deny(rl)
  try {
    const db = getAdminClient()
    const { data, error } = await db
      .from('orders')
      .select('*, order_items(*), order_payouts(*)')
      .order('created_at', { ascending: false })

    if (error) throw error
    const orders: MockOrder[] = (data as DbRow[]).map(toMockOrder)
    return NextResponse.json({ orders })
  } catch (e) {
    console.error('[ORDERS GET]', e)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}
