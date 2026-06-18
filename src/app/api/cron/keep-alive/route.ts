import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'crypto'
import { getAdminClient } from '@/lib/supabase'

function safeCompare(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET

  // If the secret isn't configured, refuse to serve — prevents "Bearer undefined" bypass
  if (!cronSecret) {
    console.error('[CRON] CRON_SECRET env var not set — refusing request')
    return NextResponse.json({ error: 'Cron not configured' }, { status: 503 })
  }

  const authHeader = req.headers.get('authorization') ?? ''
  if (!safeCompare(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const db = getAdminClient()
    const { error } = await db.from('orders').select('id').limit(1)
    if (error) throw error
    console.log('[CRON] Supabase keep-alive ping OK', new Date().toISOString())
    return NextResponse.json({ ok: true, ts: new Date().toISOString() })
  } catch (e) {
    console.error('[CRON] Keep-alive failed:', e)
    return NextResponse.json({ error: 'Keep-alive failed' }, { status: 500 })
  }
}
