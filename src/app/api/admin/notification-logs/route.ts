import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { sanitizeText } from '@/lib/sanitize'
import { checkLimit, deny, getClientIp } from '@/lib/rateLimit'

import { sanitizeInt } from '@/lib/sanitize'

export async function GET(req: NextRequest) {
  const rl = checkLimit(getClientIp(req) + ':notif-logs', 120, 60 * 1000)
  if (!rl.allowed) return deny(rl)

  const url = req.nextUrl
  const orderId = sanitizeText(url.searchParams.get('orderId') ?? '', 30)
  const limit   = sanitizeInt(url.searchParams.get('limit') ?? '50', 1, 200)

  try {
    const db = getAdminClient()

    let query = db
      .from('notification_logs')
      .select('order_id, type, recipient, to_address, subject, success, provider, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (orderId) query = query.eq('order_id', orderId).order('created_at', { ascending: true })

    const { data, error } = await query

    if (error) {
      if (error.code === '42P01') return NextResponse.json({ logs: [] })
      throw error
    }

    return NextResponse.json({ logs: data ?? [] })
  } catch (e) {
    console.error('[NOTIF LOGS]', e)
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
  }
}
