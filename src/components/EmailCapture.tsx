'use client'

import { useState } from 'react'

export default function EmailCapture() {
  const [email, setEmail]       = useState('')
  const [phone, setPhone]       = useState('')
  const [smsOptIn, setSmsOptIn] = useState(false)
  const [status, setStatus]     = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          phone: smsOptIn && phone.trim() ? phone.trim() : undefined,
          smsOptIn,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus('error')
        setErrorMsg(data.error ?? 'Something went wrong. Please try again.')
        return
      }
      setStatus('success')
    } catch {
      setStatus('error')
      setErrorMsg('Something went wrong. Please try again.')
    }
  }

  return (
    <section style={{
      background: '#1A0F0A',
      padding: '96px 0',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div aria-hidden="true" style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '600px', height: '600px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(196,98,45,0.09) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      <div className="wrap" style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: '540px', margin: '0 auto', textAlign: 'center' }}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', marginBottom: '28px' }}>
            <div style={{ width: '28px', height: '1px', background: 'rgba(196,98,45,0.6)' }} />
            <span className="label-upper" style={{ color: '#C4622D' }}>Join the list</span>
            <div style={{ width: '28px', height: '1px', background: 'rgba(196,98,45,0.6)' }} />
          </div>

          <h2 style={{
            fontFamily: 'var(--font-playfair), Georgia, serif',
            fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
            fontWeight: 700, lineHeight: 1.1,
            color: '#FFF8F0', marginBottom: '16px',
            letterSpacing: '-0.02em',
          }}>
            Be first to know about<br />new dishes and seasonal menus.
          </h2>

          <p style={{ fontSize: '15px', lineHeight: 1.75, color: 'rgba(255,248,240,0.5)', marginBottom: '40px' }}>
            Sign up and get{' '}
            <span style={{ color: '#C4622D', fontWeight: 700 }}>$5 off</span>
            {' '}your next order. No spam, just real Ghanaian food news.
          </p>

          {status === 'success' ? (
            <div style={{
              background: 'rgba(196,98,45,0.12)',
              border: '1px solid rgba(196,98,45,0.35)',
              borderRadius: '16px', padding: '32px',
            }}>
              <p style={{ fontSize: '20px', fontWeight: 700, color: '#FFF8F0', marginBottom: '10px', fontFamily: 'var(--font-playfair), Georgia, serif' }}>
                Check your inbox.
              </p>
              <p style={{ fontSize: '14px', color: 'rgba(255,248,240,0.6)', margin: 0, lineHeight: 1.7 }}>
                Your <span style={{ color: '#C4622D', fontWeight: 700 }}>$5 off</span> discount code has been sent to{' '}
                <span style={{ color: 'rgba(255,248,240,0.85)' }}>{email}</span>.
                {smsOptIn && phone && ' You\'ll also get text updates.'}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>

              {/* Email + button row */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
                <input
                  type="email"
                  required
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={status === 'loading'}
                  style={{
                    flex: '1 1 220px', maxWidth: '300px',
                    background: 'rgba(255,248,240,0.06)',
                    border: '1px solid rgba(255,248,240,0.14)',
                    borderRadius: '100px', padding: '15px 22px',
                    fontSize: '14px', color: '#FFF8F0', outline: 'none',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(196,98,45,0.6)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,248,240,0.14)' }}
                />
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  style={{
                    background: '#C4622D', color: '#FFF8F0',
                    border: 'none', borderRadius: '100px',
                    padding: '15px 30px', fontSize: '13px',
                    fontWeight: 700, letterSpacing: '0.04em',
                    cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                    opacity: status === 'loading' ? 0.7 : 1,
                    whiteSpace: 'nowrap',
                    boxShadow: '0 6px 28px rgba(196,98,45,0.32)',
                  }}
                >
                  {status === 'loading' ? 'Sending...' : 'Claim $5 Off'}
                </button>
              </div>

              {/* SMS opt-in */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setSmsOptIn(v => !v)}>
                <div style={{
                  width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0,
                  border: `1.5px solid ${smsOptIn ? '#C4622D' : 'rgba(255,248,240,0.2)'}`,
                  background: smsOptIn ? '#C4622D' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}>
                  {smsOptIn && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFF8F0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </div>
                <span style={{ fontSize: '13px', color: 'rgba(255,248,240,0.5)', userSelect: 'none' }}>
                  Also text me deals and new menu drops
                </span>
              </div>

              {/* Phone field — only shown if SMS opted in */}
              {smsOptIn && (
                <input
                  type="tel"
                  placeholder="(617) 555-0000"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  disabled={status === 'loading'}
                  style={{
                    width: '100%', maxWidth: '340px',
                    background: 'rgba(255,248,240,0.06)',
                    border: '1px solid rgba(196,98,45,0.4)',
                    borderRadius: '100px', padding: '13px 22px',
                    fontSize: '14px', color: '#FFF8F0', outline: 'none',
                    boxSizing: 'border-box',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(196,98,45,0.8)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(196,98,45,0.4)' }}
                />
              )}

              {smsOptIn && (
                <p style={{ fontSize: '11px', color: 'rgba(255,248,240,0.25)', margin: 0 }}>
                  By checking this box you agree to receive marketing texts from Edziban. Message & data rates may apply.
                </p>
              )}

              {status === 'error' && (
                <p style={{ fontSize: '13px', color: 'rgba(255,100,100,0.85)', margin: 0 }}>{errorMsg}</p>
              )}
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
