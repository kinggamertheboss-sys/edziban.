'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { useCart } from '@/context/CartContext'
import { formatCurrency, getMinOrderDate, getDeliveryFee } from '@/lib/utils'

const STEPS = ['Menu', 'Your Details', 'Payment']

export default function OrderPage() {
  const router = useRouter()
  const { items, subtotal, totalItems, orderDetails, saveOrderDetails } = useCart()

  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    guestCount: '',
    fulfillmentType: 'delivery' as 'delivery' | 'pickup',
    address: '',
    distanceRange: '0-5',
    preferredDate: '',
    preferredTime: 'afternoon',
    specialInstructions: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [distanceInfo, setDistanceInfo] = useState<{ miles: number; range: string } | null>(null)
  const [distanceLoading, setDistanceLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (orderDetails) setForm(f => ({ ...f, ...orderDetails, guestCount: String(orderDetails.guestCount ?? '') }))
  }, [orderDetails])

  useEffect(() => {
    if (totalItems === 0) router.push('/menu')
  }, [totalItems, router])

  useEffect(() => {
    if (form.fulfillmentType !== 'delivery' || form.address.trim().length < 8) {
      setDistanceInfo(null)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setDistanceLoading(true)
      try {
        const res = await fetch(`/api/distance?address=${encodeURIComponent(form.address)}`)
        if (res.ok) {
          const data = await res.json()
          setDistanceInfo({ miles: data.miles, range: data.range })
          setForm(f => ({ ...f, distanceRange: data.range }))
        } else {
          setDistanceInfo(null)
        }
      } catch {
        setDistanceInfo(null)
      } finally {
        setDistanceLoading(false)
      }
    }, 800)
  }, [form.address, form.fulfillmentType])

  const minDate = getMinOrderDate()

  function validate() {
    const e: Record<string, string> = {}
    if (!form.fullName.trim()) e.fullName = 'Full name is required'
    if (!form.phone.trim()) e.phone = 'Phone number is required'
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email is required'
    if (!form.guestCount || isNaN(Number(form.guestCount)) || Number(form.guestCount) < 1) e.guestCount = 'Enter approximate guest count'
    if (form.fulfillmentType === 'delivery' && !form.address.trim()) e.address = 'Delivery address is required'
    if (!form.preferredDate) {
      e.preferredDate = 'Please select a date'
    } else if (form.preferredDate < minDate) {
      e.preferredDate = 'Please select a date at least 5 days away. This ensures we have enough time to source and prepare your order fresh.'
    }
    return e
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    saveOrderDetails({
      ...form,
      fullName:            form.fullName.trim(),
      phone:               form.phone.trim(),
      email:               form.email.trim().toLowerCase(),
      address:             form.address.trim(),
      specialInstructions: form.specialInstructions.trim(),
      guestCount:          Number(form.guestCount),
    })
    router.push('/payment')
  }

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
    if (errors[field]) setErrors(e => { const n = { ...e }; delete n[field]; return n })
  }

  const deliveryFee = form.fulfillmentType === 'delivery' ? getDeliveryFee(form.distanceRange) : 0

  return (
    <>
      <Navbar />

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
                const done = step < 2
                const active = step === 2
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
              Tell us about your event.
            </h1>
          </div>
        </div>
      </div>

      <main style={{ background: '#FFF8F0', paddingBottom: '80px' }}>
        <div className="wrap">
          <div style={{ maxWidth: '640px', margin: '0 auto', paddingTop: '48px' }}>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

              {/* Single form panel */}
              <div style={{ background: 'white', border: '1px solid #E2CEB8', borderRadius: '20px', overflow: 'hidden' }}>

                {/* ── Guest count + Contact ── */}
                <div className="card-section" style={{ padding: '32px 32px 28px' }}>
                  <div style={{ marginBottom: '20px' }}>
                    <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: '18px', fontWeight: 700, color: '#1A0F0A' }}>
                      Your details
                    </h2>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 600, color: '#1A0F0A' }}>Approximate guest count</label>
                      <input
                        type="number" min="1"
                        value={form.guestCount}
                        onChange={e => set('guestCount', e.target.value)}
                        placeholder="e.g. 75"
                        className={`field ${errors.guestCount ? 'error' : ''}`}
                      />
                      {errors.guestCount && <p style={{ fontSize: '12px', color: '#dc2626' }}>{errors.guestCount}</p>}
                    </div>
                  </div>
                </div>

                <div style={{ height: '1px', background: '#F0E4D0' }} />

                {/* ── Contact ── */}
                <div className="card-section" style={{ padding: '28px 32px' }}>
                  <div style={{ marginBottom: '20px' }}>
                    <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: '18px', fontWeight: 700, color: '#1A0F0A' }}>
                      Contact information
                    </h2>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {[
                      { label: 'Full name', field: 'fullName', type: 'text', placeholder: 'e.g. Kwame Asante' },
                      { label: 'Phone number', field: 'phone', type: 'tel', placeholder: 'e.g. +1 617-555-0101' },
                      { label: 'Email address', field: 'email', type: 'email', placeholder: 'e.g. kwame@example.com' },
                    ].map(({ label, field, type, placeholder }) => (
                      <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 600, color: '#1A0F0A' }}>{label}</label>
                        <input
                          type={type}
                          value={form[field as keyof typeof form] as string}
                          onChange={e => set(field, e.target.value)}
                          placeholder={placeholder}
                          className={`field ${errors[field] ? 'error' : ''}`}
                        />
                        {errors[field] && <p style={{ fontSize: '12px', color: '#dc2626' }}>{errors[field]}</p>}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ height: '1px', background: '#F0E4D0' }} />

                {/* ── Delivery ── */}
                <div className="card-section" style={{ padding: '28px 32px' }}>
                  <div style={{ marginBottom: '20px' }}>
                    <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: '18px', fontWeight: 700, color: '#1A0F0A' }}>
                      Delivery or pickup?
                    </h2>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                    {(['delivery', 'pickup'] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => set('fulfillmentType', type)}
                        style={{
                          flex: 1, padding: '14px',
                          borderRadius: '12px',
                          border: `1.5px solid ${form.fulfillmentType === type ? '#C4622D' : '#E2CEB8'}`,
                          background: form.fulfillmentType === type ? '#C4622D' : 'transparent',
                          color: form.fulfillmentType === type ? '#FFF8F0' : '#4A2E20',
                          fontSize: '14px', fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.18s ease',
                          textTransform: 'capitalize',
                        }}
                      >
                        {type === 'delivery' ? 'Delivery' : 'Pickup'}
                      </button>
                    ))}
                  </div>

                  {form.fulfillmentType === 'delivery' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '13px', fontWeight: 600, color: '#1A0F0A' }}>Delivery address</label>
                        <input
                          type="text"
                          value={form.address}
                          onChange={e => set('address', e.target.value)}
                          placeholder="e.g. 123 Main St, Boston, MA 02101"
                          className={`field ${errors.address ? 'error' : ''}`}
                        />
                        {errors.address && <p style={{ fontSize: '12px', color: '#dc2626' }}>{errors.address}</p>}
                      </div>
                      {(distanceLoading || distanceInfo) && (
                        <div style={{
                          background: distanceInfo ? 'rgba(196,98,45,0.06)' : '#F9F5F0',
                          border: '1px solid #E2CEB8',
                          borderRadius: '10px',
                          padding: '12px 16px',
                          fontSize: '13px',
                          color: '#4A2E20',
                        }}>
                          {distanceLoading && !distanceInfo && 'Calculating delivery distance...'}
                          {distanceInfo && (
                            <span>
                              Estimated distance: <strong>{distanceInfo.miles} miles</strong> from Randolph, MA. Delivery fee: <strong>{formatCurrency(getDeliveryFee(distanceInfo.range))}</strong>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {form.fulfillmentType === 'pickup' && (
                    <div style={{ background: '#F0E4D0', borderRadius: '12px', padding: '16px 18px', fontSize: '13px', lineHeight: 1.7, color: '#4A2E20' }}>
                      Pickup is available in the Greater Boston area. Exact location confirmed over WhatsApp after your order.
                    </div>
                  )}
                </div>

                <div style={{ height: '1px', background: '#F0E4D0' }} />

                {/* ── Date & time ── */}
                <div className="card-section" style={{ padding: '28px 32px' }}>
                  <div style={{ marginBottom: '20px' }}>
                    <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: '18px', fontWeight: 700, color: '#1A0F0A' }}>
                      When is your event?
                    </h2>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 600, color: '#1A0F0A' }}>Preferred date</label>
                      <input
                        type="date"
                        value={form.preferredDate}
                        min={minDate}
                        onChange={e => set('preferredDate', e.target.value)}
                        className={`field ${errors.preferredDate ? 'error' : ''}`}
                      />
                      {errors.preferredDate && <p style={{ fontSize: '12px', color: '#dc2626' }}>{errors.preferredDate}</p>}
                      <p style={{ fontSize: '11.5px', color: '#9E7A52', marginTop: '2px' }}>Minimum 5 days notice. Everything is cooked fresh to order.</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 600, color: '#1A0F0A' }}>Preferred time window</label>
                      <select value={form.preferredTime} onChange={e => set('preferredTime', e.target.value)} className="field">
                        <option value="morning">Morning (10am - 12pm)</option>
                        <option value="afternoon">Afternoon (12pm - 4pm)</option>
                        <option value="evening">Evening (4pm - 7pm)</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 600, color: '#1A0F0A' }}>Special instructions <span style={{ fontWeight: 400, color: '#9E7A52' }}>(optional)</span></label>
                      <textarea
                        value={form.specialInstructions}
                        onChange={e => set('specialInstructions', e.target.value)}
                        placeholder="Allergies, setup instructions, gate codes, etc."
                        rows={3}
                        className="field resize-none"
                      />
                    </div>
                  </div>
                </div>

                <div style={{ height: '1px', background: '#F0E4D0' }} />

                {/* ── Order summary ── */}
                <div style={{ padding: '28px 32px', background: '#FAFAF8' }}>
                  <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: '16px', fontWeight: 700, color: '#1A0F0A', marginBottom: '16px' }}>
                    Order summary
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {items.map(item => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px' }}>
                        <span style={{ color: '#1A0F0A' }}>{item.name} <span style={{ color: '#9E7A52' }}>× {item.quantity}</span></span>
                        <span style={{ fontWeight: 600, color: '#1A0F0A' }}>{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    ))}
                    <div style={{ height: '1px', background: '#E2CEB8', margin: '4px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 700 }}>
                      <span style={{ color: '#1A0F0A' }}>Subtotal</span>
                      <span style={{ color: '#1A0F0A' }}>{formatCurrency(subtotal)}</span>
                    </div>
                    {form.fulfillmentType === 'delivery' && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span style={{ color: '#6B4C3B' }}>Est. delivery fee</span>
                        <span style={{ color: '#6B4C3B' }}>{formatCurrency(deliveryFee)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontSize: '12px', textAlign: 'center', color: '#9E7A52', lineHeight: 1.7 }}>
                  You will receive a confirmation within 24 hours of placing your order.
                </p>
                <button
                  type="submit"
                  style={{
                    width: '100%',
                    background: '#C4622D',
                    color: '#FFF8F0',
                    border: 'none',
                    fontWeight: 700, fontSize: '14px',
                    letterSpacing: '0.05em',
                    padding: '18px', borderRadius: '100px',
                    cursor: 'pointer',
                    boxShadow: '0 8px 32px rgba(196,98,45,0.32)',
                    transition: 'transform 0.2s cubic-bezier(0.22,1,0.36,1), box-shadow 0.2s',
                  }}
                >
                  Proceed to Payment
                </button>
              </div>
            </form>

          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
