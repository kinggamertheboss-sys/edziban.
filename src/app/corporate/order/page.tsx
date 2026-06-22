'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Footer from '@/components/Footer'
import { useCart } from '@/context/CartContext'
import { formatCurrency, getMinOrderDate, getDeliveryFee } from '@/lib/utils'

const STEPS = ['Menu', 'Your Details', 'Payment']

export default function CorporateOrderPage() {
  const router = useRouter()
  const { items, subtotal, totalItems, orderDetails, saveOrderDetails } = useCart()

  const [form, setForm] = useState({
    orgName: '',
    contactPerson: '',
    billingEmail: '',
    poNumber: '',
    requestInvoice: true,
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
    orderType: 'corporate' as 'corporate' | 'student',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [distanceInfo, setDistanceInfo] = useState<{ miles: number; range: string } | null>(null)
  const [distanceLoading, setDistanceLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (orderDetails) {
      setForm(f => ({
        ...f,
        ...orderDetails,
        guestCount: String(orderDetails.guestCount ?? ''),
        orgName: orderDetails.orgName ?? '',
        contactPerson: orderDetails.contactPerson ?? '',
        billingEmail: orderDetails.billingEmail ?? '',
        poNumber: orderDetails.poNumber ?? '',
        requestInvoice: orderDetails.requestInvoice ?? true,
      }))
    }
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
    if (!form.orgName.trim()) e.orgName = 'Organization or company name is required'
    if (!form.contactPerson.trim()) e.contactPerson = 'Contact person name is required'
    if (!form.fullName.trim()) e.fullName = 'Full name is required'
    if (!form.phone.trim()) e.phone = 'Phone number is required'
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email is required'
    if (form.billingEmail && !/\S+@\S+\.\S+/.test(form.billingEmail)) e.billingEmail = 'Enter a valid billing email'
    if (!form.guestCount || isNaN(Number(form.guestCount)) || Number(form.guestCount) < 1) e.guestCount = 'Enter approximate guest count'
    if (form.fulfillmentType === 'delivery' && !form.address.trim()) e.address = 'Delivery address is required'
    if (!form.preferredDate) {
      e.preferredDate = 'Please select a date'
    } else if (form.preferredDate < minDate) {
      e.preferredDate = 'Please select a date at least 5 days away.'
    }
    return e
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    saveOrderDetails({
      fullName:            form.fullName.trim(),
      phone:               form.phone.trim(),
      email:               form.email.trim().toLowerCase(),
      address:             form.address.trim(),
      specialInstructions: form.specialInstructions.trim(),
      guestCount:          Number(form.guestCount),
      fulfillmentType:     form.fulfillmentType,
      distanceRange:       form.distanceRange,
      preferredDate:       form.preferredDate,
      preferredTime:       form.preferredTime,
      eventType:           form.orderType === 'student' ? 'Student Organization' : 'Corporate Event',
      clientType:          'corporate',
      orgName:             form.orgName.trim(),
      contactPerson:       form.contactPerson.trim(),
      billingEmail:        form.billingEmail.trim().toLowerCase() || form.email.trim().toLowerCase(),
      poNumber:            form.poNumber.trim(),
      requestInvoice:      form.requestInvoice,
    })
    router.push('/payment')
  }

  function set(field: string, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }))
    if (errors[field]) setErrors(e => { const n = { ...e }; delete n[field]; return n })
  }

  const deliveryFee = form.fulfillmentType === 'delivery' ? getDeliveryFee(form.distanceRange) : 0

  const inputStyle = (hasError: boolean) => ({
    width: '100%',
    padding: '12px 14px',
    border: `1.5px solid ${hasError ? '#dc2626' : '#E2CEB8'}`,
    borderRadius: '10px',
    fontSize: '14px',
    color: '#1A0F0A',
    background: 'white',
    outline: 'none',
    boxSizing: 'border-box' as const,
  })

  return (
    <>

      <div style={{ background: '#1A0F0A', paddingTop: '56px', paddingBottom: '48px', position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden="true" style={{
          position: 'absolute', right: '-40px', top: '50%',
          transform: 'translateY(-50%)',
          fontFamily: 'var(--font-playfair), Georgia, serif',
          fontSize: '280px', fontWeight: 700,
          color: 'rgba(196,98,45,0.06)', lineHeight: 1,
          userSelect: 'none', pointerEvents: 'none',
        }}>E</div>

        <div className="wrap" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
              <div style={{ width: '28px', height: '1px', background: '#C4622D' }} />
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: '#C4622D' }}>
                Corporate &amp; Student Org
              </span>
            </div>

            <nav aria-label="Order progress" style={{ display: 'flex', alignItems: 'center', marginBottom: '28px' }}>
              {STEPS.map((label, i) => {
                const step = i + 1
                const done = step < 2
                const active = step === 2
                return (
                  <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <div aria-current={active ? 'step' : undefined} style={{
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
                        letterSpacing: '0.1em', textTransform: 'uppercase' as const,
                        color: done || active ? '#C4622D' : 'rgba(255,255,255,0.25)',
                        whiteSpace: 'nowrap' as const,
                      }}>{label}</span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div aria-hidden="true" style={{
                        width: '64px', height: '1px', margin: '0 10px', marginBottom: '22px',
                        background: done ? '#C4622D' : 'rgba(255,255,255,0.1)',
                        flexShrink: 0,
                      }} />
                    )}
                  </div>
                )
              })}
            </nav>

            <h1 style={{
              fontFamily: 'var(--font-playfair), Georgia, serif',
              fontSize: 'clamp(2rem, 4vw, 2.8rem)',
              fontWeight: 700, lineHeight: 1.05,
              letterSpacing: '-0.025em',
              color: '#FFF8F0',
            }}>
              Tell us about your organization.
            </h1>
          </div>
        </div>
      </div>

      <main id="main-content" style={{ background: '#FFF8F0', paddingBottom: '80px' }}>
        <div className="wrap">
          <div style={{ maxWidth: '640px', margin: '0 auto', paddingTop: '48px' }}>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>

              {/* ── Order type toggle ── */}
              <div style={{ marginBottom: '20px' }}>
                <p id="orderType-label" style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B4C3B', marginBottom: '10px' }}>I am ordering as a</p>
                <div role="group" aria-labelledby="orderType-label" style={{ display: 'flex', gap: '10px' }}>
                  {([
                    { value: 'corporate', label: 'Company or nonprofit' },
                    { value: 'student',   label: 'Student organization' },
                  ] as const).map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => set('orderType', opt.value)}
                      aria-pressed={form.orderType === opt.value}
                      style={{
                        flex: 1, padding: '14px 16px',
                        borderRadius: '12px',
                        border: `1.5px solid ${form.orderType === opt.value ? '#C4622D' : '#E2CEB8'}`,
                        background: form.orderType === opt.value ? '#C4622D' : 'white',
                        color: form.orderType === opt.value ? '#FFF8F0' : '#4A2E20',
                        fontSize: '13px', fontWeight: 600,
                        cursor: 'pointer', transition: 'all 0.18s',
                        textAlign: 'left',
                      }}
                    >
                      {opt.label}
                      {form.orderType === opt.value && (
                        <div style={{ fontSize: '11px', fontWeight: 400, marginTop: '3px', opacity: 0.85 }}>
                          {opt.value === 'student' ? 'Confirmed within 48 hrs · Invoice available' : 'Confirmed within 48 hrs · Invoice available'}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ background: 'white', border: '1px solid #E2CEB8', borderRadius: '20px', overflow: 'hidden' }}>

                {/* ── Org details ── */}
                <div style={{ padding: '32px 32px 28px' }}>
                  <div style={{ marginBottom: '20px' }}>
                    <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: '18px', fontWeight: 700, color: '#1A0F0A' }}>
                      Organization details
                    </h2>
                    <p style={{ fontSize: '13px', color: '#9E7A52', marginTop: '4px' }}>
                      For companies, nonprofits, and student orgs. We use this to generate your invoice.
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label htmlFor="orgName" style={{ fontSize: '13px', fontWeight: 600, color: '#1A0F0A' }}>Organization or company name</label>
                      <input
                        id="orgName"
                        type="text"
                        value={form.orgName}
                        onChange={e => set('orgName', e.target.value)}
                        placeholder={form.orderType === 'student' ? 'e.g. Boston University — GASA' : 'e.g. Acme Corp, City Year Boston'}
                        aria-describedby={errors.orgName ? 'orgName-error' : undefined}
                        aria-invalid={!!errors.orgName}
                        style={inputStyle(!!errors.orgName)}
                      />
                      {errors.orgName && <p id="orgName-error" role="alert" style={{ fontSize: '12px', color: '#dc2626' }}>{errors.orgName}</p>}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label htmlFor="contactPerson" style={{ fontSize: '13px', fontWeight: 600, color: '#1A0F0A' }}>Contact person</label>
                      <input
                        id="contactPerson"
                        type="text"
                        value={form.contactPerson}
                        onChange={e => set('contactPerson', e.target.value)}
                        placeholder="Who is the main point of contact?"
                        aria-describedby={errors.contactPerson ? 'contactPerson-error' : undefined}
                        aria-invalid={!!errors.contactPerson}
                        style={inputStyle(!!errors.contactPerson)}
                      />
                      {errors.contactPerson && <p id="contactPerson-error" role="alert" style={{ fontSize: '12px', color: '#dc2626' }}>{errors.contactPerson}</p>}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label htmlFor="billingEmail" style={{ fontSize: '13px', fontWeight: 600, color: '#1A0F0A' }}>
                        Billing email <span style={{ fontWeight: 400, color: '#6B4C3B' }}>(optional — defaults to contact email)</span>
                      </label>
                      <input
                        id="billingEmail"
                        type="email"
                        value={form.billingEmail}
                        onChange={e => set('billingEmail', e.target.value)}
                        placeholder="e.g. finance@yourorg.com"
                        aria-describedby={errors.billingEmail ? 'billingEmail-error' : undefined}
                        aria-invalid={!!errors.billingEmail}
                        style={inputStyle(!!errors.billingEmail)}
                      />
                      {errors.billingEmail && <p id="billingEmail-error" role="alert" style={{ fontSize: '12px', color: '#dc2626' }}>{errors.billingEmail}</p>}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label htmlFor="poNumber" style={{ fontSize: '13px', fontWeight: 600, color: '#1A0F0A' }}>
                        PO number <span style={{ fontWeight: 400, color: '#6B4C3B' }}>(optional)</span>
                      </label>
                      <input
                        id="poNumber"
                        type="text"
                        value={form.poNumber}
                        onChange={e => set('poNumber', e.target.value)}
                        placeholder="e.g. PO-2026-042"
                        style={inputStyle(false)}
                      />
                    </div>

                    <label style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '14px 16px',
                      background: form.requestInvoice ? 'rgba(196,98,45,0.06)' : '#F9F5F0',
                      border: `1.5px solid ${form.requestInvoice ? 'rgba(196,98,45,0.4)' : '#E2CEB8'}`,
                      borderRadius: '10px',
                      cursor: 'pointer',
                    }}>
                      <input
                        type="checkbox"
                        checked={form.requestInvoice}
                        onChange={e => set('requestInvoice', e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: '#C4622D', cursor: 'pointer', flexShrink: 0 }}
                      />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1A0F0A' }}>Request a formal invoice</div>
                        <div style={{ fontSize: '12px', color: '#9E7A52', marginTop: '2px' }}>Available to download from your admin dashboard after confirmation</div>
                      </div>
                    </label>
                  </div>
                </div>

                <div style={{ height: '1px', background: '#F0E4D0' }} />

                {/* ── Guest count ── */}
                <div style={{ padding: '28px 32px' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: '18px', fontWeight: 700, color: '#1A0F0A' }}>Event details</h2>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label htmlFor="corp-guestCount" style={{ fontSize: '13px', fontWeight: 600, color: '#1A0F0A' }}>Approximate guest count</label>
                    <input
                      id="corp-guestCount"
                      type="number" min="1"
                      value={form.guestCount}
                      onChange={e => set('guestCount', e.target.value)}
                      placeholder="e.g. 75"
                      aria-describedby={errors.guestCount ? 'corp-guestCount-error' : undefined}
                      aria-invalid={!!errors.guestCount}
                      style={inputStyle(!!errors.guestCount)}
                    />
                    {errors.guestCount && <p id="corp-guestCount-error" role="alert" style={{ fontSize: '12px', color: '#dc2626' }}>{errors.guestCount}</p>}
                  </div>
                </div>

                <div style={{ height: '1px', background: '#F0E4D0' }} />

                {/* ── Contact ── */}
                <div style={{ padding: '28px 32px' }}>
                  <div style={{ marginBottom: '20px' }}>
                    <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: '18px', fontWeight: 700, color: '#1A0F0A' }}>Contact information</h2>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {[
                      { label: 'Full name', field: 'fullName', type: 'text', placeholder: 'e.g. Kwame Asante' },
                      { label: 'Phone number', field: 'phone', type: 'tel', placeholder: 'e.g. +1 617-555-0101' },
                      { label: 'Email address', field: 'email', type: 'email', placeholder: 'e.g. kwame@example.com' },
                    ].map(({ label, field, type, placeholder }) => (
                      <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label htmlFor={`corp-${field}`} style={{ fontSize: '13px', fontWeight: 600, color: '#1A0F0A' }}>{label}</label>
                        <input
                          id={`corp-${field}`}
                          type={type}
                          value={form[field as keyof typeof form] as string}
                          onChange={e => set(field, e.target.value)}
                          placeholder={placeholder}
                          aria-describedby={errors[field] ? `corp-${field}-error` : undefined}
                          aria-invalid={!!errors[field]}
                          style={inputStyle(!!errors[field])}
                        />
                        {errors[field] && <p id={`corp-${field}-error`} role="alert" style={{ fontSize: '12px', color: '#dc2626' }}>{errors[field]}</p>}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ height: '1px', background: '#F0E4D0' }} />

                {/* ── Delivery ── */}
                <div style={{ padding: '28px 32px' }}>
                  <div style={{ marginBottom: '20px' }}>
                    <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: '18px', fontWeight: 700, color: '#1A0F0A' }}>Delivery or pickup?</h2>
                  </div>
                  <div role="group" aria-label="Fulfillment method" style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                    {(['delivery', 'pickup'] as const).map(type => (
                      <button
                        key={type} type="button"
                        onClick={() => set('fulfillmentType', type)}
                        aria-pressed={form.fulfillmentType === type}
                        style={{
                          flex: 1, padding: '14px',
                          borderRadius: '12px',
                          border: `1.5px solid ${form.fulfillmentType === type ? '#C4622D' : '#E2CEB8'}`,
                          background: form.fulfillmentType === type ? '#C4622D' : 'transparent',
                          color: form.fulfillmentType === type ? '#FFF8F0' : '#4A2E20',
                          fontSize: '14px', fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.18s ease',
                          textTransform: 'capitalize' as const,
                        }}
                      >
                        {type === 'delivery' ? 'Delivery' : 'Pickup'}
                      </button>
                    ))}
                  </div>

                  {form.fulfillmentType === 'delivery' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label htmlFor="corp-address" style={{ fontSize: '13px', fontWeight: 600, color: '#1A0F0A' }}>Delivery address</label>
                        <input
                          id="corp-address"
                          type="text"
                          value={form.address}
                          onChange={e => set('address', e.target.value)}
                          placeholder="e.g. 123 Commonwealth Ave, Boston, MA 02215"
                          aria-describedby={errors.address ? 'corp-address-error' : undefined}
                          aria-invalid={!!errors.address}
                          style={inputStyle(!!errors.address)}
                        />
                        {errors.address && <p id="corp-address-error" role="alert" style={{ fontSize: '12px', color: '#dc2626' }}>{errors.address}</p>}
                      </div>
                      {(distanceLoading || distanceInfo) && (
                        <div style={{
                          background: distanceInfo ? 'rgba(196,98,45,0.06)' : '#F9F5F0',
                          border: '1px solid #E2CEB8', borderRadius: '10px',
                          padding: '12px 16px', fontSize: '13px', color: '#4A2E20',
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
                <div style={{ padding: '28px 32px' }}>
                  <div style={{ marginBottom: '20px' }}>
                    <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: '18px', fontWeight: 700, color: '#1A0F0A' }}>When is your event?</h2>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label htmlFor="corp-preferredDate" style={{ fontSize: '13px', fontWeight: 600, color: '#1A0F0A' }}>Preferred date</label>
                      <input
                        id="corp-preferredDate"
                        type="date"
                        value={form.preferredDate}
                        min={minDate}
                        onChange={e => set('preferredDate', e.target.value)}
                        aria-describedby={errors.preferredDate ? 'corp-preferredDate-error' : 'corp-preferredDate-hint'}
                        aria-invalid={!!errors.preferredDate}
                        style={inputStyle(!!errors.preferredDate)}
                      />
                      {errors.preferredDate && <p id="corp-preferredDate-error" role="alert" style={{ fontSize: '12px', color: '#dc2626' }}>{errors.preferredDate}</p>}
                      <p id="corp-preferredDate-hint" style={{ fontSize: '11.5px', color: '#6B4C3B', marginTop: '2px' }}>Minimum 5 days notice. Everything is cooked fresh to order.</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label htmlFor="corp-preferredTime" style={{ fontSize: '13px', fontWeight: 600, color: '#1A0F0A' }}>Preferred time window</label>
                      <select id="corp-preferredTime" value={form.preferredTime} onChange={e => set('preferredTime', e.target.value)} style={inputStyle(false)}>
                        <option value="morning">Morning (10am - 12pm)</option>
                        <option value="afternoon">Afternoon (12pm - 4pm)</option>
                        <option value="evening">Evening (4pm - 7pm)</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label htmlFor="corp-specialInstructions" style={{ fontSize: '13px', fontWeight: 600, color: '#1A0F0A' }}>
                        Special instructions <span style={{ fontWeight: 400, color: '#6B4C3B' }}>(optional)</span>
                      </label>
                      <textarea
                        id="corp-specialInstructions"
                        value={form.specialInstructions}
                        onChange={e => set('specialInstructions', e.target.value)}
                        placeholder="Allergies, setup instructions, gate codes, loading dock info, etc."
                        rows={3}
                        style={{ ...inputStyle(false), resize: 'none' as const }}
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

              <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <p style={{ fontSize: '12px', textAlign: 'center', color: '#9E7A52', lineHeight: 1.7 }}>
                  Corporate and student org orders are confirmed within <strong>48 hours</strong>.
                  {form.requestInvoice && ' A formal invoice will be available after confirmation.'}
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
