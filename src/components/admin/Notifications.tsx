'use client'

import { useState, useEffect, useCallback } from 'react'

const D = {
  card: '#1A0F0A', border: 'rgba(255,255,255,0.07)',
  text: '#FFF8F0', muted: 'rgba(255,248,240,0.5)', faint: 'rgba(255,248,240,0.2)',
}

interface NotifLog {
  order_id: string
  type: 'email' | 'sms' | 'whatsapp'
  recipient: string
  to_address: string
  subject: string
  success: boolean
  provider: string
  created_at: string
}

const TYPE_COLORS: Record<string, string> = {
  email:    '#C084FC',
  sms:      '#60A5FA',
  whatsapp: '#4ADE80',
}

export default function Notifications() {
  const [logs, setLogs] = useState<NotifLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'email' | 'sms'>('all')

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/admin/notification-logs?limit=100')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.logs)) setLogs(d.logs) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const displayed = filter === 'all' ? logs : logs.filter(l => l.type === filter)

  const successCount = logs.filter(l => l.success).length
  const failCount    = logs.filter(l => !l.success).length

  function fmt(dateStr: string) {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total sent', value: String(logs.length) },
          { label: 'Delivered', value: String(successCount), accent: '#22C55E' },
          { label: 'Failed', value: String(failCount), accent: failCount > 0 ? '#EF4444' : undefined },
        ].map(s => (
          <div key={s.label} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: '14px', padding: '20px' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: D.faint, marginBottom: '10px' }}>{s.label}</p>
            <p style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: '26px', fontWeight: 700, color: s.accent ?? D.text, lineHeight: 1 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter + Refresh */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['all', 'email', 'sms'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                padding: '7px 16px', borderRadius: '100px', cursor: 'pointer', border: 'none',
                background: filter === f ? '#C4622D' : 'transparent',
                color: filter === f ? '#FFF8F0' : D.muted,
                outline: `1px solid ${filter === f ? '#C4622D' : D.border}`,
                transition: 'all 0.15s',
              }}
            >
              {f === 'all' ? `All (${logs.length})` : f === 'email' ? `Email (${logs.filter(l => l.type === 'email').length})` : `SMS (${logs.filter(l => l.type === 'sms').length})`}
            </button>
          ))}
        </div>
        <button
          onClick={load}
          style={{
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', padding: '7px 16px',
            borderRadius: '100px', cursor: 'pointer', border: 'none',
            background: 'transparent', color: D.muted,
            outline: `1px solid ${D.border}`,
          }}
        >
          Refresh
        </button>
      </div>

      {/* Log list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: D.muted, fontSize: '14px' }}>Loading…</div>
      ) : displayed.length === 0 ? (
        <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: '16px', padding: '48px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: D.muted }}>No notifications yet. They will appear here whenever an order email or SMS is sent.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {displayed.map((log, i) => (
            <div
              key={i}
              style={{
                background: D.card,
                border: `1px solid ${log.success ? D.border : 'rgba(239,68,68,0.2)'}`,
                borderRadius: '12px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                flexWrap: 'wrap',
              }}
            >
              {/* Type badge */}
              <span style={{
                fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: TYPE_COLORS[log.type] ?? D.muted,
                background: `${TYPE_COLORS[log.type]}18`,
                padding: '3px 10px', borderRadius: '100px', flexShrink: 0,
              }}>
                {log.type}
              </span>

              {/* Subject / content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: D.text, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {log.subject || log.to_address}
                </p>
                <p style={{ fontSize: '11px', color: D.faint, margin: '2px 0 0' }}>
                  {log.recipient} · {log.to_address} · {log.provider}
                </p>
              </div>

              {/* Order ID */}
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#C4622D', fontFamily: 'monospace', flexShrink: 0 }}>
                {log.order_id}
              </span>

              {/* Timestamp */}
              <span style={{ fontSize: '11px', color: D.faint, flexShrink: 0, whiteSpace: 'nowrap' }}>
                {fmt(log.created_at)}
              </span>

              {/* Status dot */}
              <span style={{
                width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                background: log.success ? '#22C55E' : '#EF4444',
              }} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
