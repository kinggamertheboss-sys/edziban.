import { NextRequest, NextResponse } from 'next/server'
import { checkLimit, deny, getClientIp } from '@/lib/rateLimit'
import { sanitizeEmail, sanitizeText } from '@/lib/sanitize'
import { signSession } from '@/lib/session'

export const COOKIE_NAME = 'edziban-admin-session'
export const COOKIE_MAX_AGE = 8 * 60 * 60 // 8 hours

export async function POST(req: NextRequest) {
  // OWASP A05: Enforce JSON Content-Type
  if (!req.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json({ error: 'Content-Type must be application/json' }, { status: 415 })
  }

  // OWASP A07: 5 login attempts per 15 minutes per IP — prevents brute force
  const rl = checkLimit(getClientIp(req) + ':admin-login', 5, 15 * 60 * 1000)
  if (!rl.allowed) return deny(rl)

  const raw = await req.json()
  if (typeof raw !== 'object' || raw === null) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // OWASP A08: Reject unknown fields
  const unexpected = Object.keys(raw as object).filter(k => !['email', 'password'].includes(k))
  if (unexpected.length) {
    return NextResponse.json({ error: 'Invalid request structure' }, { status: 400 })
  }

  const email    = sanitizeEmail((raw as { email?: unknown }).email)
  const password = sanitizeText((raw as { password?: unknown }).password, 128)

  const adminEmail    = process.env.ADMIN_EMAIL    ?? 'admin@edziban.com'
  const adminPassword = process.env.ADMIN_PASSWORD
  const sessionSecret = process.env.ADMIN_SESSION_SECRET

  if (!adminPassword || !sessionSecret) {
    console.error('[ADMIN LOGIN] Missing ADMIN_PASSWORD or ADMIN_SESSION_SECRET in env')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  if (email !== adminEmail || password !== adminPassword) {
    // OWASP A09: Log failed login attempts with IP for intrusion detection
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
    console.warn(`[SECURITY] Failed admin login attempt — IP: ${ip}, email: ${email}`)
    // Fixed delay regardless of which field is wrong — prevents user enumeration (OWASP A07)
    await new Promise(r => setTimeout(r, 400 + Math.random() * 200))
    return NextResponse.json({ error: 'Wrong email or password.' }, { status: 401 })
  }

  // Each login issues a fresh signed token — the cookie value never equals the raw secret
  const sessionToken = await signSession(sessionSecret)

  const res = NextResponse.json({ success: true })

  // OWASP A07: httpOnly prevents JS access (blocks DevTools bypass)
  // secure sends only over HTTPS in production; sameSite strict blocks CSRF
  res.cookies.set(COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })

  return res
}
