import Link from 'next/link'
import Footer from '@/components/Footer'
import { MENU_ITEMS } from '@/lib/mockData'
import { formatCurrency } from '@/lib/utils'

const USE_CASES = [
  {
    n: '01',
    title: 'Team lunches',
    desc: 'A few trays of jollof, chicken, and drinks covers 20-40 people. Under $10 per head. Better than ordering pizza for the fourth time this month.',
  },
  {
    n: '02',
    title: 'Company celebrations',
    desc: 'Work anniversaries, project wrap-ups, onboarding days. A full Ghanaian spread is something people remember, not just another catered event.',
  },
  {
    n: '03',
    title: 'Cultural nights',
    desc: 'Student orgs running heritage events, cultural shows, or Africa-themed dinners. We handle the food side so your committee can focus on everything else.',
  },
  {
    n: '04',
    title: 'Club fundraisers',
    desc: 'Bofrot, meat pies, and drinks move fast at fundraisers. Order a batch, set a table, and let the food do the work.',
  },
]

const FEATURED_IDS = ['jollof-rice', 'fried-chicken', 'puff-puff', 'bb-cocktail']

const FACTS = [
  { label: 'Lead time', value: '5 days minimum' },
  { label: 'Confirmation', value: 'Within 48 hours' },
  { label: 'Delivery area', value: 'Greater Boston' },
  { label: 'Per person', value: '$5 - $9 for most spreads' },
  { label: 'Minimum order', value: 'No minimum' },
  { label: 'Payment', value: 'Card via Square' },
  { label: 'Invoice', value: 'Available on request' },
]

