'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Script from 'next/script'
import Link from 'next/link'
import Footer from '@/components/Footer'
import { PLATES_MENU, PLATE_CATEGORIES, getPlatesServiceFee } from '@/lib/platesMenu'
import { formatCurrency } from '@/lib/utils'

declare global {
  interface Window {
    Square?: {
      payments: (appId: string, locationId: string) => Promise<{
        card: () => Promise<{
          attach: (selector: string) => Promise<void>
          tokenize: () => Promise<{ status: string; token?: string; errors?: { message: string }[] }>
        }>
      }>
    }
  }
}

type Step = 'menu' | 'checkout' | 'success'
type Fulfillment = 'pickup' | 'delivery'

interface DeliveryInfo {
  fee: number
  minutes: number
  miles: number
  formatted: string
}

function isOrderingOpen(): boolean {
  return true // temporarily open for testing — restore hours check before going live
}

export default function OrderNowPage() {
  const [step, setStep] = useState<Step>('menu')
  const [activeCategory, setActiveCategory] = useState<string>(PLATE_CATEGORIES[0])
  const [cart, setCart] = useState<Record<string, number>>({})

  // Fulfillment
  const [fulfillment, setFulfillment] = useState<Fulfillment>('pickup')
  const [address, setAddress] = useState('')
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo | null>(null)
  const [feeLoading, setFeeLoading] = useState(false)
  const [feeError, setFeeError] = useState('')

  // Contact
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [specialInstructions, setSpecialInstructions] = useState('')

  // Payment
  const [sdkReady, setSdkReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  const cardRef = useRef<{ tokenize: () => Promise<{ status: string; token?: string; errors?: { message: string }[] }> } | null>(null)
  const cardInitialized = useRef(false)

  const open = isOrderingOpen()

  // Computed cart values
  const cartItems = PLATES_MENU.filter(item => (cart[item.id] ?? 0) > 0)
    .map(item => ({ ...item, quantity: cart[item.id] }))
  const totalQty = cartItems.reduce((s, i) => s + i.quantity, 0)
  const subtotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0)
  const deliveryFee = fulfillment === 'delivery' ? (deliveryInfo?.fee ?? 0) : 0
  const serviceFee = getPlatesServiceFee(subtotal, deliveryFee)
  const total = subtotal + serviceFee + deliveryFee

  // Square SDK init
  useEffect(() => {
    if (step !== 'checkout' || !sdkReady || cardInitialized.current || !window.Square) return
    cardInitialized.current = true
    ;(async () => {
      try {
        const payments = await window.Square!.payments(
          process.env.NEXT_PUBLIC_SQUARE_APP_ID!,
          process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID!
        )
        const card = await payments.card()
        await card.attach('#square-card-plates')
        cardRef.current = card
      } catch (e) {
        console.error('[SQUARE] Init error:', e)
        cardInitialized.current = false
      }
    })()
  }, [step, sdkReady])

  // Re-init Square if going back to checkout
  useEffect(() => {
    if (step !== 'checkout') {
      cardInitialized.current = false
      cardRef.current = null
    }
  }, [step])

  // Delivery fee debounce
  const feeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fetchDeliveryFee = useCallback(async (addr: string) => {
    if (!addr || addr.length < 8) { setDeliveryInfo(null); setFeeError(''); return }
    setFeeLoading(true)
    setFeeError('')
    try {
      const r = await fetch('/api/delivery-fee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: addr }),
      })
      const data = await r.json()
      if (!r.ok) { setFeeError(data.error ?? 'Address not found'); setDeliveryInfo(null) }
      else setDeliveryInfo({ fee: data.deliveryFee, minutes: data.estimatedMinutes, miles: data.distanceMiles, formatted: data.formattedDistance })
    } catch {
      setFeeError('Could not calculate distance. Check your address.')
    } finally {
      setFeeLoading(false)
    }
  }, [])

  const handleAddressChange = (val: string) => {
    setAddress(val)
    setDeliveryInfo(null)
    setFeeError('')
    if (feeTimeout.current) clearTimeout(feeTimeout.current)
    feeTimeout.current = setTimeout(() => fetchDeliveryFee(val), 900)
  }

  const adjustQty = (id: string, delta: number) => {
    setCart(prev => {
      const current = prev[id] ?? 0
      const next = Math.max(0, current + delta)
      if (next === 0) { const { [id]: _, ...rest } = prev; return rest }
      return { ...prev, [id]: next }
    })
  }

  const canCheckout = cartItems.length > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!cardRef.current) { setError('Payment form not ready. Refresh and try again.'); return }
    if (!name.trim() || !email.trim()) { setError('Name and email are required.'); return }
    if (fulfillment === 'delivery' && !deliveryInfo) { setError('Please enter a valid delivery address.'); return }

    setLoading(true)
    setError('')

    try {
      const result = await cardRef.current.tokenize()
      if (result.status !== 'OK' || !result.token) {
        setError(result.errors?.[0]?.message ?? 'Card error. Please check your card details.')
        setLoading(false)
        return
      }

      const res = await fetch('/api/plates-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: result.token,
          amount: total,
          order: {
            customerName: name.trim(),
            customerPhone: phone.trim(),
            customerEmail: email.trim(),
            fulfillmentType: fulfillment,
            address: fulfillment === 'delivery' ? address.trim() : '',
            items: cartItems.map(i => ({
              itemId: i.id,
              name: i.name,
              quantity: i.quantity,
              unitPrice: i.price,
            })),
            subtotal,
            deliveryFee,
            serviceFee,
            total,
            specialInstructions: specialInstructions.trim(),
          },
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        setLoading(false)
        return
      }

      setOrderNumber(data.orderNumber)
      setStep('success')
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  const visibleItems = PLATES_MENU.filter(i => i.category === activeCategory)

  return (
    <>
      <Script
        src="https://web.squarecdn.com/v1/square.js"
        onLoad={() => setSdkReady(true)}
      />

      <div style={{ minHeight: '100vh', background: '#FFF8F0', paddingTop: '76px' }}>

        {/* ── Dark header banner ───────────────────────────────────────── */}
        <div style={{ background: '#1A0F0A', color: '#FFF8F0', padding: '36px 0 28px' }}>
          <div className="wrap">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                {step !== 'menu' && (
                  <button
                    onClick={() => setStep(step === 'checkout' ? 'menu' : 'menu')}
                    style={{ background: 'none', border: 'none', color: '#C4622D', cursor: 'pointer', fontSize: '13px', fontWeight: 600, letterSpacing: '0.04em', marginBottom: '8px', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    ← {step === 'checkout' ? 'Back to Menu' : ''}
                  </button>
                )}
                <h1 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 700, margin: 0, lineHeight: 1.1 }}>
                  {step === 'menu' ? 'Order Today' : step === 'checkout' ? 'Checkout' : 'Order Placed'}
                </h1>
                <p style={{ marginTop: '8px', fontSize: '14px', color: '#A08070', letterSpacing: '0.02em' }}>
                  {step === 'menu' && (open
                    ? 'Fresh Ghanaian plates · Ready by 5pm · Pickup or Delivery'
                    : 'Orders open 11am – 4:30pm ET · Come back tomorrow'
                  )}
                  {step === 'checkout' && 'Almost there — enter your details below'}
                  {step === 'success' && `Order ${orderNumber} confirmed`}
                </p>
              </div>

              {/* Hours badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: open ? 'rgba(196,98,45,0.15)' : 'rgba(255,255,255,0.07)', border: `1px solid ${open ? '#C4622D' : '#3A2A20'}`, borderRadius: '100px', padding: '6px 14px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: open ? '#4CAF50' : '#FF6B6B', flexShrink: 0 }} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: open ? '#C4622D' : '#A08070', letterSpacing: '0.05em' }}>
                  {open ? 'OPEN NOW' : 'CLOSED'}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* ── Menu step ───────────────────────────────────────────────────── */}
        {step === 'menu' && (
          <div className="wrap" style={{ padding: '32px 0 120px' }}>
            {!open && (
              <div style={{ background: '#FFF0E8', border: '1.5px solid #C4622D', borderRadius: '12px', padding: '20px 24px', marginBottom: '32px' }}>
                <p style={{ margin: 0, fontSize: '15px', color: '#1A0F0A', fontWeight: 600 }}>
                  We&apos;re not taking orders right now.
                </p>
                <p style={{ margin: '6px 0 0', fontSize: '14px', color: '#6B4C3B' }}>
                  Orders open Monday–Friday, 11am–4:30pm ET. Come back then to place your order.
                </p>
              </div>
            )}

            {/* Category tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', overflowX: 'auto', paddingBottom: '4px' }}>
              {PLATE_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '100px',
                    border: `1.5px solid ${activeCategory === cat ? '#C4622D' : '#E2CEB8'}`,
                    background: activeCategory === cat ? '#C4622D' : 'transparent',
                    color: activeCategory === cat ? '#FFF8F0' : '#6B4C3B',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    transition: 'all 0.15s',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Menu grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {visibleItems.map(item => {
                const qty = cart[item.id] ?? 0
                return (
                  <div
                    key={item.id}
                    style={{
                      background: '#FFF8F0',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      border: '1.5px solid #E2CEB8',
                      opacity: item.available ? 1 : 0.6,
                      boxShadow: qty > 0 ? '0 0 0 2px #C4622D' : 'none',
                      transition: 'box-shadow 0.18s',
                    }}
                  >
                    {/* Gradient image placeholder */}
                    <div style={{ height: '140px', background: item.gradient, position: 'relative' }}>
                      {!item.available && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,15,10,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', color: '#FFF8F0', textTransform: 'uppercase', background: 'rgba(0,0,0,0.5)', padding: '4px 10px', borderRadius: '100px' }}>Coming Soon</span>
                        </div>
                      )}
                    </div>

                    <div style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ margin: 0, fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: '17px', fontWeight: 700, color: '#1A0F0A' }}>{item.name}</h3>
                          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6B4C3B', lineHeight: 1.5 }}>{item.description}</p>
                        </div>
                        <span style={{ fontWeight: 800, fontSize: '16px', color: '#C4622D', flexShrink: 0 }}>{formatCurrency(item.price)}</span>
                      </div>

                      {item.available && (
                        <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {qty === 0 ? (
                            <button
                              onClick={() => adjustQty(item.id, 1)}
                              disabled={!open}
                              style={{
                                width: '100%',
                                padding: '10px',
                                borderRadius: '10px',
                                border: 'none',
                                background: open ? '#C4622D' : '#E2CEB8',
                                color: open ? '#FFF8F0' : '#A08070',
                                fontSize: '13px',
                                fontWeight: 700,
                                cursor: open ? 'pointer' : 'not-allowed',
                                letterSpacing: '0.04em',
                              }}
                            >
                              {open ? 'Add to Order' : 'Ordering Closed'}
                            </button>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0', width: '100%', background: '#F5EDE0', borderRadius: '10px', overflow: 'hidden' }}>
                              <button
                                onClick={() => adjustQty(item.id, -1)}
                                style={{ flex: 1, padding: '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', fontWeight: 700, color: '#C4622D' }}
                              >−</button>
                              <span style={{ fontSize: '15px', fontWeight: 800, color: '#1A0F0A', minWidth: '28px', textAlign: 'center' }}>{qty}</span>
                              <button
                                onClick={() => adjustQty(item.id, 1)}
                                style={{ flex: 1, padding: '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', fontWeight: 700, color: '#C4622D' }}
                              >+</button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Checkout step ────────────────────────────────────────────────── */}
        {step === 'checkout' && (
          <div className="wrap" style={{ padding: '32px 0 80px' }}>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,360px)', gap: '32px', alignItems: 'start' }}>

                {/* Left: Contact + Card */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                  {/* Contact */}
                  <div style={{ background: '#FFF8F0', border: '1.5px solid #E2CEB8', borderRadius: '16px', padding: '24px' }}>
                    <h2 style={{ margin: '0 0 20px', fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: '20px', color: '#1A0F0A' }}>Your Details</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {[
                        { label: 'Full Name', value: name, setter: setName, type: 'text', required: true, placeholder: 'Kwame Mensah' },
                        { label: 'Phone Number', value: phone, setter: setPhone, type: 'tel', required: false, placeholder: '+1 617 000 0000' },
                        { label: 'Email Address', value: email, setter: setEmail, type: 'email', required: true, placeholder: 'you@example.com' },
                      ].map(field => (
                        <div key={field.label}>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B4C3B', marginBottom: '6px' }}>
                            {field.label}{field.required && ' *'}
                          </label>
                          <input
                            type={field.type}
                            value={field.value}
                            onChange={e => field.setter(e.target.value)}
                            placeholder={field.placeholder}
                            required={field.required}
                            style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #E2CEB8', background: '#FEFAF6', fontSize: '14px', color: '#1A0F0A', outline: 'none', boxSizing: 'border-box' }}
                          />
                        </div>
                      ))}

                      {/* Fulfillment */}
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B4C3B', marginBottom: '6px' }}>Fulfillment</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {(['pickup', 'delivery'] as Fulfillment[]).map(type => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setFulfillment(type)}
                              style={{
                                flex: 1,
                                padding: '10px',
                                borderRadius: '10px',
                                border: `1.5px solid ${fulfillment === type ? '#C4622D' : '#E2CEB8'}`,
                                background: fulfillment === type ? '#FFF0E8' : 'transparent',
                                color: fulfillment === type ? '#C4622D' : '#6B4C3B',
                                fontSize: '13px',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              {type === 'pickup' ? 'Pickup' : 'Delivery'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Delivery address in checkout */}
                      {fulfillment === 'delivery' && (
                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B4C3B', marginBottom: '6px' }}>Delivery Address *</label>
                          <input
                            type="text"
                            value={address}
                            onChange={e => handleAddressChange(e.target.value)}
                            placeholder="123 Main St, Brockton, MA"
                            style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: `1.5px solid ${feeError ? '#FF6B6B' : '#E2CEB8'}`, background: '#FEFAF6', fontSize: '14px', color: '#1A0F0A', outline: 'none', boxSizing: 'border-box' }}
                          />
                          {feeLoading && <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#A08070' }}>Calculating…</p>}
                          {feeError && <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#E05050' }}>{feeError}</p>}
                          {deliveryInfo && !feeError && (
                            <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#C4622D', fontWeight: 600 }}>
                              {deliveryInfo.formatted} · {formatCurrency(deliveryInfo.fee)} · ~{deliveryInfo.minutes} min
                            </p>
                          )}
                        </div>
                      )}

                      {/* Pickup location */}
                      {fulfillment === 'pickup' && (
                        <div style={{ background: '#F5EDE0', borderRadius: '10px', padding: '12px 14px' }}>
                          <p style={{ margin: 0, fontSize: '13px', color: '#6B4C3B' }}>
                            <strong style={{ color: '#1A0F0A' }}>Pickup location:</strong> Randolph, MA 02368 — we&apos;ll text you exact details when your order is ready.
                          </p>
                        </div>
                      )}

                      {/* Special instructions */}
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B4C3B', marginBottom: '6px' }}>Special Instructions</label>
                        <textarea
                          value={specialInstructions}
                          onChange={e => setSpecialInstructions(e.target.value)}
                          placeholder="Any allergies or requests?"
                          rows={2}
                          style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #E2CEB8', background: '#FEFAF6', fontSize: '14px', color: '#1A0F0A', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Square card */}
                  <div style={{ background: '#FFF8F0', border: '1.5px solid #E2CEB8', borderRadius: '16px', padding: '24px' }}>
                    <h2 style={{ margin: '0 0 20px', fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: '20px', color: '#1A0F0A' }}>Payment</h2>
                    <div id="square-card-plates" style={{ minHeight: '89px' }} />
                    {!sdkReady && <p style={{ fontSize: '13px', color: '#A08070', marginTop: '8px' }}>Loading payment form…</p>}
                  </div>

                  {error && (
                    <div style={{ background: '#FFF0F0', border: '1.5px solid #FFCCCC', borderRadius: '10px', padding: '14px 16px' }}>
                      <p style={{ margin: 0, fontSize: '14px', color: '#C03030' }}>{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !sdkReady || (fulfillment === 'delivery' && !deliveryInfo)}
                    style={{
                      width: '100%',
                      padding: '16px',
                      borderRadius: '12px',
                      border: 'none',
                      background: loading ? '#A08070' : '#C4622D',
                      color: '#FFF8F0',
                      fontSize: '15px',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      transition: 'background 0.18s',
                    }}
                  >
                    {loading ? 'Processing…' : `Place Order · ${formatCurrency(total)}`}
                  </button>
                </div>

                {/* Right: Order summary */}
                <div style={{ background: '#FFF8F0', border: '1.5px solid #E2CEB8', borderRadius: '16px', padding: '24px', position: 'sticky', top: '96px' }}>
                  <h2 style={{ margin: '0 0 20px', fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: '18px', color: '#1A0F0A' }}>Your Order</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                    {cartItems.map(item => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: item.gradient, flexShrink: 0 }} />
                          <div>
                            <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#1A0F0A' }}>{item.name}</p>
                            <p style={{ margin: 0, fontSize: '12px', color: '#A08070' }}>× {item.quantity}</p>
                          </div>
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#1A0F0A', flexShrink: 0 }}>{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ borderTop: '1px solid #E2CEB8', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                      { label: 'Subtotal', value: subtotal },
                      { label: 'Service fee', value: serviceFee },
                      ...(fulfillment === 'delivery' ? [{ label: `Delivery (${deliveryInfo?.formatted ?? '—'})`, value: deliveryFee }] : []),
                    ].map(row => (
                      <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '13px', color: '#6B4C3B' }}>{row.label}</span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1A0F0A' }}>{formatCurrency(row.value)}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E2CEB8', paddingTop: '12px', marginTop: '4px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: '#1A0F0A' }}>Total</span>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: '#C4622D' }}>{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* ── Success step ─────────────────────────────────────────────────── */}
        {step === 'success' && (
          <div className="wrap" style={{ padding: '64px 0 80px', textAlign: 'center', maxWidth: '560px', margin: '0 auto' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#C4622D', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: '32px' }}>
              ✓
            </div>
            <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 700, color: '#1A0F0A', margin: '0 0 12px' }}>
              Order Confirmed
            </h2>
            <p style={{ fontSize: '16px', color: '#6B4C3B', margin: '0 0 8px' }}>Order number: <strong style={{ color: '#1A0F0A' }}>{orderNumber}</strong></p>
            <p style={{ fontSize: '14px', color: '#6B4C3B', margin: '0 0 32px', lineHeight: 1.6 }}>
              {fulfillment === 'delivery'
                ? `We're preparing your order now. Estimated delivery: ~${deliveryInfo?.minutes ?? '35'} minutes once we head out around 5pm.`
                : `Your order is being prepared. We'll text you when it's ready for pickup in Randolph, MA.`}
            </p>
            <Link
              href="/"
              style={{ display: 'inline-block', padding: '14px 32px', borderRadius: '100px', background: '#C4622D', color: '#FFF8F0', textDecoration: 'none', fontSize: '14px', fontWeight: 700, letterSpacing: '0.04em' }}
            >
              Back to Home
            </Link>
          </div>
        )}

        {/* ── Sticky cart bar ───────────────────────────────────────────────── */}
        {step === 'menu' && totalQty > 0 && (
          <div style={{
            position: 'fixed',
            bottom: 0, left: 0, right: 0,
            background: '#1A0F0A',
            borderTop: '1px solid #3A2A20',
            padding: '16px 0',
            zIndex: 100,
          }}>
            <div className="wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
              <div style={{ color: '#FFF8F0' }}>
                <span style={{ fontSize: '14px', fontWeight: 700 }}>{totalQty} item{totalQty !== 1 ? 's' : ''}</span>
                <span style={{ color: '#A08070', fontSize: '14px', margin: '0 12px' }}>·</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#C4622D' }}>{formatCurrency(subtotal)}</span>
                <span style={{ color: '#A08070', fontSize: '13px', marginLeft: '8px' }}>+ delivery</span>
              </div>
              <button
                onClick={() => setStep('checkout')}
                style={{
                  padding: '12px 28px',
                  borderRadius: '100px',
                  border: 'none',
                  background: '#C4622D',
                  color: '#FFF8F0',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  letterSpacing: '0.04em',
                  transition: 'background 0.18s',
                  flexShrink: 0,
                }}
              >
                Checkout →
              </button>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </>
  )
}
