import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { sanitizeText, sanitizePhone, sanitizeEnum, validateBody } from '@/lib/sanitize'
import { checkLimit, deny, getClientIp } from '@/lib/rateLimit'

const VALID_STATUSES = ['active', 'inactive'] as const

export async function GET(req: NextRequest) {
  const rl = checkLimit(getClientIp(req) + ':suppliers-get', 120, 60_000)
  if (!rl.allowed) return deny(rl)
  try {
    const db = getAdminClient()
    const { data, error } = await db.from('suppliers').select('*').order('name')
    if (error) throw error
    return NextResponse.json({ suppliers: data ?? [] })
  } catch (e) {
    console.error('[SUPPLIERS GET]', e)
    return NextResponse.json({ error: 'Failed to fetch suppliers' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!req.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 })
  }
  const rl = checkLimit(getClientIp(req) + ':suppliers-post', 30, 60_000)
  if (!rl.allowed) return deny(rl)
  try {
    const raw = await req.json()
    const result = validateBody(raw, {
      name:                     { sanitize: (v) => sanitizeText(v, 100),  required: true },
      phone:                    { sanitize: (v) => sanitizePhone(v),       required: true },
      whatsapp:                 { sanitize: (v) => sanitizePhone(v),       required: false },
      products:                 { sanitize: (v) => sanitizeText(v, 500),  required: false },
      wholesale_price_per_unit: { sanitize: (v) => sanitizeText(v, 200),  required: false },
      min_batch_size:           { sanitize: (v) => sanitizeText(v, 100),  required: false },
      prep_time:                { sanitize: (v) => sanitizeText(v, 100),  required: false },
      notes:                    { sanitize: (v) => sanitizeText(v, 1000), required: false },
      status:                   { sanitize: (v) => sanitizeEnum(v, VALID_STATUSES), required: false },
    })
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

    const db = getAdminClient()
    const { data, error } = await db.from('suppliers').insert({
      name:                     result.data.name,
      phone:                    result.data.phone,
      whatsapp:                 result.data.whatsapp ?? '',
      products:                 result.data.products ?? '',
      wholesale_price_per_unit: result.data.wholesale_price_per_unit ?? '',
      min_batch_size:           result.data.min_batch_size ?? '',
      prep_time:                result.data.prep_time ?? '',
      notes:                    result.data.notes ?? '',
      status:                   (result.data.status as string) || 'active',
    }).select().single()
    if (error) throw error
    return NextResponse.json({ supplier: data })
  } catch (e) {
    console.error('[SUPPLIERS POST]', e)
    return NextResponse.json({ error: 'Failed to create supplier' }, { status: 500 })
  }
}
