'use client'

import { useState, useEffect, useMemo } from 'react'
import { formatCurrency } from '@/lib/utils'
import type { MockOrder } from '@/lib/mockData'

const D = {
  bg: '#0E0806', card: '#1A0F0A', border: 'rgba(255,255,255,0.07)',
  text: '#FFF8F0', muted: 'rgba(255,248,240,0.5)', faint: 'rgba(255,248,240,0.2)',
}

interface SentCode {
  code: string
  amount: number
  is_active: boolean
  customer_email: string
  created_at: string
  used: boolean
  used_at: string | null
  used_order_id: string | null
}

const GOOD_CUSTOMER_ORDERS = 2   // at least this many completed orders
const GOOD_CUSTOMER_SPEND  = 200 // OR at least this much total spent

const COMPLETED = new Set(['confirmed', 'delivered', 'reviewed', 'completed', 'ready'])

interface CustomerRow {
  email: string
  name: string
  orderCount: number
  completedCount: number
  totalSpent: number
  lastOrderDate: string
  isGood: boolean
}

export default function LoyaltyRewards({ orders }: { orders: MockOrder[] }) {
  const [sentCodes, setSentCodes] = useState<SentCode[]>([])
  const [loadingSent, setLoadingSent] = useState(true)
  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const [sending, setSending] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, { ok: boolean; msg: string }>>({})
  const [filterGood, setFilterGood] = useState(true)

  useEffect(() => {
    fetch('/api/admin/loyalty-codes')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.codes)) setSentCodes(d.codes) })
      .catch(() => {})
      .finally(() => setLoadingSent(false))
  }, [])

  const customers = useMemo<CustomerRow[]>(() => {
    const map = new Map<string, CustomerRow>()
    for (const order of orders) {
      const email = order.customerEmail?.toLowerCase()
      if (!email) continue
      const existing = map.get(email)
      const isCompleted = COMPLETED.has(order.status ?? '')
      if (existing) {
        existing.orderCount++
        existing.totalSpent += order.total
        if (isCompleted) existing.completedCount++
        if (order.createdAt > existing.lastOrderDate) {
          existing.lastOrderDate = order.createdAt
          existing.name = order.customerName
        }
      } else {
        map.set(email, {
          email,
          name: order.customerName,
          orderCount: 1,
          completedCount: isCompleted ? 1 : 0,
          totalSpent: order.total,
          lastOrderDate: order.createdAt,
          isGood: false,
        })
      }
    }
    return Array.from(map.values())
      .map(c => ({
        ...c,
        isGood: c.completedCount >= GOOD_CUSTOMER_ORDERS || c.totalSpent >= GOOD_CUSTOMER_SPEND,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
  }, [orders])

  const displayed = filterGood ? customers.filter(c => c.isGood) : customers

  const getSentCode = (email: string) => sentCodes.find(s => s.customer_email === email)

  async function handleSend(customer: CustomerRow) {
    const amountStr = amounts[customer.email]?.trim()
    const amount = parseFloat(amountStr ?? '')
    if (!amountStr || isNaN(amount) || amount < 1) {
      setResults(r => ({ ...r, [customer.email]: { ok: false, msg: 'Enter a valid amount (min $1)' } }))
      return
    }

    setSending(customer.email)
    setResults(r => ({ ...r, [customer.email]: { ok: true, msg: '' } }))

    try {
      const res = await fetch('/api/admin/loyalty-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: customer.email,
          customerName: customer.name,
          amount,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setSentCodes(prev => [{
          code: data.code,
          amount,
          is_active: true,
          customer_email: customer.email,
          created_at: new Date().toISOString(),
          used: false,
          used_at: null,
          used_order_id: null,
        }, ...prev])
        setResults(r => ({ ...r, [customer.email]: { ok: true, msg: `Sent ${data.code} — ${formatCurrency(amount)} off` } }))
        setAmounts(a => ({ ...a, [customer.email]: '' }))
      } else {
        setResults(r => ({ ...r, [customer.email]: { ok: false, msg: data.error ?? 'Failed to send' } }))
      }
    } catch {
      setResults(r => ({ ...r, [customer.email]: { ok: false, msg: 'Network error. Try again.' } }))
    } finally {
      setSending(null)
    }
  }

  const goodCount = customers.filter(c => c.isGood).length

  return (
    <div>
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Unique customers', value: String(customers.length) },
          { label: 'Reward-eligible', value: String(goodCount), accent: goodCount > 0 },
          { label: 'Codes sent', value: String(sentCodes.length) },
        ].map(s => (
          <div key={s.label} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: '14px', padding: '20px' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: D.faint, marginBottom: '10px' }}>{s.label}</p>
            <p style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: '26px', fontWeight: 700, color: s.accent ? '#C4622D' : D.text, letterSpacing: '-0.02em', lineHeight: 1 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div style={{ background: 'rgba(196,98,45,0.06)', border: '1px solid rgba(196,98,45,0.15)', borderRadius: '14px', padding: '20px 24px', marginBottom: '24px' }}>
        <p style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C4622D', marginBottom: '10px' }}>How it works</p>
        <p style={{ fontSize: '13px', color: D.muted, lineHeight: 1.75, margin: 0 }}>
          Each customer gets a unique, single-use code tied exclusively to their email address — no one else can redeem it. The code is emailed to them automatically the moment you click Send. Reward-eligible customers have placed {GOOD_CUSTOMER_ORDERS}+ completed orders or spent {formatCurrency(GOOD_CUSTOMER_SPEND)}+.
        </p>
      </div>

      {/* Filter toggle */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {[
          { label: `Reward-eligible (${goodCount})`, value: true },
          { label: `All customers (${customers.length})`, value: false },
        ].map(opt => (
          <button
            key={String(opt.value)}
            onClick={() => setFilterGood(opt.value)}
            style={{
              fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
              padding: '8px 18px', borderRadius: '100px', cursor: 'pointer', border: 'none',
              background: filterGood === opt.value ? '#C4622D' : 'transparent',
              color: filterGood === opt.value ? '#FFF8F0' : D.muted,
              outline: `1px solid ${filterGood === opt.value ? '#C4622D' : D.border}`,
              transition: 'all 0.18s',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Customer list */}
      {displayed.length === 0 ? (
        <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: '16px', padding: '48px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: D.muted }}>
            {filterGood
              ? 'No customers meet the eligibility criteria yet. They need 2+ completed orders or $200+ spent.'
              : 'No customer order history found.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {displayed.map(customer => {
            const sent = getSentCode(customer.email)
            const result = results[customer.email]
            const isSending = sending === customer.email

            return (
              <div
                key={customer.email}
                style={{ background: D.card, border: `1px solid ${customer.isGood ? 'rgba(196,98,45,0.25)' : D.border}`, borderRadius: '16px', padding: '22px 24px' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>

                  {/* Customer info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                      <p style={{ fontSize: '15px', fontWeight: 700, color: D.text }}>{customer.name}</p>
                      {customer.isGood && (
                        <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'rgba(196,98,45,0.15)', color: '#C4622D', borderRadius: '100px', padding: '2px 10px' }}>
                          Eligible
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '12px', color: D.muted, marginBottom: '8px' }}>{customer.email}</p>
                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                      {[
                        { label: 'Orders', value: String(customer.orderCount) },
                        { label: 'Completed', value: String(customer.completedCount) },
                        { label: 'Total spent', value: formatCurrency(customer.totalSpent) },
                      ].map(stat => (
                        <div key={stat.label}>
                          <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: D.faint }}>{stat.label}</p>
                          <p style={{ fontSize: '14px', fontWeight: 700, color: D.text, marginTop: '2px' }}>{stat.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Send code section */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '260px', flexShrink: 0 }}>
                    {sent ? (
                      <div style={{
                        background: sent.used
                          ? 'rgba(96,165,250,0.06)'
                          : 'rgba(34,197,94,0.06)',
                        border: `1px solid ${sent.used ? 'rgba(96,165,250,0.2)' : 'rgba(34,197,94,0.2)'}`,
                        borderRadius: '12px', padding: '14px 16px',
                      }}>
                        {/* Status pill */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{
                            fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                            color: sent.used ? '#60A5FA' : '#22C55E',
                          }}>
                            {sent.used ? 'Redeemed' : 'Active — not yet used'}
                          </span>
                          {sent.used && sent.used_order_id && (
                            <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(96,165,250,0.7)', fontFamily: 'monospace' }}>
                              {sent.used_order_id}
                            </span>
                          )}
                        </div>

                        {/* Code */}
                        <p style={{
                          fontFamily: 'monospace', fontSize: '18px', fontWeight: 700,
                          color: sent.used ? 'rgba(255,248,240,0.35)' : '#22C55E',
                          letterSpacing: '0.08em', marginBottom: '6px',
                          textDecoration: sent.used ? 'line-through' : 'none',
                        }}>
                          {sent.code}
                        </p>

                        {/* Meta */}
                        <p style={{ fontSize: '11px', color: D.faint, lineHeight: 1.6 }}>
                          {formatCurrency(sent.amount)} off
                          {' · '}sent {new Date(sent.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          {sent.used && sent.used_at && (
                            <> · used {new Date(sent.used_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>
                          )}
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: D.muted, pointerEvents: 'none' }}>$</span>
                          <input
                            type="number"
                            min="1"
                            max="200"
                            step="1"
                            value={amounts[customer.email] ?? ''}
                            onChange={e => setAmounts(a => ({ ...a, [customer.email]: e.target.value }))}
                            placeholder="Amount off"
                            aria-label={`Discount amount for ${customer.name}`}
                            style={{
                              width: '100%', padding: '11px 12px 11px 24px',
                              border: `1px solid ${D.border}`, borderRadius: '10px',
                              fontSize: '14px', fontWeight: 700,
                              color: D.text, background: 'rgba(255,255,255,0.05)',
                              outline: 'none',
                              boxSizing: 'border-box',
                            }}
                          />
                        </div>
                        <button
                          onClick={() => handleSend(customer)}
                          disabled={isSending}
                          style={{
                            fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em',
                            padding: '11px 20px', borderRadius: '10px', border: 'none',
                            background: isSending ? 'rgba(196,98,45,0.4)' : '#C4622D',
                            color: '#FFF8F0', cursor: isSending ? 'not-allowed' : 'pointer',
                            whiteSpace: 'nowrap',
                            display: 'flex', alignItems: 'center', gap: '6px',
                            transition: 'all 0.15s',
                          }}
                        >
                          {isSending ? (
                            <>
                              <svg style={{ animation: 'spin 1s linear infinite' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                                <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
                              </svg>
                              Sending
                            </>
                          ) : 'Send reward'}
                        </button>
                      </div>
                    )}

                    {result?.msg && (
                      <p style={{ fontSize: '12px', color: result.ok ? '#22C55E' : '#EF4444', lineHeight: 1.4 }}>
                        {result.msg}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
