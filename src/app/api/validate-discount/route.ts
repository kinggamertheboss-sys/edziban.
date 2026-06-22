import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { sanitizeEmail, sanitizeText } from '@/lib/sanitize'
import { checkLimit, deny, getClientIp } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  if (!req.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 })
  }

  const ip = getClientIp(req)
  const rl = checkLimit(ip + ':discount', 10, 60 * 1000)
  if (!rl.allowed) return deny(rl)

  try {
    const raw = await req.json()
    if (typeof raw !== 'object' || raw === null) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const code = sanitizeText(String(raw.code ?? ''), 30).toUpperCase().trim()
    const email = sanitizeEmail(raw.email)

    if (!code || !email) {
      return NextResponse.json({ error: 'Code and email are required' }, { status: 400 })
    }

    const db = getAdminClient()

    const { data: codeData, error: codeError } = await db
      .from('discount_codes')
      .select('code, amount, is_active, single_use, customer_email')
      .eq('code', code)
      .single()

    if (codeError || !codeData) {
      return NextResponse.json({ valid: false, error: 'Invalid discount code' })
    }

    if (!codeData.is_active) {
      return NextResponse.json({ valid: false, error: 'This code is no longer active' })
    }

    // Loyalty codes are tied to a specific customer email
    if (codeData.customer_email && codeData.customer_email !== email) {
      return NextResponse.json({ valid: false, error: 'This code is not valid for your account' })
    }

    if (codeData.single_use) {
      const { data: existing } = await db
        .from('discount_code_uses')
        .select('id')
        .eq('code', code)
        .eq('customer_email', email)
        .maybeSingle()

      if (existing) {
        return NextResponse.json({ valid: false, error: 'This code has already been used' })
      }
    }

    return NextResponse.json({ valid: true, discountAmount: Number(codeData.amount) })
  } catch (err) {
    console.error('[DISCOUNT] Validation error:', err)
    return NextResponse.json({ error: 'Failed to validate code' }, { status: 500 })
  }
}
