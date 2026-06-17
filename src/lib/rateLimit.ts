// In-memory rate limiter.
// The counter store is sealed inside a closure — it cannot be imported, read,
// reset, or tampered with by any other module. Only checkLimit() can increment
// counters; only the internal sweep can delete them.
//
// IMPORTANT — SERVERLESS LIMITATION:
// On Vercel, each cold-start gets a fresh counter store. Limits are enforced
// within a single warm lambda instance but not globally across instances.
// This means a determined attacker can bypass limits by forcing cold starts.
// For true global rate limiting before production scale, replace the Map with
// Upstash Redis: https://upstash.com/docs/redis/sdks/ratelimit-ts/overview

import { NextResponse } from 'next/server'

export interface LimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: number    // Unix seconds
  retryAfter: number // seconds until window resets (0 when allowed)
}

// ── Sealed counter store ──────────────────────────────────────────────────
// The IIFE returns only the two functions that need the store.
// Nothing outside this block can access, modify, or clear the counters.

interface RateLimitWindow {
  count: number
  resetAt: number
}

const { checkLimit, _startSweep } = (() => {
  const store = new Map<string, RateLimitWindow>()

  function checkLimit(key: string, limit: number, windowMs: number): LimitResult {
    const now = Date.now()
    const win = store.get(key)

    if (!win || win.resetAt < now) {
      store.set(key, { count: 1, resetAt: now + windowMs })
      return {
        allowed: true,
        limit,
        remaining: limit - 1,
        resetAt: Math.ceil((now + windowMs) / 1000),
        retryAfter: 0,
      }
    }

    const resetAt    = Math.ceil(win.resetAt / 1000)
    const retryAfter = Math.max(1, Math.ceil((win.resetAt - now) / 1000))

    if (win.count >= limit) {
      return { allowed: false, limit, remaining: 0, resetAt, retryAfter }
    }

    win.count++
    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - win.count),
      resetAt,
      retryAfter: 0,
    }
  }

  // Sweep expired windows to prevent unbounded memory growth
  function _startSweep() {
    if (typeof setInterval === 'undefined') return
    setInterval(() => {
      const now = Date.now()
      for (const [key, win] of store) {
        if (win.resetAt < now) store.delete(key)
      }
    }, 5 * 60 * 1000)
  }

  return { checkLimit, _startSweep }
})()

// Start the sweep once at module load — store remains sealed inside the closure above
_startSweep()

export { checkLimit }

// ── Public helpers ────────────────────────────────────────────────────────

/** Build a 429 response with standard rate-limit headers and a human-readable message. */
export function deny(result: LimitResult): NextResponse {
  const minutes = Math.ceil(result.retryAfter / 60)
  const when = result.retryAfter < 90
    ? `${result.retryAfter} seconds`
    : `${minutes} minute${minutes !== 1 ? 's' : ''}`

  return NextResponse.json(
    {
      error: 'Too many requests.',
      message: `Please try again in ${when}.`,
      retryAfter: result.retryAfter,
    },
    {
      status: 429,
      headers: {
        'Retry-After':           String(result.retryAfter),
        'X-RateLimit-Limit':     String(result.limit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset':     String(result.resetAt),
      },
    }
  )
}

/** Extract the real client IP from Next.js / Vercel request headers. */
export function getClientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}
