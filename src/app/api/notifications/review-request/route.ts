import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, EDZIBAN_CONFIG } from '@/lib/notifications'
import { checkLimit, deny, getClientIp } from '@/lib/rateLimit'
import { sanitizeText, sanitizeEmail, validateBody } from '@/lib/sanitize'

export interface ReviewRequestPayload {
  orderNumber: string
  customerName: string
  customerEmail: string
}

export async function POST(req: NextRequest) {
  if (!req.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 })
  }

  const rl = checkLimit(getClientIp(req) + ':notif-review', 60, 60 * 1000)
  if (!rl.allowed) return deny(rl)

  const raw = await req.json()

  const result = validateBody(raw, {
    orderNumber:   { sanitize: (v) => sanitizeText(v, 30),   required: true },
    customerName:  { sanitize: (v) => sanitizeText(v, 100),  required: true },
    customerEmail: { sanitize: (v) => sanitizeEmail(v),      required: true },
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  const data: ReviewRequestPayload = {
    orderNumber:   result.data.orderNumber   as string,
    customerName:  result.data.customerName  as string,
    customerEmail: result.data.customerEmail as string,
  }
  console.log(`\n========== REVIEW REQUEST: ${data.orderNumber} ==========`)

  const reviewLink = EDZIBAN_CONFIG.googleReviewLink

  const html = `<!DOCTYPE html>
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
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#C4622D;">Thank You</p>
            <h1 style="margin:0 0 16px;font-size:26px;font-weight:700;color:#1A0F0A;letter-spacing:-0.02em;">We hope you enjoyed it, ${data.customerName}.</h1>
            <p style="margin:0;font-size:15px;color:#6B4C3B;line-height:1.7;">It was a pleasure serving you. If you have a moment, a quick Google review would mean a lot to us and helps other families in the community find Edziban.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;">
            <a href="${reviewLink}" style="display:inline-block;background:#C4622D;color:#FFF8F0;font-size:14px;font-weight:700;letter-spacing:0.04em;padding:16px 32px;border-radius:100px;text-decoration:none;box-shadow:0 4px 20px rgba(196,98,45,0.3);">Leave a Google Review</a>
          </td>
        </tr>
        <tr>
          <td style="background:#1A0F0A;padding:24px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:rgba(255,248,240,0.4);line-height:1.7;">
              Edziban &mdash; Ghana&apos;s finest, delivered to you.<br>
              Greater Boston Area &bull; <a href="${EDZIBAN_CONFIG.website}" style="color:#C4622D;text-decoration:none;">edziban.vercel.app</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  const notifications = await Promise.all([
    sendEmail(
      data.customerEmail,
      `How was your Edziban order, ${data.customerName}?`,
      html,
      'customer'
    ),
  ])

  // ADD_KEY_HERE: Set MAKE_REVIEW_DELAY_WEBHOOK in .env.local
  // For real "3 hours after delivery" behavior, use a Make.com scenario with a 3hr delay
  // triggered from the "Mark Delivered" action in the admin dashboard.
  // Payload: { orderNumber, customerName, customerPhone, delayMinutes: 180 }
  console.log(
    `[REVIEW] Production note: Use Make.com delay module or Vercel cron to send this 3 hours after delivery.\n` +
    `Make.com webhook: process.env.MAKE_REVIEW_DELAY_WEBHOOK`
  )

  console.log(`========== REVIEW REQUEST COMPLETE ==========\n`)

  return NextResponse.json({ success: true, notifications })
}
