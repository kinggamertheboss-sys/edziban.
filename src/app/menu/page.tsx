'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import Footer from '@/components/Footer'
import { MENU_ITEMS, MENU_CATEGORIES } from '@/lib/mockData'
import { useCart } from '@/context/CartContext'
import { formatCurrency, getItemGradient } from '@/lib/utils'

function MenuPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { items, updateQuantity, subtotal, totalItems } = useCart()
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const [isCorporate, setIsCorporate] = useState(false)

  useEffect(() => {
    if (searchParams.get('type') === 'corporate') {
      sessionStorage.setItem('edziban_order_type', 'corporate')
      setIsCorporate(true)
    } else {
      const stored = sessionStorage.getItem('edziban_order_type')
      setIsCorporate(stored === 'corporate')
    }
  }, [searchParams])

  function handleCheckout() {
    if (isCorporate) {
      sessionStorage.removeItem('edziban_order_type')
      router.push('/corporate/order')
    } else {
      router.push('/order')
    }
  }

  const getOption = (id: string, opts?: string[]) =>
    selectedOptions[id] ?? opts?.[0] ?? undefined

  const getQty = (id: string, option?: string) => {
    const cartId = option ? `${id}--${option}` : id
    return items.find(i => i.id === cartId)?.quantity ?? 0
  }

  return (
    <>

      <main id="main-content" className="page-enter" style={{ paddingBottom: '160px' }}>

        {/* Corporate order banner */}
        {isCorporate && (
          <div style={{
            background: '#C4622D',
            padding: '14px 0',
            position: 'sticky', top: '64px', zIndex: 40,
          }}>
            <div className="wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FFF8F0', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFF8F0' }}>Corporate order in progress</span>
                <span style={{ fontSize: '13px', color: 'rgba(255,248,240,0.75)' }}>— Add your items, then click Checkout below</span>
              </div>
              <button
                onClick={() => { sessionStorage.removeItem('edziban_order_type'); setIsCorporate(false) }}
                style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,248,240,0.7)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Cancel corporate order
              </button>
            </div>
          </div>
        )}

        {/* Page header */}
        <div style={{
          background: '#1A0F0A',
          paddingTop: '72px',
          paddingBottom: '72px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Decorative background E */}
          <div aria-hidden="true" style={{
            position: 'absolute',
            right: '-40px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontFamily: 'var(--font-playfair), Georgia, serif',
            fontSize: '320px',
            fontWeight: 700,
            color: 'rgba(196,98,45,0.06)',
            lineHeight: 1,
            userSelect: 'none',
            pointerEvents: 'none',
            letterSpacing: '-0.05em',
          }}>E</div>

          <div className="wrap" style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ maxWidth: '680px', margin: '0 auto', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '24px' }}>
                <div style={{ width: '28px', height: '1px', background: '#C4622D' }} />
                <span className="label-upper" style={{ color: '#C4622D' }}>Catering menu</span>
                <div style={{ width: '28px', height: '1px', background: '#C4622D' }} />
              </div>
              <h1 style={{
                fontFamily: 'var(--font-playfair), Georgia, serif',
                fontSize: 'clamp(2.4rem, 5vw, 3.5rem)',
                fontWeight: 700,
                lineHeight: 1.05,
                letterSpacing: '-0.025em',
                color: '#FFF8F0',
                marginBottom: '18px',
              }}>
                Pick your food.
              </h1>
              <p style={{ fontSize: '15px', lineHeight: 1.75, color: 'rgba(255,248,240,0.55)' }}>
                Everything is cooked fresh to order. Pick your quantities below.
                Each item shows how many people it feeds.
              </p>
            </div>
          </div>
        </div>

        {/* Items by category */}
        <div className="wrap" style={{ paddingTop: '64px' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '64px' }}>
            {MENU_CATEGORIES.map(cat => {
              const catItems = MENU_ITEMS.filter(i => i.category === cat.key)
              if (catItems.length === 0) return null
              return (
                <div key={cat.key}>
                  {/* Category label */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
                    <span className="label-upper" style={{ color: '#C4622D', whiteSpace: 'nowrap' }}>
                      {cat.label}
                    </span>
                    <div style={{ flex: 1, height: '1px', background: '#E2CEB8' }} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {catItems.map(item => {
                      const selectedOpt = getOption(item.id, item.options)
                      const qty = getQty(item.id, selectedOpt)
                      return (
                        <div key={item.id} className="menu-item-card">

                          {/* Media strip — video > image > gradient fallback */}
                          <div className="menu-card-media" style={{
                            width: (item.video || item.image) ? '140px' : '96px',
                            flexShrink: 0,
                            position: 'relative',
                            overflow: 'hidden',
                            background: getItemGradient(item.id),
                            display: 'flex',
                            alignItems: 'flex-end',
                            justifyContent: 'center',
                            paddingBottom: (item.video || item.image) ? '0' : '18px',
                          }}>
                            {item.video ? (
                              <video
                                src={item.video}
                                autoPlay
                                muted
                                loop
                                playsInline
                                aria-label={item.name}
                                style={{
                                  position: 'absolute',
                                  inset: 0,
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                  objectPosition: item.mediaPosition ?? 'center',
                                }}
                              />
                            ) : item.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.image}
                                alt={item.name}
                                style={{
                                  position: 'absolute',
                                  inset: 0,
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                  objectPosition: item.mediaPosition ?? 'center',
                                }}
                              />
                            ) : (
                              <span style={{
                                writingMode: 'vertical-rl',
                                transform: 'rotate(180deg)',
                                fontSize: '8.5px',
                                fontWeight: 700,
                                letterSpacing: '0.16em',
                                textTransform: 'uppercase',
                                color: 'rgba(255,248,240,0.65)',
                              }}>
                                {cat.label}
                              </span>
                            )}
                          </div>

                          {/* Card content */}
                          <div className="menu-card-body" style={{ padding: '28px 28px 24px', flex: 1 }}>

                            {/* Top row */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              justifyContent: 'space-between',
                              gap: '20px',
                              marginBottom: '14px',
                            }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <h2 style={{
                                  fontFamily: 'var(--font-playfair), Georgia, serif',
                                  fontSize: '19px', fontWeight: 700,
                                  color: '#1A0F0A', marginBottom: '8px',
                                  lineHeight: 1.15,
                                }}>{item.name}</h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                    <span style={{ fontWeight: 700, fontSize: '17px', color: '#C4622D' }}>
                                      {formatCurrency(item.price)}
                                    </span>
                                    <span style={{ fontSize: '12px', color: '#9E7A52' }}>{item.unit}</span>
                                  </div>
                                  <span style={{ fontSize: '11px', color: '#6B4C3B', letterSpacing: '0.01em' }}>{item.serves}</span>
                                </div>
                              </div>

                              {/* Qty controls */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
                                <button
                                  className="qty-btn"
                                  onClick={() => updateQuantity(item.id, -1, selectedOpt)}
                                  disabled={qty === 0}
                                  aria-label={`Remove ${item.name}`}
                                >−</button>
                                <span style={{
                                  fontWeight: 700, fontSize: '17px',
                                  color: '#1A0F0A', minWidth: '22px',
                                  textAlign: 'center',
                                }}>{qty}</span>
                                <button
                                  className="qty-btn"
                                  onClick={() => updateQuantity(item.id, 1, selectedOpt)}
                                  aria-label={`Add ${item.name}`}
                                >+</button>
                              </div>
                            </div>

                            {/* Protein / option selector */}
                            {item.options && item.options.length > 0 && (
                              <div role="group" aria-label={`Protein choice for ${item.name}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                                <span aria-hidden="true" style={{ fontSize: '12px', fontWeight: 600, color: '#6B4C3B', letterSpacing: '0.04em' }}>
                                  Protein:
                                </span>
                                {item.options.map(opt => (
                                  <button
                                    key={opt}
                                    onClick={() => setSelectedOptions(prev => ({ ...prev, [item.id]: opt }))}
                                    aria-pressed={selectedOpt === opt}
                                    style={{
                                      padding: '4px 14px',
                                      borderRadius: '100px',
                                      border: '1.5px solid',
                                      borderColor: selectedOpt === opt ? '#C4622D' : '#E2CEB8',
                                      background: selectedOpt === opt ? '#C4622D' : 'transparent',
                                      color: selectedOpt === opt ? '#FFF8F0' : '#6B4C3B',
                                      fontSize: '12px', fontWeight: 600,
                                      cursor: 'pointer',
                                      transition: 'all 0.15s',
                                    }}
                                  >{opt}</button>
                                ))}
                              </div>
                            )}

                            {/* Description */}
                            <p style={{ fontSize: '13.5px', lineHeight: 1.78, color: '#6B4C3B', overflowWrap: 'break-word' }}>
                              {item.description}
                            </p>

                            {/* Line total */}
                            {qty > 0 && (
                              <div style={{
                                marginTop: '16px', paddingTop: '16px',
                                borderTop: '1px solid #E2CEB8',
                                display: 'flex', justifyContent: 'space-between',
                                fontSize: '13px', fontWeight: 600,
                              }}>
                                <span style={{ color: '#6B4C3B' }}>
                                  {qty} {qty === 1 ? 'unit' : 'units'} selected
                                  {selectedOpt ? ` · ${selectedOpt}` : ''}
                                </span>
                                <span style={{ color: '#C4622D' }}>
                                  {formatCurrency(item.price * qty)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>

      {/* Sticky order bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        background: 'linear-gradient(to top, #FFF8F0 70%, transparent)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        <div className="wrap" style={{ paddingTop: '20px', paddingBottom: '20px' }}>
          <div style={{
            maxWidth: '800px', margin: '0 auto',
            background: '#1A0F0A',
            borderRadius: '20px', padding: '18px 28px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
            boxShadow: '0 8px 40px rgba(26,15,10,0.22)',
          }}>
            <div>
              {totalItems > 0 ? (
                <>
                  <p style={{ fontSize: '11px', color: 'rgba(255,248,240,0.5)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {totalItems} {totalItems === 1 ? 'item' : 'items'} selected
                  </p>
                  <p style={{
                    fontFamily: 'var(--font-playfair), Georgia, serif',
                    fontWeight: 700, fontSize: '22px',
                    color: '#FFF8F0',
                    lineHeight: 1.15,
                  }}>{formatCurrency(subtotal)}</p>
                </>
              ) : (
                <p style={{ fontSize: '14px', color: 'rgba(255,248,240,0.5)' }}>Select items to begin</p>
              )}
            </div>
            <button
              onClick={handleCheckout}
              disabled={totalItems === 0}
              style={{
                background: totalItems > 0 ? '#C4622D' : 'rgba(255,255,255,0.08)',
                color: totalItems > 0 ? '#FFF8F0' : 'rgba(255,255,255,0.25)',
                border: 'none',
                cursor: totalItems > 0 ? 'pointer' : 'not-allowed',
                fontWeight: 700, fontSize: '13px',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                padding: '14px 32px', borderRadius: '100px',
                whiteSpace: 'nowrap',
                boxShadow: totalItems > 0 ? '0 4px 20px rgba(196,98,45,0.38)' : 'none',
                transition: 'all 0.22s ease',
              }}
            >
              {isCorporate ? 'Corporate Checkout' : 'Proceed to Order'}
            </button>
          </div>
        </div>
      </div>

      <Footer />
    </>
  )
}

export default function MenuPage() {
  return (
    <Suspense>
      <MenuPageInner />
    </Suspense>
  )
}
