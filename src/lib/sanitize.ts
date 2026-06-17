// Sanitization helpers applied at every API boundary.
// React JSX escapes output automatically, but these protect stored data,
// SMS/email content, and downstream systems.

/** Trim, strip HTML tags + entities, enforce max length. */
export function sanitizeText(value: unknown, maxLength = 500): string {
  if (typeof value !== 'string') return ''
  return value
    .trim()
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-zA-Z#0-9]+;/g, ' ')
    .slice(0, maxLength)
}

/** Trim, lowercase, max RFC 5321 length. */
export function sanitizeEmail(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().toLowerCase().slice(0, 254)
}

/** Keep only digits, +, spaces, dashes, parens. */
export function sanitizePhone(value: unknown): string {
  if (typeof value !== 'string') return ''
  const digits = value.trim().replace(/[^\d]/g, '')
  if (!digits) return ''
  return '+' + digits
}

/** Parse to integer, clamp to [min, max]. */
export function sanitizeInt(value: unknown, min = 0, max = 100_000): number {
  const n = parseInt(String(value), 10)
  if (isNaN(n)) return min
  return Math.min(max, Math.max(min, n))
}

/** Parse to float, round to 2 decimal places, floor at 0. */
export function sanitizeAmount(value: unknown): number {
  const n = parseFloat(String(value))
  if (isNaN(n) || n < 0) return 0
  return Math.round(n * 100) / 100
}

/** Return value only if it's in the allowed list, otherwise null. */
export function sanitizeEnum<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  if (typeof value !== 'string') return null
  return (allowed as readonly string[]).includes(value) ? (value as T) : null
}

export const VALID_ORDER_STATUSES = [
  'pending', 'confirmed', 'supplier_notified', 'ready',
  'delivered', 'reviewed', 'in_progress', 'cancelled', 'completed',
] as const

export const VALID_FULFILLMENT_TYPES = ['pickup', 'delivery'] as const
export const VALID_TIMES = ['morning', 'afternoon', 'evening'] as const
export const VALID_DISTANCE_RANGES = ['0-5', '5-10', '10-15', '15+', ''] as const
export const VALID_PAYOUT_METHODS = ['check', 'zelle'] as const

// ── Schema-based body validation (OWASP A03/A08) ─────────────────────────────
// Rejects unknown fields to prevent parameter injection and prototype pollution.
// Each field declares its sanitizer and whether it is required.
// Use on every POST/PATCH route that accepts user-controlled input.

export type FieldSpec = {
  sanitize: (v: unknown) => string | number | null
  required?: boolean
}
export type BodySchema = Record<string, FieldSpec>

export function validateBody(
  raw: unknown,
  schema: BodySchema,
): { ok: true; data: Record<string, string | number | null> } | { ok: false; error: string } {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, error: 'Body must be a JSON object' }
  }
  const obj = raw as Record<string, unknown>

  // Reject any key not declared in the schema
  const unexpected = Object.keys(obj).filter(k => !(k in schema))
  if (unexpected.length) {
    return { ok: false, error: `Unexpected field(s): ${unexpected.slice(0, 3).join(', ')}` }
  }

  const data: Record<string, string | number | null> = {}
  for (const [key, spec] of Object.entries(schema)) {
    const rawVal = obj[key]
    if (spec.required && (rawVal === undefined || rawVal === null)) {
      return { ok: false, error: `Missing required field: ${key}` }
    }
    const val = spec.sanitize(rawVal)
    if (spec.required && (val === null || val === '')) {
      return { ok: false, error: `Invalid value for field: ${key}` }
    }
    data[key] = val
  }
  return { ok: true, data }
}
