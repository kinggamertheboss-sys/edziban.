import { NextRequest, NextResponse } from 'next/server'
import { checkLimit, deny, getClientIp } from '@/lib/rateLimit'
import { COOKIE_NAME } from '@/app/api/admin/login/route'

export async function POST(req: NextRequest) {
  // 20 logout requests per minute per IP — prevents session disruption spam
  const rl = checkLimit(getClientIp(req) + ':admin-logout', 20, 60 * 1000)
  if (!rl.allowed) return deny(rl)

  const res = NextResponse.json({ success: true })
  res.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  })
  return res
}
