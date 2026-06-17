'use client'

import { useState, useEffect, useRef } from 'react'
import { MENU_ITEMS, MENU_CATEGORIES, type MockOrder } from '@/lib/mockData'

const D = {
  bg: '#0E0806', card: '#1A0F0A', border: 'rgba(255,255,255,0.07)',
  text: '#FFF8F0', muted: 'rgba(255,248,240,0.5)', faint: 'rgba(255,248,240,0.2)',
}

// UPDATE this to your kitchen/pickup address before going live
const EDZIBAN_ADDRESS = '— (update EDZIBAN_ADDRESS in SupplierHub.tsx with your kitchen address)'

// ── Types ──────────────────────────────────────────────────────────────────

export interface Supplier {
  id: string
  name: string
  phone: string
  whatsapp: string
  products: string
  wholesale_price_per_unit: string
  min_batch_size: string
  prep_time: string
  notes: string
  status: 'active' | 'inactive'
  created_at: string
}

export interface SupplierContact {
  id: string
  order_id: string
  supplier_id: string
  supplier_name: string
  method: 'call' | 'whatsapp' | 'sms'
  response: 'confirmed' | 'declined' | 'no_response' | 'called_back'
  notes: string
  contacted_at: string
}

type SubTab = 'directory' | 'comms' | 'performance'
type LogForm = { method: 'call' | 'whatsapp' | 'sms'; response: SupplierContact['response']; notes: string }

interface SupplierHubProps {
  orders: MockOrder[]
  paidPayouts: { orderId: string; supplierId: string; amount: number }[]
}

// ── Helpers ────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.ceil((new Date(dateStr + 'T00:00:00').getTime() - today.getTime()) / 86400000)
}

function readyByDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() - 1)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
}

function toDialDigits(phone: string): string {
  return phone.replace(/[^\d+]/g, '')
}

function buildMessage(items: Array<{ name: string; quantity: number }>, eventDate: string): string {
  const lines = items.map(i => `  - ${i.name}: ${i.quantity} unit${i.quantity !== 1 ? 's' : ''}`).join('\n')
  return `Hi! This is Edziban. I have an order I need fulfilled:\n\nProducts needed:\n${lines}\n\nReady by: ${readyByDate(eventDate)}\nDeliver to: ${EDZIBAN_ADDRESS}\nPlain packaging only - no labels.\n\nCan you confirm? Thanks!`
}

