'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Footer from '@/components/Footer'

const steps = [
  {
    number: '01',
    title: 'Email confirmation',
    desc: 'A confirmation email has been sent to you with your complete order details and next steps.',
  },
  {
    number: '02',
    title: 'Fresh to order',
    desc: 'Your food is prepared closer to your event date. Nothing is batch frozen or reheated.',
  },
  {
    number: '03',
    title: 'Minimum confirmed',
    desc: 'Your order is locked in once the minimum batch quantity is reached for your requested items.',
  },
]

function ConfirmationContent() {
  const params = useSearchParams()
  const orderNumber = params.get('order') ?? 'EDZ-XXXXXX'
  const isCorporate = params.get('type') === 'corporate'

  return (
    <>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.7); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes drawCheck {
          from { stroke-dashoffset: 40; }
          to   { stroke-dashoffset: 0; }
        }
        .anim-check   { animation: scaleIn 0.45s cubic-bezier(0.34,1.56,0.64,1) 0.1s both; }
        .anim-label   { animation: fadeUp 0.5s ease 0.35s both; }
        .anim-heading { animation: fadeUp 0.5s ease 0.45s both; }
        .anim-order   { animation: fadeUp 0.5s ease 0.55s both; }
        .anim-text    { animation: fadeUp 0.5s ease 0.65s both; }
        .anim-divider { animation: fadeUp 0.4s ease 0.72s both; }
        .anim-steps   { animation: fadeUp 0.5s ease 0.8s both; }
        .anim-cta     { animation: fadeUp 0.5s ease 0.95s both; }
        .check-path   {
          stroke-dasharray: 40;
          stroke-dashoffset: 40;
          animation: drawCheck 0.4s ease 0.55s forwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .anim-check,.anim-label,.anim-heading,.anim-order,
          .anim-text,.anim-divider,.anim-steps,.anim-cta { animation: none; }
        }
      `}</style>

      <main id="main-content" style={{
        flex: 1,
        background: '#FFF8F0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '64px 24px 80px',
      }}>
        <div style={{ width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

          {/* Check icon */}
          <div className="anim-check" style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: '#C4622D',
            boxShadow: '0 0 0 12px rgba(196,98,45,0.1), 0 12px 32px rgba(196,98,45,0.28)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '28px', flexShrink: 0,
          }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <polyline
                className="check-path"
                points="20 6 9 17 4 12"
                stroke="#FFF8F0"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Label */}
          <p className="anim-label" style={{
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: '#C4622D', marginBottom: '12px',
          }}>
            Order received
          </p>

          {/* Heading */}
          <h1 className="anim-heading" style={{
            fontFamily: 'var(--font-playfair), Georgia, serif',
            fontSize: 'clamp(2.4rem, 6vw, 3.2rem)',
            fontWeight: 700, lineHeight: 1.05,
            letterSpacing: '-0.025em',
            color: '#1A0F0A',
            textAlign: 'center',
            marginBottom: '28px',
          }}>
            You&rsquo;re all set.
          </h1>

          {/* Order number */}
          <div className="anim-order" style={{
            display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
            gap: '6px', padding: '16px 32px',
            background: 'rgba(196,98,45,0.06)',
            border: '1.5px solid rgba(196,98,45,0.2)',
            borderRadius: '14px',
            marginBottom: '28px',
          }}>
            <span style={{
              fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em',
              textTransform: 'uppercase', color: '#9E7A52',
            }}>
              Order number
            </span>
            <span style={{
              fontFamily: 'var(--font-playfair), Georgia, serif',
              fontSize: '1.6rem', fontWeight: 700,
              color: '#C4622D', letterSpacing: '0.02em',
            }}>
              {orderNumber}
            </span>
          </div>

          {/* Thank you text */}
          <p className="anim-text" style={{
            fontSize: '15px', lineHeight: 1.75,
            color: '#6B4C3B', textAlign: 'center',
            maxWidth: '380px', marginBottom: '44px',
          }}>
            {isCorporate
              ? 'Your corporate order has been received. A confirmation email has been sent with your complete order details. Our team will be in touch within 48 hours.'
              : 'Your order has been received. A confirmation email has been sent to you with your complete order details. Our team will be in touch within 24 hours.'
            }
          </p>

          {/* Divider */}
          <div className="anim-divider" style={{
            width: '100%', height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(196,98,45,0.2) 30%, rgba(196,98,45,0.2) 70%, transparent)',
            marginBottom: '40px',
          }} />

          {/* Steps */}
          <div className="anim-steps" style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0', marginBottom: '44px' }}>
            {steps.map((step, i) => (
              <div key={step.number} style={{
                display: 'flex', gap: '20px', alignItems: 'flex-start',
                padding: '20px 0',
                borderBottom: i < steps.length - 1 ? '1px solid rgba(196,98,45,0.1)' : 'none',
              }}>
                {/* Number */}
                <span style={{
                  fontFamily: 'var(--font-playfair), Georgia, serif',
                  fontSize: '13px', fontWeight: 700,
                  color: 'rgba(196,98,45,0.4)',
                  letterSpacing: '0.05em',
                  flexShrink: 0, marginTop: '2px',
                  width: '24px',
                }}>
                  {step.number}
                </span>

                {/* Thin vertical accent line */}
                <div style={{
                  width: '2px', borderRadius: '2px',
                  background: 'rgba(196,98,45,0.25)',
                  alignSelf: 'stretch', flexShrink: 0,
                  marginTop: '2px',
                }} />

                {/* Text */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <p style={{
                    fontFamily: 'var(--font-playfair), Georgia, serif',
                    fontSize: '15px', fontWeight: 700,
                    color: '#1A0F0A', margin: 0, lineHeight: 1.3,
                  }}>
                    {step.title}
                  </p>
                  <p style={{
                    fontSize: '13.5px', lineHeight: 1.65,
                    color: '#6B4C3B', margin: 0,
                  }}>
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="anim-cta" style={{ width: '100%' }}>
            <Link
              href="/"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '100%', padding: '17px 32px',
                background: '#C4622D', color: '#FFF8F0',
                fontWeight: 700, fontSize: '13.5px',
                letterSpacing: '0.06em', textTransform: 'uppercase',
                borderRadius: '100px', textDecoration: 'none',
                boxShadow: '0 8px 28px rgba(196,98,45,0.3)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLAnchorElement
                el.style.transform = 'translateY(-2px)'
                el.style.boxShadow = '0 12px 36px rgba(196,98,45,0.38)'
                el.style.background = '#B5571E'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLAnchorElement
                el.style.transform = 'translateY(0)'
                el.style.boxShadow = '0 8px 28px rgba(196,98,45,0.3)'
                el.style.background = '#C4622D'
              }}
            >
              Back to home
            </Link>
          </div>

        </div>
      </main>
    </>
  )
}

export default function ConfirmationPage() {
  return (
    <>
      <Suspense fallback={
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FFF8F0' }}>
          <p style={{ color: '#9E7A52', fontSize: '14px' }}>Loading&hellip;</p>
        </div>
      }>
        <ConfirmationContent />
      </Suspense>
      <Footer />
    </>
  )
}
