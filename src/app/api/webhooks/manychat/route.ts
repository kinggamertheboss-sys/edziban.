// Agent 7: Instagram/TikTok DM Auto-Reply via Manychat
// This endpoint is called by Manychat when a DM matches a keyword trigger.
// Set this URL as your Manychat external webhook URL.
//
// HOW TO SET UP IN MANYCHAT:
//   1. Create a Flow in Manychat
//   2. Add a "Keyword Trigger" for each keyword below
//   3. Add "External Request" action pointing to:
//      https://your-domain.vercel.app/api/webhooks/manychat
//   4. Manychat will POST the subscriber data here, this returns the reply text.
//
// ADD_KEY_HERE: Set MANYCHAT_API_KEY in .env.local
// ADD_KEY_HERE: Set MANYCHAT_PAGE_ID in .env.local

import { NextRequest, NextResponse } from 'next/server'
import { createHash, timingSafeEqual } from 'crypto'
import { checkLimit, deny, getClientIp } from '@/lib/rateLimit'
import { sanitizeText } from '@/lib/sanitize'

function safeCompare(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

const WEBSITE = 'https://edziban.vercel.app'

interface ManychatPayload {
  id?: string
  key?: string
  subscriber?: {
    id: string
    first_name?: string
    last_name?: string
  }
  text?: string
  message?: string
}

function matchKeyword(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase()
  return keywords.some(k => lower.includes(k))
}

function getAutoReply(text: string): string | null {
  console.log(`[MANYCHAT] Incoming DM — length: ${text.length}`)

  if (matchKeyword(text, ['how do i order', 'how to order', 'how can i order', 'place an order', 'ordering'])) {
    const reply = `Hey! 👋🏾 To place an order visit our website:\n${WEBSITE}\n\nOrders close every Saturday at midnight.\nPickup and delivery available in the Greater Boston area 🇬🇭`
    console.log(`[MANYCHAT] Matched: HOW TO ORDER → replying`)
    return reply
  }

  if (matchKeyword(text, ['price', 'how much', 'cost', 'pricing', 'prices'])) {
    const reply = `Here are our current prices 🇬🇭\n\nIce Kenkey – $60/batch (serves 10–12)\nPuff Puff – $35/50 pieces\nMeat Pies – $48/24 pieces\nShito – $15/jar\nJollof Rice – $120/full pan\nWaakye – $120/full tray\n\nOrder here: ${WEBSITE}`
    console.log(`[MANYCHAT] Matched: PRICE → replying`)
    return reply
  }

  if (matchKeyword(text, ['delivery', 'do you deliver', 'deliver', 'shipping', 'ship'])) {
    const reply = `Yes we deliver! 🚗\n\nDelivery fees:\n0–5 miles: $5\n5–10 miles: $10\n10–15 miles: $15\n15+ miles: $20\n\nOr free pickup in Randolph, MA!\nOrder here: ${WEBSITE}`
    console.log(`[MANYCHAT] Matched: DELIVERY → replying`)
    return reply
  }

  if (matchKeyword(text, ['menu', 'what do you sell', 'what food', 'ghanaian food'])) {
    const reply = `We serve authentic Ghanaian catering! 🇬🇭\n\nJollof Rice, Waakye, Fried Chicken, Ice Kenkey, Puff Puff, Meat Pies, Shito, and more.\n\nFull menu and ordering: ${WEBSITE}`
    console.log(`[MANYCHAT] Matched: MENU → replying`)
    return reply
  }

  if (matchKeyword(text, ['minimum', 'minimum order', 'min order', 'how many people'])) {
    const reply = `Great question! Our minimum batch sizes:\n\nIce Kenkey – 10 cups\nPuff Puff – 20 pieces\nMeat Pies – 10 pies\nShito – 5 jars\n\nFor full catering (Jollof, Waakye) order at: ${WEBSITE}`
    console.log(`[MANYCHAT] Matched: MINIMUM → replying`)
    return reply
  }

  console.log(`[MANYCHAT] No keyword match — length: ${text.length}`)
  return null
}

export async function POST(req: NextRequest) {
  // 300 webhook calls per IP per minute — lenient because Manychat is a trusted external caller (OWASP A04)
  const rl = checkLimit(getClientIp(req) + ':manychat', 300, 60 * 1000)
  if (!rl.allowed) return deny(rl)

  // Require shared secret — set MANYCHAT_WEBHOOK_SECRET in .env and in
  // Manychat External Request → Headers → "x-webhook-secret: <your-secret>"
  const webhookSecret = process.env.MANYCHAT_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
  }
  const provided = req.headers.get('x-webhook-secret') ?? ''
  if (!safeCompare(provided, webhookSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const raw = await req.json()
  // OWASP A03: Extract only the fields we use; ignore any unknown fields Manychat may add
  const body = raw as ManychatPayload
  // Log only non-PII event metadata — never log subscriber names or IDs
  console.log(`\n[MANYCHAT] Webhook received — subscriber: ${body.subscriber?.id ?? 'unknown'}, text length: ${(body.text ?? body.message ?? '').length}`)

  // OWASP A03: Sanitize the inbound DM text before running keyword matching
  const rawText = body.text ?? body.message ?? ''
  const text = sanitizeText(rawText, 1000)
  const reply = getAutoReply(text)

  if (!reply) {
    return NextResponse.json({
      version: 'v2',
      content: { messages: [] },
    })
  }

  // Manychat external request v2 response format
  return NextResponse.json({
    version: 'v2',
    content: {
      messages: [
        {
          type: 'text',
          text: reply,
        },
      ],
    },
  })
}

// Manychat sends GET to verify the webhook endpoint during setup
export async function GET(req: NextRequest) {
  const rl = checkLimit(getClientIp(req) + ':manychat-verify', 10, 60 * 1000)
  if (!rl.allowed) return deny(rl)
  return NextResponse.json({ status: 'ok', service: 'Edziban Manychat Webhook' })
}
