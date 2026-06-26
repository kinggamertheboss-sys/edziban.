import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { checkLimit, deny, getClientIp } from '@/lib/rateLimit'

export async function GET(req: NextRequest) {
  const rl = checkLimit(getClientIp(req) + ':admin-subscribers', 60, 60 * 1000)
  if (!rl.allowed) return deny(rl)

  try {
    const db = getAdminClient()

    const { data, error } = await db
      .from('discount_codes')
      .select('customer_email, customer_phone, code, created_at, is_active')
      .eq('amount', 5)
      .not('customer_email', 'is', null)
      .order('created_at', { ascending: false })

    if (error) {
      if (error.code === '42P01') return NextResponse.json({ subscribers: [] })
      throw error
    }

    return NextResponse.json({ subscribers: data ?? [] })
  } catch (e) {
    console.error('[SUBSCRIBERS]', e)
    return NextResponse.json({ error: 'Failed to fetch subscribers' }, { status: 500 })
  }
}
