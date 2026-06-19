import { NextRequest, NextResponse } from 'next/server'
import { sendReply, zohoConfigured } from '@/lib/zohoMail'
import { checkLimit, deny, getClientIp } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const rl = checkLimit(getClientIp(req) + ':inbox-reply', 10, 60 * 1000)
  if (!rl.allowed) return deny(rl)

  if (!zohoConfigured()) {
    return NextResponse.json({ error: 'zoho_not_configured' }, { status: 503 })
  }

  if (!req.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 })
  }

  const { to, subject, content } = await req.json()

  if (!to || !subject || !content) {
    return NextResponse.json({ error: 'to, subject, and content are required' }, { status: 400 })
  }

  try {
    await sendReply(String(to), String(subject), String(content))
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[INBOX REPLY]', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
