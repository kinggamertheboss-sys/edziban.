// Session token helpers using Web Crypto API (works in both Edge and Node.js runtimes)
// Format: <hex-nonce>.<hex-hmac-sha256>
// The raw ADMIN_SESSION_SECRET never travels outside the server.

function hexToBytes(hex: string): ArrayBuffer {
  const pairs = hex.match(/.{2}/g)
  if (!pairs) return new ArrayBuffer(0)
  const arr = new Uint8Array(pairs.map(h => parseInt(h, 16)))
  return arr.buffer as ArrayBuffer
}

function bytesToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function getKey(secret: string, usage: 'sign' | 'verify'): Promise<CryptoKey> {
  const enc = new TextEncoder()
  return crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    [usage],
  )
}

export async function signSession(secret: string): Promise<string> {
  const nonceBytes = new Uint8Array(32)
  crypto.getRandomValues(nonceBytes)
  const nonce = bytesToHex(nonceBytes.buffer)

  const key  = await getKey(secret, 'sign')
  const hmac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(nonce))

  return `${nonce}.${bytesToHex(hmac)}`
}

export async function verifySession(token: string, secret: string): Promise<boolean> {
  const dot = token.indexOf('.')
  if (dot === -1) return false

  const nonce   = token.slice(0, dot)
  const hmacHex = token.slice(dot + 1)

  if (nonce.length !== 64 || hmacHex.length !== 64) return false

  try {
    const key       = await getKey(secret, 'verify')
    const hmacBytes = hexToBytes(hmacHex)
    return await crypto.subtle.verify('HMAC', key, hmacBytes, new TextEncoder().encode(nonce))
  } catch {
    return false
  }
}
