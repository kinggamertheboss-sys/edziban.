'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import Footer from '@/components/Footer'
import { useCart } from '@/context/CartContext'
import { formatCurrency, getDeliveryFee, getServiceFee, getTimeLabel } from '@/lib/utils'

const STEPS = ['Menu', 'Your Details', 'Payment']

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

export default function PaymentPage() {
  const router = useRouter()
  const { items, orderDetails, hydrated, subtotal, totalItems, clearCart } = useCart()
  const [loading, setLoading] = useState(false)
  const [sdkReady, setSdkReady] = useState(() => typeof window !== 'undefined' && !!window.Square)
  const [cardError, setCardError] = useState('')
  const cardRef = useRef<{ tokenize: () => Promise<{ status: string; token?: string; errors?: { message: string }[] }> } | null>(null)
  const cardInitialized = useRef(false)

  useEffect(() => {
    if (!hydrated) return
    if (totalItems === 0) router.push('/menu')
    if (!orderDetails) router.push('/order')
  }, [hydrated, totalItems, orderDetails, router])

  useEffect(() => {
    if (!sdkReady || cardInitialized.current || !window.Square) return
    cardInitialized.current = true
    ;(async () => {
      try {
        const payments = await window.Square!.payments(
          process.env.NEXT_PUBLIC_SQUARE_APP_ID!,
          process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID!
        )
        const card = await payments.card()
        await card.attach('#square-card')
        cardRef.current = card
      } catch (e) {
        console.error('[SQUARE] Init error:', e)
        cardInitialized.current = false
      }
    })()
  }, [sdkReady])

  if (!hydrated || !orderDetails || totalItems === 0) return null
  const od = orderDetails

  const deliveryFee = od.fulfillmentType === 'delivery' ? getDeliveryFee(od.distanceRange) : 0
  const serviceFee = getServiceFee(subtotal, deliveryFee)
  const total = subtotal + serviceFee + deliveryFee

  async function handlePlaceOrder(e: React.FormEvent) {
    e.preventDefault()
    if (!cardRef.current) { setCardError('Card form not ready. Please wait a moment.'); return }
    setLoading(true)
    setCardError('')

    try {
      const result = await cardRef.current.tokenize()
      if (result.status !== 'OK' || !result.token) {
        setCardError(result.errors?.[0]?.message ?? 'Card error. Please check your details.')
        setLoading(false)
        return
      }

      const paymentRes = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: result.token,
          amount: total,
          order: {
            customerName: od.fullName,
            customerPhone: od.phone,
            customerEmail: od.email,
            eventType: od.eventType ?? '',
            guestCount: od.guestCount,
            items: items.map(i => ({ itemId: i.id, name: i.name, quantity: i.quantity, unitPrice: i.price })),
            fulfillmentType: od.fulfillmentType,
            address: od.address ?? '',
            distanceRange: od.distanceRange ?? '',
            requestedDate: od.preferredDate,
            requestedTime: od.preferredTime,
            specialInstructions: od.specialInstructions ?? '',
            subtotal,
            serviceFee,
            deliveryFee,
            total,
            clientType: od.clientType ?? 'regular',
            orgName: od.orgName ?? '',
            contactPerson: od.contactPerson ?? '',
            billingEmail: od.billingEmail ?? '',
            poNumber: od.poNumber ?? '',
            requestInvoice: od.requestInvoice ?? false,
          },
        }),
      })

      if (!paymentRes.ok) {
        const err = await paymentRes.json()
        setCardError(err.error ?? 'Payment failed. Please try again.')
        setLoading(false)
        return
      }

      const { orderNumber } = await paymentRes.json()
      // Notifications are now fired server-side inside /api/payments — no client call needed.

      const isCorp = od.clientType === 'corporate'
      router.push(`/confirmation?order=${orderNumber}${isCorp ? '&type=corporate' : ''}`)
      setTimeout(() => clearCart(), 300)
    } catch (err) {
      console.error('[PAYMENT] Error:', err)
      setCardError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  const distanceLabel: Record<string, string> = {
    '0-5': '0-5 miles', '5-10': '5-10 miles', '10-15': '10-15 miles', '15+': '15+ miles',
  }

  const squareSrc = process.env.NEXT_PUBLIC_SQUARE_APP_ID?.startsWith('sandbox')
    ? 'https://sandbox.web.squarecdn.com/v1/square.js'
    : 'https://web.squarecdn.com/v1/square.js'

  return (
    <>
      <Script src={squareSrc} strategy="afterInteractive" onReady={() => setSdkReady(true)} />

      {/* Dark page header */}
      <div style={{ background: '#1A0F0A', paddingTop: '56px', paddingBottom: '48px', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', right: '-40px', top: '50%',
          transform: 'translateY(-50%)',
          fontFamily: 'var(--font-playfair), Georgia, serif',
          fontSize: '280px', fontWeight: 700,
          color: 'rgba(196,98,45,0.06)', lineHeight: 1,
          userSelect: 'none', pointerEvents: 'none',
        }}>E</div>

        <div className="wrap" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>

            {/* Progress steps */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '36px' }}>
              {STEPS.map((label, i) => {
                const step = i + 1
                const done = step < 3
                const active = step === 3
                return (
                  <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '30px', height: '30px', borderRadius: '50%',
                        background: done ? '#C4622D' : active ? 'transparent' : 'rgba(255,255,255,0.07)',
                        border: active ? '2px solid #C4622D' : 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {done ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFF8F0" strokeWidth="3" strokeLinecap="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        ) : (
                          <span style={{ fontSize: '11px', fontWeight: 700, color: active ? '#C4622D' : 'rgba(255,255,255,0.25)' }}>{step}</span>
                        )}
                      </div>
                      <span style={{
                        fontSize: '10px', fontWeight: 700,
                        letterSpacing: '0.1em', textTransform: 'uppercase',
                        color: done || active ? '#C4622D' : 'rgba(255,255,255,0.25)',
                        whiteSpace: 'nowrap',
                      }}>{label}</span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div style={{
                        width: '64px', height: '1px', margin: '0 10px', marginBottom: '22px',
                        background: done ? '#C4622D' : 'rgba(255,255,255,0.1)',
                        flexShrink: 0,
                      }} />
                    )}
                  </div>
                )
              })}
            </div>

            <h1 style={{
              fontFamily: 'var(--font-playfair), Georgia, serif',
              fontSize: 'clamp(2rem, 4vw, 2.8rem)',
              fontWeight: 700, lineHeight: 1.05,
              letterSpacing: '-0.025em',
              color: '#FFF8F0',
            }}>
              Review and pay.
            </h1>
          </div>
        </div>
      </div>

      <main style={{ background: '#FFF8F0', paddingBottom: '80px' }}>
        <div className="wrap">
          <div style={{ maxWidth: '640px', margin: '0 auto', paddingTop: '48px' }}>

            <form onSubmit={handlePlaceOrder} style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

              <div style={{ background: 'white', border: '1px solid #E2CEB8', borderRadius: '20px', overflow: 'hidden' }}>

                {/* Order breakdown */}
                <div className="card-section" style={{ padding: '32px 32px 28px' }}>
                  <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: '18px', fontWeight: 700, color: '#1A0F0A', marginBottom: '20px' }}>
                    Order breakdown
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                    {items.map(item => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px' }}>
                        <span style={{ color: '#1A0F0A' }}>
                          {item.name} <span style={{ color: '#9E7A52' }}>× {item.quantity}</span>
                        </span>
                        <span style={{ fontWeight: 600, color: '#1A0F0A' }}>{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ height: '1px', background: '#E2CEB8', marginBottom: '14px' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#6B4C3B' }}>Subtotal</span>
                      <span style={{ color: '#1A0F0A', fontWeight: 500 }}>{formatCurrency(subtotal)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#6B4C3B' }}>Service fee</span>
                      <span style={{ color: '#1A0F0A', fontWeight: 500 }}>{formatCurrency(serviceFee)}</span>
                    </div>
                    {od.fulfillmentType === 'delivery' && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span style={{ color: '#6B4C3B' }}>Delivery fee ({distanceLabel[od.distanceRange] ?? od.distanceRange})</span>
                        <span style={{ color: '#1A0F0A', fontWeight: 500 }}>{formatCurrency(deliveryFee)}</span>
                      </div>
                    )}
                    <div style={{ height: '1px', background: '#E2CEB8', margin: '2px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: '#1A0F0A' }}>Total</span>
                      <span style={{ fontSize: '18px', fontWeight: 700, color: '#C4622D' }}>{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>

                <div style={{ height: '1px', background: '#F0E4D0' }} />

                {/* Event details */}
                <div className="card-section" style={{ padding: '28px 32px' }}>
                  <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: '18px', fontWeight: 700, color: '#1A0F0A', marginBottom: '16px' }}>
                    Event details
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[
                      { label: 'Contact', value: od.fullName },
                      { label: 'Phone', value: od.phone },
                      { label: 'Guests', value: od.guestCount ? String(od.guestCount) : '' },
                      { label: 'Fulfillment', value: od.fulfillmentType === 'delivery' ? 'Delivery' : 'Pickup' },
                      ...(od.fulfillmentType === 'delivery' && od.address ? [{ label: 'Address', value: od.address }] : []),
                      { label: 'Date', value: od.preferredDate },
                      { label: 'Time', value: getTimeLabel(od.preferredTime) },
                      ...(od.specialInstructions ? [{ label: 'Notes', value: od.specialInstructions }] : []),
                    ].filter(r => r.value).map(row => (
                      <div key={row.label} style={{ display: 'flex', gap: '16px', fontSize: '13.5px' }}>
                        <span style={{ width: '80px', flexShrink: 0, color: '#9E7A52', fontWeight: 600 }}>{row.label}</span>
                        <span style={{ color: '#1A0F0A', fontWeight: 500 }}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ height: '1px', background: '#F0E4D0' }} />

                {/* Square card form */}
                <div className="card-section" style={{ padding: '28px 32px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: '18px', fontWeight: 700, color: '#1A0F0A' }}>
                      Card details
                    </h2>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {['VISA', 'MC', 'AMEX'].map(b => (
                        <span key={b} style={{
                          fontSize: '10px', fontWeight: 700,
                          padding: '4px 8px', borderRadius: '6px',
                          border: '1px solid #E2CEB8', color: '#9E7A52',
                          letterSpacing: '0.05em',
                        }}>{b}</span>
                      ))}
                    </div>
                  </div>

                  {!sdkReady && (
                    <div style={{ fontSize: '13px', color: '#9E7A52', padding: '16px 0' }}>Loading payment form...</div>
                  )}

                  <div id="square-card" style={{ minHeight: '89px' }} />

                  {cardError && (
                    <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '8px' }}>{cardError}</p>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#9E7A52', marginTop: '12px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    Encrypted and secure. Powered by Square.
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  type="submit"
                  disabled={loading || !sdkReady}
                  style={{
                    width: '100%',
                    background: '#C4622D',
                    color: '#FFF8F0',
                    border: 'none',
                    fontWeight: 700, fontSize: '14px',
                    letterSpacing: '0.05em',
                    padding: '18px', borderRadius: '100px',
                    cursor: (loading || !sdkReady) ? 'not-allowed' : 'pointer',
                    opacity: (loading || !sdkReady) ? 0.7 : 1,
                    boxShadow: (loading || !sdkReady) ? 'none' : '0 8px 32px rgba(196,98,45,0.32)',
                    transition: 'all 0.2s ease',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                  }}
                >
                  {loading ? (
                    <>
                      <svg style={{ animation: 'spin 1s linear infinite' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                        <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    `Place Order · ${formatCurrency(total)}`
                  )}
                </button>
                <p style={{ fontSize: '11.5px', textAlign: 'center', color: '#9E7A52', lineHeight: 1.6 }}>
                  By placing this order you agree to be contacted via SMS for confirmation.
                </p>
              </div>
            </form>

          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
