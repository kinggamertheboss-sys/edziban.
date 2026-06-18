import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'

const COOKIE_NAME = 'edziban-admin-session'

// Every request to these paths requires a valid admin session cookie.
// Unauthenticated page requests → redirect to /admin/login
// Unauthenticated API requests  → 401 Unauthorized
//
// Public routes NOT listed here (no auth needed):
//   /api/payments           — customer checkout
//   /api/distance           — address lookup
//   /api/notifications/order-received  — fires after customer payment
//   /api/webhooks/manychat  — external Manychat webhook
//   /admin/login            — login page itself

const PROTECTED_PAGES: string[] = [
  '/admin/dashboard',
]

const PROTECTED_APIS: string[] = [
  '/api/orders',
  '/api/vendor-payments',
  '/api/batch',
  '/api/suppliers',
  '/api/supplier-contacts',
  '/api/notifications/order-confirmed',
  '/api/notifications/order-ready',
  '/api/notifications/review-request',
]

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isProtectedPage = PROTECTED_PAGES.some(p => pathname === p || pathname.startsWith(p + '/'))
  const isProtectedApi  = PROTECTED_APIS.some(p => pathname === p || pathname.startsWith(p + '/'))

  if (!isProtectedPage && !isProtectedApi) return NextResponse.next()

  const secret = process.env.ADMIN_SESSION_SECRET
  const cookie = req.cookies.get(COOKIE_NAME)

  const authenticated = secret && cookie && await verifySession(cookie.value, secret)

  if (!authenticated) {
    if (isProtectedPage) {
      const loginUrl = new URL('/admin/login', req.url)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // OWASP A05: Prevent proxies and browsers from caching authenticated responses
  const res = NextResponse.next()
  if (isProtectedApi) {
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    res.headers.set('Pragma', 'no-cache')
  }
  if (isProtectedPage) {
    // Tells CDNs the response varies by cookie — prevents serving admin HTML to anonymous users
    res.headers.set('Cache-Control', 'private, no-store')
    res.headers.set('Vary', 'Cookie')
  }
  return res
}

export const config = {
  matcher: [
    '/admin/dashboard/:path*',
    '/api/orders/:path*',
    '/api/vendor-payments/:path*',
    '/api/batch/:path*',
    '/api/suppliers/:path*',
    '/api/supplier-contacts/:path*',
    '/api/notifications/order-confirmed/:path*',
    '/api/notifications/order-ready/:path*',
    '/api/notifications/review-request/:path*',
  ],
}
