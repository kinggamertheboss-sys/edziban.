import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { sanitizeEmail, sanitizePhone } from '@/lib/sanitize'
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

function buildWelcomeEmail(code: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5EDE0;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5EDE0;">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#FFF8F0;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(26,15,10,0.12);">
        <tr>
          <td style="background:#1A0F0A;padding:32px 40px;text-align:center;">
            <div style="font-size:72px;font-weight:700;color:#C4622D;line-height:1;letter-spacing:-0.04em;font-family:Georgia,serif;">E</div>
            <div style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,248,240,0.4);margin-top:6px;">EDZIBAN</div>
            <div style="font-size:12px;font-style:italic;color:rgba(255,248,240,0.35);margin-top:4px;">Ghana&apos;s finest, delivered to you.</div>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 0;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#C4622D;">Welcome to the list</p>
            <h1 style="margin:0 0 16px;font-size:26px;font-weight:700;color:#1A0F0A;letter-spacing:-0.02em;">Your $5 off is inside.</h1>
            <p style="margin:0;font-size:15px;color:#6B4C3B;line-height:1.7;">
              You&rsquo;re now the first to hear about new dishes, seasonal specials, and limited-time offerings from our Ghanaian home cooks in Boston.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 40px;">
            <div style="background:#1A0F0A;border-radius:16px;padding:28px 32px;text-align:center;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:rgba(255,248,240,0.4);">Your discount code</p>
              <p style="margin:0 0 10px;font-size:36px;font-weight:700;color:#C4622D;letter-spacing:0.12em;font-family:monospace;">${code}</p>
              <div style="width:48px;height:1px;background:rgba(196,98,45,0.3);margin:0 auto 10px;"></div>
              <p style="margin:0;font-size:18px;font-weight:700;color:#FFF8F0;font-family:Georgia,serif;">$5 off your next order</p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:0 40px 36px;">
            <div style="background:rgba(196,98,45,0.06);border:1px solid rgba(196,98,45,0.18);border-radius:12px;padding:16px 20px;margin-bottom:28px;">
              <p style="margin:0;font-size:13px;color:#6B4C3B;line-height:1.7;">Enter this code at checkout on your next order. Single use, no minimum order required.</p>
            </div>
            <div style="text-align:center;">
              <a href="https://edzibancatering.com/order-now" style="display:inline-block;background:#C4622D;color:#FFF8F0;font-size:14px;font-weight:700;letter-spacing:0.05em;padding:16px 40px;border-radius:100px;text-decoration:none;box-shadow:0 8px 24px rgba(196,98,45,0.28);">Order Now</a>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#1A0F0A;padding:24px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:rgba(255,248,240,0.4);line-height:1.7;">
              Edziban &mdash; Ghana&apos;s finest, delivered to you.<br>
              Greater Boston Area &bull; <a href="https://edzibancatering.com" style="color:#C4622D;text-decoration:none;">edzibancatering.com</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  if (!req.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 })
  }

  const ip = getClientIp(req)
  const rl = checkLimit(ip + ':subscribe', 5, 60 * 60 * 1000)
  if (!rl.allowed) return deny(rl)

  const raw = await req.json().catch(() => null)
  if (typeof raw !== 'object' || raw === null) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const email = sanitizeEmail(raw.email)
  if (!email) {
    return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 })
  }
  const phone = raw.smsOptIn ? sanitizePhone(raw.phone ?? '') : ''

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
  const { data: collision } = await db.from('discount_codes').select('code').eq('code', code).maybeSingle()
  if (collision) code = generateCode()

  const { error: insertError } = await db.from('discount_codes').insert({
    code,
    amount: 5,
    is_active: true,
    single_use: true,
    customer_email: email,
    ...(phone ? { customer_phone: phone } : {}),
  })

  if (insertError) {
    console.error('[SUBSCRIBE] Failed to insert discount code:', insertError.message)
    return NextResponse.json({ error: 'Could not create your code. Please try again.' }, { status: 500 })
  }

  // Send email — if it fails, delete the code so the user can try again
  const result = await sendEmail(email, 'Your $5 off — welcome to Edziban', buildWelcomeEmail(code), 'subscriber')

  if (!result.success) {
    console.error('[SUBSCRIBE] Welcome email failed — rolling back code:', result.error)
    await db.from('discount_codes').delete().eq('code', code)
    return NextResponse.json({ error: 'We could not send the email. Please check the address and try again.' }, { status: 500 })
  }

  // Never return the code — it lives only in the email
  return NextResponse.json({ success: true })
}