function getItemsForSupplier(orderItems: MockOrder['items'], payoutSupplierId: string, payoutSupplierName: string) {
  return orderItems.filter(oi => {
    const m = MENU_ITEMS.find(mi => mi.id === oi.itemId)
    return m?.supplierId === payoutSupplierId || m?.supplierName.toLowerCase() === payoutSupplierName.toLowerCase()
  })
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

const RESPONSE_LABELS: Record<SupplierContact['response'], string> = {
  confirmed: 'Confirmed',
  declined: 'Declined',
  no_response: 'No response yet',
  called_back: 'Called back later',
}

const RESPONSE_COLORS: Record<SupplierContact['response'], string> = {
  confirmed: '#22C55E',
  declined: '#EF4444',
  no_response: '#9CA3AF',
  called_back: '#F59E0B',
}

const METHOD_LABELS: Record<SupplierContact['method'], string> = { call: 'Call', whatsapp: 'WhatsApp', sms: 'SMS' }

const ACTIVE_STATUSES = new Set(['pending', 'confirmed', 'supplier_notified', 'in_progress', 'ready'])

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').replace(/^1/, '').slice(0, 10)
  if (!digits) return ''
  if (digits.length <= 3) return `+1 (${digits}`
  if (digits.length <= 6) return `+1 (${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

function parseWholesalePrices(raw: string): Record<string, string> {
  try { return JSON.parse(raw) } catch { return {} }
}

function formatWholesalePricesDisplay(raw: string): string {
  const p = parseWholesalePrices(raw)
  const entries = Object.entries(p)
  if (!entries.length) return raw || '—'
  return entries.map(([k, v]) => `${k}: $${v}`).join(', ')
}

const EMPTY_SUPPLIER_FORM = {
  name: '', phone: '', whatsapp: '', products: '',
  wholesale_price_per_unit: '', min_batch_size: '', prep_time: '', notes: '',
  status: 'active' as 'active' | 'inactive',
}

// ── Products multi-select ──────────────────────────────────────────────────

function ProductsPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = value ? value.split(',').map(s => s.trim()).filter(Boolean) : []

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function toggle(name: string) {
    const next = selected.includes(name)
      ? selected.filter(s => s !== name)
      : [...selected, name]
    onChange(next.join(', '))
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', minHeight: '42px', padding: '8px 14px', borderRadius: '10px',
          border: `1px solid ${open ? '#C4622D' : D.border}`,
          background: D.bg, cursor: 'pointer', boxSizing: 'border-box',
          display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center',
          transition: 'border-color 0.15s',
        }}
      >
        {selected.length === 0 ? (
          <span style={{ fontSize: '13px', color: D.faint }}>Click to select menu items...</span>
        ) : (
          selected.map(name => (
            <span key={name} style={{
              fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '100px',
              background: 'rgba(196,98,45,0.18)', color: '#C4622D',
              display: 'flex', alignItems: 'center', gap: '5px',
            }}>
              {name}
              <span
                onClick={e => { e.stopPropagation(); toggle(name) }}
                style={{ cursor: 'pointer', opacity: 0.7, fontSize: '13px', lineHeight: 1 }}
              >×</span>
            </span>
          ))
        )}
        <span style={{ marginLeft: 'auto', color: D.faint, fontSize: '12px' }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 200,
          background: '#1E1008', border: `1px solid ${D.border}`, borderRadius: '12px',
          overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          {MENU_CATEGORIES.map(cat => {
            const items = MENU_ITEMS.filter(m => m.category === cat.key)
            return (
              <div key={cat.key}>
                <p style={{
                  fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: D.faint, padding: '10px 14px 6px',
                }}>{cat.label}</p>
                {items.map(item => {
                  const checked = selected.includes(item.name)
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggle(item.name)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '9px 14px', cursor: 'pointer',
                        background: checked ? 'rgba(196,98,45,0.1)' : 'transparent',
                        transition: 'background 0.12s',
                      }}
                    >
                      <span style={{
                        width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0,
                        border: `2px solid ${checked ? '#C4622D' : D.border}`,
                        background: checked ? '#C4622D' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.12s',
                      }}>
                        {checked && <span style={{ color: '#FFF8F0', fontSize: '10px', fontWeight: 900, lineHeight: 1 }}>✓</span>}
                      </span>
                      <span style={{ fontSize: '13px', color: checked ? D.text : D.muted }}>{item.name}</span>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function SupplierHub({ orders, paidPayouts }: SupplierHubProps) {
  const [subTab, setSubTab] = useState<SubTab>('directory')
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [contacts, setContacts] = useState<SupplierContact[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [form, setForm] = useState({ ...EMPTY_SUPPLIER_FORM })
  const [wholesalePrices, setWholesalePrices] = useState<Record<string, string>>({})
  const [whatsappSameAsPhone, setWhatsappSameAsPhone] = useState(false)
  const [formSaving, setFormSaving] = useState(false)
  const [logOpen, setLogOpen] = useState<string | null>(null)
  const [logForms, setLogForms] = useState<Record<string, LogForm>>({})
  const [savingLog, setSavingLog] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/suppliers').then(r => r.json()),
      fetch('/api/supplier-contacts').then(r => r.json()),
    ]).then(([sd, cd]) => {
      if (Array.isArray(sd.suppliers)) setSuppliers(sd.suppliers)
      if (Array.isArray(cd.contacts)) setContacts(cd.contacts)
    }).catch(e => console.error('[SupplierHub load]', e))
      .finally(() => setLoading(false))
  }, [])

  function openAdd() {
    setEditingSupplier(null)
    setForm({ ...EMPTY_SUPPLIER_FORM })
    setWholesalePrices({})
    setWhatsappSameAsPhone(false)
    setShowModal(true)
  }

  function openEdit(s: Supplier) {
    setEditingSupplier(s)
    setForm({
      name: s.name, phone: s.phone, whatsapp: s.whatsapp,
      products: s.products, wholesale_price_per_unit: s.wholesale_price_per_unit,
      min_batch_size: s.min_batch_size, prep_time: s.prep_time,
      notes: s.notes, status: s.status,
    })
    setWholesalePrices(parseWholesalePrices(s.wholesale_price_per_unit))
    setWhatsappSameAsPhone(!!s.whatsapp && s.whatsapp === s.phone)
    setShowModal(true)
  }

  async function handleSaveSupplier() {
    if (!form.name.trim() || !form.phone.trim()) return
    setFormSaving(true)
    const payload = {
      ...form,
      whatsapp: whatsappSameAsPhone ? form.phone : form.whatsapp,
      wholesale_price_per_unit: Object.keys(wholesalePrices).length
        ? JSON.stringify(wholesalePrices)
        : '',
    }
    try {
      if (editingSupplier) {
        await fetch(`/api/suppliers/${editingSupplier.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        setSuppliers(prev => prev.map(s => s.id === editingSupplier.id ? { ...s, ...payload } : s))
      } else {
        const res = await fetch('/api/suppliers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (data.supplier) setSuppliers(prev => [...prev, data.supplier])
      }
      setShowModal(false)
    } catch (e) {
      console.error('[saveSupplier]', e)
    } finally {
      setFormSaving(false)
    }
  }

  async function handleToggleStatus(s: Supplier) {
    const newStatus = s.status === 'active' ? 'inactive' : 'active'
    setSuppliers(prev => prev.map(x => x.id === s.id ? { ...x, status: newStatus } : x))
    await fetch(`/api/suppliers/${s.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    }).catch(e => console.error('[toggleStatus]', e))
  }

  async function handleDeleteSupplier(id: string) {
    setDeletingId(id)
    try {
      await fetch(`/api/suppliers/${id}`, { method: 'DELETE' })
      setSuppliers(prev => prev.filter(s => s.id !== id))
    } catch (e) {
      console.error('[deleteSupplier]', e)
    } finally {
      setDeletingId(null)
    }
  }

  function getLogForm(key: string): LogForm {
    return logForms[key] ?? { method: 'call', response: 'no_response', notes: '' }
  }

  function setLogField<K extends keyof LogForm>(key: string, field: K, val: LogForm[K]) {
    setLogForms(prev => ({ ...prev, [key]: { ...getLogForm(key), [field]: val } }))
  }

  async function handleSaveLog(order: MockOrder, supplierId: string, supplierName: string) {
    const key = `${order.id}::${supplierId}`
    const lf = getLogForm(key)
    setSavingLog(key)
    try {
      const res = await fetch('/api/supplier-contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          supplierId,
          supplierName,
          method: lf.method,
          response: lf.response,
          notes: lf.notes,
        }),
      })
      const data = await res.json()
      if (data.contact) setContacts(prev => [data.contact, ...prev])
      setLogOpen(null)
      setLogForms(prev => { const n = { ...prev }; delete n[key]; return n })
    } catch (e) {
      console.error('[saveLog]', e)
    } finally {
      setSavingLog(null)
    }
  }

  function getOrderContacts(orderId: string, supplierId: string): SupplierContact[] {
    return contacts
      .filter(c => c.order_id === orderId && (c.supplier_id === supplierId || c.supplier_name.toLowerCase() === suppliers.find(s => s.id === supplierId)?.name.toLowerCase()))
      .sort((a, b) => new Date(b.contacted_at).getTime() - new Date(a.contacted_at).getTime())
  }

  function findSupplierByPayout(supplierName: string): Supplier | undefined {
    return suppliers.find(s => s.name.toLowerCase() === supplierName.toLowerCase())
  }

  const activeOrders = orders.filter(o => ACTIVE_STATUSES.has(o.status)).sort((a, b) =>
    new Date(a.requestedDate).getTime() - new Date(b.requestedDate).getTime()
  )

  // ── Performance data ────────────────────────────────────────────────────

  const performanceData = suppliers.map(sup => {
    const supContacts = contacts.filter(c =>
      c.supplier_id === sup.id || c.supplier_name.toLowerCase() === sup.name.toLowerCase()
    )
    const fulfilled = supContacts.filter(c => c.response === 'confirmed').length
    const declined  = supContacts.filter(c => c.response === 'declined').length
    const lastContact = supContacts[0]?.contacted_at ?? null
    const totalPaid = paidPayouts
      .filter(p => p.supplierId === sup.id || p.supplierId.toLowerCase() === sup.name.toLowerCase())
      .reduce((s, p) => s + p.amount, 0)
    return { sup, fulfilled, declined, lastContact, totalPaid }
  })

  // ── Render ──────────────────────────────────────────────────────────────

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
      <span style={{ width: '24px', height: '24px', border: '2px solid rgba(196,98,45,0.3)', borderTopColor: '#C4622D', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
    </div>
  )

  return (
    <div>
      {/* Sub-tab nav */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: D.card, border: `1px solid ${D.border}`, borderRadius: '12px', padding: '4px', width: 'fit-content' }}>
        {(['directory', 'comms', 'performance'] as SubTab[]).map(t => {
          const label = t === 'directory' ? 'Directory' : t === 'comms' ? 'Communication Center' : 'Performance'
          return (
            <button key={t} onClick={() => setSubTab(t)} style={{
              fontSize: '12px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
              padding: '8px 18px', borderRadius: '9px', cursor: 'pointer', border: 'none',
              background: subTab === t ? '#C4622D' : 'transparent',
              color: subTab === t ? '#FFF8F0' : D.muted,
              transition: 'all 0.18s',
            }}>{label}</button>
          )
        })}
      </div>

      {/* ── DIRECTORY ─────────────────────────────────────────────────── */}
      {subTab === 'directory' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <p style={{ fontSize: '16px', fontWeight: 700, color: D.text }}>Supplier Directory</p>
              <p style={{ fontSize: '12px', color: D.muted, marginTop: '2px' }}>{suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={openAdd} style={{
              fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em',
              padding: '10px 20px', borderRadius: '100px', border: 'none',
              background: '#C4622D', color: '#FFF8F0', cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(196,98,45,0.3)',
            }}>+ Add Supplier</button>
          </div>

          {suppliers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 24px', background: D.card, border: `1px solid ${D.border}`, borderRadius: '16px' }}>
              <p style={{ fontSize: '14px', color: D.muted, marginBottom: '16px' }}>No suppliers yet. Add your first supplier to get started.</p>
              <button onClick={openAdd} style={{ fontSize: '13px', fontWeight: 700, padding: '11px 24px', borderRadius: '100px', border: 'none', background: '#C4622D', color: '#FFF8F0', cursor: 'pointer' }}>Add Supplier</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {suppliers.map(s => (
                <div key={s.id} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: '16px', padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: s.status === 'active' ? 'rgba(196,98,45,0.18)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                        <span style={{ fontSize: '15px', fontWeight: 700, color: s.status === 'active' ? '#C4622D' : D.faint }}>{s.name.charAt(0)}</span>
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <p style={{ fontSize: '15px', fontWeight: 700, color: D.text }}>{s.name}</p>
                          <span style={{
                            fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em',
                            padding: '2px 8px', borderRadius: '100px',
                            background: s.status === 'active' ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.06)',
                            color: s.status === 'active' ? '#22C55E' : D.faint,
                          }}>{s.status === 'active' ? 'ACTIVE' : 'INACTIVE'}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '4px 24px' }}>
                          {[
                            { l: 'Phone', v: s.phone },
                            { l: 'WhatsApp', v: s.whatsapp || '—' },
                            { l: 'Products', v: s.products || '—' },
                            { l: 'Min batch', v: s.min_batch_size || '—' },
                            { l: 'Prep time', v: s.prep_time || '—' },
                            { l: 'Wholesale/unit', v: formatWholesalePricesDisplay(s.wholesale_price_per_unit) },
                          ].map(row => (
                            <p key={row.l} style={{ fontSize: '12px', color: D.muted }}>
                              <span style={{ color: D.faint }}>{row.l}: </span>{row.v}
                            </p>
                          ))}
                        </div>
                        {s.notes && (
                          <p style={{ fontSize: '12px', color: D.muted, marginTop: '8px', fontStyle: 'italic' }}>"{s.notes}"</p>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      <button onClick={() => handleToggleStatus(s)} style={{
                        fontSize: '11px', fontWeight: 700, padding: '7px 14px', borderRadius: '100px',
                        border: `1px solid ${D.border}`, background: 'transparent', color: D.muted, cursor: 'pointer',
                      }}>{s.status === 'active' ? 'Deactivate' : 'Activate'}</button>
                      <button onClick={() => openEdit(s)} style={{
                        fontSize: '11px', fontWeight: 700, padding: '7px 14px', borderRadius: '100px',
                        border: `1px solid ${D.border}`, background: 'transparent', color: D.muted, cursor: 'pointer',
                      }}>Edit</button>
                      <button onClick={() => handleDeleteSupplier(s.id)} disabled={deletingId === s.id} style={{
                        fontSize: '11px', fontWeight: 700, padding: '7px 14px', borderRadius: '100px',
                        border: '1px solid rgba(239,68,68,0.25)', background: 'transparent', color: 'rgba(239,68,68,0.7)', cursor: 'pointer',
                        opacity: deletingId === s.id ? 0.5 : 1,
                      }}>{deletingId === s.id ? '...' : 'Delete'}</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── COMMUNICATION CENTER ───────────────────────────────────────── */}
      {subTab === 'comms' && (
        <div>
          <p style={{ fontSize: '13px', color: D.muted, marginBottom: '20px', lineHeight: 1.6 }}>
            Active orders requiring supplier contact. Click to open dialer / messaging app, then log the response.
          </p>

          {activeOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', background: D.card, border: `1px solid ${D.border}`, borderRadius: '16px', color: D.muted, fontSize: '14px' }}>No active orders.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {activeOrders.map(order => {
                const days = daysUntil(order.requestedDate)
                const urgency = days <= 3 ? { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', label: days <= 0 ? 'TODAY' : `${days}d` }
                  : days <= 5 ? { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', label: `${days}d` }
                  : { color: D.muted, bg: 'rgba(255,255,255,0.04)', label: `${days}d` }

                return (
                  <div key={order.id} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: '16px', overflow: 'hidden' }}>
                    {/* Order header */}
                    <div style={{ padding: '16px 24px', borderBottom: `1px solid ${D.border}`, display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <p style={{ fontSize: '14px', fontWeight: 700, color: D.text }}>{order.customerName}</p>
                          <span style={{ fontSize: '11px', color: D.muted }}>{order.id}</span>
                          <span style={{ fontSize: '11px', color: D.muted }}>·</span>
                          <span style={{ fontSize: '11px', color: D.muted }}>Event: {new Date(order.requestedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      </div>
                      <div style={{ background: urgency.bg, borderRadius: '8px', padding: '5px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: urgency.color }}>{urgency.label} away</span>
                      </div>
                    </div>

                    {/* Supplier panels */}
                    <div style={{ padding: '0' }}>
                      {order.supplierPayouts.map((payout, pi) => {
                        const key = `${order.id}::${payout.supplierId}`
                        const dbSupplier = findSupplierByPayout(payout.supplierName)
                        const items = getItemsForSupplier(order.items, payout.supplierId, payout.supplierName)
                        const phone = dbSupplier?.phone ?? ''
                        const whatsapp = dbSupplier?.whatsapp || phone
                        const msg = buildMessage(items.length > 0 ? items : order.items, order.requestedDate)
                        const orderContacts = getOrderContacts(order.id, payout.supplierId)
                        const hasConfirmed = orderContacts.some(c => c.response === 'confirmed')
                        const hasDeclined  = orderContacts.some(c => c.response === 'declined')
                        const lf = getLogForm(key)
                        const isLogOpen = logOpen === key

                        return (
                          <div key={key} style={{ borderTop: pi > 0 ? `1px solid ${D.border}` : undefined, padding: '20px 24px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '14px', flexWrap: 'wrap' }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                  <p style={{ fontSize: '14px', fontWeight: 700, color: D.text }}>{payout.supplierName}</p>
                                  {hasConfirmed && <span style={{ fontSize: '10px', fontWeight: 700, background: 'rgba(34,197,94,0.12)', color: '#22C55E', borderRadius: '100px', padding: '2px 8px' }}>CONFIRMED</span>}
                                  {hasDeclined && !hasConfirmed && <span style={{ fontSize: '10px', fontWeight: 700, background: 'rgba(239,68,68,0.12)', color: '#EF4444', borderRadius: '100px', padding: '2px 8px' }}>DECLINED</span>}
                                  {!dbSupplier && <span style={{ fontSize: '10px', color: '#F59E0B' }}>Not in directory</span>}
                                </div>
                                {items.length > 0 && (
                                  <p style={{ fontSize: '12px', color: D.muted }}>
                                    {items.map(i => `${i.name} × ${i.quantity}`).join(', ')}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Declined alert */}
                            {hasDeclined && !hasConfirmed && (
                              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', fontSize: '12px', color: '#EF4444', fontWeight: 600 }}>
                                ⚠ Find a backup supplier for this order
                              </div>
                            )}

                            {/* Action buttons */}
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                              {phone ? (
                                <a href={`tel:${toDialDigits(phone)}`} style={{
                                  fontSize: '12px', fontWeight: 700, padding: '10px 18px', borderRadius: '100px',
                                  background: '#C4622D', color: '#FFF8F0', textDecoration: 'none',
                                  boxShadow: '0 4px 14px rgba(196,98,45,0.3)', display: 'inline-block',
                                }}>📞 Call Supplier</a>
                              ) : (
                                <span style={{ fontSize: '12px', fontWeight: 700, padding: '10px 18px', borderRadius: '100px', background: 'rgba(255,255,255,0.05)', color: D.faint }}>📞 Call (add to directory)</span>
                              )}
                              {whatsapp ? (
                                <a href={`https://wa.me/${toDialDigits(whatsapp)}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer" style={{
                                  fontSize: '12px', fontWeight: 700, padding: '10px 18px', borderRadius: '100px',
                                  background: 'rgba(37,211,102,0.15)', color: '#25D366', border: '1px solid rgba(37,211,102,0.25)',
                                  textDecoration: 'none', display: 'inline-block',
                                }}>💬 Send WhatsApp</a>
                              ) : (
                                <span style={{ fontSize: '12px', fontWeight: 700, padding: '10px 18px', borderRadius: '100px', background: 'rgba(255,255,255,0.05)', color: D.faint, border: `1px solid ${D.border}` }}>💬 WhatsApp (add to directory)</span>
                              )}
                              {phone ? (
                                <a href={`sms:${toDialDigits(phone)}&body=${encodeURIComponent(msg)}`} style={{
                                  fontSize: '12px', fontWeight: 700, padding: '10px 18px', borderRadius: '100px',
                                  background: 'rgba(96,165,250,0.12)', color: '#60A5FA', border: '1px solid rgba(96,165,250,0.2)',
                                  textDecoration: 'none', display: 'inline-block',
                                }}>📱 Send SMS</a>
                              ) : (
                                <span style={{ fontSize: '12px', fontWeight: 700, padding: '10px 18px', borderRadius: '100px', background: 'rgba(255,255,255,0.05)', color: D.faint, border: `1px solid ${D.border}` }}>📱 SMS (add to directory)</span>
                              )}
                            </div>

                            {/* Log contact */}
                            <button onClick={() => setLogOpen(isLogOpen ? null : key)} style={{
                              fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                              padding: '7px 14px', borderRadius: '100px', cursor: 'pointer',
                              border: `1px solid ${isLogOpen ? '#C4622D' : D.border}`,
                              background: isLogOpen ? 'rgba(196,98,45,0.08)' : 'transparent',
                              color: isLogOpen ? '#C4622D' : D.muted,
                              transition: 'all 0.18s',
                            }}>
                              {isLogOpen ? '▲ Close' : '+ Log Contact'}
                            </button>

                            {isLogOpen && (
                              <div style={{ marginTop: '14px', background: 'rgba(196,98,45,0.05)', border: '1px solid rgba(196,98,45,0.15)', borderRadius: '14px', padding: '18px' }}>
                                <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: D.faint, marginBottom: '14px' }}>Log Contact</p>

                                {/* Method */}
                                <div style={{ marginBottom: '12px' }}>
                                  <p style={{ fontSize: '11px', color: D.muted, marginBottom: '6px' }}>Method used</p>
                                  <div style={{ display: 'flex', gap: '6px' }}>
                                    {(['call', 'whatsapp', 'sms'] as const).map(m => (
                                      <button key={m} onClick={() => setLogField(key, 'method', m)} style={{
                                        fontSize: '11px', fontWeight: 700, padding: '6px 14px', borderRadius: '100px', cursor: 'pointer',
                                        border: `1px solid ${lf.method === m ? '#C4622D' : D.border}`,
                                        background: lf.method === m ? 'rgba(196,98,45,0.15)' : 'transparent',
                                        color: lf.method === m ? '#C4622D' : D.muted,
                                      }}>{METHOD_LABELS[m]}</button>
                                    ))}
                                  </div>
                                </div>

                                {/* Response */}
                                <div style={{ marginBottom: '12px' }}>
                                  <p style={{ fontSize: '11px', color: D.muted, marginBottom: '6px' }}>Response</p>
                                  <select
                                    value={lf.response}
                                    onChange={e => setLogField(key, 'response', e.target.value as SupplierContact['response'])}
                                    style={{
                                      width: '100%', padding: '10px 12px', borderRadius: '10px',
                                      border: `1px solid ${D.border}`, background: D.bg, color: D.text,
                                      fontSize: '13px', cursor: 'pointer', outline: 'none',
                                    }}
                                  >
                                    <option value="confirmed">Confirmed</option>
                                    <option value="declined">Declined</option>
                                    <option value="no_response">No response yet</option>
                                    <option value="called_back">Called back later</option>
                                  </select>
                                </div>

                                {/* Notes */}
                                <div style={{ marginBottom: '14px' }}>
                                  <p style={{ fontSize: '11px', color: D.muted, marginBottom: '6px' }}>Notes</p>
                                  <textarea
                                    value={lf.notes}
                                    onChange={e => setLogField(key, 'notes', e.target.value)}
                                    placeholder="Price agreed, pickup time, special instructions..."
                                    rows={3}
                                    style={{
                                      width: '100%', padding: '10px 12px', borderRadius: '10px',
                                      border: `1px solid ${D.border}`, background: D.bg, color: D.text,
                                      fontSize: '13px', resize: 'vertical', outline: 'none',
                                      fontFamily: 'inherit', lineHeight: 1.5, boxSizing: 'border-box',
                                    }}
                                  />
                                </div>

                                <button
                                  onClick={() => handleSaveLog(order, payout.supplierId, payout.supplierName)}
                                  disabled={savingLog === key}
                                  style={{
                                    fontSize: '12px', fontWeight: 700, padding: '10px 22px', borderRadius: '100px',
                                    border: 'none', background: '#C4622D', color: '#FFF8F0', cursor: 'pointer',
                                    opacity: savingLog === key ? 0.7 : 1,
                                  }}
                                >
                                  {savingLog === key ? 'Saving...' : 'Save Log'}
                                </button>
                              </div>
                            )}

                            {/* Timeline */}
                            {orderContacts.length > 0 && (
                              <div style={{ marginTop: '16px' }}>
                                <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: D.faint, marginBottom: '10px' }}>Contact History</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  {orderContacts.map(c => {
                                    const rc = RESPONSE_COLORS[c.response]
                                    return (
                                      <div key={c.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '10px 12px', background: `${rc}0a`, border: `1px solid ${rc}22`, borderRadius: '10px', fontSize: '12px' }}>
                                        <div style={{ flex: 1 }}>
                                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: c.notes ? '4px' : 0 }}>
                                            <span style={{ fontWeight: 700, color: rc }}>{RESPONSE_LABELS[c.response]}</span>
                                            <span style={{ color: D.faint }}>·</span>
                                            <span style={{ color: D.muted, textTransform: 'capitalize' }}>{METHOD_LABELS[c.method]}</span>
                                            <span style={{ color: D.faint }}>·</span>
                                            <span style={{ color: D.faint }}>{fmtTime(c.contacted_at)}</span>
                                          </div>
                                          {c.notes && <p style={{ color: D.muted, lineHeight: 1.5 }}>{c.notes}</p>}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── PERFORMANCE ───────────────────────────────────────────────── */}
      {subTab === 'performance' && (
        <div>
          <p style={{ fontSize: '13px', color: D.muted, marginBottom: '20px', lineHeight: 1.6 }}>
            Derived from logged contacts and recorded payouts.
          </p>
          {performanceData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', background: D.card, border: `1px solid ${D.border}`, borderRadius: '16px', color: D.muted, fontSize: '14px' }}>Add suppliers to the directory to see performance data.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {performanceData.map(({ sup, fulfilled, declined, lastContact, totalPaid }) => (
                <div key={sup.id} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: '16px', padding: '22px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: sup.status === 'active' ? 'rgba(196,98,45,0.18)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: sup.status === 'active' ? '#C4622D' : D.faint }}>{sup.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: D.text }}>{sup.name}</p>
                      <p style={{ fontSize: '11px', color: sup.status === 'active' ? '#22C55E' : D.faint }}>{sup.status}</p>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {[
                      { l: 'Orders fulfilled', v: String(fulfilled), c: fulfilled > 0 ? '#22C55E' : D.text },
                      { l: 'Orders declined',  v: String(declined),  c: declined > 0 ? '#EF4444' : D.text },
                      { l: 'Total paid',       v: `$${totalPaid.toFixed(2)}`, c: D.text },
                      { l: 'Last contacted',   v: lastContact ? fmtTime(lastContact) : 'Never', c: D.muted },
                    ].map(stat => (
                      <div key={stat.l} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '12px' }}>
                        <p style={{ fontSize: '10px', fontWeight: 700, color: D.faint, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>{stat.l}</p>
                        <p style={{ fontSize: '16px', fontWeight: 700, color: stat.c, fontFamily: 'var(--font-playfair), Georgia, serif' }}>{stat.v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Add / Edit Modal ──────────────────────────────────────────── */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(14,8,6,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100, padding: '24px',
        }} onClick={() => setShowModal(false)}>
          <div style={{
            background: '#1E1008', border: `1px solid ${D.border}`, borderRadius: '20px',
            padding: '32px', maxWidth: '520px', width: '100%', maxHeight: '90vh',
            overflowY: 'auto',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: '20px', fontWeight: 700, color: D.text }}>
                {editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: D.muted, fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Supplier Name */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: D.faint, display: 'block', marginBottom: '6px' }}>Supplier Name *</label>
                <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Auntie Ama"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: `1px solid ${D.border}`, background: D.bg, color: D.text, fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              {/* Phone — auto-formatted */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: D.faint, display: 'block', marginBottom: '6px' }}>Phone Number *</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => {
                    const formatted = formatPhone(e.target.value)
                    setForm(p => ({ ...p, phone: formatted }))
                    if (whatsappSameAsPhone) setForm(p => ({ ...p, phone: formatted }))
                  }}
                  placeholder="+1 (617) 555-0000"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: `1px solid ${D.border}`, background: D.bg, color: D.text, fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              {/* WhatsApp — same as phone toggle or separate input */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: D.faint, display: 'block', marginBottom: '8px' }}>WhatsApp</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: whatsappSameAsPhone ? 0 : '8px' }}>
                  {([true, false] as const).map(same => (
                    <button key={String(same)} type="button" onClick={() => {
                      setWhatsappSameAsPhone(same)
                      if (same) setForm(p => ({ ...p, whatsapp: '' }))
                    }} style={{
                      fontSize: '12px', fontWeight: 700, padding: '8px 16px', borderRadius: '100px', cursor: 'pointer',
                      border: `1px solid ${whatsappSameAsPhone === same ? '#C4622D' : D.border}`,
                      background: whatsappSameAsPhone === same ? 'rgba(196,98,45,0.15)' : 'transparent',
                      color: whatsappSameAsPhone === same ? '#C4622D' : D.muted,
                      transition: 'all 0.15s',
                    }}>
                      {same ? 'Same as phone' : 'Different number'}
                    </button>
                  ))}
                </div>
                {!whatsappSameAsPhone && (
                  <input
                    type="tel"
                    value={form.whatsapp}
                    onChange={e => setForm(p => ({ ...p, whatsapp: formatPhone(e.target.value) }))}
                    placeholder="+1 (617) 555-0000"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: `1px solid ${D.border}`, background: D.bg, color: D.text, fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                )}
                {whatsappSameAsPhone && (
                  <p style={{ fontSize: '12px', color: D.faint, marginTop: '6px' }}>Will use: {form.phone || '(enter phone number above)'}</p>
                )}
              </div>

              {/* What they make */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: D.faint, display: 'block', marginBottom: '6px' }}>What they make</label>
                <ProductsPicker
                  value={form.products}
                  onChange={v => {
                    setForm(p => ({ ...p, products: v }))
                    const selected = v ? v.split(',').map(s => s.trim()).filter(Boolean) : []
                    setWholesalePrices(prev => {
                      const next: Record<string, string> = {}
                      for (const name of selected) next[name] = prev[name] ?? ''
                      return next
                    })
                  }}
                />
              </div>

              {/* Wholesale price per item */}
              {form.products && (
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: D.faint, display: 'block', marginBottom: '8px' }}>
                    What they charge you (per item)
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {form.products.split(',').map(s => s.trim()).filter(Boolean).map(name => {
                      const unit = MENU_ITEMS.find(m => m.name === name)?.unit ?? ''
                      return (
                        <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '10px 14px' }}>
                          <span style={{ fontSize: '13px', color: D.text, flex: 1 }}>{name}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '13px', color: D.muted }}>$</span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={wholesalePrices[name] ?? ''}
                              onChange={e => setWholesalePrices(prev => ({ ...prev, [name]: e.target.value }))}
                              placeholder="0"
                              style={{
                                width: '80px', padding: '6px 10px', borderRadius: '8px',
                                border: `1px solid ${D.border}`, background: D.bg, color: D.text,
                                fontSize: '13px', outline: 'none', textAlign: 'right',
                              }}
                            />
                            {unit && <span style={{ fontSize: '11px', color: D.faint, whiteSpace: 'nowrap' }}>{unit}</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {[
                { key: 'min_batch_size', label: 'Minimum batch size', ph: 'e.g. 1 full pan' },
                { key: 'prep_time',      label: 'Usual prep time',    ph: 'e.g. 2 days notice' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: D.faint, display: 'block', marginBottom: '6px' }}>{f.label}</label>
                  <input
                    type="text"
                    value={(form as Record<string, string>)[f.key] ?? ''}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.ph}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: `1px solid ${D.border}`, background: D.bg, color: D.text, fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              ))}

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: D.faint, display: 'block', marginBottom: '6px' }}>Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Anything important to remember about this supplier..."
                  rows={3}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '10px',
                    border: `1px solid ${D.border}`, background: D.bg, color: D.text,
                    fontSize: '13px', resize: 'vertical', outline: 'none',
                    fontFamily: 'inherit', lineHeight: 1.5, boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: D.faint, display: 'block', marginBottom: '8px' }}>Status</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['active', 'inactive'] as const).map(s => (
                    <button key={s} onClick={() => setForm(prev => ({ ...prev, status: s }))} style={{
                      fontSize: '12px', fontWeight: 700, padding: '8px 18px', borderRadius: '100px', cursor: 'pointer', textTransform: 'capitalize',
                      border: `1px solid ${form.status === s ? '#C4622D' : D.border}`,
                      background: form.status === s ? 'rgba(196,98,45,0.15)' : 'transparent',
                      color: form.status === s ? '#C4622D' : D.muted,
                    }}>{s}</button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '28px' }}>
              <button onClick={() => setShowModal(false)} style={{ fontSize: '13px', fontWeight: 700, padding: '11px 22px', borderRadius: '100px', border: `1px solid ${D.border}`, background: 'transparent', color: D.muted, cursor: 'pointer' }}>Cancel</button>
              <button
                onClick={handleSaveSupplier}
                disabled={formSaving || !form.name.trim() || !form.phone.trim()}
                style={{
                  fontSize: '13px', fontWeight: 700, padding: '11px 28px', borderRadius: '100px',
                  border: 'none', background: '#C4622D', color: '#FFF8F0', cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(196,98,45,0.3)',
                  opacity: formSaving || !form.name.trim() || !form.phone.trim() ? 0.6 : 1,
                }}
              >
                {formSaving ? 'Saving...' : editingSupplier ? 'Save Changes' : 'Add Supplier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
