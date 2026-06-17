import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { sanitizeEnum, sanitizeText, VALID_ORDER_STATUSES, validateBody } from '@/lib/sanitize'
import { checkLimit, deny, getClientIp } from '@/lib/rateLimit'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!req.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 })
  }

  const rl = checkLimit(getClientIp(req) + ':orders-patch', 60, 60 * 1000)
  if (!rl.allowed) return deny(rl)

  try {
    const { id } = await params
    const orderId = sanitizeText(id, 20)
    const raw = await req.json()

    const result = validateBody(raw, {
      status: { sanitize: (v) => sanitizeEnum(v, VALID_ORDER_STATUSES), required: false },
      notes:  { sanitize: (v) => sanitizeText(v, 2000), required: false },
    })
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    const updateData: Record<string, string> = {}

    if ('status' in raw) {
      const status = result.data.status as string | null
      if (!status) return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
      updateData.status = status
    }

    if ('notes' in raw) {
      updateData.admin_notes = (result.data.notes as string) ?? ''
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    if (!orderId) {
      return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 })
    }

    const db = getAdminClient()
    const { error } = await db.from('orders').update(updateData).eq('id', orderId)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[ORDERS PATCH]', e)
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 })
  }
}
