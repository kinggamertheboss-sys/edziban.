// OWASP A05 — Security Misconfiguration
// Validates that all required server-side environment variables are set.
// Runs once per serverless cold start; logs clearly so misconfigs surface in deployment logs.
// Throws in development so the issue is caught immediately during local dev.

const REQUIRED_ENV: readonly string[] = [
  'SUPABASE_URL',                  // server-only — never expose to client
  'SUPABASE_SERVICE_ROLE_KEY',    // server-only — never expose to client
  'SQUARE_ACCESS_TOKEN',           // server-only — never expose to client
  'SQUARE_LOCATION_ID',
  'SQUARE_ENVIRONMENT',
  'ADMIN_PASSWORD',                // server-only — checked by /api/admin/login
  'ADMIN_SESSION_SECRET',          // server-only — used to sign/verify admin cookies
  'CRON_SECRET',                   // server-only — authorizes /api/cron/keep-alive
]

export function checkRequiredEnv(): void {
  const missing = REQUIRED_ENV.filter(k => !process.env[k])
  if (!missing.length) return
  const msg = `[SECURITY] Missing required env vars: ${missing.join(', ')}`
  console.error(msg)
  if (process.env.NODE_ENV === 'development') throw new Error(msg)
}
