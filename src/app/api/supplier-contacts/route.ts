import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { sanitizeText, sanitizeEnum, validateBody } from '@/lib/sanitize'
import { checkLimit, deny, getClientIp } from '@/lib/rateLimit'

const VALID_METHODS   = ['call', 'whatsapp', 'sms'] as const
const VALID_RESPONSES = ['confirmed', 'declined', 'no_response', 'called_back'] as const

export async function GET(req: NextRequest) {
  const rl = checkLimit(getClientIp(req) + ':sc-get', 120, 60_000)
  if (!rl.allowed) return deny(rl)
  try {
    const db = getAdminClient()
    const orderId = req.nextUrl.searchParams.get('orderId')
    let query = db.from('supplier_contacts').select('*').order('contacted_at', { ascending: false })
    if (orderId) query = query.eq('order_id', sanitizeText(orderId, 20))
    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ contacts: data ?? [] })
  } catch (e) {
    console.error('[SC GET]', e)
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!req.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 })
  }
  const rl = checkLimit(getClientIp(req) + ':sc-post', 60, 60_000)
  if (!rl.allowed) return deny(rl)
  try {
    const raw = await req.json()
    const result = validateBody(raw, {
      orderId:      { sanitize: (v) => sanitizeText(v, 20),  required: true },
      supplierId:   { sanitize: (v) => sanitizeText(v, 60),  required: true },
      supplierName: { sanitize: (v) => sanitizeText(v, 100), required: true },
      method:       { sanitize: (v) => sanitizeEnum(v, VALID_METHODS),    required: true },
      response:     { sanitize: (v) => sanitizeEnum(v, VALID_RESPONSES),  required: false },
      notes:        { sanitize: (v) => sanitizeText(v, 1000), required: false },
    })
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    if (!result.data.method) return NextResponse.json({ error: 'Invalid method' }, { status: 400 })

    const db = getAdminClient()
    const { data, error } = await db.from('supplier_contacts').insert({
      order_id:      result.data.orderId,
      supplier_id:   result.data.supplierId,
      supplier_name: result.data.supplierName,
      method:        result.data.method,
      response:      (result.data.response as string) || 'no_response',
      notes:         (result.data.notes as string) || '',
    }).select().single()
    if (error) throw error
    return NextResponse.json({ contact: data })
  } catch (e) {
    console.error('[SC POST]', e)
    return NextResponse.json({ error: 'Failed to save contact' }, { status: 500 })
  }
}
