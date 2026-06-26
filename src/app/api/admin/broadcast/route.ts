import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { sanitizeText, sanitizeEmail } from '@/lib/sanitize'
import { checkLimit, deny, getClientIp } from '@/lib/rateLimit'
import { sendEmail } from '@/lib/notifications'

function buildBroadcastEmail(subject: string, body: string, imageUrl: string, ctaText: string, ctaUrl: string): string {
  const imageBlock = imageUrl ? `
    <tr>
      <td style="padding:0;">
        <img src="${imageUrl}" alt="${subject}" style="width:100%;max-width:600px;display:block;border-radius:0;" />
      </td>
    </tr>` : ''

  const ctaBlock = ctaText && ctaUrl ? `
    <tr>
      <td style="padding:0 40px 36px;text-align:center;">
        <a href="${ctaUrl}" style="display:inline-block;background:#C4622D;color:#FFF8F0;font-size:14px;font-weight:700;letter-spacing:0.05em;padding:16px 40px;border-radius:100px;text-decoration:none;box-shadow:0 8px 24px rgba(196,98,45,0.28);">${ctaText}</a>
      </td>
    </tr>` : ''

  // Convert plain newlines in body to <br> tags
  const htmlBody = body.replace(/\n/g, '<br/>')

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5EDE0;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5EDE0;">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#FFF8F0;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(26,15,10,0.12);">

        <tr>
          <td style="background:#1A0F0A;padding:24px 40px;text-align:center;">
            <div style="font-size:52px;font-weight:700;color:#C4622D;line-height:1;letter-spacing:-0.04em;font-family:Georgia,serif;">E</div>
            <div style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,248,240,0.4);margin-top:4px;">EDZIBAN</div>
          </td>
        </tr>

        ${imageBlock}

        <tr>
          <td style="padding:36px 40px 28px;">
            <h1 style="margin:0 0 16px;font-size:26px;font-weight:700;color:#1A0F0A;letter-spacing:-0.02em;line-height:1.2;">${subject}</h1>
            <p style="margin:0;font-size:15px;color:#6B4C3B;line-height:1.8;">${htmlBody}</p>
          </td>
        </tr>

        ${ctaBlock}

        <tr>
          <td style="background:#1A0F0A;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:11px;color:rgba(255,248,240,0.35);line-height:1.7;">
              Edziban &mdash; Ghana&apos;s finest, delivered to you.<br>
              Greater Boston Area &bull; <a href="https://edzibancatering.com" style="color:#C4622D;text-decoration:none;">edzibancatering.com</a><br><br>
              <a href="https://edzibancatering.com" style="color:rgba(255,248,240,0.3);text-decoration:underline;font-size:10px;">Unsubscribe</a>
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

  // Strict rate limit — 2 broadcasts per hour to prevent accidental mass sends
  const rl = checkLimit(getClientIp(req) + ':broadcast', 2, 60 * 60 * 1000)
  if (!rl.allowed) return deny(rl)

  const raw = await req.json().catch(() => null)
  if (typeof raw !== 'object' || raw === null) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const subject  = sanitizeText(raw.subject ?? '', 200)
  const body     = sanitizeText(raw.body ?? '', 2000)
  const imageUrl = sanitizeText(raw.imageUrl ?? '', 500)
  const ctaText  = sanitizeText(raw.ctaText ?? '', 100)
  const ctaUrl   = sanitizeText(raw.ctaUrl ?? '', 500)

  if (!subject || !body) {
    return NextResponse.json({ error: 'Subject and body are required' }, { status: 400 })
  }

  const db = getAdminClient()

  // Fetch all active subscribers
  const { data: subscribers, error } = await db
    .from('discount_codes')
    .select('customer_email')
    .eq('amount', 5)
    .not('customer_email', 'is', null)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch subscribers' }, { status: 500 })
  }

  const emails = [...new Set(
    (subscribers ?? [])
      .map(s => sanitizeEmail(s.customer_email))
      .filter(Boolean)
  )]

  if (emails.length === 0) {
    return NextResponse.json({ error: 'No subscribers to send to' }, { status: 400 })
  }

  const html = buildBroadcastEmail(subject, body, imageUrl, ctaText, ctaUrl)

  let sent = 0
  let failed = 0

  // Send sequentially with a small delay to respect Zoho rate limits
  for (const email of emails) {
    const result = await sendEmail(email, subject, html, 'subscriber')
    if (result.success) {
      sent++
    } else {
      failed++
      console.error(`[BROADCAST] Failed to send to ${email}:`, result.error)
    }
    // 300ms between sends to stay within Zoho limits
    if (emails.indexOf(email) < emails.length - 1) {
      await new Promise(r => setTimeout(r, 300))
    }
  }

  return NextResponse.json({ sent, failed, total: emails.length })
}