export default function CorporatePage() {
  const featured = MENU_ITEMS.filter(i => FEATURED_IDS.includes(i.id))

  return (
    <>
      <main>

        {/* ── Hero ── */}
        <section style={{
          background: '#1A0F0A',
          paddingTop: '100px',
          paddingBottom: '100px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute',
            right: '-40px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontFamily: 'var(--font-playfair), Georgia, serif',
            fontSize: '360px',
            fontWeight: 700,
            color: 'rgba(196,98,45,0.05)',
            lineHeight: 1,
            userSelect: 'none',
            pointerEvents: 'none',
            letterSpacing: '-0.05em',
          }}>E</div>

          <div className="wrap" style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ maxWidth: '720px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '36px' }}>
                <div style={{ width: '32px', height: '1px', background: '#C4622D' }} />
                <span className="label-upper" style={{ color: '#C4622D' }}>Corporate and student org catering</span>
              </div>

              <h1 style={{
                fontFamily: 'var(--font-playfair), Georgia, serif',
                fontSize: 'clamp(2.6rem, 6vw, 5rem)',
                fontWeight: 700,
                lineHeight: 1.05,
                letterSpacing: '-0.03em',
                color: '#FFF8F0',
                marginBottom: '32px',
              }}>
                Food worth talking<br />
                <span style={{ color: '#C4622D' }}>about at work.</span>
              </h1>

              <p style={{
                fontSize: 'clamp(15px, 1.8vw, 17px)',
                lineHeight: 1.8,
                color: 'rgba(255,248,240,0.58)',
                maxWidth: '520px',
                marginBottom: '48px',
              }}>
                Most office catering is forgettable. Edziban brings Ghanaian food
                to your team lunch, company event, or student org gathering.
                Something people will actually talk about.
              </p>

              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <Link href="/menu?type=corporate" style={{
                  display: 'inline-flex', alignItems: 'center', gap: '12px',
                  background: '#C4622D', color: '#FFF8F0',
                  fontWeight: 600, fontSize: '13px',
                  letterSpacing: '0.04em',
                  padding: '16px 36px', borderRadius: '100px',
                  textDecoration: 'none',
                  boxShadow: '0 8px 40px rgba(196,98,45,0.32)',
                  transition: 'transform 0.2s',
                }}>
                  Place a corporate order
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </Link>
                <Link href="/menu" style={{
                  display: 'inline-flex', alignItems: 'center', gap: '12px',
                  border: '1px solid rgba(196,98,45,0.4)', color: '#C4622D',
                  fontWeight: 600, fontSize: '13px',
                  letterSpacing: '0.04em',
                  padding: '16px 36px', borderRadius: '100px',
                  textDecoration: 'none',
                  transition: 'border-color 0.2s',
                }}>
                  Browse the menu
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Student org callout ── */}
        <section style={{ background: '#C4622D', padding: '20px 0' }}>
          <div className="wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,248,240,0.7)' }}>Student Organizations</span>
            <div style={{ width: '1px', height: '16px', background: 'rgba(255,248,240,0.3)' }} />
            <span style={{ fontSize: '14px', color: '#FFF8F0', fontWeight: 500 }}>
              Student orgs get the same order flow, same menu, and a formal invoice for reimbursement.
            </span>
            <Link href="/menu?type=corporate" style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: 'rgba(255,248,240,0.15)', color: '#FFF8F0',
              fontWeight: 600, fontSize: '12px', letterSpacing: '0.06em',
              padding: '8px 20px', borderRadius: '100px',
              textDecoration: 'none', border: '1px solid rgba(255,248,240,0.3)',
              whiteSpace: 'nowrap',
            }}>
              Order now
            </Link>
          </div>
        </section>

        {/* ── Use cases ── */}
        <section style={{ background: '#FFF8F0', padding: '100px 0' }}>
          <div className="wrap">
            <div className="sec-head">
              <div className="overline">
                <div className="bar" />
                <span className="label-upper" style={{ color: '#C4622D' }}>What we cater</span>
                <div className="bar" />
              </div>
              <h2>Built for groups,<br />not just parties.</h2>
              <p style={{ color: '#6B4C3B' }}>
                Offices and student orgs order differently than families. Smaller headcount,
                tighter budgets, and they need it to be easy.
              </p>
            </div>

            <div className="stagger steps-grid corp-steps">
              {USE_CASES.map((uc, i) => (
                <div key={uc.n} className="step-cell" style={{
                  padding: '40px 28px',
                  borderRight: i < USE_CASES.length - 1 ? '1px solid #E2CEB8' : 'none',
                }}>
                  <div style={{
                    fontFamily: 'var(--font-playfair), Georgia, serif',
                    fontSize: '60px', fontWeight: 700,
                    color: 'rgba(196,98,45,0.1)',
                    lineHeight: 1, marginBottom: '20px',
                  }}>{uc.n}</div>
                  <div style={{ width: '28px', height: '1px', background: '#C4622D', marginBottom: '20px' }} />
                  <h3 style={{
                    fontFamily: 'var(--font-playfair), Georgia, serif',
                    fontSize: '19px', fontWeight: 700,
                    color: '#1A0F0A', marginBottom: '12px', lineHeight: 1.2,
                  }}>{uc.title}</h3>
                  <p style={{ fontSize: '14px', lineHeight: 1.8, color: '#6B4C3B' }}>{uc.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Featured items ── */}
        <section style={{ background: '#1A0F0A', padding: '100px 0' }}>
          <div className="wrap">
            <div className="sec-head">
              <div className="overline">
                <div className="bar" style={{ background: '#C4622D' }} />
                <span className="label-upper" style={{ color: '#C4622D' }}>Popular for groups</span>
                <div className="bar" style={{ background: '#C4622D' }} />
              </div>
              <h2 style={{ color: '#FFF8F0' }}>Items that work<br />at any office event.</h2>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px',
            }}>
              {featured.map(item => (
                <Link key={item.id} href="/menu" style={{
                  background: '#261410',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '16px',
                  padding: '28px',
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  transition: 'border-color 0.2s',
                }}>
                  <div style={{
                    fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em',
                    textTransform: 'uppercase', color: '#C4622D',
                  }}>{item.unit}</div>
                  <h3 style={{
                    fontFamily: 'var(--font-playfair), Georgia, serif',
                    fontSize: '20px', fontWeight: 700,
                    color: '#FFF8F0', lineHeight: 1.15,
                  }}>{item.name}</h3>
                  <p style={{
                    fontSize: '13px', lineHeight: 1.7,
                    color: 'rgba(255,248,240,0.45)',
                    flex: 1,
                  }}>{item.serves}</p>
                  <div style={{
                    display: 'flex', alignItems: 'baseline', gap: '8px',
                    paddingTop: '12px',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <span style={{ fontSize: '22px', fontWeight: 700, color: '#C4622D' }}>
                      {formatCurrency(item.price)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginTop: '48px' }}>
              <Link href="/menu" style={{
                display: 'inline-flex', alignItems: 'center', gap: '10px',
                border: '1px solid rgba(196,98,45,0.45)', color: '#C4622D',
                fontWeight: 600, fontSize: '13px', letterSpacing: '0.06em',
                padding: '15px 36px', borderRadius: '100px',
                textDecoration: 'none',
              }}>
                See full menu
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </Link>
            </div>
          </div>
        </section>

        {/* ── Logistics ── */}
        <section style={{ background: '#FFF8F0', padding: '100px 0' }}>
          <div className="wrap">
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '80px',
              alignItems: 'start',
            }}
            className="corp-split"
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
                  <div style={{ width: '28px', height: '1px', background: '#C4622D' }} />
                  <span className="label-upper" style={{ color: '#C4622D' }}>How it works</span>
                </div>
                <h2 style={{
                  fontFamily: 'var(--font-playfair), Georgia, serif',
                  fontSize: 'clamp(1.9rem, 3.5vw, 2.8rem)',
                  fontWeight: 700,
                  lineHeight: 1.1,
                  letterSpacing: '-0.02em',
                  color: '#1A0F0A',
                  marginBottom: '24px',
                }}>
                  Order once,<br />we handle the rest.
                </h2>
                <p style={{ fontSize: '15px', lineHeight: 1.8, color: '#6B4C3B', maxWidth: '400px' }}>
                  Go through the menu, pick your quantities, and place the order.
                  We confirm over WhatsApp or SMS within 24 hours with delivery or pickup details.
                  No back-and-forth, no custom quote forms.
                </p>
                <div style={{ marginTop: '36px' }}>
                  <Link href="/menu?type=corporate" style={{
                    display: 'inline-flex', alignItems: 'center', gap: '10px',
                    background: '#C4622D', color: '#FFF8F0',
                    fontWeight: 600, fontSize: '13px', letterSpacing: '0.04em',
                    padding: '15px 32px', borderRadius: '100px',
                    textDecoration: 'none',
                    boxShadow: '0 6px 28px rgba(196,98,45,0.3)',
                  }}>
                    Start your order
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </Link>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {FACTS.map((fact, i) => (
                  <div key={fact.label} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '18px 0',
                    borderBottom: i < FACTS.length - 1 ? '1px solid #E2CEB8' : 'none',
                  }}>
                    <span style={{
                      fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em',
                      textTransform: 'uppercase', color: '#9E7A52',
                    }}>{fact.label}</span>
                    <span style={{ fontSize: '15px', fontWeight: 600, color: '#1A0F0A' }}>
                      {fact.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

      </main>
      <Footer />

      <style>{`
        .corp-steps { grid-template-columns: repeat(4, 1fr) !important; }
        @media (max-width: 900px) {
          .corp-steps { grid-template-columns: repeat(2, 1fr) !important; }
          .corp-steps .step-cell { border-right: none !important; border-bottom: 1px solid #E2CEB8; }
          .corp-steps .step-cell:last-child { border-bottom: none; }
        }
        @media (max-width: 540px) {
          .corp-steps { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 700px) {
          .corp-split { grid-template-columns: 1fr !important; gap: 48px !important; }
        }
      `}</style>
    </>
  )
}
