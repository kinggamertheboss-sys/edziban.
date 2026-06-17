import type { NextConfig } from "next";

// OWASP A05 — Security Misconfiguration
// These headers are returned on every response and harden the browser's security posture.

const isDev = process.env.NODE_ENV === 'development'

const securityHeaders = [
  // Prevent the site from being embedded in iframes — blocks clickjacking attacks
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  // Stop browsers from guessing the content type — prevents MIME-sniffing attacks
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // Only send the origin (not the full URL) as the referrer on cross-origin requests
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // Disable browser features this site never uses
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  // HTTPS enforcement — tells browsers to ALWAYS use HTTPS for this domain for 2 years.
  // Vercel provides HTTPS automatically; this locks the browser into it.
  // preload allows submission to the HSTS preload list (https://hstspreload.org).
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // Content Security Policy — restricts what resources the browser can load.
  // Blocks most XSS, data injection, and clickjacking vectors.
  // Square Web Payments SDK requires script-src + frame-src + connect-src allowances below.
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Square SDK is loaded from web.squarecdn.com; unsafe-inline needed for Next.js hydration
      // unsafe-eval is included in dev only — React needs it for debugging; production stays strict
      `script-src 'self' https://web.squarecdn.com https://sandbox.web.squarecdn.com 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
      // Tailwind and Next.js inject inline styles; Square SDK loads its own stylesheet
      "style-src 'self' 'unsafe-inline' https://sandbox.web.squarecdn.com https://web.squarecdn.com",
      // Local fonts + data URIs + Square card input fonts
      "font-src 'self' data: https://sandbox.web.squarecdn.com https://web.squarecdn.com",
      // Site images + Next.js image optimization
      "img-src 'self' data: blob:",
      // Square payment API calls (both sandbox and production endpoints)
      "connect-src 'self' https://connect.squareapi.com https://connect.squareupsandbox.com https://pci-connect.squareupsandbox.com https://*.supabase.co",
      // Square card input renders in an iframe hosted on their domain
      "frame-src https://web.squarecdn.com https://sandbox.web.squarecdn.com",
      // Never allow plugins (Flash, Java, etc.)
      "object-src 'none'",
      // Prevent base tag hijacking
      "base-uri 'self'",
      // Forms can only submit to the same origin
      "form-action 'self'",
      // Belt-and-suspenders with X-Frame-Options above
      "frame-ancestors 'none'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig
