import Link from 'next/link'
import Footer from '@/components/Footer'
import FAQ from '@/components/FAQ'
import { MENU_ITEMS } from '@/lib/mockData'
import { getItemGradient, formatCurrency } from '@/lib/utils'

const EVENTS = [
  { n: '01', title: 'Funerals and Memorials', desc: 'We handle all catering so the family can be fully present. Place your order at least 5 days in advance and we take care of the rest.' },
  { n: '02', title: 'Weddings', desc: 'Custom spreads tailored to your guest count and event timeline. Authentic Ghanaian cuisine for your most important day.' },
  { n: '03', title: 'Naming Ceremonies', desc: 'From Jollof and Waakye to Bofrot and everything in between. Fresh, made-to-order food for every guest at your table.' },
  { n: '04', title: 'Birthday Parties', desc: 'Trays, platters, and drinks for any party size. Select exactly what you need and we handle everything from there.' },
]

const STEPS = [
  { n: '01', title: 'Choose your menu', desc: 'Browse our menu and select your trays, platters, and drinks. Each item includes a guest count so you know exactly how much to order.' },
  { n: '02', title: 'Schedule your event', desc: 'Select a date at least 5 days in advance. All food is prepared fresh to order — nothing pre-made or reheated.' },
  { n: '03', title: 'We handle the rest', desc: 'Receive an email confirmation within 24 hours. We offer both delivery and pickup across the Greater Boston area.' },
]

const MARQUEE_ITEMS = [
  'Jollof Rice', 'Waakye', 'Puff Puff', 'Fried Chicken', 'Shito',
  'Ice Kenkey', 'Meat Pies', 'Made Fresh Daily', 'Boston Area',
  'Funerals', 'Weddings', 'Naming Ceremonies', 'Birthday Parties', 'Ghanaian Catering',
]

