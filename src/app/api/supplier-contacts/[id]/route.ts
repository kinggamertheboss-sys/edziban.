import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { sanitizeText, sanitizeEnum } from '@/lib/sanitize'
import { checkLimit, deny, getClientIp } from '@/lib/rateLimit'

const VALID_RESPONSES = ['confirmed', 'declined', 'no_response', 'called_back'] as const
const ALLOWED_FIELDS  = new Set(['response', 'notes'])

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!req.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 })
  }
  const rl = checkLimit(getClientIp(req) + ':sc-patch', 60, 60_000)
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
    if ('response' in raw) {
      const r = sanitizeEnum(raw.response, VALID_RESPONSES)
      if (!r) return NextResponse.json({ error: 'Invalid response value' }, { status: 400 })
      update.response = r
    }
    if ('notes' in raw) {
      update.notes = sanitizeText(raw.notes, 1000)
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const db = getAdminClient()
    const { error } = await db.from('supplier_contacts').update(update).eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[SC PATCH]', e)
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 })
  }
}
