// Zoho Mail API helper — token management + inbox operations
// Env vars required: ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN
// Optional: ZOHO_ACCOUNT_ID (auto-fetched if not set)

const MAIL_API = 'https://mail.zoho.com/api'
const TOKEN_URL = 'https://accounts.zoho.com/oauth/v2/token'

let tokenCache: { value: string; exp: number } | null = null
let accountIdCache: string | null = null

export interface ZohoMessage {
  messageId: string
  subject: string
  fromAddress: string
  toAddress: string
  receivedTime: string  // ms since epoch as string
  size: string
  status: string        // "0" = unread, "1" = read
  hasAttachment: string // "0" | "1"
  summary: string
  folderId: string
}

export interface ZohoMessageContent {
  messageId: string
  subject: string
  fromAddress: string
  toAddress: string
  receivedTime: string
  htmlBody?: string
  content?: string
  folderId: string
}

export function zohoConfigured(): boolean {
  return !!(process.env.ZOHO_CLIENT_ID && process.env.ZOHO_CLIENT_SECRET && process.env.ZOHO_REFRESH_TOKEN)
}

async function getToken(): Promise<string> {
  if (tokenCache && tokenCache.exp > Date.now() + 60_000) return tokenCache.value

  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.ZOHO_CLIENT_ID!,
      client_secret: process.env.ZOHO_CLIENT_SECRET!,
      refresh_token: process.env.ZOHO_REFRESH_TOKEN!,
    }),
  })

  if (!r.ok) {
    const text = await r.text().catch(() => '')
    throw new Error(`Zoho token refresh failed ${r.status}: ${text}`)
  }

  const d = await r.json()
  if (d.error) throw new Error(`Zoho token error: ${d.error}`)

  tokenCache = { value: d.access_token, exp: Date.now() + d.expires_in * 1000 }
  return tokenCache.value
}

async function getAccountId(): Promise<string> {
  if (process.env.ZOHO_ACCOUNT_ID) return process.env.ZOHO_ACCOUNT_ID
  if (accountIdCache) return accountIdCache

  const token = await getToken()
  const r = await fetch(`${MAIL_API}/accounts`, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  })
  const d = await r.json()
  if (!d.data?.[0]?.accountId) throw new Error('No Zoho Mail account found')

  accountIdCache = String(d.data[0].accountId)
  return accountIdCache!
}

export async function listInboxEmails(limit = 20, start = 0): Promise<ZohoMessage[]> {
  const [token, accountId] = await Promise.all([getToken(), getAccountId()])
  const qs = new URLSearchParams({ limit: String(limit), start: String(start) })
  const r = await fetch(`${MAIL_API}/accounts/${accountId}/messages/view?${qs}`, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  })
  const d = await r.json()
  if (!Array.isArray(d.data)) return []
  return d.data as ZohoMessage[]
}

export async function getEmailContent(messageId: string, folderId: string): Promise<ZohoMessageContent> {
  const [token, accountId] = await Promise.all([getToken(), getAccountId()])
  const r = await fetch(`${MAIL_API}/accounts/${accountId}/folders/${folderId}/messages/${messageId}`, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  })
  const d = await r.json()
  return d.data as ZohoMessageContent
}

export async function markAsRead(messageId: string): Promise<void> {
  const [token, accountId] = await Promise.all([getToken(), getAccountId()])
  await fetch(`${MAIL_API}/accounts/${accountId}/updatemessage`, {
    method: 'PUT',
    headers: { Authorization: `Zoho-oauthtoken ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'markAsRead', messageId: [messageId] }),
  })
}

export async function sendReply(to: string, subject: string, content: string): Promise<void> {
  const [token, accountId] = await Promise.all([getToken(), getAccountId()])
  const r = await fetch(`${MAIL_API}/accounts/${accountId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Zoho-oauthtoken ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fromAddress: process.env.ADMIN_EMAIL ?? 'admin@edzibancatering.com',
      toAddress: to,
      subject,
      content,
      mailFormat: 'plaintext',
    }),
  })
  if (!r.ok) {
    const d = await r.json().catch(() => ({}))
    throw new Error(d?.data?.errorMessage ?? `Zoho send failed: ${r.status}`)
  }
}

/** Send a transactional HTML email via Zoho Mail. No sandbox restrictions. */
export async function sendZohoEmail(to: string, subject: string, html: string): Promise<void> {
  const [token, accountId] = await Promise.all([getToken(), getAccountId()])
  const from = process.env.ZOHO_FROM_ADDRESS ?? process.env.ADMIN_EMAIL ?? 'admin@edzibancatering.com'
  const r = await fetch(`${MAIL_API}/accounts/${accountId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Zoho-oauthtoken ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fromAddress: from,
      toAddress: to,
      subject,
      content: html,
      mailFormat: 'html',
    }),
  })
  const d = await r.json().catch(() => ({}))
  if (!r.ok || d?.status?.code !== 200) {
    throw new Error(d?.data?.errorMessage ?? d?.status?.description ?? `Zoho send failed: ${r.status}`)
  }
}
