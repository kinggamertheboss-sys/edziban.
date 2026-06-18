'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { MOCK_ORDERS, MOCK_SUPPLIERS, MENU_ITEMS, type MockOrder } from '@/lib/mockData'
import { formatCurrency, getStatusLabel, getTimeLabel } from '@/lib/utils'
import SupplierHub from '@/components/admin/SupplierHub'
import Financials from '@/components/admin/Financials'
import CorporateOrders from '@/components/admin/CorporateOrders'

const D = { bg: '#0E0806', card: '#1A0F0A', border: 'rgba(255,255,255,0.07)', text: '#FFF8F0', muted: 'rgba(255,248,240,0.5)', faint: 'rgba(255,248,240,0.2)' }

function statusStyle(status: string): { bg: string; color: string } {
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

interface NotifLog {
  type: 'sms' | 'email' | 'whatsapp'
  recipient: string
  preview: string
  timestamp: string
  mock: boolean
  success: boolean
}

interface ContactEntry {
  order_id: string
  supplier_id: string
  supplier_name: string
  response: string
}

interface PayoutRecord {
  orderId: string
  supplierId: string
  amount: number
  paidAt: string
  method: 'check' | 'zelle'
}

interface PipelineStep {
  label: string
  apiRoute: string | null
  nextStatus: string
  color: string
  icon: string
}

const PIPELINE: Record<string, PipelineStep> = {
  pending: { label: 'Confirm Order', apiRoute: '/api/notifications/order-confirmed', nextStatus: 'confirmed', color: '#60A5FA', icon: '✓' },
  confirmed: { label: 'Start Prep', apiRoute: null, nextStatus: 'supplier_notified', color: '#C084FC', icon: '→' },
  supplier_notified: { label: 'Mark Ready', apiRoute: '/api/notifications/order-ready', nextStatus: 'ready', color: '#4ADE80', icon: '✓' },
  ready: { label: 'Mark Delivered', apiRoute: null, nextStatus: 'delivered', color: '#22C55E', icon: '✓' },
  delivered: { label: 'Request Review', apiRoute: '/api/notifications/review-request', nextStatus: 'reviewed', color: '#9CA3AF', icon: '★' },
  reviewed:  { label: 'Mark Completed', apiRoute: null, nextStatus: 'completed', color: '#6B7280', icon: '✓' },
}

const ALL_STATUSES = ['all', 'pending', 'confirmed', 'supplier_notified', 'ready', 'delivered', 'reviewed', 'completed']


function NotifIcon({ type }: { type: 'sms' | 'email' | 'whatsapp' }) {
  if (type === 'sms') return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
  )
  if (type === 'email') return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
  )
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><circle cx="17" cy="10" r="1" fill="currentColor"/></svg>
  )
}

export default function AdminDashboard() {
  const router = useRouter()
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [orderStatuses, setOrderStatuses] = useState<Record<string, string>>({})
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loadingBtn, setLoadingBtn] = useState<string | null>(null)
  const [notifLogs, setNotifLogs] = useState<Record<string, NotifLog[]>>({})
  const [activeTab, setActiveTab] = useState<'orders' | 'payouts' | 'supplier' | 'financials' | 'corporate'>('orders')
  const [paidPayouts, setPaidPayouts] = useState<PayoutRecord[]>([])
  const [payingKey, setPayingKey] = useState<string | null>(null)
  const [payMethod, setPayMethod] = useState<'check' | 'zelle'>('zelle')
  const [dbOrders, setDbOrders] = useState<MockOrder[] | null>(null)
  const [dbLoading, setDbLoading] = useState(true)
  const [contacts, setContacts] = useState<ContactEntry[]>([])
  const [dbSuppliers, setDbSuppliers] = useState<{ id: string; name: string; phone: string }[]>([])

  useEffect(() => {
    // Middleware already verified the session cookie before this page loaded.
    // If we got here, the user is authenticated.
    setAuthed(true)

    Promise.all([
      fetch('/api/orders').then(r => r.json()),
      fetch('/api/vendor-payments').then(r => r.json()),
      fetch('/api/supplier-contacts').then(r => r.json()).catch(() => ({ contacts: [] })),
      fetch('/api/suppliers').then(r => r.json()).catch(() => ({ suppliers: [] })),
    ]).then(([ordersData, paymentsData, contactsData, suppliersData]) => {
      if (Array.isArray(suppliersData.suppliers)) setDbSuppliers(suppliersData.suppliers)
      if (Array.isArray(ordersData.orders)) {
        setDbOrders(ordersData.orders)
      }
      if (Array.isArray(paymentsData.payments)) {
        setPaidPayouts(paymentsData.payments.map((p: {
          order_id: string; supplier_id: string; amount: number; paid_at: string; method: string
        }) => ({
          orderId: p.order_id,
          supplierId: p.supplier_id,
          amount: p.amount,
          paidAt: p.paid_at,
          method: p.method as 'check' | 'zelle',
        })))
      }
      if (Array.isArray(contactsData.contacts)) setContacts(contactsData.contacts)
    }).catch(e => {
      console.error('[DASHBOARD] Failed to load from DB:', e)
    }).finally(() => setDbLoading(false))
  }, [router])

  const displayOrders = (dbOrders && dbOrders.length > 0) ? dbOrders : MOCK_ORDERS
  const getStatus = useCallback((id: string) => orderStatuses[id] ?? displayOrders.find(o => o.id === id)?.status ?? 'pending', [orderStatuses, displayOrders])

  function setStatus(id: string, status: string) {
    setOrderStatuses(s => ({ ...s, [id]: status }))
    fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).catch(e => console.error('[STATUS]', e))
  }

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }

  function addLogs(orderId: string, logs: NotifLog[]) {
    setNotifLogs(prev => ({ ...prev, [orderId]: [...(prev[orderId] ?? []), ...logs] }))
  }

  function handleMarkPaid(orderId: string, supplierId: string, amount: number) {
    const now = new Date()
    const paidAt = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    const record = { orderId, supplierId, amount, paidAt, method: payMethod }
    setPaidPayouts(prev => [...prev, record])
    setPayingKey(null)
    fetch('/api/vendor-payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    }).catch(e => console.error('[PAYOUT]', e))
  }

  async function handlePipelineAction(order: MockOrder, step: PipelineStep) {
    const btnKey = `${order.id}-pipeline`
    setLoadingBtn(btnKey)

    const timestamp = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

    try {
      if (step.apiRoute) {
        // Build payload based on which route we're calling
        let payload: Record<string, unknown> = {
          orderNumber: order.id,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerEmail: order.customerEmail,
          items: order.items.map(i => ({ name: i.name, quantity: i.quantity, unitPrice: i.unitPrice })),
          subtotal: order.subtotal,
          serviceFee: order.serviceFee,
          deliveryFee: order.deliveryFee,
          total: order.total,
          fulfillmentType: order.fulfillmentType,
          address: order.address,
          requestedDate: order.requestedDate,
          requestedTime: order.requestedTime,
          specialInstructions: order.specialInstructions,
          eventType: order.eventType,
        }

        // Review request needs minimal shape
        if (step.apiRoute === '/api/notifications/review-request') {
          payload = {
            orderNumber: order.id,
            customerName: order.customerName,
            customerEmail: order.customerEmail,
          }
        }

        const resp = await fetch(step.apiRoute, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await resp.json()

        if (data.notifications) {
          addLogs(order.id, data.notifications.map((n: NotifLog) => ({ ...n, timestamp })))
        }
      }

      setStatus(order.id, step.nextStatus)
    } catch (e) {
      console.error('Pipeline action failed:', e)
    } finally {
      setLoadingBtn(null)
    }
  }

  // ── Revenue calculations ───────────────────────────────────────────────
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const nonCancelledOrders = displayOrders.filter(o => getStatus(o.id) !== 'cancelled')
  const totalRevenue = nonCancelledOrders.reduce((s, o) => s + o.total, 0)
  const totalCommission = nonCancelledOrders.reduce((s, o) => s + o.commission, 0)

  const thisMonthOrders = nonCancelledOrders.filter(o => new Date(o.createdAt) >= monthStart)
  const thisWeekOrders  = nonCancelledOrders.filter(o => new Date(o.createdAt) >= weekAgo)
  const todayOrders     = nonCancelledOrders.filter(o => o.createdAt.startsWith(todayStr))

  const activeOrders = displayOrders.filter(o => !['cancelled', 'delivered', 'reviewed'].includes(getStatus(o.id)))
  const supplierTotals = MOCK_SUPPLIERS.map(sup => ({
    ...sup,
    total: nonCancelledOrders.reduce((sum, order) => sum + (order.supplierPayouts.find(p => p.supplierId === sup.id)?.amount ?? 0), 0),
  }))

  const filteredOrders = filter === 'all'
    ? displayOrders
    : filter === 'completed'
      ? displayOrders.filter(o => ['delivered', 'reviewed', 'cancelled', 'completed'].includes(getStatus(o.id)))
      : displayOrders.filter(o => getStatus(o.id) === filter)

  // ── Supplier contact alert ─────────────────────────────────────────────
  function daysUntilEvent(dateStr: string): number {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return Math.ceil((new Date(dateStr + 'T00:00:00').getTime() - today.getTime()) / 86400000)
  }

  const ACTIVE_ORDER_STATUSES = new Set(['pending', 'confirmed', 'supplier_notified', 'in_progress', 'ready'])
  const contactAlertOrders = displayOrders
    .filter(o => ACTIVE_ORDER_STATUSES.has(getStatus(o.id)))
    .map(order => {
      const supplierStatuses = order.supplierPayouts.map(p => {
        const confirmed = contacts.some(
          c => c.order_id === order.id &&
            (c.supplier_id === p.supplierId || c.supplier_name.toLowerCase() === p.supplierName.toLowerCase()) &&
            c.response === 'confirmed'
        )
        return { supplierId: p.supplierId, supplierName: p.supplierName, confirmed }
      })
      const allConfirmed = supplierStatuses.every(s => s.confirmed)
      const pendingCount = supplierStatuses.filter(s => !s.confirmed).length
      const days = daysUntilEvent(order.requestedDate)
      return { order, supplierStatuses, allConfirmed, pendingCount, days }
    })
    .filter(({ allConfirmed }) => !allConfirmed)
    .sort((a, b) => a.days - b.days)

  // ── Payouts computation ───────────────────────────────────────────────
  const allPayoutRows = nonCancelledOrders.flatMap(order =>
    order.supplierPayouts.map(p => ({
      orderId: order.id,
      supplierId: p.supplierId,
      supplierName: p.supplierName,
      amount: p.amount,
      customerName: order.customerName,
      requestedDate: order.requestedDate,
      key: `${order.id}::${p.supplierId}`,
    }))
  )
  const isPaid = (orderId: string, supplierId: string) =>
    paidPayouts.some(p => p.orderId === orderId && p.supplierId === supplierId)
  const getPaidRecord = (orderId: string, supplierId: string) =>
    paidPayouts.find(p => p.orderId === orderId && p.supplierId === supplierId)
  const vendorPayouts = MOCK_SUPPLIERS.map(sup => {
    const rows = allPayoutRows.filter(r => r.supplierId === sup.id)
    const totalEarned = rows.reduce((s, r) => s + r.amount, 0)
    const totalPaid = rows.filter(r => isPaid(r.orderId, r.supplierId)).reduce((s, r) => s + r.amount, 0)
    return { ...sup, rows, totalEarned, totalPaid, balanceDue: totalEarned - totalPaid }
  })
  const grandOutstanding = vendorPayouts.reduce((s, v) => s + v.balanceDue, 0)
  const grandPaid = vendorPayouts.reduce((s, v) => s + v.totalPaid, 0)

  if (authed === null || authed === false) return (
    <div style={{ minHeight: '100dvh', background: '#0E0806', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '24px', height: '24px', border: '2px solid rgba(196,98,45,0.3)', borderTopColor: '#C4622D', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', background: D.bg }}>

      {/* Header */}
      <header style={{ background: D.card, borderBottom: `1px solid ${D.border}`, position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Image src="/The_Single_E.png" alt="E" width={28} height={28} className="h-7 w-auto object-contain" />
            <div style={{ width: '1px', height: '18px', background: D.border }} />
            <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: D.muted }}>Admin</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {dbLoading ? (
              <span style={{ fontSize: '11px', color: D.faint, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', border: '1.5px solid rgba(196,98,45,0.3)', borderTopColor: '#C4622D', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                Loading
              </span>
            ) : dbOrders ? (
              <span style={{ fontSize: '11px', color: '#22C55E', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
                Live
              </span>
            ) : (
              <span style={{ fontSize: '11px', color: '#F59E0B' }}>Mock data</span>
            )}
            <span style={{ fontSize: '12px', color: D.faint }} className="hidden sm:block">admin@edzibancatering.com</span>
            <button onClick={handleLogout} style={{ fontSize: '12px', fontWeight: 600, padding: '7px 16px', borderRadius: '100px', border: `1px solid ${D.border}`, background: 'transparent', color: D.muted, cursor: 'pointer' }}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* Title */}
        <div style={{ marginBottom: '32px' }}>
          <p className="label-upper" style={{ color: '#C4622D', marginBottom: '8px' }}>Overview</p>
          <h1 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', fontWeight: 700, color: D.text, letterSpacing: '-0.02em' }}>
            Edziban Dashboard
          </h1>
        </div>

        {/* ── Top stat cards ─────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' }}>
          {[
            { label: 'All-time revenue', value: formatCurrency(totalRevenue), accent: true },
            { label: 'My income', value: formatCurrency(totalCommission), accent: false },
            { label: 'Total orders', value: String(nonCancelledOrders.length), accent: false },
            { label: 'Active orders', value: String(activeOrders.length), accent: false },
          ].map(s => (
            <div key={s.label} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: '16px', padding: '22px' }}>
              <p className="label-upper" style={{ color: D.faint, marginBottom: '14px' }}>{s.label}</p>
              <p style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: '26px', fontWeight: 700, color: s.accent ? '#C4622D' : D.text, letterSpacing: '-0.02em', lineHeight: 1 }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Revenue breakdown */}
        <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: '16px', padding: '24px', marginBottom: '28px' }}>
          <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: '16px', fontWeight: 700, color: D.text, marginBottom: '20px' }}>Revenue breakdown</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            {[
              { label: 'Today', orders: todayOrders },
              { label: 'This week', orders: thisWeekOrders },
              { label: 'This month', orders: thisMonthOrders },
            ].map(({ label, orders }) => (
              <div key={label}>
                <p className="label-upper" style={{ color: D.faint, marginBottom: '8px' }}>{label}</p>
                <p style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: '20px', fontWeight: 700, color: D.text, letterSpacing: '-0.02em', marginBottom: '2px' }}>
                  {formatCurrency(orders.reduce((s, o) => s + o.total, 0))}
                </p>
                <p style={{ fontSize: '11px', color: D.muted }}>{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Needs Supplier Contact ──────────────────────────────────────── */}
        {contactAlertOrders.length > 0 && (
          <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: '16px', marginBottom: '28px', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: `1px solid ${D.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: contactAlertOrders.some(a => a.days <= 3) ? '#EF4444' : '#F59E0B', display: 'inline-block', flexShrink: 0 }} />
                <p style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: D.text }}>Needs Supplier Contact</p>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, background: 'rgba(196,98,45,0.15)', color: '#C4622D', borderRadius: '100px', padding: '3px 10px' }}>{contactAlertOrders.length} order{contactAlertOrders.length !== 1 ? 's' : ''}</span>
            </div>
            <div>
              {contactAlertOrders.map(({ order, supplierStatuses, pendingCount, days }, idx) => {
                const urgency = days <= 3
                  ? { dot: '#EF4444', label: days <= 0 ? 'TODAY' : `${days}d`, bg: 'rgba(239,68,68,0.06)' }
                  : days <= 5
                    ? { dot: '#F59E0B', label: `${days}d`, bg: 'rgba(245,158,11,0.06)' }
                    : { dot: 'rgba(255,248,240,0.2)', label: `${days}d`, bg: 'transparent' }
                const status = getStatus(order.id)
                return (
                  <div key={order.id} style={{ borderTop: idx > 0 ? `1px solid ${D.border}` : 'none', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: '14px', background: urgency.bg, flexWrap: 'wrap' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: urgency.dot, display: 'inline-block', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <p style={{ fontSize: '13px', fontWeight: 700, color: D.text }}>{order.customerName}</p>
                        <span style={{ fontSize: '11px', color: D.muted }}>{order.id}</span>
                        <span style={{ fontSize: '11px', color: D.faint }}>·</span>
                        <span className="badge" style={{ background: statusStyle(status).bg, color: statusStyle(status).color }}>{getStatusLabel(status)}</span>
                      </div>
                      <p style={{ fontSize: '12px', color: D.muted, marginTop: '3px' }}>
                        {new Date(order.requestedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        {' · '}
                        {supplierStatuses.map(s => (
                          <span key={s.supplierId} style={{ color: s.confirmed ? '#22C55E' : urgency.dot }}>
                            {s.supplierName}{s.confirmed ? ' ✓' : ' ✗'}{'  '}
                          </span>
                        ))}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: urgency.dot }}>{urgency.label} away</span>
                      <button onClick={() => setActiveTab('supplier')} style={{
                        fontSize: '11px', fontWeight: 700, padding: '6px 14px', borderRadius: '100px',
                        border: `1px solid ${D.border}`, background: 'transparent', color: D.muted, cursor: 'pointer',
                      }}>Contact →</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Tab navigation ─────────────────────────────────────────────── */}
        {(() => {
          const actionNeededCount = displayOrders.filter(o => ['pending', 'confirmed', 'supplier_notified'].includes(getStatus(o.id))).length
          const tabBadge: Record<string, number> = {}
          if (actionNeededCount > 0) tabBadge['orders'] = actionNeededCount
          if (vendorPayouts.filter(v => v.balanceDue > 0).length > 0) tabBadge['payouts'] = vendorPayouts.filter(v => v.balanceDue > 0).length

          const TAB_LABELS: Record<string, string> = { orders: 'Orders', payouts: 'Payouts', supplier: 'Suppliers', financials: 'Financials', corporate: 'Corporate' }

          return (
            <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: D.card, border: `1px solid ${D.border}`, borderRadius: '12px', padding: '4px', width: 'fit-content', flexWrap: 'wrap' }}>
              {(['orders', 'payouts', 'supplier', 'financials', 'corporate'] as const).map(tab => {
                const badge = tabBadge[tab]
                const isActive = activeTab === tab
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                      padding: '8px 18px', borderRadius: '9px', cursor: 'pointer', border: 'none',
                      background: isActive ? '#C4622D' : 'transparent',
                      color: isActive ? '#FFF8F0' : D.muted,
                      transition: 'all 0.18s',
                      display: 'flex', alignItems: 'center', gap: '6px',
                    }}
                  >
                    {TAB_LABELS[tab]}
                    {badge !== undefined && (
                      <span style={{
                        fontSize: '10px', fontWeight: 700,
                        background: isActive ? 'rgba(255,248,240,0.25)' : 'rgba(196,98,45,0.2)',
                        color: isActive ? '#FFF8F0' : '#C4622D',
                        borderRadius: '100px', padding: '1px 7px', lineHeight: '16px',
                      }}>
                        {badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )
        })()}


        {/* ── PAYOUTS tab ────────────────────────────────────────────────── */}
        {activeTab === 'payouts' && (
          <div>
            {/* Summary bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
              {[
                { label: 'Total outstanding', value: formatCurrency(grandOutstanding), accent: grandOutstanding > 0 },
                { label: 'Total paid out', value: formatCurrency(grandPaid), accent: false },
                { label: 'Vendors with balance', value: String(vendorPayouts.filter(v => v.balanceDue > 0).length), accent: false },
              ].map(s => (
                <div key={s.label} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: '14px', padding: '20px' }}>
                  <p className="label-upper" style={{ color: D.faint, marginBottom: '10px' }}>{s.label}</p>
                  <p style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: '22px', fontWeight: 700, color: s.accent ? '#F59E0B' : D.text, letterSpacing: '-0.02em', lineHeight: 1 }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Per-vendor cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {vendorPayouts.map(vendor => (
                <div key={vendor.id} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: '16px', overflow: 'hidden' }}>

                  {/* Vendor header */}
                  <div style={{ padding: '20px 24px', borderBottom: `1px solid ${D.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(196,98,45,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#C4622D' }}>{vendor.name.charAt(0)}</span>
                      </div>
                      <div>
                        <p style={{ fontSize: '15px', fontWeight: 700, color: D.text }}>{vendor.name}</p>
                        <p style={{ fontSize: '12px', color: D.muted }}>{vendor.phone}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '11px', color: D.faint, marginBottom: '3px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Earned</p>
                        <p style={{ fontSize: '16px', fontWeight: 700, color: D.text }}>{formatCurrency(vendor.totalEarned)}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '11px', color: D.faint, marginBottom: '3px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Paid</p>
                        <p style={{ fontSize: '16px', fontWeight: 700, color: '#22C55E' }}>{formatCurrency(vendor.totalPaid)}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '11px', color: D.faint, marginBottom: '3px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Balance due</p>
                        <p style={{ fontSize: '16px', fontWeight: 700, color: vendor.balanceDue > 0 ? '#F59E0B' : D.muted }}>{formatCurrency(vendor.balanceDue)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Per-order payout rows */}
                  {vendor.rows.length === 0 ? (
                    <div style={{ padding: '24px', fontSize: '13px', color: D.faint, textAlign: 'center' }}>No payouts for this vendor.</div>
                  ) : (
                    <div style={{ padding: '8px 0' }}>
                      {vendor.rows.map((row, i) => {
                        const paid = isPaid(row.orderId, row.supplierId)
                        const record = getPaidRecord(row.orderId, row.supplierId)
                        const rowKey = `${row.orderId}::${row.supplierId}`
                        const isOpening = payingKey === rowKey

                        return (
                          <div key={rowKey} style={{ borderTop: i > 0 ? `1px solid ${D.border}` : 'none' }}>
                            <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: '13.5px', fontWeight: 600, color: D.text, marginBottom: '2px' }}>{row.customerName}</p>
                                <p style={{ fontSize: '12px', color: D.muted }}>{row.orderId} &nbsp;·&nbsp; {row.requestedDate}</p>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                                <p style={{ fontSize: '15px', fontWeight: 700, color: paid ? D.muted : D.text }}>{formatCurrency(row.amount)}</p>
                                {paid ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                                    <span style={{ fontSize: '12px', color: '#22C55E', fontWeight: 600 }}>
                                      {record!.method === 'zelle' ? 'Zelle' : 'Check'} &middot; {record!.paidAt}
                                    </span>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => { setPayingKey(isOpening ? null : rowKey); setPayMethod('zelle') }}
                                    style={{
                                      fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em',
                                      padding: '8px 16px', borderRadius: '100px', cursor: 'pointer',
                                      border: `1px solid ${isOpening ? '#C4622D' : D.border}`,
                                      background: isOpening ? 'rgba(196,98,45,0.12)' : 'transparent',
                                      color: isOpening ? '#C4622D' : D.muted,
                                      transition: 'all 0.18s',
                                    }}
                                  >
                                    Mark Paid
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Inline pay form */}
                            {isOpening && !paid && (
                              <div style={{ margin: '0 24px 16px', padding: '16px 20px', background: 'rgba(196,98,45,0.06)', border: '1px solid rgba(196,98,45,0.18)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                                <p style={{ fontSize: '12px', fontWeight: 700, color: D.muted, letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0 }}>Method</p>
                                {(['zelle', 'check'] as const).map(m => (
                                  <button
                                    key={m}
                                    onClick={() => setPayMethod(m)}
                                    style={{
                                      fontSize: '12px', fontWeight: 700,
                                      padding: '7px 18px', borderRadius: '100px', cursor: 'pointer',
                                      border: `1px solid ${payMethod === m ? '#C4622D' : D.border}`,
                                      background: payMethod === m ? 'rgba(196,98,45,0.15)' : 'transparent',
                                      color: payMethod === m ? '#C4622D' : D.muted,
                                      transition: 'all 0.15s',
                                      textTransform: 'capitalize',
                                    }}
                                  >
                                    {m === 'zelle' ? 'Zelle' : 'Check'}
                                  </button>
                                ))}
                                <button
                                  onClick={() => handleMarkPaid(row.orderId, row.supplierId, row.amount)}
                                  style={{
                                    fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em',
                                    padding: '8px 20px', borderRadius: '100px', cursor: 'pointer',
                                    border: 'none', background: '#C4622D', color: '#FFF8F0',
                                    boxShadow: '0 4px 16px rgba(196,98,45,0.3)',
                                    transition: 'all 0.15s', marginLeft: 'auto',
                                  }}
                                >
                                  Confirm {formatCurrency(row.amount)} payment
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SUPPLIER HUB tab ───────────────────────────────────────────── */}
        {activeTab === 'supplier' && (
          <SupplierHub
            orders={displayOrders}
            paidPayouts={paidPayouts.map(p => ({ orderId: p.orderId, supplierId: p.supplierId, amount: p.amount }))}
          />
        )}


        {/* ── FINANCIALS tab ─────────────────────────────────────────────── */}
        {activeTab === 'financials' && (
          <Financials
            orders={displayOrders}
            paidPayouts={paidPayouts}
          />
        )}

        {/* ── CORPORATE tab ──────────────────────────────────────────────── */}
        {activeTab === 'corporate' && (
          <CorporateOrders
            orders={displayOrders}
            orderStatuses={orderStatuses}
          />
        )}

        {/* ── ORDERS tab ─────────────────────────────────────────────────── */}
        {activeTab === 'orders' && (
          <>
            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
              {ALL_STATUSES.map(s => {
                const isActive = filter === s
                const isCompleted = s === 'completed'
                const count = s === 'all'
                  ? displayOrders.length
                  : isCompleted
                    ? 0
                    : displayOrders.filter(o => getStatus(o.id) === s).length
                const label = s === 'all' ? 'All' : isCompleted ? 'Completed' : getStatusLabel(s)
                return (
                  <button
                    key={s}
                    onClick={() => setFilter(s)}
                    style={{
                      fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                      padding: '6px 14px', borderRadius: '100px', cursor: 'pointer',
                      border: `1px solid ${isActive ? '#C4622D' : D.border}`,
                      background: isActive ? '#C4622D' : 'transparent',
                      color: isActive ? '#FFF8F0' : D.muted,
                      transition: 'all 0.18s',
                      display: 'flex', alignItems: 'center', gap: '5px',
                    }}
                  >
                    {label}
                    {!isCompleted && count > 0 && (
                      <span style={{
                        fontSize: '10px', fontWeight: 700,
                        background: isActive ? 'rgba(255,248,240,0.25)' : 'rgba(255,248,240,0.1)',
                        color: isActive ? '#FFF8F0' : D.muted,
                        borderRadius: '100px', padding: '0 6px', lineHeight: '15px',
                        display: 'inline-block',
                      }}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Orders list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredOrders.length === 0 && (
                <div style={{ textAlign: 'center', padding: '48px', color: D.muted, fontSize: '14px' }}>No orders with this status.</div>
              )}
              {filteredOrders.map(order => {
                const status = getStatus(order.id)
                const isExpanded = expanded === order.id
                const st = statusStyle(status)
                const pipelineStep = PIPELINE[status]
                const logs = notifLogs[order.id] ?? []
                const btnKey = `${order.id}-pipeline`

                return (
                  <div key={order.id} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: '16px', overflow: 'hidden' }}>

                    {/* Order summary row */}
                    <button
                      onClick={() => setExpanded(isExpanded ? null : order.id)}
                      style={{ width: '100%', textAlign: 'left', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                          <p style={{ fontSize: '15px', fontWeight: 700, color: D.text }}>{order.customerName}</p>
                          <span className="badge" style={{ background: st.bg, color: st.color }}>{getStatusLabel(status)}</span>
                          {pipelineStep && (
                            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: pipelineStep.color, opacity: 0.8 }}>
                              Next: {pipelineStep.label}
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: '12px', color: D.muted }}>{order.id} &nbsp;·&nbsp; {order.requestedDate} &nbsp;·&nbsp; {order.fulfillmentType}</p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ fontSize: '16px', fontWeight: 700, color: D.text }}>{formatCurrency(order.total)}</p>
                        <p style={{ fontSize: '12px', color: '#C4622D', fontWeight: 600 }}>+{formatCurrency(order.commission)}</p>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={D.faint} strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s' }}>
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div style={{ borderTop: `1px solid ${D.border}`, padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

                        {/* ── Pipeline action button ─────────────────────── */}
                        {pipelineStep && (
                          <div style={{ background: `rgba(${pipelineStep.color === '#60A5FA' ? '96,165,250' : pipelineStep.color === '#C084FC' ? '192,132,252' : pipelineStep.color === '#4ADE80' ? '74,222,128' : pipelineStep.color === '#22C55E' ? '34,197,94' : '156,163,175'},0.07)`, border: `1px solid ${pipelineStep.color}22`, borderRadius: '14px', padding: '20px' }}>
                            <p className="label-upper" style={{ color: D.faint, marginBottom: '14px' }}>Next step</p>
                            <button
                              onClick={() => handlePipelineAction(order, pipelineStep)}
                              disabled={loadingBtn === btnKey}
                              style={{
                                fontSize: '13px', fontWeight: 700, letterSpacing: '0.04em',
                                padding: '13px 28px', borderRadius: '100px', border: 'none',
                                background: pipelineStep.color, color: '#0E0806',
                                cursor: loadingBtn === btnKey ? 'not-allowed' : 'pointer',
                                opacity: loadingBtn === btnKey ? 0.7 : 1,
                                display: 'flex', alignItems: 'center', gap: '8px',
                                boxShadow: `0 4px 20px ${pipelineStep.color}33`,
                                transition: 'all 0.18s',
                              }}
                            >
                              {loadingBtn === btnKey ? (
                                <>
                                  <svg style={{ animation: 'spin 1s linear infinite' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                                    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
                                  </svg>
                                  Sending...
                                </>
                              ) : (
                                <>{pipelineStep.icon} {pipelineStep.label}</>
                              )}
                            </button>
                          </div>
                        )}

                        {/* ── Supplier breakdown ────────────────────────── */}
                        {['pending', 'confirmed', 'supplier_notified', 'in_progress', 'ready'].includes(status) && (() => {
                          const baseId = (id: string) => id.split('--')[0]
                          const bySupplier: Record<string, { name: string; phone: string; items: { name: string; quantity: number }[] }> = {}
                          for (const item of order.items) {
                            const menuItem = MENU_ITEMS.find(m => m.id === baseId(item.itemId))
                            if (!menuItem) continue
                            const sid = menuItem.supplierId
                            if (!bySupplier[sid]) {
                              const sup = dbSuppliers.find(s => s.name.toLowerCase() === menuItem.supplierName.toLowerCase())
                              bySupplier[sid] = { name: menuItem.supplierName, phone: sup?.phone ?? '', items: [] }
                            }
                            bySupplier[sid].items.push({ name: item.name, quantity: item.quantity })
                          }
                          const entries = Object.entries(bySupplier)
                          if (!entries.length) return null
                          return (
                            <div>
                              <p className="label-upper" style={{ color: D.faint, marginBottom: '12px' }}>Who to call</p>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {entries.map(([sid, sup]) => (
                                  <div key={sid} style={{ background: 'rgba(255,248,240,0.04)', border: `1px solid ${D.border}`, borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <p style={{ fontSize: '14px', fontWeight: 700, color: D.text, marginBottom: '4px' }}>{sup.name}</p>
                                      <p style={{ fontSize: '12px', color: D.muted, marginBottom: '6px' }}>{sup.phone}</p>
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {sup.items.map(i => (
                                          <span key={i.name} style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '100px', background: 'rgba(196,98,45,0.12)', color: '#C4622D' }}>
                                            {i.name} &times; {i.quantity}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                    {sup.phone && (
                                      <a
                                        href={`tel:${sup.phone.replace(/[^\d+]/g, '')}`}
                                        style={{
                                          fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em',
                                          padding: '10px 20px', borderRadius: '100px', textDecoration: 'none',
                                          background: '#C4622D', color: '#FFF8F0',
                                          boxShadow: '0 4px 14px rgba(196,98,45,0.3)',
                                          flexShrink: 0, whiteSpace: 'nowrap',
                                        }}
                                      >
                                        Call
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })()}

                        {/* Customer + Delivery info */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
                          {[
                            { title: 'Customer', rows: [
                              { l: 'Name',  v: order.customerName },
                              { l: 'Phone', v: order.customerPhone },
                              { l: 'Email', v: order.customerEmail },
                              ...(order.guestCount ? [{ l: 'Guests', v: String(order.guestCount) }] : []),
                            ]},
                            { title: 'Fulfillment', rows: [
                              { l: 'Type',  v: order.fulfillmentType },
                              ...(order.address ? [{ l: 'Address', v: order.address }] : []),
                              { l: 'Date',  v: order.requestedDate },
                              { l: 'Time',  v: getTimeLabel(order.requestedTime) },
                            ]},
                          ].map(col => (
                            <div key={col.title}>
                              <p className="label-upper" style={{ color: D.faint, marginBottom: '12px' }}>{col.title}</p>
                              {col.rows.map(r => (
                                <div key={r.l} style={{ display: 'flex', gap: '12px', fontSize: '13px', marginBottom: '8px' }}>
                                  <span style={{ width: '52px', flexShrink: 0, color: D.muted }}>{r.l}</span>
                                  <span style={{ color: D.text, fontWeight: 500, textTransform: r.l === 'Type' ? 'capitalize' : 'none' }}>{r.v}</span>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>

                        {/* Items */}
                        <div>
                          <p className="label-upper" style={{ color: D.faint, marginBottom: '12px' }}>Items ordered</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {order.items.map(item => (
                              <div key={item.itemId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px' }}>
                                <span style={{ color: D.text }}>{item.name} <span style={{ color: D.muted }}>× {item.quantity}</span></span>
                                <span style={{ fontWeight: 600, color: D.text }}>{formatCurrency(item.unitPrice * item.quantity)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Financials */}
                        {(() => {
                          const squarePct     = Math.round(order.total * 0.029 * 100) / 100
                          const squareFlat    = 0.30
                          const squareTotal   = Math.round((squarePct + squareFlat) * 100) / 100
                          const supplierTotal = order.supplierPayouts.reduce((s, p) => s + p.amount, 0)
                          // Service fee breakdown: coverage of Square on food+delivery, plus $3.50 surcharge
                          const sqCoverage    = Math.round(((order.subtotal + order.deliveryFee) * 0.029 + 0.30) * 100) / 100
                          const surcharge     = Math.round((order.serviceFee - sqCoverage) * 100) / 100

                          return (
                            <div style={{ background: 'rgba(196,98,45,0.06)', border: '1px solid rgba(196,98,45,0.12)', borderRadius: '12px', padding: '20px' }}>
                              <p className="label-upper" style={{ color: D.faint, marginBottom: '14px' }}>Financials</p>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>

                                {/* What customer paid */}
                                <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: D.faint }}>What customer paid</p>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: D.muted }}>Food subtotal</span><span style={{ color: D.text }}>{formatCurrency(order.subtotal)}</span></div>
                                {order.deliveryFee > 0 && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: D.muted }}>Delivery fee</span><span style={{ color: D.text }}>{formatCurrency(order.deliveryFee)}</span></div>
                                )}
                                {order.serviceFee > 0 ? (
                                  <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: D.muted }}>Service fee</span><span style={{ color: D.text }}>{formatCurrency(order.serviceFee)}</span></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '14px' }}><span style={{ color: D.faint }}>└ Square coverage (2.9% + $0.30)</span><span style={{ color: D.faint }}>{formatCurrency(sqCoverage)}</span></div>
                                    {surcharge > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '14px' }}><span style={{ color: D.faint }}>└ Your surcharge</span><span style={{ color: D.faint }}>{formatCurrency(surcharge)}</span></div>}
                                  </>
                                ) : (
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: D.muted }}>Service fee</span><span style={{ color: D.faint }}>$0.00 (test order)</span></div>
                                )}
                                <div style={{ height: '1px', background: D.border, margin: '2px 0' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}><span style={{ color: D.text }}>Customer total</span><span style={{ color: D.text }}>{formatCurrency(order.total)}</span></div>

                                {/* Where it went */}
                                <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: D.faint, marginTop: '8px' }}>Where it went</p>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: D.muted }}>Square 2.9%</span><span style={{ color: D.text }}>({formatCurrency(squarePct)})</span></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: D.muted }}>Square + $0.30</span><span style={{ color: D.text }}>($0.30)</span></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}><span style={{ color: D.muted }}>Total Square fee</span><span style={{ color: D.text }}>({formatCurrency(squareTotal)})</span></div>
                                {order.supplierPayouts.map(p => (
                                  <div key={p.supplierId} style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: D.muted }}>{p.supplierName}</span><span style={{ color: D.text }}>({formatCurrency(p.amount)})</span></div>
                                ))}
                                <div style={{ height: '1px', background: D.border, margin: '2px 0' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '14px' }}>
                                  <span style={{ color: '#C4622D' }}>Your commission</span>
                                  <span style={{ color: '#C4622D' }}>{formatCurrency(order.commission)}</span>
                                </div>
                              </div>
                            </div>
                          )
                        })()}

                        {/* Notes */}
                        {order.specialInstructions && (
                          <div style={{ background: D.bg, border: `1px solid ${D.border}`, borderRadius: '12px', padding: '14px 18px', fontSize: '13px', color: D.muted, lineHeight: 1.7 }}>
                            <span style={{ fontWeight: 600, color: D.text }}>Notes: </span>{order.specialInstructions}
                          </div>
                        )}

                        {/* ── Email log ─────────────────────────────────── */}
                        <div>
                          <p className="label-upper" style={{ color: D.faint, marginBottom: '12px' }}>Emails sent to customer</p>

                          {/* Static schedule — always visible */}
                          <div style={{ background: 'rgba(192,132,252,0.06)', border: '1px solid rgba(192,132,252,0.15)', borderRadius: '12px', padding: '16px 20px', marginBottom: '10px' }}>
                            <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(192,132,252,0.7)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>3 emails are sent to every customer</p>
                            {[
                              { trigger: 'When they pay', label: 'Order Received', desc: 'Thank you email with full order summary, total paid, date/time, and a note that confirmation comes within 24 hours.' },
                              { trigger: 'When you click Confirm Order', label: 'Order Confirmed', desc: 'Tells the customer their order is approved and being prepared. Includes order details and pickup/delivery info.' },
                              { trigger: 'When you click Mark Ready', label: 'Order Ready', desc: `Tells the customer their food is ready for ${order.fulfillmentType === 'pickup' ? 'pickup' : 'delivery'} with the time and location.` },
                            ].map((e, i) => (
                              <div key={i} style={{ display: 'flex', gap: '14px', paddingBottom: i < 2 ? '12px' : 0, marginBottom: i < 2 ? '12px' : 0, borderBottom: i < 2 ? '1px solid rgba(192,132,252,0.1)' : 'none' }}>
                                <div style={{ width: '6px', borderRadius: '3px', background: 'rgba(192,132,252,0.3)', flexShrink: 0, marginTop: '2px' }} />
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: D.text }}>{e.label}</span>
                                    <span style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(192,132,252,0.6)', background: 'rgba(192,132,252,0.1)', borderRadius: '100px', padding: '1px 8px' }}>{e.trigger}</span>
                                  </div>
                                  <p style={{ fontSize: '12px', color: D.muted, lineHeight: 1.6, margin: 0 }}>{e.desc}</p>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Sent log */}
                          {logs.filter(l => l.type === 'email').length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {logs.filter(l => l.type === 'email').map((log, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', padding: '10px 14px', background: 'rgba(192,132,252,0.06)', border: '1px solid rgba(192,132,252,0.15)', borderRadius: '10px' }}>
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C084FC" strokeWidth="2" style={{ flexShrink: 0 }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <span style={{ fontWeight: 700, color: '#C084FC' }}>{log.preview}</span>
                                    <span style={{ color: D.faint, marginLeft: '8px' }}>&rarr; {log.recipient}</span>
                                    <span style={{ color: D.faint, marginLeft: '8px', fontSize: '11px' }}>{log.timestamp}</span>
                                    {log.mock && <span style={{ color: 'rgba(245,158,11,0.7)', fontSize: '10px', fontWeight: 600, marginLeft: '8px' }}>NOT SENT (no AWS keys)</span>}
                                  </div>
                                  {log.success && !log.mock && (
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p style={{ fontSize: '12px', color: D.faint, fontStyle: 'italic' }}>No emails sent yet for this order this session.</p>
                          )}
                        </div>

                        {/* Manual status override */}
                        <div>
                          <p className="label-upper" style={{ color: D.faint, marginBottom: '12px' }}>Manual status override</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {(['pending', 'confirmed', 'supplier_notified', 'ready', 'delivered', 'reviewed', 'completed'] as const).map(s => {
                              const active = status === s
                              const st2 = statusStyle(s)
                              return (
                                <button
                                  key={s}
                                  onClick={() => setStatus(order.id, s)}
                                  style={{
                                    fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
                                    padding: '7px 14px', borderRadius: '100px', cursor: 'pointer',
                                    border: `1px solid ${active ? st2.color : D.border}`,
                                    background: active ? st2.bg : 'transparent',
                                    color: active ? st2.color : D.muted,
                                    transition: 'all 0.18s',
                                  }}
                                >
                                  {getStatusLabel(s)}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}

        <div style={{ marginTop: '48px', textAlign: 'center' }}>
          <Link href="/" style={{ fontSize: '12px', color: D.faint, textDecoration: 'none' }}>Back to Edziban website</Link>
        </div>
      </main>
    </div>
  )
}
