'use client'

import { useEffect, useState } from 'react'

const D = { bg: '#0E0806', card: '#1A0F0A', border: 'rgba(255,255,255,0.07)', text: '#FFF8F0', muted: 'rgba(255,248,240,0.5)', faint: 'rgba(255,248,240,0.2)' }

interface Subscriber {
  customer_email: string
  code: string
  created_at: string
}

export default function Subscribers() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [loading, setLoading] = useState(true)

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

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <p style={{ margin: '0 0 2px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C4622D' }}>
            Email List
          </p>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: D.text }}>
            Subscribers
          </h2>
        </div>
        <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: '12px', padding: '14px 24px', textAlign: 'center' }}>
          <p style={{ margin: '0 0 2px', fontSize: '28px', fontWeight: 700, color: '#C4622D' }}>{subscribers.length}</p>
          <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: D.muted }}>Total</p>
        </div>
      </div>

      {loading ? (
        <p style={{ color: D.muted, fontSize: '14px' }}>Loading...</p>
      ) : subscribers.length === 0 ? (
        <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: '16px', padding: '48px', textAlign: 'center' }}>
          <p style={{ color: D.muted, fontSize: '15px', margin: 0 }}>No subscribers yet. Share the homepage and get people to sign up.</p>
        </div>
      ) : (
        <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: '16px', overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 160px 120px',
            gap: '0 16px',
            padding: '12px 24px',
            borderBottom: `1px solid ${D.border}`,
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: D.muted,
          }}>
            <span>Email</span>
            <span>Discount Code</span>
            <span>Signed Up</span>
          </div>

          {/* Rows */}
          {subscribers.map((sub, i) => (
            <div
              key={sub.customer_email}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 160px 120px',
                gap: '0 16px',
                padding: '16px 24px',
                borderBottom: i < subscribers.length - 1 ? `1px solid ${D.border}` : 'none',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '14px', color: D.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {sub.customer_email}
              </span>
              <span style={{
                fontFamily: 'monospace',
                fontSize: '12px',
                fontWeight: 700,
                color: '#C4622D',
                background: 'rgba(196,98,45,0.1)',
                borderRadius: '6px',
                padding: '4px 8px',
                display: 'inline-block',
              }}>
                {sub.code}
              </span>
              <span style={{ fontSize: '12px', color: D.muted }}>
                {sub.created_at ? formatDate(sub.created_at) : '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
