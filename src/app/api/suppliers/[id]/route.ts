import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { sanitizeText, sanitizePhone, sanitizeEnum } from '@/lib/sanitize'
import { checkLimit, deny, getClientIp } from '@/lib/rateLimit'

const VALID_STATUSES = ['active', 'inactive'] as const
const ALLOWED_FIELDS = new Set(['name', 'phone', 'whatsapp', 'products', 'wholesale_price_per_unit', 'min_batch_size', 'prep_time', 'notes', 'status'])

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!req.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 })
  }
  const rl = checkLimit(getClientIp(req) + ':suppliers-patch', 60, 60_000)
  if (!rl.allowed) return deny(rl)
  try {
    const { id } = await params
    const raw = await req.json()
    if (typeof raw !== 'object' || raw === null) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }

    const unexpected = Object.keys(raw).filter(k => !ALLOWED_FIELDS.has(k))
    if (unexpected.length) {
      return NextResponse.json({ error: `Unexpected field(s): ${unexpected.join(', ')}` }, { status: 400 })
    }

    const update: Record<string, string> = {}
    if ('name' in raw)                     update.name                     = sanitizeText(raw.name, 100)
    if ('phone' in raw)                    update.phone                    = sanitizePhone(raw.phone)
    if ('whatsapp' in raw)                 update.whatsapp                 = sanitizePhone(raw.whatsapp)
    if ('products' in raw)                 update.products                 = sanitizeText(raw.products, 500)
    if ('wholesale_price_per_unit' in raw) update.wholesale_price_per_unit = sanitizeText(raw.wholesale_price_per_unit, 200)
    if ('min_batch_size' in raw)           update.min_batch_size           = sanitizeText(raw.min_batch_size, 100)
    if ('prep_time' in raw)                update.prep_time                = sanitizeText(raw.prep_time, 100)
    if ('notes' in raw)                    update.notes                    = sanitizeText(raw.notes, 1000)
    if ('status' in raw) {
      const s = sanitizeEnum(raw.status, VALID_STATUSES)
      if (!s) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      update.status = s
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const db = getAdminClient()
    const { error } = await db.from('suppliers').update(update).eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[SUPPLIERS PATCH]', e)
    return NextResponse.json({ error: 'Failed to update supplier' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rl = checkLimit(getClientIp(req) + ':suppliers-delete', 30, 60_000)
  if (!rl.allowed) return deny(rl)
  try {
    const { id } = await params
    const db = getAdminClient()
    const { error } = await db.from('suppliers').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[SUPPLIERS DELETE]', e)
    return NextResponse.json({ error: 'Failed to delete supplier' }, { status: 500 })
  }
}
