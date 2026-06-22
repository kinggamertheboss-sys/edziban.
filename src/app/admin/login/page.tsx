'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (res.ok) {
        // Cookie is set server-side (httpOnly) — no sessionStorage needed
        router.push('/admin/dashboard')
      } else {
        const data = await res.json()
        if (res.status === 429) {
          setError('Too many attempts. Please wait a few minutes.')
        } else {
          setError(data.error ?? 'Wrong email or password.')
        }
      }
    } catch {
      setError('Could not reach server. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-grid">

      {/* Left: brand panel */}
      <div aria-hidden="true" className="auth-brand" style={{ background: '#0E0806' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '480px', height: '480px', borderRadius: '50%', border: '1px solid rgba(196,98,45,0.08)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '340px', height: '340px', borderRadius: '50%', border: '1px solid rgba(196,98,45,0.12)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(to top, rgba(196,98,45,0.1), transparent)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', position: 'relative', zIndex: 1 }}>
          <div style={{
            fontFamily: 'var(--font-playfair), Georgia, serif',
            fontSize: '180px', fontWeight: 700,
            color: '#C4622D', lineHeight: 1,
            letterSpacing: '-0.05em',
          }}>E</div>
          <div style={{
            fontFamily: 'var(--font-cormorant), var(--font-playfair), Georgia, serif',
            fontSize: '16px', fontStyle: 'italic',
            color: 'rgba(255,248,240,0.45)',
            letterSpacing: '0.03em',
          }}>
            &ldquo;edziban a dzidzi&rdquo;
          </div>
        </div>

      </div>

      {/* Right: form */}
      <main id="main-content" style={{ background: '#FFF8F0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 40px' }}>
        <div style={{ width: '100%', maxWidth: '360px' }}>

          <div style={{ marginBottom: '40px', textAlign: 'center' }}>
            <Image
              src="/full_logo_name.png"
              alt="Edziban"
              width={240}
              height={75}
              className="w-auto object-contain mx-auto mb-3"
              style={{ mixBlendMode: 'multiply', height: '64px' }}
            />
            <p className="label-upper" style={{ color: '#C4622D' }}>Admin Portal</p>
          </div>

          <h1 style={{
            fontFamily: 'var(--font-playfair), Georgia, serif',
            fontSize: '28px', fontWeight: 700,
            color: '#1A0F0A', marginBottom: '6px',
            letterSpacing: '-0.02em',
          }}>Sign in</h1>
          <p style={{ fontSize: '14px', color: '#6B4C3B', marginBottom: '32px', lineHeight: 1.6 }}>
            Manage orders, revenue, and suppliers.
          </p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label htmlFor="admin-email" style={{ fontSize: '13px', fontWeight: 600, color: '#1A0F0A' }}>Email</label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email address"
                className="field"
                required
                autoComplete="email"
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label htmlFor="admin-password" style={{ fontSize: '13px', fontWeight: 600, color: '#1A0F0A' }}>Password</label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="field"
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div role="alert" style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: '#dc2626' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '4px',
                width: '100%', background: '#C4622D', color: '#FFF8F0',
                border: 'none', fontWeight: 700, fontSize: '14px',
                letterSpacing: '0.04em', padding: '16px',
                borderRadius: '100px', cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                boxShadow: loading ? 'none' : '0 6px 24px rgba(196,98,45,0.3)',
                transition: 'all 0.2s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              }}
            >
              {loading ? (
                <>
                  <svg style={{ animation: 'spin 1s linear infinite' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
                  </svg>
                  Signing in...
                </>
              ) : 'Sign in'}
            </button>
          </form>

          <div style={{ marginTop: '32px', textAlign: 'center' }}>
            <Link href="/" style={{ fontSize: '12px', color: '#6B4C3B', textDecoration: 'none' }}>
              Back to Edziban
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
