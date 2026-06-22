// Edziban Notification Service
// Handles: Zoho Mail (primary), AWS SNS SMS, AWS SES (fallback), Make.com webhooks
//
// HOW TO ACTIVATE:
//   1. Copy .env.local.example to .env.local
//   2. Fill in real API keys where marked ADD_KEY_HERE
//   In MOCK MODE (no keys), everything logs to console only — safe for dev.

// ── Notification log (persists to Supabase for dashboard visibility) ───────

export async function logNotification(entry: {
  orderId: string
  type: 'email' | 'sms' | 'whatsapp'
  recipient: string
  toAddress: string
  subject: string
  success: boolean
  provider: string
}): Promise<void> {
  try {
    const { getAdminClient } = await import('./supabase')
    const db = getAdminClient()
    await db.from('notification_logs').insert({
      order_id:   entry.orderId,
      type:       entry.type,
      recipient:  entry.recipient,
      to_address: entry.toAddress,
      subject:    entry.subject,
      success:    entry.success,
      provider:   entry.provider,
    })
  } catch {
    // Table may not exist yet — silently skip, never block email sending
  }
}

// ── Config ─────────────────────────────────────────────────────────────────

export const EDZIBAN_CONFIG = {
  // ADD_KEY_HERE: Replace X's with your real WhatsApp number
  myWhatsapp: '+1XXXXXXXXXX',

  // ADD_KEY_HERE: Your personal phone number for admin SMS alerts (E.164 format: +16175550000)
  myPhone: '+16177928522',

  myEmail: 'admin@edzibancatering.com',

  website: 'https://edzibancatering.com',
  pickupLocation: 'Randolph, MA 02368',
  googleReviewLink: 'https://g.page/r/edziban/review',

  suppliers: {
    'supplier-1': { name: 'Auntie Ama', phone: '+1XXXXXXXXXX' },
    'supplier-2': { name: 'Uncle Kofi', phone: '+1XXXXXXXXXX' },
  } as Record<string, { name: string; phone: string }>,
}

// ── Result type ────────────────────────────────────────────────────────────

export interface NotifResult {
  type: 'sms' | 'email' | 'whatsapp'
  recipient: string
  to: string
  preview: string
  mock: boolean
  success: boolean
  error?: string
}

// ── SMS (AWS SNS) ──────────────────────────────────────────────────────────

export async function sendSMS(to: string, message: string, recipientLabel = 'customer', orderId?: string): Promise<NotifResult> {
  const result: NotifResult = { type: 'sms', recipient: recipientLabel, to, preview: message.slice(0, 80), mock: false, success: false }

  const masked = to.slice(0, 4) + '****' + to.slice(-2)
  console.log(`\n[SMS] ── To: ${masked} (${recipientLabel}) ──`)

  // ADD_KEY_HERE: Set AWS_ACCESS_KEY_ID in .env.local
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID
  // ADD_KEY_HERE: Set AWS_SECRET_ACCESS_KEY in .env.local
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
  const region = process.env.AWS_REGION ?? 'us-east-1'

  if (!accessKeyId || !secretAccessKey) {
    console.log(`[SMS] MOCK MODE — no AWS keys. Would send to ${to}.`)
    return { ...result, mock: true, success: true }
  }

  try {
    const { SNSClient, PublishCommand } = await import('@aws-sdk/client-sns')
    const client = new SNSClient({ region, credentials: { accessKeyId, secretAccessKey } })
    await client.send(new PublishCommand({
      PhoneNumber: to,
      Message: message,
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': { DataType: 'String', StringValue: 'Transactional' },
        'AWS.SNS.SMS.SenderID': { DataType: 'String', StringValue: 'Edziban' },
      },
    }))
    console.log(`[SMS] Sent successfully to ${to}`)
    if (orderId) logNotification({ orderId, type: 'sms', recipient: recipientLabel, toAddress: to, subject: message.slice(0, 80), success: true, provider: 'sns' }).catch(() => {})
    return { ...result, success: true }
  } catch (e) {
    console.error(`[SMS] Error:`, e)
    if (orderId) logNotification({ orderId, type: 'sms', recipient: recipientLabel, toAddress: to, subject: message.slice(0, 80), success: false, provider: 'sns' }).catch(() => {})
    return { ...result, success: false, error: String(e) }
  }
}

