import Link from 'next/link'

export default function Footer() {
  return (
    <footer style={{ background: '#1A0F0A' }}>
      <div className="wrap" style={{ paddingTop: '80px', paddingBottom: '80px' }}>

        {/* Top grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '48px 64px',
          marginBottom: '64px',
        }}>

          {/* Brand */}
          <div>
            <p style={{
              fontFamily: 'var(--font-playfair), Georgia, serif',
              fontSize: '30px', fontWeight: 700,
              color: '#C4622D',
              letterSpacing: '-0.02em',
              marginBottom: '4px',
            }}>
              Edziban
            </p>
            <p style={{
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'rgba(255,248,240,0.28)',
              marginBottom: '20px',
            }}>Ghana&apos;s finest, delivered to you.</p>
            <p style={{
              fontSize: '14px',
              lineHeight: 1.78,
              color: 'rgba(255,248,240,0.5)',
              maxWidth: '220px',
            }}>
              Ghanaian catering in Greater Boston.
              Proudly serving the Greater Boston area.
            </p>
          </div>

          {/* Quick links */}
          <nav aria-label="Footer navigation">
            <p className="label-upper" style={{ color: 'rgba(255,248,240,0.60)', marginBottom: '22px' }}>
              Quick links
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { href: '/',           label: 'Home' },
                { href: '/menu',       label: 'Menu' },
                { href: '/corporate',  label: 'Corporate' },
                { href: '/order-now',  label: 'Order Plates' },
                { href: '/order',      label: 'Book Catering' },
              ].map(link => (
                <Link key={link.href} href={link.href} style={{
                  fontSize: '14px',
                  color: 'rgba(255,248,240,0.80)',
                  textDecoration: 'none',
                  transition: 'color 0.2s',
                }}>
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>

          {/* We cater */}
          <div>
            <p className="label-upper" style={{ color: 'rgba(255,248,240,0.60)', marginBottom: '22px' }}>
              We cater
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                'Funerals & Memorials',
                'Weddings',
                'Naming Ceremonies',
                'Birthday Parties',
              ].map(ev => (
                <li key={ev} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span aria-hidden="true" style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#C4622D', flexShrink: 0 }} />
                  <span style={{ fontSize: '14px', color: 'rgba(255,248,240,0.75)' }}>{ev}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="label-upper" style={{ color: 'rgba(255,248,240,0.60)', marginBottom: '22px' }}>
              Contact
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '14px' }}>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,248,240,0.55)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                <span style={{ color: 'rgba(255,248,240,0.75)', lineHeight: 1.5 }}>Serving Greater Boston, MA</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,248,240,0.55)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16.92z"/>
                </svg>
                <a href="tel:+16175550000" style={{ color: 'rgba(255,248,240,0.80)', lineHeight: 1.5, textDecoration: 'none' }}>
                  Call/Text: (617) 555-0000
                </a>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,248,240,0.55)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                </svg>
                <a href="mailto:admin@edzibancatering.com" style={{ color: '#C4622D', textDecoration: 'none', lineHeight: 1.5 }}>
                  admin@edzibancatering.com
                </a>
              </div>

            </div>
          </div>
        </div>

        {/* Divider rule */}
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', marginBottom: '28px' }} />

        {/* Bottom bar */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          fontSize: '11px',
          letterSpacing: '0.06em',
          color: 'rgba(255,248,240,0.28)',
        }}>
          <span style={{ color: 'rgba(255,248,240,0.7)' }}>&copy; {new Date().getFullYear()} Edziban. All rights reserved.</span>
          <Link href="/privacy" style={{ color: 'rgba(255,248,240,0.7)', textDecoration: 'none' }}>Privacy Policy</Link>
          <span aria-hidden="true" style={{ color: 'rgba(255,248,240,0.4)' }}>·</span>
          <Link href="/terms" style={{ color: 'rgba(255,248,240,0.7)', textDecoration: 'none' }}>Terms & Conditions</Link>
        </div>
      </div>
    </footer>
  )
}
