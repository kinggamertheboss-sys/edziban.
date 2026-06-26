import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { sanitizeEmail } from '@/lib/sanitize'
import { checkLimit, deny, getClientIp } from '@/lib/rateLimit'
import { sendEmail } from '@/lib/notifications'

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let suffix = ''
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)]
  }
  return `SAVE5-${suffix}`
}

export async function POST(req: NextRequest) {
  if (!req.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 })
  }

  const ip = getClientIp(req)
  const rl = checkLimit(ip + ':subscribe', 5, 60 * 60 * 1000) // 5 per hour per IP
  if (!rl.allowed) return deny(rl)

  const raw = await req.json().catch(() => null)
  if (typeof raw !== 'object' || raw === null) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const email = sanitizeEmail(raw.email)
  if (!email) {
    return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 })
  }

  const db = getAdminClient()

  // Check if this email already has a welcome discount
  const { data: existing } = await db
    .from('discount_codes')
    .select('code')
    .eq('customer_email', email)
    .eq('amount', 5)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'This email is already subscribed.' }, { status: 409 })
  }

  // Generate a unique code
  let code = generateCode()
  // Retry once on the rare collision
  const { data: collision } = await db.from('discount_codes').select('code').eq('code', code).maybeSingle()
  if (collision) code = generateCode()

  const { error: insertError } = await db.from('discount_codes').insert({
    code,
    amount: 5,
    is_active: true,
    single_use: true,
    customer_email: email,
  })

  if (insertError) {
    console.error('[SUBSCRIBE] Failed to insert discount code:', insertError.message)
    return NextResponse.json({ error: 'Could not create discount code. Please try again.' }, { status: 500 })
  }

  // Send the welcome email (best-effort — don't fail the request if it errors)
  const html = `
    <div style="font-family:Georgia,serif;max-width:540px;margin:0 auto;padding:40px 24px;background:#FFF8F0;color:#1A0F0A;">
      <p style="font-size:28px;font-weight:700;color:#C4622D;margin:0 0 8px;">Edziban</p>
      <p style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#9E7A52;margin:0 0 40px;">Ghanaian Catering &middot; Boston Area</p>
      <p style="font-size:17px;font-weight:700;color:#1A0F0A;margin:0 0 12px;">Welcome to the list.</p>
      <p style="font-size:14px;line-height:1.8;color:#4A2E20;margin:0 0 28px;">
        You&rsquo;re now the first to hear about new dishes, seasonal specials, and limited-time offerings from our Ghanaian home cooks in Boston.
      </p>
      <p style="font-size:14px;line-height:1.8;color:#4A2E20;margin:0 0 20px;">
        Here&rsquo;s your <strong style="color:#C4622D;">$5 off</strong> welcome discount:
      </p>
      <div style="background:#1A0F0A;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
        <p style="font-family:monospace;font-size:26px;font-weight:700;letter-spacing:0.14em;color:#FFF8F0;margin:0;">${code}</p>
      </div>
      <p style="font-size:13px;color:#9E7A52;line-height:1.6;margin:0 0 32px;">
        Enter this code at checkout on your next order. Single use, no minimum.
      </p>
      <a href="https://edzibancatering.com/order-now" style="display:inline-block;background:#C4622D;color:#FFF8F0;text-decoration:none;padding:14px 32px;border-radius:100px;font-size:13px;font-weight:700;letter-spacing:0.04em;">
        Order Now
      </a>
      <p style="font-size:11px;color:#C4B8A8;margin-top:40px;line-height:1.6;">
        Edziban Catering &middot; Greater Boston Area<br/>
        <a href="https://edzibancatering.com" style="color:#C4622D;">edzibancatering.com</a>
      </p>
    </div>
  `

  sendEmail(email, 'Your $5 off — welcome to Edziban', html, 'subscriber').catch(err => {
    console.error('[SUBSCRIBE] Welcome email failed:', err)
  })

  return NextResponse.json({ code })
}
