'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ZohoMessage, ZohoMessageContent } from '@/lib/zohoMail'

const D = {
  bg: '#0E0806', card: '#1A0F0A', border: 'rgba(255,255,255,0.07)',
  text: '#FFF8F0', muted: 'rgba(255,248,240,0.5)', faint: 'rgba(255,248,240,0.2)',
}

function formatDate(receivedTime: string): string {
  const ms = parseInt(receivedTime, 10)
  if (isNaN(ms)) return ''
  const d = new Date(ms)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function senderName(from: string): string {
  const match = from.match(/^"?([^"<]+)"?\s*</)
  return match ? match[1].trim() : from.split('@')[0]
}

export default function Inbox() {
  const [emails, setEmails] = useState<ZohoMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [emailContent, setEmailContent] = useState<Record<string, ZohoMessageContent>>({})
  const [contentLoading, setContentLoading] = useState<string | null>(null)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [notConfigured, setNotConfigured] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const fetchEmails = useCallback(async (start: number, replace: boolean) => {
    try {
      const r = await fetch(`/api/admin/inbox?start=${start}`)
      if (r.status === 503) { setNotConfigured(true); setLoading(false); return }
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data = await r.json()
      const list: ZohoMessage[] = data.emails ?? []
      if (replace) {
        setEmails(list)
      } else {
        setEmails(prev => [...prev, ...list])
      }
      setHasMore(list.length === 20)
    } catch (e) {
      setError('Could not load inbox. Check your network or Zoho credentials.')
      console.error('[INBOX]', e)
    } finally {
      setLoading(false)
      setLoadingMore(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { fetchEmails(0, true) }, [fetchEmails])

  async function openEmail(msg: ZohoMessage) {
    const id = msg.messageId
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    setReadIds(prev => new Set(prev).add(id))

    if (emailContent[id]) return

    setContentLoading(id)
    try {
      const r = await fetch(`/api/admin/inbox/${id}?folderId=${encodeURIComponent(msg.folderId)}`)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data = await r.json()
      setEmailContent(prev => ({ ...prev, [id]: data.email }))
    } catch (e) {
      console.error('[INBOX] content fetch failed:', e)
    } finally {
      setContentLoading(null)
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    setPage(0)
    setHasMore(true)
    await fetchEmails(0, true)
  }

  async function handleLoadMore() {
    const next = page + 1
    setPage(next)
    setLoadingMore(true)
    await fetchEmails(next * 20, false)
  }

  const unreadCount = emails.filter(e => e.status === '0' && !readIds.has(e.messageId)).length

  if (notConfigured) {
    return (
      <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: '16px', padding: '48px 40px', textAlign: 'center' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(196,98,45,0.12)', border: '1px solid rgba(196,98,45,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C4622D" strokeWidth="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        </div>
        <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '20px', fontWeight: 700, color: D.text, marginBottom: '10px' }}>Zoho Mail not connected</h3>
        <p style={{ fontSize: '14px', color: D.muted, lineHeight: 1.7, maxWidth: '440px', margin: '0 auto 28px' }}>
          Add your Zoho Mail credentials to your Vercel environment variables to enable the inbox here.
        </p>
        <div style={{ background: 'rgba(196,98,45,0.06)', border: '1px solid rgba(196,98,45,0.15)', borderRadius: '12px', padding: '20px 24px', textAlign: 'left', maxWidth: '440px', margin: '0 auto 28px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: D.faint, marginBottom: '12px' }}>Env vars to add in Vercel</p>
          {['ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET', 'ZOHO_REFRESH_TOKEN'].map(v => (
            <div key={v} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontFamily: 'monospace', fontSize: '13px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', padding: '3px 10px', color: '#C4622D' }}>{v}</span>
            </div>
          ))}
        </div>
        <a
          href="https://api-console.zoho.com/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.04em', padding: '12px 24px', borderRadius: '100px', textDecoration: 'none', background: '#C4622D', color: '#FFF8F0', display: 'inline-block', boxShadow: '0 4px 16px rgba(196,98,45,0.3)' }}
        >
          Open Zoho API Console
        </a>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: '14px', padding: '18px 22px', display: 'flex', gap: '14px', alignItems: 'center' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: D.border, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ height: '13px', width: `${60 + (i % 3) * 15}%`, background: D.border, borderRadius: '4px', marginBottom: '8px' }} />
              <div style={{ height: '11px', width: `${40 + (i % 4) * 10}%`, background: D.border, borderRadius: '4px' }} />
            </div>
            <div style={{ height: '11px', width: '40px', background: D.border, borderRadius: '4px', flexShrink: 0 }} />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: '16px', padding: '40px', textAlign: 'center' }}>
        <p style={{ fontSize: '14px', color: '#EF4444', marginBottom: '16px' }}>{error}</p>
        <button onClick={handleRefresh} style={{ fontSize: '13px', fontWeight: 700, padding: '10px 22px', borderRadius: '100px', border: `1px solid ${D.border}`, background: 'transparent', color: D.muted, cursor: 'pointer' }}>
          Try again
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Inbox header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '18px', fontWeight: 700, color: D.text }}>Inbox</h2>
          {unreadCount > 0 && (
            <span style={{ fontSize: '11px', fontWeight: 700, background: 'rgba(196,98,45,0.2)', color: '#C4622D', borderRadius: '100px', padding: '2px 10px' }}>
              {unreadCount} unread
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <a
            href="https://mail.zoho.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em', padding: '8px 18px', borderRadius: '100px', textDecoration: 'none', border: `1px solid ${D.border}`, color: D.muted }}
          >
            Open Zoho Mail
          </a>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em', padding: '8px 18px', borderRadius: '100px', border: `1px solid ${D.border}`, background: 'transparent', color: D.muted, cursor: refreshing ? 'not-allowed' : 'pointer', opacity: refreshing ? 0.6 : 1 }}
          >
            {refreshing ? (
              <svg style={{ animation: 'spin 1s linear infinite' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" strokeOpacity="0.8"/>
                <circle cx="12" cy="12" r="10" strokeOpacity="0.2"/>
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            )}
            Refresh
          </button>
        </div>
      </div>

      {emails.length === 0 ? (
        <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: '16px', padding: '48px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: D.muted }}>Your inbox is empty.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {emails.map(msg => {
            const isRead = msg.status === '1' || readIds.has(msg.messageId)
            const isOpen = expanded === msg.messageId
            const content = emailContent[msg.messageId]
            const isLoadingContent = contentLoading === msg.messageId

            return (
              <div key={msg.messageId} style={{ background: D.card, border: `1px solid ${isOpen ? 'rgba(196,98,45,0.3)' : D.border}`, borderRadius: '14px', overflow: 'hidden', transition: 'border-color 0.2s' }}>

                {/* Email row */}
                <button
                  onClick={() => openEmail(msg)}
                  style={{ width: '100%', textAlign: 'left', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px', background: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  {/* Unread dot */}
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0, background: isRead ? 'transparent' : '#C4622D', border: isRead ? `1.5px solid ${D.border}` : 'none', transition: 'background 0.2s' }} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13.5px', fontWeight: isRead ? 500 : 700, color: D.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {senderName(msg.fromAddress)}
                      </span>
                      <span style={{ fontSize: '11px', color: D.faint, flexShrink: 0 }}>{formatDate(msg.receivedTime)}</span>
                    </div>
                    <p style={{ fontSize: '13px', fontWeight: isRead ? 400 : 600, color: isRead ? D.muted : D.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '3px' }}>
                      {msg.subject || '(no subject)'}
                    </p>
                    {msg.summary && (
                      <p style={{ fontSize: '12px', color: D.faint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {msg.summary}
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {msg.hasAttachment === '1' && (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={D.faint} strokeWidth="2" strokeLinecap="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                    )}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={D.faint} strokeWidth="2" strokeLinecap="round" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                </button>

                {/* Email content */}
                {isOpen && (
                  <div style={{ borderTop: `1px solid ${D.border}`, padding: '24px 24px 20px' }}>
                    {isLoadingContent ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: D.faint, fontSize: '13px' }}>
                        <svg style={{ animation: 'spin 1s linear infinite' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
                          <circle cx="12" cy="12" r="10" strokeOpacity="0.2"/>
                        </svg>
                        Loading email...
                      </div>
                    ) : content ? (
                      <>
                        {/* Meta */}
                        <div style={{ marginBottom: '20px', padding: '14px 18px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: `1px solid ${D.border}` }}>
                          {[
                            { l: 'From', v: content.fromAddress },
                            { l: 'To', v: content.toAddress },
                            { l: 'Date', v: formatDate(content.receivedTime) },
                          ].map(row => (
                            <div key={row.l} style={{ display: 'flex', gap: '12px', fontSize: '12.5px', marginBottom: '6px' }}>
                              <span style={{ width: '38px', flexShrink: 0, color: D.faint }}>{row.l}</span>
                              <span style={{ color: D.muted, wordBreak: 'break-all' }}>{row.v}</span>
                            </div>
                          ))}
                        </div>

                        {/* Body */}
                        {content.htmlBody ? (
                          <iframe
                            srcDoc={content.htmlBody}
                            sandbox="allow-same-origin"
                            style={{ width: '100%', minHeight: '320px', border: 'none', borderRadius: '10px', background: '#fff' }}
                            onLoad={e => {
                              const frame = e.currentTarget
                              try {
                                const h = frame.contentDocument?.documentElement?.scrollHeight ?? 320
                                frame.style.height = `${Math.max(320, h + 24)}px`
                              } catch { /* cross-origin */ }
                            }}
                          />
                        ) : (
                          <div style={{ fontSize: '14px', color: D.muted, lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {content.content || '(empty)'}
                          </div>
                        )}

                        {/* Reply link */}
                        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: `1px solid ${D.border}`, display: 'flex', justifyContent: 'flex-end' }}>
                          <a
                            href={`https://mail.zoho.com/zm/#mail/folder/inbox`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em', padding: '9px 20px', borderRadius: '100px', textDecoration: 'none', background: '#C4622D', color: '#FFF8F0', boxShadow: '0 4px 14px rgba(196,98,45,0.3)' }}
                          >
                            Reply in Zoho Mail
                          </a>
                        </div>
                      </>
                    ) : (
                      <p style={{ fontSize: '13px', color: '#EF4444' }}>Failed to load email content.</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Load more */}
      {hasMore && emails.length > 0 && (
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '0.04em', padding: '11px 28px', borderRadius: '100px', border: `1px solid ${D.border}`, background: 'transparent', color: D.muted, cursor: loadingMore ? 'not-allowed' : 'pointer', opacity: loadingMore ? 0.6 : 1 }}
          >
            {loadingMore ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  )
}
