import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/session'

const COOKIE_NAME = 'edziban-admin-session'

const PROTECTED_PAGES: string[] = [
  '/admin/dashboard',
]

const PROTECTED_APIS: string[] = [
  '/api/orders',
  '/api/vendor-payments',
  '/api/batch',
  '/api/suppliers',
  '/api/supplier-contacts',
  '/api/admin/inbox',
  '/api/admin/loyalty-codes',
  '/api/admin/notification-logs',
  '/api/notifications/order-confirmed',
  '/api/notifications/order-ready',
  '/api/notifications/review-request',
]

export async function middleware(req: NextRequest) {
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

  const res = NextResponse.next()
  if (isProtectedApi) {
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    res.headers.set('Pragma', 'no-cache')
  }
  if (isProtectedPage) {
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
    '/api/admin/inbox/:path*',
    '/api/admin/inbox',
    '/api/admin/loyalty-codes/:path*',
    '/api/admin/loyalty-codes',
    '/api/admin/notification-logs/:path*',
    '/api/admin/notification-logs',
    '/api/notifications/order-confirmed/:path*',
    '/api/notifications/order-ready/:path*',
    '/api/notifications/review-request/:path*',
  ],
}
