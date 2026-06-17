import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET

  // If the secret isn't configured, refuse to serve — prevents "Bearer undefined" bypass
  if (!cronSecret) {
    console.error('[CRON] CRON_SECRET env var not set — refusing request')
    return NextResponse.json({ error: 'Cron not configured' }, { status: 503 })
  }

  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
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
