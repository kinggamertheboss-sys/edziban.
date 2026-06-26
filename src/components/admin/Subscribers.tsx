'use client'

import { useEffect, useState } from 'react'

const D = {
  bg: '#0E0806', card: '#1A0F0A', border: 'rgba(255,255,255,0.07)',
  text: '#FFF8F0', muted: 'rgba(255,248,240,0.5)', faint: 'rgba(255,248,240,0.2)',
}

interface Subscriber {
  customer_email: string
  code: string
  created_at: string
}

type View = 'list' | 'compose'

export default function Subscribers() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('list')

  // Broadcast form
  const [subject, setSubject]   = useState('')
  const [body, setBody]         = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [ctaText, setCtaText]   = useState('Order Now')
  const [ctaUrl, setCtaUrl]     = useState('https://edzibancatering.com/order-now')
  const [sending, setSending]   = useState(false)
  const [result, setResult]     = useState<{ sent: number; failed: number; total: number } | null>(null)
  const [broadcastError, setBroadcastError] = useState('')

  useEffect(() => {
    fetch('/api/admin/subscribers')
      .then(r => r.json())
      .then(d => setSubscribers(d.subscribers ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  async function handleSend() {
    if (!subject.trim() || !body.trim()) {
      setBroadcastError('Subject and message are required.')
      return
    }
    if (!confirm(`Send this email to all ${subscribers.length} subscriber${subscribers.length !== 1 ? 's' : ''}?`)) return

    setSending(true)
    setBroadcastError('')
    setResult(null)

    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body, imageUrl, ctaText, ctaUrl }),
      })
      const data = await res.json()
      if (!res.ok) {
        setBroadcastError(data.error ?? 'Send failed. Please try again.')
      } else {
        setResult(data)
        setSubject('')
        setBody('')
        setImageUrl('')
      }
    } catch {
      setBroadcastError('Something went wrong. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,248,240,0.05)',
    border: `1px solid ${D.border}`,
    borderRadius: '10px',
    padding: '12px 16px',
    fontSize: '14px',
    color: D.text,
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <p style={{ margin: '0 0 2px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C4622D' }}>
            Email List
          </p>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: D.text }}>Subscribers</h2>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: '12px', padding: '12px 20px', textAlign: 'center' }}>
            <p style={{ margin: '0 0 1px', fontSize: '22px', fontWeight: 700, color: '#C4622D' }}>{subscribers.length}</p>
            <p style={{ margin: 0, fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: D.muted }}>Subscribers</p>
          </div>
          <button
            onClick={() => { setView(view === 'list' ? 'compose' : 'list'); setResult(null); setBroadcastError('') }}
            style={{
              background: view === 'compose' ? 'rgba(255,248,240,0.08)' : '#C4622D',
              color: D.text,
              border: 'none',
              borderRadius: '10px',
              padding: '12px 20px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: '0.03em',
            }}
          >
            {view === 'compose' ? 'View List' : 'Send Email'}
          </button>
        </div>
      </div>

      {/* ── COMPOSE VIEW ─────────────────────────────── */}
      {view === 'compose' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {result ? (
            <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: 700, color: '#22C55E' }}>Sent.</p>
              <p style={{ margin: 0, fontSize: '14px', color: D.muted }}>
                {result.sent} email{result.sent !== 1 ? 's' : ''} delivered
                {result.failed > 0 ? `, ${result.failed} failed` : ''} out of {result.total} subscriber{result.total !== 1 ? 's' : ''}.
              </p>
              <button
                onClick={() => setResult(null)}
                style={{ marginTop: '20px', background: D.card, border: `1px solid ${D.border}`, borderRadius: '8px', padding: '10px 20px', fontSize: '13px', color: D.muted, cursor: 'pointer' }}
              >
                Send Another
              </button>
            </div>
          ) : (
            <>
              <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: D.muted, marginBottom: '8px' }}>
                    Subject Line
                  </label>
                  <input
                    type="text"
                    placeholder="New on the menu: Tsofi Tray"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: D.muted, marginBottom: '8px' }}>
                    Menu Image URL <span style={{ color: 'rgba(255,248,240,0.25)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional — paste a link to your food photo)</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                    style={inputStyle}
                  />
                  {imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt="preview" style={{ marginTop: '10px', width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px', opacity: 0.85 }} onError={e => { e.currentTarget.style.display = 'none' }} />
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: D.muted, marginBottom: '8px' }}>
                    Message
                  </label>
                  <textarea
                    placeholder={`Hey, we just added a new dish to the menu — Tsofi Tray. Slow-cooked Ghanaian snail stew, served on a tray big enough for 10–15 guests. Perfect for funerals, naming ceremonies, and big family events.\n\nOrder yours before slots fill up.`}
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    rows={6}
                    style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.7 }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: D.muted, marginBottom: '8px' }}>
                      Button Text
                    </label>
                    <input
                      type="text"
                      value={ctaText}
                      onChange={e => setCtaText(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: D.muted, marginBottom: '8px' }}>
                      Button Link
                    </label>
                    <input
                      type="url"
                      value={ctaUrl}
                      onChange={e => setCtaUrl(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>

              {broadcastError && (
                <p style={{ fontSize: '13px', color: 'rgba(255,100,100,0.85)', margin: 0 }}>{broadcastError}</p>
              )}

              <button
                onClick={handleSend}
                disabled={sending || subscribers.length === 0}
                style={{
                  background: sending ? 'rgba(196,98,45,0.5)' : '#C4622D',
                  color: D.text,
                  border: 'none',
                  borderRadius: '12px',
                  padding: '16px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: sending || subscribers.length === 0 ? 'not-allowed' : 'pointer',
                  letterSpacing: '0.03em',
                  transition: 'background 0.2s',
                }}
              >
                {sending
                  ? `Sending to ${subscribers.length} subscriber${subscribers.length !== 1 ? 's' : ''}...`
                  : `Send to ${subscribers.length} subscriber${subscribers.length !== 1 ? 's' : ''}`}
              </button>

              <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,248,240,0.25)', textAlign: 'center' }}>
                Emails send one at a time. For large lists this may take a minute.
              </p>
            </>
          )}
        </div>
      )}

      {/* ── LIST VIEW ────────────────────────────────── */}
      {view === 'list' && (
        <>
          {loading ? (
            <p style={{ color: D.muted, fontSize: '14px' }}>Loading...</p>
          ) : subscribers.length === 0 ? (
            <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: '16px', padding: '48px', textAlign: 'center' }}>
              <p style={{ color: D.muted, fontSize: '15px', margin: 0 }}>No subscribers yet. Share the homepage to get sign-ups.</p>
            </div>
          ) : (
            <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: '16px', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 120px', gap: '0 16px', padding: '12px 24px', borderBottom: `1px solid ${D.border}`, fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: D.muted }}>
                <span>Email</span>
                <span>Code</span>
                <span>Signed Up</span>
              </div>
              {subscribers.map((sub, i) => (
                <div key={sub.customer_email} style={{ display: 'grid', gridTemplateColumns: '1fr 160px 120px', gap: '0 16px', padding: '16px 24px', borderBottom: i < subscribers.length - 1 ? `1px solid ${D.border}` : 'none', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', color: D.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.customer_email}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 700, color: '#C4622D', background: 'rgba(196,98,45,0.1)', borderRadius: '6px', padding: '4px 8px', display: 'inline-block' }}>{sub.code}</span>
                  <span style={{ fontSize: '12px', color: D.muted }}>{sub.created_at ? formatDate(sub.created_at) : '—'}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