// ── Email ──────────────────────────────────────────────────────────────────
// Zoho is the primary sender — no sandbox restrictions, works immediately.
// AWS SES is the fallback for when SES production access is granted.

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  recipientLabel = 'customer',
  orderId?: string,
): Promise<NotifResult> {
  const result: NotifResult = { type: 'email', recipient: recipientLabel, to, preview: subject, mock: false, success: false }

  const [u, d] = to.split('@')
  const maskedEmail = (u[0] ?? '') + '***@' + (d ?? '')
  console.log(`\n[EMAIL] ── To: ${maskedEmail} (${recipientLabel}) ──`)
  console.log(`[EMAIL] Subject: ${subject}`)

  let provider = ''

  // ── Try Zoho first (primary, no sandbox) ──────────────────────────────
  const zohoReady = !!(process.env.ZOHO_CLIENT_ID && process.env.ZOHO_CLIENT_SECRET && process.env.ZOHO_REFRESH_TOKEN)
  if (zohoReady) {
    try {
      const { sendZohoEmail } = await import('./zohoMail')
      await sendZohoEmail(to, subject, html)
      console.log(`[EMAIL] Sent via Zoho to ${to}`)
      provider = 'zoho'
      if (orderId) logNotification({ orderId, type: 'email', recipient: recipientLabel, toAddress: to, subject, success: true, provider }).catch(() => {})
      return { ...result, success: true }
    } catch (e) {
      console.error(`[EMAIL] Zoho failed, trying SES fallback:`, e)
    }
  }

  // ── Fallback: AWS SES ─────────────────────────────────────────────────
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
  const region = process.env.AWS_REGION ?? 'us-east-1'
  const from = process.env.AWS_SES_FROM ?? 'Edziban <orders@edzibancatering.com>'

  if (!accessKeyId || !secretAccessKey) {
    console.log(`[EMAIL] MOCK MODE — no email provider configured. Would email ${to}: "${subject}"`)
    provider = 'mock'
    if (orderId) logNotification({ orderId, type: 'email', recipient: recipientLabel, toAddress: to, subject, success: false, provider }).catch(() => {})
    return { ...result, mock: true, success: true }
  }

  try {
    const { SESClient, SendEmailCommand } = await import('@aws-sdk/client-ses')
    const client = new SESClient({ region, credentials: { accessKeyId, secretAccessKey } })
    await client.send(new SendEmailCommand({
      Source: from,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: { Html: { Data: html, Charset: 'UTF-8' } },
      },
    }))
    console.log(`[EMAIL] Sent via SES to ${to}`)
    provider = 'ses'
    if (orderId) logNotification({ orderId, type: 'email', recipient: recipientLabel, toAddress: to, subject, success: true, provider }).catch(() => {})
    return { ...result, success: true }
  } catch (e) {
    console.error(`[EMAIL] SES error:`, e)
    provider = 'ses'
    if (orderId) logNotification({ orderId, type: 'email', recipient: recipientLabel, toAddress: to, subject, success: false, provider }).catch(() => {})
    return { ...result, success: false, error: String(e) }
  }
}

// ── WhatsApp via Make.com webhook ──────────────────────────────────────────
// Make.com scenario receives the payload and sends the WhatsApp message.
// Set up your Make.com scenario to listen on this webhook URL.

export async function sendWhatsApp(to: string, message: string, recipientLabel = 'admin', context: Record<string, unknown> = {}): Promise<NotifResult> {
  const result: NotifResult = { type: 'whatsapp', recipient: recipientLabel, to, preview: message.slice(0, 80), mock: false, success: false }

  console.log(`\n[WHATSAPP] ── To: ${to} (${recipientLabel}) ──`)
  console.log(`[WHATSAPP] ${message}`)

  // ADD_KEY_HERE: Set MAKE_WHATSAPP_WEBHOOK in .env.local
  // This is the webhook URL from your Make.com scenario
  // Example: https://hook.us1.make.com/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
  const webhookUrl = process.env.MAKE_WHATSAPP_WEBHOOK

  if (!webhookUrl) {
    console.log(`[WHATSAPP] MOCK MODE — no Make.com webhook. Would WhatsApp ${to}.`)
    return { ...result, mock: true, success: true }
  }

  try {
    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, message, recipientLabel, ...context }),
    })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    console.log(`[WHATSAPP] Make.com webhook triggered for ${to}`)
    return { ...result, success: true }
  } catch (e) {
    console.error(`[WHATSAPP] Error:`, e)
    return { ...result, success: false, error: String(e) }
  }
}

// ── Make.com General Automation Webhook ───────────────────────────────────
// For triggering any Make.com scenario (order alerts, automations, etc.)

export async function triggerMakeWebhook(eventType: string, payload: Record<string, unknown>): Promise<void> {
  console.log(`\n[MAKE] Triggering scenario: ${eventType}`)
  console.log(`[MAKE] Payload:`, JSON.stringify(payload, null, 2))

  // ADD_KEY_HERE: Set MAKE_ORDER_WEBHOOK in .env.local
  // This is your general Edziban automation webhook on Make.com
  const webhookUrl = process.env.MAKE_ORDER_WEBHOOK

  if (!webhookUrl) {
    console.log(`[MAKE] MOCK MODE — no webhook URL. Event: ${eventType}`)
    return
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: eventType, ...payload }),
    })
    console.log(`[MAKE] Webhook sent: ${eventType}`)
  } catch (e) {
    console.error(`[MAKE] Webhook error:`, e)
  }
}

// ── Time label helper (shared) ─────────────────────────────────────────────

export function timeLabel(t: string) {
  const m: Record<string, string> = {
    morning: '10am–12pm',
    afternoon: '12pm–4pm',
    evening: '4pm–7pm',
  }
  return m[t] ?? t
}
