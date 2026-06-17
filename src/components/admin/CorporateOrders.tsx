'use client'

import { useState } from 'react'
import { type MockOrder } from '@/lib/mockData'
import { formatCurrency, getTimeLabel } from '@/lib/utils'

const D = { bg: '#0E0806', card: '#1A0F0A', border: 'rgba(255,255,255,0.07)', text: '#FFF8F0', muted: 'rgba(255,248,240,0.5)', faint: 'rgba(255,248,240,0.2)' }

function statusStyle(status: string) {
  const map: Record<string, { bg: string; color: string }> = {
    pending:           { bg: 'rgba(245,158,11,0.15)',  color: '#F59E0B' },
    confirmed:         { bg: 'rgba(96,165,250,0.15)',  color: '#60A5FA' },
    supplier_notified: { bg: 'rgba(168,85,247,0.15)',  color: '#C084FC' },
    ready:             { bg: 'rgba(74,222,128,0.15)',  color: '#4ADE80' },
    in_progress:       { bg: 'rgba(196,98,45,0.2)',    color: '#E07840' },
    delivered:         { bg: 'rgba(34,197,94,0.15)',   color: '#22C55E' },
    reviewed:          { bg: 'rgba(156,163,175,0.1)',  color: '#9CA3AF' },
    cancelled:         { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,248,240,0.3)' },
  }
  return map[status] ?? { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,248,240,0.4)' }
}

