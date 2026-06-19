'use client'

import { useState } from 'react'

const FAQS = [
  {
    q: 'How far in advance do I need to order?',
    a: 'We require at least 5 days notice to ensure your food is sourced and prepared fresh. For larger events, more notice is appreciated.',
  },
  {
    q: 'Do you deliver?',
    a: 'Yes, we offer both delivery and pickup across the Greater Boston area.',
  },
  {
    q: 'What if I need to cancel or change my order?',
    a: 'Contact us by phone, text, or email as soon as possible. We\'ll do our best to accommodate changes made more than 48 hours before your event.',
  },
  {
    q: 'Is there a minimum order?',
    a: 'No minimum for most orders. Corporate and student org orders have no minimum either.',
  },
  {
    q: 'How do I pay?',
    a: 'We accept card payments securely through Square at checkout.',
  },
]

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section style={{ padding: '100px 0', background: '#FFF8F0' }}>
      <div className="wrap">
        <div className="sec-head">
          <div className="overline">
            <div className="bar" />
            <span className="label-upper" style={{ color: '#C4622D' }}>FAQ</span>
            <div className="bar" />
          </div>
          <h2>Common questions.</h2>
        </div>

        <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {FAQS.map((faq, i) => {
            const isOpen = open === i
            return (
              <div
                key={i}
                style={{
                  borderBottom: '1px solid #E2CEB8',
                  overflow: 'hidden',
                }}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  style={{
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '22px 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    textAlign: 'left',
                  }}
                  aria-expanded={isOpen}
                >
                  <span style={{
                    fontFamily: 'var(--font-playfair), Georgia, serif',
                    fontSize: '16px',
                    fontWeight: 700,
                    color: isOpen ? '#C4622D' : '#1A0F0A',
                    lineHeight: 1.3,
                    transition: 'color 0.2s',
                  }}>
                    {faq.q}
                  </span>
                  <span style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    border: `1px solid ${isOpen ? '#C4622D' : '#E2CEB8'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: isOpen ? '#C4622D' : '#9E7A52',
                    transition: 'border-color 0.2s, color 0.2s, transform 0.2s',
                    transform: isOpen ? 'rotate(45deg)' : 'none',
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                  </span>
                </button>
                {isOpen && (
                  <div style={{
                    paddingBottom: '22px',
                    fontSize: '14px',
                    lineHeight: 1.8,
                    color: '#6B4C3B',
                  }}>
                    {faq.a}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
