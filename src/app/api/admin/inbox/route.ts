import { NextRequest, NextResponse } from 'next/server'
import { listInboxEmails, zohoConfigured } from '@/lib/zohoMail'
import { checkLimit, deny, getClientIp } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const rl = checkLimit(getClientIp(req) + ':inbox-list', 30, 60 * 1000)
  if (!rl.allowed) return deny(rl)

  if (!zohoConfigured()) {
    return NextResponse.json({ error: 'zoho_not_configured' }, { status: 503 })
  }

  const url = new URL(req.url)
  const start = Math.max(0, parseInt(url.searchParams.get('start') ?? '0', 10))

  try {
    const emails = await listInboxEmails(20, start)
    return NextResponse.json({ emails })
  } catch (e) {
    console.error('[INBOX] list failed:', e)
    return NextResponse.json({ error: 'Failed to fetch inbox' }, { status: 500 })
  }
}