export default function HomePage() {
  const featured = MENU_ITEMS.filter(i =>
    ['jollof-rice', 'waakye', 'fried-chicken', 'tsofi'].includes(i.id)
  )

  return (
    <>
      <main id="main-content">

        {/* ────────────── PROMO BANNER ────────────── */}
        <div style={{
          background: '#1A0F0A',
          padding: '10px 0',
          textAlign: 'center',
          position: 'sticky',
          top: '76px',
          zIndex: 39,
        }}>
          <div className="wrap">
            <p style={{
              fontSize: '12.5px',
              fontWeight: 600,
              color: '#FFF8F0',
              letterSpacing: '0.04em',
            }}>
              New to Edziban? Get{' '}
              <span style={{ color: '#C4622D', fontWeight: 700 }}>$10 off</span>
              {' '}your first order — use code{' '}
              <span style={{
                background: 'rgba(196,98,45,0.35)',
                color: '#FFF8F0',
                fontWeight: 700,
                padding: '1px 7px',
                borderRadius: '4px',
                letterSpacing: '0.08em',
                fontFamily: 'monospace',
              }}>FIRST10</span>
              {' '}at checkout
            </p>
          </div>
        </div>

        {/* ────────────── HERO ────────────── */}
        <section style={{
          background: '#FFF8F0',
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          paddingTop: '80px',
          paddingBottom: '80px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Soft radial glow */}
          <div aria-hidden="true" style={{
            position: 'absolute',
            top: '-80px',
            right: '-80px',
            width: '640px',
            height: '640px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(196,98,45,0.07) 0%, transparent 68%)',
            pointerEvents: 'none',
          }} />
          <div aria-hidden="true" style={{
            position: 'absolute',
            bottom: '-60px',
            left: '-60px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(196,98,45,0.04) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <div className="wrap">
            <div className="hero-grid page-enter">

              {/* Left: Text */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '40px' }}>
                  <div style={{ width: '32px', height: '1px', background: '#C4622D' }} />
                  <span className="label-upper" style={{ color: '#C4622D' }}>Ghanaian Catering · Boston Area</span>
                </div>

                <h1 style={{
                  fontFamily: 'var(--font-playfair), Georgia, serif',
                  fontSize: 'clamp(3.4rem, 8vw, 7rem)',
                  fontWeight: 700,
                  lineHeight: 1.0,
                  letterSpacing: '-0.03em',
                  color: '#1A0F0A',
                  marginBottom: '36px',
                }}>
                  Ghana&rsquo;s finest,<br />
                  <span style={{ color: '#C4622D' }}>delivered<br />to&nbsp;you.</span>
                </h1>

                <p style={{
                  fontSize: 'clamp(15px, 1.8vw, 18px)',
                  lineHeight: 1.8,
                  color: '#4A2E20',
                  maxWidth: '460px',
                  marginBottom: '48px',
                }}>
                  Real Ghanaian food from real home cooks, brought to your
                  event in the Boston area. Funerals, weddings, naming
                  ceremonies, birthday parties.
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <Link href="/order" style={{
                    display: 'inline-flex', alignItems: 'center', gap: '12px',
                    background: '#C4622D', color: '#FFF8F0',
                    fontWeight: 600, fontSize: '14px',
                    letterSpacing: '0.03em',
                    padding: '17px 38px', borderRadius: '100px',
                    textDecoration: 'none',
                    boxShadow: '0 8px 40px rgba(196,98,45,0.36)',
                    transition: 'transform 0.25s cubic-bezier(0.22,1,0.36,1), box-shadow 0.25s ease',
                  }}>
                    Order Now
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </Link>
                  <a href="tel:+16175550000" style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    border: '1px solid rgba(196,98,45,0.45)',
                    color: '#C4622D',
                    fontWeight: 600, fontSize: '13px',
                    letterSpacing: '0.04em',
                    padding: '16px 28px', borderRadius: '100px',
                    textDecoration: 'none',
                    transition: 'border-color 0.2s, background 0.2s',
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16.92z"/>
                    </svg>
                    Call or Text
                  </a>
                </div>

                <div style={{
                  display: 'flex', flexWrap: 'wrap', gap: '8px 40px',
                  marginTop: '60px', paddingTop: '32px',
                  borderTop: '1px solid #E2CEB8',
                  fontSize: '10.5px', fontWeight: 700,
                  letterSpacing: '0.13em', textTransform: 'uppercase',
                  color: '#9E7A52',
                }}>
                  <span>5-day advance ordering</span>
                  <span>Delivery and pickup</span>
                  <span>Orders confirmed within 24 hours</span>
                </div>
              </div>

              {/* Right: Decorative panel */}
              <div aria-hidden="true" className="hero-deco" style={{ flexShrink: 0 }}>
                <div style={{
                  width: '240px',
                  height: '420px',
                  background: '#1A0F0A',
                  borderRadius: '130px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute',
                    bottom: 0, left: 0, right: 0,
                    height: '55%',
                    background: 'linear-gradient(to top, rgba(196,98,45,0.28), transparent)',
                    pointerEvents: 'none',
                  }} />
                  <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0,
                    height: '30%',
                    background: 'linear-gradient(to bottom, rgba(196,98,45,0.08), transparent)',
                    pointerEvents: 'none',
                  }} />

                  <div style={{
                    fontFamily: 'var(--font-playfair), Georgia, serif',
                    fontSize: '148px',
                    fontWeight: 700,
                    color: '#C4622D',
                    lineHeight: 1,
                    letterSpacing: '-0.05em',
                    position: 'relative',
                    zIndex: 1,
                  }}>E</div>

                  <div style={{
                    width: '36px', height: '1px',
                    background: 'rgba(196,98,45,0.5)',
                    margin: '14px 0',
                    position: 'relative', zIndex: 1,
                  }} />

                  <div style={{
                    fontFamily: 'var(--font-cormorant), var(--font-playfair), Georgia, serif',
                    fontSize: '15px',
                    fontStyle: 'italic',
                    color: 'rgba(255,248,240,0.6)',
                    textAlign: 'center',
                    letterSpacing: '0.02em',
                    lineHeight: 1.5,
                    position: 'relative', zIndex: 1,
                    padding: '0 20px',
                  }}>
                    Ghana&rsquo;s finest, delivered to you.
                  </div>

                  {/* Ring decoration */}
                  <div style={{
                    position: 'absolute',
                    top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '200px', height: '200px',
                    borderRadius: '50%',
                    border: '1px solid rgba(196,98,45,0.12)',
                    pointerEvents: 'none',
                    zIndex: 0,
                  }} />
                  <div style={{
                    position: 'absolute',
                    top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '160px', height: '160px',
                    borderRadius: '50%',
                    border: '1px solid rgba(196,98,45,0.07)',
                    pointerEvents: 'none',
                    zIndex: 0,
                  }} />
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ────────────── TRUST SECTION ────────────── */}
        <section style={{
          background: '#FFF8F0',
          borderTop: '1px solid #E2CEB8',
          borderBottom: '1px solid #E2CEB8',
          padding: '40px 0',
        }}>
          <div className="wrap">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '28px',
              maxWidth: '720px',
              margin: '0 auto',
            }}>
              <div aria-hidden="true" style={{
                fontFamily: 'var(--font-playfair), Georgia, serif',
                fontSize: '52px',
                fontWeight: 700,
                color: '#C4622D',
                lineHeight: 1,
                flexShrink: 0,
                opacity: 0.85,
              }}>E</div>
              <div>
                <p style={{
                  fontFamily: 'var(--font-playfair), Georgia, serif',
                  fontSize: 'clamp(15px, 1.6vw, 17px)',
                  fontWeight: 700,
                  color: '#1A0F0A',
                  marginBottom: '6px',
                  lineHeight: 1.3,
                }}>
                  Proudly Fante-owned and operated in the Boston area
                </p>
                <p style={{
                  fontSize: '13.5px',
                  lineHeight: 1.75,
                  color: '#6B4C3B',
                }}>
                  Every dish is cooked fresh to order by real Ghanaian home cooks.
                  No shortcuts, no pre-made trays.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ────────────── MARQUEE ────────────── */}
        <div
          aria-hidden="true"
          style={{
            background: '#C4622D',
            padding: '13px 0',
            overflow: 'hidden',
          }}
        >
          <div className="marquee-track" style={{
            display: 'flex',
            alignItems: 'center',
            whiteSpace: 'nowrap',
          }}>
            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
              <span key={i} style={{
                fontSize: '10.5px',
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: '#FFF8F0',
                padding: '0 28px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '28px',
              }}>
                {item}
                <span style={{
                  display: 'inline-block',
                  width: '3px', height: '3px',
                  borderRadius: '50%',
                  background: 'rgba(255,248,240,0.45)',
                  flexShrink: 0,
                }} />
              </span>
            ))}
          </div>
        </div>

        {/* ────────────── FEATURED MENU ────────────── */}
        <section style={{ padding: '108px 0', background: '#1A0F0A' }}>
          <div className="wrap">
            <div className="sec-head">
              <div className="overline">
                <div className="bar" style={{ background: '#C4622D' }} />
                <span className="label-upper" style={{ color: '#C4622D' }}>From the menu</span>
                <div className="bar" style={{ background: '#C4622D' }} />
              </div>
              <h2 style={{ color: '#FFF8F0' }}>Fresh food from<br />Ghanaian cooks.</h2>
              <p style={{ color: 'rgba(255,248,240,0.55)' }}>
                Every item is cooked to order by Ghanaian home cooks in the Boston area. Nothing pre-made.
              </p>
            </div>

            <div className="stagger feat-grid">
              {featured.map(item => (
                <Link key={item.id} href="/menu" className="feat-card">
                  {/* Media strip — video > image > gradient fallback */}
                  <div style={{
                    width: (item.video || item.image) ? '140px' : '108px',
                    flexShrink: 0,
                    background: getItemGradient(item.id),
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    paddingBottom: (item.video || item.image) ? '0' : '20px',
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
                        }}
                      />
                    ) : (
                      <span style={{
                        writingMode: 'vertical-rl',
                        transform: 'rotate(180deg)',
                        fontSize: '9px',
                        fontWeight: 700,
                        letterSpacing: '0.16em',
                        textTransform: 'uppercase',
                        color: 'rgba(255,248,240,0.6)',
                      }}>
                        {item.category}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="feat-card-body" style={{
                    padding: '28px 28px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    flex: 1,
                  }}>
                    <div>
                      <h3 style={{
                        fontFamily: 'var(--font-playfair), Georgia, serif',
                        fontSize: '19px', fontWeight: 700,
                        color: '#FFF8F0', marginBottom: '10px',
                        lineHeight: 1.15,
                      }}>{item.name}</h3>
                      <p style={{
                        fontSize: '13px', lineHeight: 1.72,
                        color: 'rgba(255,248,240,0.5)',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical' as const,
                        overflow: 'hidden',
                      }}>{item.description}</p>
                    </div>
                    <div style={{ marginTop: '22px', display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                      <span style={{ fontWeight: 700, fontSize: '21px', color: '#C4622D' }}>
                        {formatCurrency(item.price)}
                      </span>
                      <span style={{ fontSize: '11px', color: 'rgba(255,248,240,0.35)', letterSpacing: '0.04em' }}>
                        {item.unit}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginTop: '52px' }}>
              <Link href="/menu" style={{
                display: 'inline-flex', alignItems: 'center', gap: '10px',
                border: '1px solid rgba(196,98,45,0.5)', color: '#C4622D',
                fontWeight: 600, fontSize: '13px',
                letterSpacing: '0.07em',
                padding: '15px 38px', borderRadius: '100px',
                textDecoration: 'none',
                transition: 'background 0.25s, border-color 0.25s',
              }}>
                See full menu
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </Link>
            </div>
          </div>
        </section>

        {/* ────────────── HOW IT WORKS ────────────── */}
        <section style={{ padding: '108px 0', background: '#FFF8F0' }}>
          <div className="wrap">
            <div className="sec-head">
              <div className="overline">
                <div className="bar" />
                <span className="label-upper" style={{ color: '#C4622D' }}>How it works</span>
                <div className="bar" />
              </div>
              <h2>Three steps to get<br />your food sorted.</h2>
            </div>

            <div className="stagger steps-grid">
              {STEPS.map((step, i) => (
                <div key={step.n} className="step-cell" style={{
                  padding: '56px 48px',
                  borderRight: i < STEPS.length - 1 ? '1px solid #E2CEB8' : 'none',
                }}>
                  <div style={{
                    fontFamily: 'var(--font-playfair), Georgia, serif',
                    fontSize: '84px', fontWeight: 700,
                    color: 'rgba(196,98,45,0.11)',
                    lineHeight: 1, marginBottom: '28px',
                  }}>{step.n}</div>
                  <div style={{ width: '32px', height: '1px', background: '#C4622D', marginBottom: '22px' }} />
                  <h3 style={{
                    fontFamily: 'var(--font-playfair), Georgia, serif',
                    fontSize: '20px', fontWeight: 700,
                    color: '#1A0F0A', marginBottom: '14px',
                    lineHeight: 1.2,
                  }}>{step.title}</h3>
                  <p style={{ fontSize: '14px', lineHeight: 1.8, color: '#6B4C3B' }}>{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ────────────── BRAND STATEMENT ────────────── */}
        <section style={{
          padding: '128px 0',
          background: '#C4622D',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Background oversized letterform */}
          <div aria-hidden="true" style={{
            position: 'absolute',
            right: '-60px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontFamily: 'var(--font-playfair), Georgia, serif',
            fontSize: '520px',
            fontWeight: 700,
            color: 'rgba(0,0,0,0.07)',
            lineHeight: 1,
            userSelect: 'none',
            pointerEvents: 'none',
            letterSpacing: '-0.05em',
          }}>E</div>

          {/* Top-left ring decoration */}
          <div aria-hidden="true" style={{
            position: 'absolute',
            top: '-80px', left: '-80px',
            width: '320px', height: '320px',
            borderRadius: '50%',
            border: '1px solid rgba(255,248,240,0.1)',
            pointerEvents: 'none',
          }} />
          <div aria-hidden="true" style={{
            position: 'absolute',
            top: '-120px', left: '-120px',
            width: '480px', height: '480px',
            borderRadius: '50%',
            border: '1px solid rgba(255,248,240,0.05)',
            pointerEvents: 'none',
          }} />

          <div className="wrap" style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '44px' }}>
                <div style={{ width: '32px', height: '1px', background: 'rgba(255,248,240,0.45)' }} />
                <span className="label-upper" style={{ color: 'rgba(255,248,240,0.75)' }}>Our promise</span>
                <div style={{ width: '32px', height: '1px', background: 'rgba(255,248,240,0.45)' }} />
              </div>

              <blockquote style={{
                fontFamily: 'var(--font-cormorant), var(--font-playfair), Georgia, serif',
                fontSize: 'clamp(1.7rem, 3.8vw, 3rem)',
                fontWeight: 600,
                lineHeight: 1.28,
                color: '#FFF8F0',
                fontStyle: 'italic',
                marginBottom: '56px',
                letterSpacing: '-0.01em',
              }}>
                &ldquo;Edziban means <em>food in pot</em>{' '}in Fante.
                Every tray we put out carries that. Made by Ghanaian hands,
                cooked fresh for every table.&rdquo;
              </blockquote>

              <Link href="/order" style={{
                display: 'inline-flex', alignItems: 'center', gap: '12px',
                background: '#FFF8F0', color: '#1A0F0A',
                fontWeight: 700, fontSize: '13px',
                letterSpacing: '0.07em',
                padding: '18px 48px', borderRadius: '100px',
                textDecoration: 'none',
                boxShadow: '0 12px 48px rgba(0,0,0,0.18)',
                transition: 'transform 0.25s cubic-bezier(0.22,1,0.36,1)',
              }}>
                Order Now
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </Link>
            </div>
          </div>
        </section>

      </main>
      <FAQ />
      <Footer />
    </>
  )
}
