import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { sanitizeText } from '@/lib/sanitize'
import { checkLimit, deny, getClientIp } from '@/lib/rateLimit'
import { sendSMS } from '@/lib/notifications'

export async function POST(req: NextRequest) {
  if (!req.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 })
  }

  // Max 2 SMS blasts per hour to prevent accidental spam
  const rl = checkLimit(getClientIp(req) + ':sms-broadcast', 2, 60 * 60 * 1000)
  if (!rl.allowed) return deny(rl)

  const raw = await req.json().catch(() => null)
  if (typeof raw !== 'object' || raw === null) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const message = sanitizeText(raw.message ?? '', 160)
  if (!message) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  const db = getAdminClient()

  const { data: subscribers, error } = await db
    .from('discount_codes')
    .select('customer_phone')
    .eq('amount', 5)
    .not('customer_phone', 'is', null)

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch SMS subscribers' }, { status: 500 })
  }

  const phones = [...new Set(
    (subscribers ?? [])
      .map(s => s.customer_phone as string)
      .filter(Boolean)
  )]

  if (phones.length === 0) {
    return NextResponse.json({ error: 'No SMS subscribers yet. People need to opt in with their phone number on the signup form.' }, { status: 400 })
  }

  let sent = 0
  let failed = 0

  for (const phone of phones) {
    const result = await sendSMS(phone, message, 'subscriber')
    if (result.success && !result.mock) {
      sent++
    } else if (result.mock) {
      sent++ // count mock sends in dev
    } else {
      failed++
      console.error(`[SMS BROADCAST] Failed to send to phone:`, result.error)
    }
    // 500ms between sends to avoid SNS throttling
    if (phones.indexOf(phone) < phones.length - 1) {
      await new Promise(r => setTimeout(r, 500))
    }
  }

  return NextResponse.json({ sent, failed, total: phones.length })
}
