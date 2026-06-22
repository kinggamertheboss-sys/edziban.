import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { sanitizeText } from '@/lib/sanitize'
import { checkLimit, deny, getClientIp } from '@/lib/rateLimit'

export async function GET(req: NextRequest) {
  const rl = checkLimit(getClientIp(req) + ':notif-logs', 120, 60 * 1000)
  if (!rl.allowed) return deny(rl)

  const orderId = sanitizeText(req.nextUrl.searchParams.get('orderId') ?? '', 30)
  if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 })

  try {
    const db = getAdminClient()
    const { data, error } = await db
      .from('notification_logs')
      .select('type, recipient, subject, success, provider, created_at')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })

    if (error) {
      // Table may not exist yet — return empty gracefully
      if (error.code === '42P01') return NextResponse.json({ logs: [] })
      throw error
    }

    return NextResponse.json({ logs: data ?? [] })
  } catch (e) {
    console.error('[NOTIF LOGS]', e)
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
  }
}
