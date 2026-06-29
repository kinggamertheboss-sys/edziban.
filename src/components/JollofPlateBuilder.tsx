'use client'

import { useState } from 'react'
import { useCart } from '@/context/CartContext'
import { formatCurrency } from '@/lib/utils'

const PLATE_ID = 'jollof-plate'
const BASE_PRICE = 15

const ADDONS = [
  { id: 'jollof-plate-plantain',      label: 'Fried plantain',      price: 2 },
  { id: 'jollof-plate-salad',         label: 'Ghana salad',         price: 2 },
  { id: 'jollof-plate-egg',           label: 'Boiled egg',          price: 1 },
  { id: 'jollof-plate-extra-sauce',   label: 'Extra shito or stew', price: 1 },
  { id: 'jollof-plate-extra-chicken', label: 'Extra chicken',       price: 4 },
]

export default function JollofPlateBuilder() {
  const { updateQuantity } = useCart()
  const [sauce, setSauce] = useState<'Shito' | 'Stew'>('Shito')
  const [addons, setAddons] = useState<Set<string>>(new Set())
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  const addonSum = ADDONS.filter(a => addons.has(a.id)).reduce((s, a) => s + a.price, 0)
  const plateTotal = (BASE_PRICE + addonSum) * qty

  function toggleAddon(id: string) {
    setAddons(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleAddToCart() {
    updateQuantity(PLATE_ID, qty, sauce)
    for (const addon of ADDONS) {
      if (addons.has(addon.id)) updateQuantity(addon.id, qty)
    }
    setAdded(true)
    setTimeout(() => setAdded(false), 2200)
  }

  return (
    <div style={{ marginBottom: '64px' }}>
      {/* Section label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
        <span className="label-upper" style={{ color: '#C4622D', whiteSpace: 'nowrap' }}>
          Individual Plates
        </span>
        <div style={{ flex: 1, height: '1px', background: '#E2CEB8' }} />
      </div>

      {/* Builder card */}
      <div className="plate-builder-card">

        {/* Left: media */}
        <div className="plate-builder-media">
          <video
            src="/videos/jollof.mp4"
            autoPlay muted loop playsInline
            aria-label="Ghanaian jollof rice plate"
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'center',
            }}
          />
          {/* Dark gradient overlay for readability */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to top, rgba(26,15,10,0.6) 0%, transparent 50%)',
          }} />
          {/* Badge */}
          <div style={{
            position: 'absolute', top: '16px', left: '16px',
            background: '#C4622D',
            color: '#FFF8F0',
            padding: '5px 14px',
            borderRadius: '100px',
            fontSize: '10.5px', fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            Starts at $15
          </div>
          {/* Bottom quote */}
          <p style={{
            position: 'absolute', bottom: '18px', left: '18px', right: '18px',
            fontSize: '12px', color: 'rgba(255,248,240,0.72)', lineHeight: 1.55,
            fontStyle: 'italic',
          }}>
            &ldquo;Start with our classic Ghanaian jollof plate and build it your way.&rdquo;
          </p>
        </div>

        {/* Right: controls */}
        <div className="plate-builder-body" style={{ flex: 1, padding: '32px', background: '#FFF8F0' }}>

          {/* Title */}
          <h2 style={{
            fontFamily: 'var(--font-playfair), Georgia, serif',
            fontSize: '22px', fontWeight: 700,
            color: '#1A0F0A', marginBottom: '5px', lineHeight: 1.15,
          }}>Build Your Jollof Plate</h2>
          <p style={{ fontSize: '12.5px', color: '#9E7A52', marginBottom: '6px', lineHeight: 1.6 }}>
            Jollof rice · 2 pieces of chicken · your choice of sauce
          </p>
          <p style={{ fontSize: '12px', color: '#6B4C3B', marginBottom: '24px', lineHeight: 1.65 }}>
            Plates start at $15. Build it your way with your favorite add-ons.
          </p>

          {/* Sauce selector */}
          <div style={{ marginBottom: '22px' }}>
            <p style={{
              fontSize: '10.5px', fontWeight: 700, color: '#6B4C3B',
              letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px',
            }}>
              Choose your sauce
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['Shito', 'Stew'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setSauce(s)}
                  aria-pressed={sauce === s}
                  style={{
                    padding: '8px 22px',
                    borderRadius: '100px',
                    border: '1.5px solid',
                    borderColor: sauce === s ? '#C4622D' : '#E2CEB8',
                    background: sauce === s ? '#C4622D' : 'white',
                    color: sauce === s ? '#FFF8F0' : '#6B4C3B',
                    fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >{s}</button>
              ))}
            </div>
          </div>

          {/* Add-ons */}
          <div style={{ marginBottom: '22px' }}>
            <p style={{
              fontSize: '10.5px', fontWeight: 700, color: '#6B4C3B',
              letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px',
            }}>
              Add-ons{' '}
              <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#9E7A52', fontSize: '11px' }}>
                (optional)
              </span>
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {ADDONS.map(addon => {
                const checked = addons.has(addon.id)
                return (
                  <button
                    key={addon.id}
                    onClick={() => toggleAddon(addon.id)}
                    aria-pressed={checked}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '11px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid',
                      borderColor: checked ? '#C4622D' : '#E2CEB8',
                      background: checked ? 'rgba(196,98,45,0.06)' : 'white',
                      cursor: 'pointer', transition: 'all 0.15s',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {/* Checkbox */}
                      <div style={{
                        width: '17px', height: '17px', borderRadius: '4px',
                        border: '1.5px solid',
                        borderColor: checked ? '#C4622D' : '#C8B8A2',
                        background: checked ? '#C4622D' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, transition: 'all 0.15s',
                      }}>
                        {checked && (
                          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                            <path d="M1 3.5L3.5 6L8 1" stroke="#FFF8F0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <span style={{
                        fontSize: '13px', color: '#1A0F0A',
                        fontWeight: checked ? 600 : 400,
                      }}>
                        {addon.label}
                      </span>
                    </div>
                    <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#C4622D', flexShrink: 0, marginLeft: '8px' }}>
                      +{formatCurrency(addon.price)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Qty + total row */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: '16px', marginBottom: '16px',
            padding: '16px 20px',
            borderRadius: '14px',
            background: '#1A0F0A',
          }}>
            <div>
              <p style={{
                fontSize: '9.5px', color: 'rgba(255,248,240,0.45)',
                fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px',
              }}>Quantity</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <button
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  disabled={qty === 1}
                  aria-label="Remove one plate"
                  style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    border: '1.5px solid rgba(255,248,240,0.2)',
                    background: 'transparent',
                    color: qty === 1 ? 'rgba(255,248,240,0.25)' : '#FFF8F0',
                    fontSize: '20px', cursor: qty === 1 ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    lineHeight: 1, transition: 'opacity 0.15s',
                  }}
                >−</button>
                <span style={{
                  fontWeight: 700, fontSize: '20px', color: '#FFF8F0',
                  minWidth: '22px', textAlign: 'center',
                }}>{qty}</span>
                <button
                  onClick={() => setQty(q => Math.min(99, q + 1))}
                  aria-label="Add one plate"
                  style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    border: '1.5px solid rgba(255,248,240,0.2)',
                    background: 'transparent', color: '#FFF8F0',
                    fontSize: '20px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    lineHeight: 1,
                  }}
                >+</button>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{
                fontSize: '9.5px', color: 'rgba(255,248,240,0.45)',
                fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px',
              }}>Total</p>
              <span style={{
                fontFamily: 'var(--font-playfair), Georgia, serif',
                fontWeight: 700, fontSize: '26px', color: '#FFF8F0',
              }}>{formatCurrency(plateTotal)}</span>
            </div>
          </div>

          {/* Add to Cart button */}
          <button
            onClick={handleAddToCart}
            style={{
              width: '100%',
              background: added ? '#2A6B2C' : '#C4622D',
              color: '#FFF8F0',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700, fontSize: '13px',
              letterSpacing: '0.07em', textTransform: 'uppercase',
              padding: '16px 32px', borderRadius: '100px',
              boxShadow: added
                ? '0 4px 20px rgba(42,107,44,0.35)'
                : '0 4px 20px rgba(196,98,45,0.35)',
              transition: 'all 0.22s ease',
            }}
          >
            {added ? 'Added to Cart' : `Add to Cart — ${formatCurrency(plateTotal)}`}
          </button>
        </div>
      </div>
    </div>
  )
}
