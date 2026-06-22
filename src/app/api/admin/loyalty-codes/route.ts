import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { sanitizeEmail, sanitizeText, sanitizeAmount, sanitizeInt } from '@/lib/sanitize'
import { checkLimit, deny, getClientIp } from '@/lib/rateLimit'
import { sendEmail } from '@/lib/notifications'
import { loyaltyRewardEmail } from '@/lib/emailTemplates'

const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function generateCode(): string {
  let code = 'LOYAL-'
  for (let i = 0; i < 6; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)]
  return code
}

export async function POST(req: NextRequest) {
  if (!req.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 })
  }

  const rl = checkLimit(getClientIp(req) + ':loyalty-codes', 30, 60 * 1000)
  if (!rl.allowed) return deny(rl)

  try {
    const raw = await req.json()
    if (typeof raw !== 'object' || raw === null) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const allowed = new Set(['customerEmail', 'customerName', 'amount'])
    const unexpected = Object.keys(raw as object).filter(k => !allowed.has(k))
    if (unexpected.length) {
      return NextResponse.json({ error: 'Invalid request structure' }, { status: 400 })
    }

    const customerEmail = sanitizeEmail((raw as Record<string, unknown>).customerEmail)
    const customerName  = sanitizeText((raw as Record<string, unknown>).customerName, 100)
    const amount        = sanitizeAmount((raw as Record<string, unknown>).amount)

    if (!customerEmail) return NextResponse.json({ error: 'Valid customer email is required' }, { status: 400 })
    if (!customerName)  return NextResponse.json({ error: 'Customer name is required' }, { status: 400 })
    if (amount < 1 || amount > 200) return NextResponse.json({ error: 'Amount must be between $1 and $200' }, { status: 400 })

    const db = getAdminClient()

    // Check if this customer already has an active unredeemed loyalty code
    const { data: existing } = await db
      .from('discount_codes')
      .select('code')
      .eq('customer_email', customerEmail)
      .eq('is_active', true)
      .ilike('code', 'LOYAL-%')
      .maybeSingle()

    if (existing) {
      return NextResponse.json({
        error: `${customerEmail} already has an active loyalty code (${existing.code}). Deactivate it first if you want to send a new one.`,
      }, { status: 409 })
    }

    // Generate a unique code — retry up to 5 times on collision
    let code = ''
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateCode()
      const { data: collision } = await db
        .from('discount_codes')
        .select('code')
        .eq('code', candidate)
        .maybeSingle()
      if (!collision) { code = candidate; break }
    }

    if (!code) return NextResponse.json({ error: 'Could not generate a unique code' }, { status: 500 })

    // Insert the code — customer_email makes it exclusive to this recipient
    const { error: insertError } = await db.from('discount_codes').insert({
      code,
      amount,
      is_active: true,
      single_use: true,
      customer_email: customerEmail,
    })

    if (insertError) {
      console.error('[LOYALTY] Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create discount code' }, { status: 500 })
    }

    // Send the email — non-blocking, failure doesn't roll back the code
    sendEmail(
      customerEmail,
      `A gift from Edziban — $${amount.toFixed(2)} off your next order`,
      loyaltyRewardEmail({ customerName, discountAmount: amount, code }),
      'customer'
    ).catch(e => console.error('[LOYALTY] Email send failed:', e))

    return NextResponse.json({ success: true, code })
  } catch (e) {
    console.error('[LOYALTY]', e)
    return NextResponse.json({ error: 'Failed to send loyalty code' }, { status: 500 })
  }
}

// List loyalty codes sent — used by the admin component to show sent history
export async function GET(req: NextRequest) {
  const rl = checkLimit(getClientIp(req) + ':loyalty-codes-get', 60, 60 * 1000)
  if (!rl.allowed) return deny(rl)

  try {
    const db = getAdminClient()
    const { data, error } = await db
      .from('discount_codes')
      .select('code, amount, is_active, customer_email, created_at')
      .ilike('code', 'LOYAL-%')
      .order('created_at', { ascending: false })
      .limit(sanitizeInt(new URL(req.url).searchParams.get('limit') ?? '100', 1, 500))

    if (error) throw error
    return NextResponse.json({ codes: data ?? [] })
  } catch (e) {
    console.error('[LOYALTY GET]', e)
    return NextResponse.json({ error: 'Failed to fetch loyalty codes' }, { status: 500 })
  }
}