function getStatusLabel(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

interface InvoiceModalProps {
  order: MockOrder
  onClose: () => void
}

function InvoiceModal({ order, onClose }: InvoiceModalProps) {
  const invoiceNumber = `INV-${order.id}`
  const invoiceDate = new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const eventDate = new Date(order.requestedDate + 'T12:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '24px',
      overflowY: 'auto',
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '680px',
        overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
        margin: 'auto',
      }}>

        {/* Modal toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 24px',
          background: '#1A0F0A',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,248,240,0.7)', letterSpacing: '0.06em' }}>
            INVOICE PREVIEW
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => window.print()}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: '#C4622D', color: '#FFF8F0',
                border: 'none', borderRadius: '8px',
                padding: '8px 18px', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
              </svg>
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.08)', color: 'rgba(255,248,240,0.7)',
                border: 'none', borderRadius: '8px',
                padding: '8px 14px', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>

        {/* Invoice content */}
        <div id="invoice-content" style={{ padding: '48px', background: 'white', color: '#1A0F0A' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
            <div>
              <div style={{
                fontFamily: 'Georgia, serif',
                fontSize: '28px', fontWeight: 700,
                color: '#1A0F0A', letterSpacing: '-0.02em',
              }}>Edziban</div>
              <div style={{ fontSize: '12px', color: '#9E7A52', marginTop: '4px' }}>Ghanaian Catering · Greater Boston</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: '#C4622D', marginBottom: '6px',
              }}>Invoice</div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#1A0F0A' }}>{invoiceNumber}</div>
              <div style={{ fontSize: '12px', color: '#9E7A52', marginTop: '4px' }}>Date: {invoiceDate}</div>
            </div>
          </div>

          <div style={{ height: '2px', background: '#C4622D', marginBottom: '32px' }} />

          {/* Bill to + Payment status */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9E7A52', marginBottom: '10px' }}>Bill To</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#1A0F0A', marginBottom: '4px' }}>{order.orgName}</div>
              {order.contactPerson && <div style={{ fontSize: '13px', color: '#4A2E20' }}>{order.contactPerson}</div>}
              {order.billingEmail && <div style={{ fontSize: '13px', color: '#4A2E20' }}>{order.billingEmail}</div>}
              {order.poNumber && (
                <div style={{ fontSize: '12px', color: '#9E7A52', marginTop: '6px' }}>PO #: {order.poNumber}</div>
              )}
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: '100px', padding: '6px 14px',
            }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E' }} />
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#22C55E' }}>PAID</span>
            </div>
          </div>

          {/* Event info */}
          <div style={{
            background: '#FFF8F0', borderRadius: '10px',
            padding: '16px 20px', marginBottom: '32px',
            display: 'flex', gap: '32px', flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9E7A52', marginBottom: '2px' }}>Event Date</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#1A0F0A' }}>{eventDate} — {getTimeLabel(order.requestedTime)}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9E7A52', marginBottom: '2px' }}>Fulfillment</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#1A0F0A', textTransform: 'capitalize' }}>{order.fulfillmentType}</div>
            </div>
            {order.address && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9E7A52', marginBottom: '2px' }}>Delivery To</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1A0F0A' }}>{order.address}</div>
              </div>
            )}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9E7A52', marginBottom: '2px' }}>Guests</div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#1A0F0A' }}>{order.guestCount}</div>
            </div>
          </div>

          {/* Line items */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E2CEB8' }}>
                {['Item', 'Qty', 'Unit Price', 'Total'].map((h, i) => (
                  <th key={h} style={{
                    padding: '8px 0', textAlign: i === 0 ? 'left' : 'right',
                    fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em',
                    textTransform: 'uppercase', color: '#9E7A52',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #F0E4D0' }}>
                  <td style={{ padding: '12px 0', fontSize: '14px', color: '#1A0F0A', fontWeight: 500 }}>{item.name}</td>
                  <td style={{ padding: '12px 0', fontSize: '14px', color: '#4A2E20', textAlign: 'right' }}>{item.quantity}</td>
                  <td style={{ padding: '12px 0', fontSize: '14px', color: '#4A2E20', textAlign: 'right' }}>{formatCurrency(item.unitPrice)}</td>
                  <td style={{ padding: '12px 0', fontSize: '14px', fontWeight: 600, color: '#1A0F0A', textAlign: 'right' }}>{formatCurrency(item.unitPrice * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: '260px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'Subtotal', value: order.subtotal },
                ...(order.deliveryFee > 0 ? [{ label: 'Delivery fee', value: order.deliveryFee }] : []),
                { label: 'Service fee', value: order.serviceFee },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#6B4C3B' }}>{row.label}</span>
                  <span style={{ color: '#1A0F0A' }}>{formatCurrency(row.value)}</span>
                </div>
              ))}
              <div style={{ height: '1px', background: '#E2CEB8', margin: '4px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 700 }}>
                <span style={{ color: '#1A0F0A' }}>Total</span>
                <span style={{ color: '#C4622D' }}>{formatCurrency(order.total)}</span>
              </div>
              <div style={{ fontSize: '11px', color: '#9E7A52', textAlign: 'right', marginTop: '2px' }}>
                Paid via Square · {invoiceDate}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            marginTop: '48px', paddingTop: '24px',
            borderTop: '1px solid #E2CEB8',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', gap: '12px',
          }}>
            <div style={{ fontSize: '12px', color: '#9E7A52' }}>
              Thank you for your business.
            </div>
            <div style={{ fontSize: '12px', color: '#9E7A52' }}>
              Edziban · edziban.com
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body > *:not(#invoice-content) { display: none !important; }
          #invoice-content { padding: 0 !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  )
}

interface Props {
  orders: MockOrder[]
  orderStatuses: Record<string, string>
}

export default function CorporateOrders({ orders, orderStatuses }: Props) {
  const [invoiceOrder, setInvoiceOrder] = useState<MockOrder | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const corporateOrders = orders.filter(o => o.clientType === 'corporate')

  if (corporateOrders.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0', color: D.muted }}>
        <div style={{ fontSize: '32px', marginBottom: '16px' }}>🏢</div>
        <div style={{ fontSize: '16px', fontWeight: 600, color: D.text, marginBottom: '8px' }}>No corporate orders yet</div>
        <div style={{ fontSize: '14px' }}>Orders from the corporate &amp; student org form will appear here.</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div>
          <h2 style={{ color: D.text, fontSize: '18px', fontWeight: 700, margin: 0 }}>Corporate &amp; Student Org Orders</h2>
          <p style={{ color: D.muted, fontSize: '13px', marginTop: '4px' }}>{corporateOrders.length} order{corporateOrders.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {corporateOrders.map(order => {
        const status = orderStatuses[order.id] ?? order.status
        const ss = statusStyle(status)
        const isOpen = expanded === order.id

        return (
          <div key={order.id} style={{
            background: D.card,
            border: `1px solid ${D.border}`,
            borderRadius: '14px',
            overflow: 'hidden',
          }}>
            {/* Row header */}
            <div
              onClick={() => setExpanded(isOpen ? null : order.id)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '18px 20px', cursor: 'pointer', gap: '12px', flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: D.text }}>{order.orgName}</span>
                    <span style={{
                      fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em',
                      padding: '2px 8px', borderRadius: '100px',
                      background: order.eventType === 'Student Organization' ? 'rgba(96,165,250,0.15)' : 'rgba(196,98,45,0.15)',
                      color: order.eventType === 'Student Organization' ? '#60A5FA' : '#E07840',
                    }}>
                      {order.eventType === 'Student Organization' ? 'Student Org' : 'Corporate'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: D.muted }}>
                    {order.contactPerson} · {order.id} · {order.requestedDate}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {order.requestInvoice && (
                  <button
                    onClick={e => { e.stopPropagation(); setInvoiceOrder(order) }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      background: 'rgba(196,98,45,0.15)', color: '#E07840',
                      border: '1px solid rgba(196,98,45,0.3)',
                      borderRadius: '8px', padding: '6px 14px',
                      fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                    </svg>
                    Invoice
                  </button>
                )}
                <div style={{
                  fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em',
                  padding: '4px 10px', borderRadius: '100px',
                  background: ss.bg, color: ss.color,
                }}>
                  {getStatusLabel(status)}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: D.text }}>{formatCurrency(order.total)}</div>
                  <div style={{ fontSize: '11px', color: '#22C55E', fontWeight: 600, marginTop: '1px' }}>
                    your cut {formatCurrency(order.commission)}
                  </div>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={D.muted} strokeWidth="2" strokeLinecap="round" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </div>

            {/* Expanded detail */}
            {isOpen && (
              <div style={{ borderTop: `1px solid ${D.border}`, padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Org info */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '12px',
                }}>
                  {[
                    { label: 'Organization', value: order.orgName },
                    { label: 'Contact', value: order.contactPerson },
                    { label: 'Billing Email', value: order.billingEmail },
                    ...(order.poNumber ? [{ label: 'PO Number', value: order.poNumber }] : []),
                    { label: 'Phone', value: order.customerPhone },
                    { label: 'Guests', value: String(order.guestCount) },
                    { label: 'Fulfillment', value: order.fulfillmentType },
                    ...(order.address ? [{ label: 'Address', value: order.address }] : []),
                  ].map(item => (
                    <div key={item.label}>
                      <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: D.muted, marginBottom: '3px' }}>{item.label}</div>
                      <div style={{ fontSize: '13px', color: D.text }}>{item.value}</div>
                    </div>
                  ))}
                </div>

                {/* Items */}
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: D.muted, marginBottom: '8px' }}>Items</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {order.items.map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span style={{ color: D.text }}>{item.name} <span style={{ color: D.muted }}>× {item.quantity}</span></span>
                        <span style={{ color: D.text, fontWeight: 600 }}>{formatCurrency(item.unitPrice * item.quantity)}</span>
                      </div>
                    ))}
                    <div style={{ height: '1px', background: D.border, margin: '4px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: D.muted }}>
                      <span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span>
                    </div>
                    {order.deliveryFee > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: D.muted }}>
                        <span>Delivery</span><span>{formatCurrency(order.deliveryFee)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: D.muted }}>
                      <span>Service fee</span><span>{formatCurrency(order.serviceFee)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 700, color: D.text }}>
                      <span>Total</span><span style={{ color: '#C4622D' }}>{formatCurrency(order.total)}</span>
                    </div>
                    <div style={{ height: '1px', background: D.border, margin: '4px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700 }}>
                      <span style={{ color: '#22C55E' }}>Your commission</span>
                      <span style={{ color: '#22C55E' }}>{formatCurrency(order.commission)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: D.muted }}>
                      <span>Supplier payouts</span>
                      <span>{formatCurrency(order.supplierPayouts.reduce((s, p) => s + p.amount, 0))}</span>
                    </div>
                  </div>
                </div>

                {order.requestInvoice && (
                  <button
                    onClick={() => setInvoiceOrder(order)}
                    style={{
                      alignSelf: 'flex-start',
                      display: 'inline-flex', alignItems: 'center', gap: '8px',
                      background: '#C4622D', color: '#FFF8F0',
                      border: 'none', borderRadius: '10px',
                      padding: '10px 20px', fontSize: '13px', fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    </svg>
                    Generate Invoice
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}

      {invoiceOrder && (
        <InvoiceModal order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />
      )}
    </div>
  )
}
