import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { sanitizeText, sanitizeAmount, sanitizeEnum, VALID_PAYOUT_METHODS, validateBody } from '@/lib/sanitize'
import { checkLimit, deny, getClientIp } from '@/lib/rateLimit'

// OWASP A07 note: This route records vendor payouts and should be protected by admin auth.
// Admin auth via Supabase is deferred — add it here before production go-live.

export async function GET(req: NextRequest) {
  const rl = checkLimit(getClientIp(req) + ':vendor-payments-get', 120, 60 * 1000)
  if (!rl.allowed) return deny(rl)
  try {
    const db = getAdminClient()
    const { data, error } = await db
      .from('vendor_payments')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return NextResponse.json({ payments: data })
  } catch (e) {
    console.error('[VENDOR PAYMENTS GET]', e)
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  // OWASP A05: Enforce JSON Content-Type
  if (!req.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 })
  }

  const rl = checkLimit(getClientIp(req) + ':vendor-payments-post', 30, 60 * 1000)
  if (!rl.allowed) return deny(rl)
  try {
    const raw = await req.json()

    // OWASP A08: Reject unknown fields; validate required fields
    const result = validateBody(raw, {
      orderId:    { sanitize: (v) => sanitizeText(v, 20),    required: true },
      supplierId: { sanitize: (v) => sanitizeText(v, 60),    required: true },
      amount:     { sanitize: (v) => sanitizeAmount(v),       required: true },
      method:     { sanitize: (v) => sanitizeEnum(v, VALID_PAYOUT_METHODS), required: true },
      paidAt:     { sanitize: (v) => sanitizeText(v, 50),    required: true },
    })
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    const { orderId, supplierId, amount, method, paidAt } = result.data

    if (!orderId || !supplierId || !method || !paidAt) {
      return NextResponse.json({ error: 'Invalid payout data' }, { status: 400 })
    }

    const db = getAdminClient()
    const { error } = await db.from('vendor_payments').insert({
      order_id: orderId, supplier_id: supplierId, amount, method, paid_at: paidAt,
    })
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[VENDOR PAYMENTS POST]', e)
    return NextResponse.json({ error: 'Failed to save payment' }, { status: 500 })
  }
}
