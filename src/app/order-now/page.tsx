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
    google?: {
      maps: {
        places: {
          Autocomplete: new (
            input: HTMLInputElement,
            opts?: { componentRestrictions?: { country: string }; types?: string[] }
          ) => {
            addListener: (event: string, cb: () => void) => void
            getPlace: () => { formatted_address?: string }
          }
        }
      }
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

const JOLLOF_BUILD_ID = 'jollof-build-plate'
const JOLLOF_ADDONS = [
  { id: 'jollof-addon-plantain',  label: 'Fried plantain',      price: 2 },
  { id: 'jollof-addon-salad',     label: 'Ghana salad',         price: 2 },
  { id: 'jollof-addon-egg',       label: 'Boiled egg',          price: 1 },
  { id: 'jollof-addon-sauce',     label: 'Extra shito or stew', price: 1 },
  { id: 'jollof-addon-chicken',   label: 'Extra chicken',       price: 4 },
]

function isOrderingOpen(): boolean {
  return true // temporarily open for testing — restore hours check before going live
}

// Strips --variant suffix to find base item (e.g. jollof-build-plate--Shito)
const stripVariant = (id: string) => id.split('--')[0]

export default function OrderNowPage() {
  const [step, setStep] = useState<Step>('menu')
  const [activeCategory, setActiveCategory] = useState<string>(PLATE_CATEGORIES[0])
  const [cart, setCart] = useState<Record<string, number>>({})

  // Jollof customizer modal
  const [jollofModal, setJollofModal] = useState(false)
  const [modalSauce, setModalSauce] = useState<'Shito' | 'Stew'>('Shito')
  const [modalAddons, setModalAddons] = useState<Set<string>>(new Set())
  const [modalQty, setModalQty] = useState(1)

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
  const [mapsReady, setMapsReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  const cardRef = useRef<{ tokenize: () => Promise<{ status: string; token?: string; errors?: { message: string }[] }> } | null>(null)
  const cardInitialized = useRef(false)
  const addressInputRef = useRef<HTMLInputElement>(null)

  const open = isOrderingOpen()

  // Cart items — supports --variant keys (e.g. jollof-build-plate--Shito)
  const cartItems = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([rawId, qty]) => {
      const baseItem = PLATES_MENU.find(m => m.id === stripVariant(rawId))
      if (!baseItem) return null
      const variant = rawId.includes('--') ? rawId.split('--')[1] : null
      return {
        ...baseItem,
        id: rawId,
        name: variant ? `${baseItem.name} — ${variant}` : baseItem.name,
        quantity: qty,
      }
    })
    .filter(Boolean) as (typeof PLATES_MENU[number] & { quantity: number; name: string })[]

  const totalQty = cartItems.reduce((s, i) => s + i.quantity, 0)
  const subtotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0)
  const deliveryFee = fulfillment === 'delivery' ? (deliveryInfo?.fee ?? 0) : 0
  const serviceFee = getPlatesServiceFee(subtotal, deliveryFee)
  const total = subtotal + serviceFee + deliveryFee

  // Jollof plate total qty across all sauce variants
  const jollofQtyInCart = Object.entries(cart)
    .filter(([id]) => stripVariant(id) === JOLLOF_BUILD_ID)
    .reduce((s, [, qty]) => s + qty, 0)

  // Modal plate total
  const modalAddonSum = JOLLOF_ADDONS.filter(a => modalAddons.has(a.id)).reduce((s, a) => s + a.price, 0)
  const modalPlateTotal = (15 + modalAddonSum) * modalQty

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

  useEffect(() => {
    if (step !== 'checkout') {
      cardInitialized.current = false
      cardRef.current = null
    }
  }, [step])

  // Close modal on Escape
  useEffect(() => {
    if (!jollofModal) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setJollofModal(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [jollofModal])

  // Lock body scroll when modal open
  useEffect(() => {
    document.body.style.overflow = jollofModal ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [jollofModal])

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

  useEffect(() => {
    if (step !== 'checkout' || !mapsReady || !addressInputRef.current || !window.google?.maps?.places) return
    const autocomplete = new window.google.maps.places.Autocomplete(addressInputRef.current, {
      componentRestrictions: { country: 'us' },
      types: ['address'],
    })
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()
      if (place.formatted_address) {
        setAddress(place.formatted_address)
        fetchDeliveryFee(place.formatted_address)
      }
    })
  }, [step, mapsReady, fetchDeliveryFee])

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

  function handleAddJollofPlate() {
    const cartKey = `${JOLLOF_BUILD_ID}--${modalSauce}`
    adjustQty(cartKey, modalQty)
    for (const addon of JOLLOF_ADDONS) {
      if (modalAddons.has(addon.id)) adjustQty(addon.id, modalQty)
    }
    setJollofModal(false)
    setModalAddons(new Set())
    setModalQty(1)
    setModalSauce('Shito')
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
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
        onLoad={() => setMapsReady(true)}
      />

      <main id="main-content" style={{ minHeight: '100vh', background: '#FFF8F0', paddingTop: '76px' }}>

        {/* ── Dark header banner ───────────────────────────────────────── */}
        <div className="bg-dark" style={{ background: '#1A0F0A', color: '#FFF8F0', padding: '36px 0 28px' }}>
          <div className="wrap">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                {step !== 'menu' && (
                  <button
                    onClick={() => setStep(step === 'checkout' ? 'menu' : 'menu')}
                    style={{ background: 'none', border: 'none', color: '#C4622D', cursor: 'pointer', fontSize: '13px', fontWeight: 600, letterSpacing: '0.04em', marginBottom: '8px', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    ← {step === 'checkout' ? 'Back to Menu' : 'Back to Home'}
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

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: open ? 'rgba(196,98,45,0.15)' : 'rgba(255,255,255,0.07)', border: `1px solid ${open ? '#C4622D' : '#3A2A20'}`, borderRadius: '100px', padding: '6px 14px' }}>
                <span aria-hidden="true" style={{ width: '8px', height: '8px', borderRadius: '50%', background: open ? '#4CAF50' : '#FF6B6B', flexShrink: 0 }} />
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
                const qty = item.customizable ? jollofQtyInCart : (cart[item.id] ?? 0)

                return (
                  <div
                    key={item.id}
                    style={{
                      background: '#FFF8F0',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      border: `1.5px solid ${qty > 0 ? '#C4622D' : '#E2CEB8'}`,
                      opacity: item.available ? 1 : 0.6,
                      boxShadow: qty > 0 ? '0 0 0 2px rgba(196,98,45,0.18)' : 'none',
                      transition: 'box-shadow 0.18s, border-color 0.18s',
                    }}
                  >
                    {/* Card image */}
                    <div style={{ height: '160px', background: item.gradient, position: 'relative', overflow: 'hidden' }}>
                      {item.video && (
                        <video
                          src={item.video}
                          autoPlay muted loop playsInline
                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      )}
                      {!item.available && (
                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(26,15,10,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', color: '#FFF8F0', textTransform: 'uppercase', background: 'rgba(0,0,0,0.5)', padding: '4px 10px', borderRadius: '100px' }}>Coming Soon</span>
                        </div>
                      )}
                      {/* Gradient overlay for text readability */}
                      {item.video && (
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(26,15,10,0.5) 0%, transparent 50%)' }} />
                      )}
                      {/* Customizable badge */}
                      {item.customizable && (
                        <div style={{ position: 'absolute', top: '10px', left: '10px', background: '#1A0F0A', color: '#FFF8F0', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: '100px' }}>
                          Build Your Plate
                        </div>
                      )}
                      {/* In-cart badge */}
                      {qty > 0 && (
                        <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#C4622D', color: '#FFF8F0', fontSize: '12px', fontWeight: 700, width: '26px', height: '26px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {qty}
                        </div>
                      )}
                    </div>

                    <div style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ margin: 0, fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: '17px', fontWeight: 700, color: '#1A0F0A' }}>{item.name}</h3>
                          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6B4C3B', lineHeight: 1.5 }}>{item.description}</p>
                        </div>
                        <span style={{ fontWeight: 800, fontSize: '16px', color: '#C4622D', flexShrink: 0 }}>
                          {item.customizable ? `From ${formatCurrency(item.price)}` : formatCurrency(item.price)}
                        </span>
                      </div>

                      {item.available && (
                        <>
                          {item.customizable ? (
                            /* Customizable: always show "Customize & Add" */
                            <button
                              onClick={() => { if (open) setJollofModal(true) }}
                              disabled={!open}
                              style={{
                                width: '100%',
                                padding: '11px',
                                borderRadius: '10px',
                                border: 'none',
                                background: open ? (qty > 0 ? '#1A0F0A' : '#C4622D') : '#E2CEB8',
                                color: open ? '#FFF8F0' : '#A08070',
                                fontSize: '13px',
                                fontWeight: 700,
                                cursor: open ? 'pointer' : 'not-allowed',
                                letterSpacing: '0.04em',
                                transition: 'background 0.18s',
                              }}
                            >
                              {!open ? 'Ordering Closed' : qty > 0 ? `Add Another · ${qty} in cart` : 'Customize & Add'}
                            </button>
                          ) : (
                            /* Regular item: +/- stepper */
                            <div style={{ marginTop: '2px' }}>
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
                                    aria-label={`Remove ${item.name} from order`}
                                    style={{ flex: 1, padding: '10px', minHeight: '44px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', fontWeight: 700, color: '#C4622D' }}
                                  >−</button>
                                  <span aria-label={`${item.name} quantity: ${qty}`} style={{ fontSize: '15px', fontWeight: 800, color: '#1A0F0A', minWidth: '28px', textAlign: 'center' }}>{qty}</span>
                                  <button
                                    onClick={() => adjustQty(item.id, 1)}
                                    aria-label={`Add another ${item.name} to order`}
                                    style={{ flex: 1, padding: '10px', minHeight: '44px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', fontWeight: 700, color: '#C4622D' }}
                                  >+</button>
                                </div>
                              )}
                            </div>
                          )}
                        </>
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div style={{ background: '#FFF8F0', border: '1.5px solid #E2CEB8', borderRadius: '16px', padding: '24px' }}>
                    <h2 style={{ margin: '0 0 20px', fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: '20px', color: '#1A0F0A' }}>Your Details</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {[
                        { id: 'on-name',  label: 'Full Name',     value: name,  setter: setName,  type: 'text',  required: true,  placeholder: 'Kwame Mensah' },
                        { id: 'on-phone', label: 'Phone Number',  value: phone, setter: setPhone, type: 'tel',   required: false, placeholder: '+1 617 000 0000' },
                        { id: 'on-email', label: 'Email Address', value: email, setter: setEmail, type: 'email', required: true,  placeholder: 'you@example.com' },
                      ].map(field => (
                        <div key={field.label}>
                          <label htmlFor={field.id} style={{ display: 'block', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B4C3B', marginBottom: '6px' }}>
                            {field.label}{field.required && ' *'}
                          </label>
                          <input
                            id={field.id}
                            type={field.type}
                            value={field.value}
                            onChange={e => field.setter(e.target.value)}
                            placeholder={field.placeholder}
                            required={field.required}
                            style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #E2CEB8', background: '#FEFAF6', fontSize: '14px', color: '#1A0F0A', boxSizing: 'border-box' }}
                          />
                        </div>
                      ))}

                      <div>
                        <label id="on-fulfillment-label" style={{ display: 'block', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B4C3B', marginBottom: '6px' }}>Fulfillment</label>
                        <div role="group" aria-labelledby="on-fulfillment-label" style={{ display: 'flex', gap: '8px' }}>
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

                      {fulfillment === 'delivery' && (
                        <div>
                          <label htmlFor="on-address" style={{ display: 'block', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B4C3B', marginBottom: '6px' }}>Delivery Address *</label>
                          <input
                            id="on-address"
                            ref={addressInputRef}
                            type="text"
                            value={address}
                            onChange={e => handleAddressChange(e.target.value)}
                            placeholder="Start typing your address…"
                            autoComplete="off"
                            aria-describedby={feeError ? 'on-address-error' : undefined}
                            style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: `1.5px solid ${feeError ? '#FF6B6B' : '#E2CEB8'}`, background: '#FEFAF6', fontSize: '14px', color: '#1A0F0A', boxSizing: 'border-box' }}
                          />
                          <span id="on-address-error" role="alert" style={{ display: feeError ? 'block' : 'none', fontSize: '12px', color: '#E05050', marginTop: '6px' }}>{feeError}</span>
                          {feeLoading && <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#A08070' }}>Calculating…</p>}
                          {feeError && <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#E05050' }}>{feeError}</p>}
                          {deliveryInfo && !feeError && (
                            <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#C4622D', fontWeight: 600 }}>
                              {deliveryInfo.formatted} · {formatCurrency(deliveryInfo.fee)} · ~{deliveryInfo.minutes} min
                            </p>
                          )}
                        </div>
                      )}

                      {fulfillment === 'pickup' && (
                        <div style={{ background: '#F5EDE0', borderRadius: '10px', padding: '12px 14px' }}>
                          <p style={{ margin: 0, fontSize: '13px', color: '#6B4C3B' }}>
                            <strong style={{ color: '#1A0F0A' }}>Pickup location:</strong> Randolph, MA 02368 — we&apos;ll text you exact details when your order is ready.
                          </p>
                        </div>
                      )}

                      <div>
                        <label htmlFor="on-instructions" style={{ display: 'block', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B4C3B', marginBottom: '6px' }}>Special Instructions</label>
                        <textarea
                          id="on-instructions"
                          value={specialInstructions}
                          onChange={e => setSpecialInstructions(e.target.value)}
                          placeholder="Any allergies or requests?"
                          rows={2}
                          style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1.5px solid #E2CEB8', background: '#FEFAF6', fontSize: '14px', color: '#1A0F0A', resize: 'vertical', boxSizing: 'border-box' }}
                        />
                      </div>
                    </div>
                  </div>

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
                disabled={!canCheckout}
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
      </main>

      {/* ── Jollof Plate Customizer Modal (Uber Eats style) ──────────────── */}
      {jollofModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Build Your Jollof Plate"
          style={{
            position: 'fixed', inset: 0, zIndex: 300,
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          }}
        >
          {/* Backdrop */}
          <div
            onClick={() => setJollofModal(false)}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
          />

          {/* Sheet */}
          <div style={{
            position: 'relative',
            background: '#FFF8F0',
            borderRadius: '24px 24px 0 0',
            maxHeight: '92dvh',
            overflowY: 'auto',
            width: '100%',
            maxWidth: '560px',
            margin: '0 auto',
          }}>

            {/* Jollof image header */}
            <div style={{ height: '200px', background: 'linear-gradient(150deg, #C4622D 0%, #E07840 55%, #F0A560 100%)', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
              <video
                src="/videos/jollof.mp4"
                autoPlay muted loop playsInline
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(26,15,10,0.65) 0%, transparent 55%)' }} />
              {/* Close button */}
              <button
                onClick={() => setJollofModal(false)}
                aria-label="Close"
                style={{
                  position: 'absolute', top: '14px', right: '14px',
                  width: '34px', height: '34px', borderRadius: '50%',
                  background: 'rgba(0,0,0,0.45)', border: 'none',
                  color: '#FFF8F0', fontSize: '18px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  lineHeight: 1,
                }}
              >×</button>
              {/* Title overlay */}
              <div style={{ position: 'absolute', bottom: '16px', left: '20px', right: '20px' }}>
                <h2 style={{ margin: 0, fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: '22px', fontWeight: 700, color: '#FFF8F0', lineHeight: 1.15 }}>
                  Build Your Jollof Plate
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'rgba(255,248,240,0.75)' }}>
                  Jollof rice · 2 pieces of chicken · your choice of sauce
                </p>
              </div>
            </div>

            {/* Body */}
            <div style={{ padding: '24px 20px 32px' }}>

              {/* Sauce choice */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#1A0F0A' }}>Choose your sauce</p>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#C4622D', background: 'rgba(196,98,45,0.1)', padding: '2px 8px', borderRadius: '100px' }}>Required</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(['Shito', 'Stew'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setModalSauce(s)}
                      aria-pressed={modalSauce === s}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 16px',
                        borderRadius: '12px',
                        border: `1.5px solid ${modalSauce === s ? '#C4622D' : '#E2CEB8'}`,
                        background: modalSauce === s ? 'rgba(196,98,45,0.06)' : 'white',
                        cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Radio circle */}
                        <div style={{
                          width: '20px', height: '20px', borderRadius: '50%',
                          border: `2px solid ${modalSauce === s ? '#C4622D' : '#C8B8A2'}`,
                          background: 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, transition: 'border-color 0.15s',
                        }}>
                          {modalSauce === s && (
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#C4622D' }} />
                          )}
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: modalSauce === s ? 600 : 400, color: '#1A0F0A' }}>{s}</span>
                      </div>
                      <span style={{ fontSize: '13px', color: '#9E7A52' }}>Included</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: '1px', background: '#E2CEB8', marginBottom: '24px' }} />

              {/* Add-ons */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#1A0F0A' }}>Add-ons</p>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#9E7A52', background: 'rgba(158,122,82,0.1)', padding: '2px 8px', borderRadius: '100px' }}>Optional</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {JOLLOF_ADDONS.map(addon => {
                    const checked = modalAddons.has(addon.id)
                    return (
                      <button
                        key={addon.id}
                        onClick={() => {
                          setModalAddons(prev => {
                            const next = new Set(prev)
                            next.has(addon.id) ? next.delete(addon.id) : next.add(addon.id)
                            return next
                          })
                        }}
                        aria-pressed={checked}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '13px 16px',
                          borderRadius: '12px',
                          border: `1.5px solid ${checked ? '#C4622D' : '#E2CEB8'}`,
                          background: checked ? 'rgba(196,98,45,0.06)' : 'white',
                          cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {/* Checkbox */}
                          <div style={{
                            width: '20px', height: '20px', borderRadius: '5px',
                            border: `2px solid ${checked ? '#C4622D' : '#C8B8A2'}`,
                            background: checked ? '#C4622D' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, transition: 'all 0.15s',
                          }}>
                            {checked && (
                              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                <path d="M1 4L3.5 6.5L9 1" stroke="#FFF8F0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                          <span style={{ fontSize: '14px', fontWeight: checked ? 600 : 400, color: '#1A0F0A' }}>{addon.label}</span>
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#C4622D', flexShrink: 0, marginLeft: '8px' }}>
                          +{formatCurrency(addon.price)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: '1px', background: '#E2CEB8', marginBottom: '24px' }} />

              {/* Qty stepper */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#1A0F0A' }}>Quantity</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: '#F5EDE0', borderRadius: '100px', padding: '6px 6px' }}>
                  <button
                    onClick={() => setModalQty(q => Math.max(1, q - 1))}
                    disabled={modalQty === 1}
                    aria-label="Decrease quantity"
                    style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      border: 'none',
                      background: modalQty === 1 ? 'transparent' : 'white',
                      color: modalQty === 1 ? '#C8B8A2' : '#C4622D',
                      fontSize: '20px', cursor: modalQty === 1 ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: modalQty === 1 ? 'none' : '0 1px 4px rgba(0,0,0,0.1)',
                      transition: 'all 0.15s', lineHeight: 1,
                    }}
                  >−</button>
                  <span style={{ fontSize: '17px', fontWeight: 800, color: '#1A0F0A', minWidth: '20px', textAlign: 'center' }}>{modalQty}</span>
                  <button
                    onClick={() => setModalQty(q => Math.min(99, q + 1))}
                    aria-label="Increase quantity"
                    style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      border: 'none', background: 'white',
                      color: '#C4622D',
                      fontSize: '20px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                      lineHeight: 1,
                    }}
                  >+</button>
                </div>
              </div>

              {/* Add to Order button */}
              <button
                onClick={handleAddJollofPlate}
                style={{
                  width: '100%',
                  padding: '17px',
                  borderRadius: '14px',
                  border: 'none',
                  background: '#C4622D',
                  color: '#FFF8F0',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  letterSpacing: '0.04em',
                  boxShadow: '0 6px 24px rgba(196,98,45,0.35)',
                  transition: 'background 0.18s',
                }}
              >
                Add {modalQty > 1 ? `${modalQty} ×` : ''} to Order — {formatCurrency(modalPlateTotal)}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  )
}
