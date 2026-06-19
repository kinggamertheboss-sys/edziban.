import { NextRequest, NextResponse } from 'next/server'
import { getEmailContent, markAsRead, zohoConfigured } from '@/lib/zohoMail'
import { checkLimit, deny, getClientIp } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const rl = checkLimit(getClientIp(req) + ':inbox-read', 60, 60 * 1000)
  if (!rl.allowed) return deny(rl)

  if (!zohoConfigured()) {
    return NextResponse.json({ error: 'zoho_not_configured' }, { status: 503 })
  }

  const { messageId } = await params
  const folderId = new URL(req.url).searchParams.get('folderId')

  if (!folderId) {
    return NextResponse.json({ error: 'folderId required' }, { status: 400 })
  }

  try {
    const [email] = await Promise.all([
      getEmailContent(messageId, folderId),
      markAsRead(messageId).catch(() => {}),
    ])
    return NextResponse.json({ email })
  } catch (e) {
    console.error('[INBOX] read failed:', e)
    return NextResponse.json({ error: 'Failed to fetch email' }, { status: 500 })
  }
}
