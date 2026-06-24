import Link from 'next/link'
import Footer from '@/components/Footer'

const LAST_UPDATED = 'June 23, 2026'
const CONTACT_EMAIL = 'admin@edzibancatering.com'
const SITE = 'edzibancatering.com'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '40px' }}>
      <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: '20px', fontWeight: 700, color: '#1A0F0A', marginBottom: '14px' }}>{title}</h2>
      <div style={{ fontSize: '15px', color: '#4A2E20', lineHeight: 1.8 }}>{children}</div>
    </section>
  )
}

export default function PrivacyPage() {
  return (
    <>
      <div style={{ minHeight: '100vh', background: '#FFF8F0', paddingTop: '76px' }}>
        <div style={{ background: '#1A0F0A', padding: '56px 0 48px' }}>
          <div className="wrap">
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C4622D', marginBottom: '12px' }}>Legal</p>
            <h1 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 700, color: '#FFF8F0', margin: '0 0 12px' }}>Privacy Policy</h1>
            <p style={{ fontSize: '14px', color: '#6B4C3B' }}>Last updated: {LAST_UPDATED}</p>
          </div>
        </div>

        <div className="wrap" style={{ maxWidth: '720px', padding: '56px 24px 80px' }}>

          <Section title="Who we are">
            <p>Edziban is a Ghanaian food business operating in the Greater Boston area, serving individual plate orders and event catering. Our website is <strong>{SITE}</strong>. Questions about this policy can be sent to <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#C4622D' }}>{CONTACT_EMAIL}</a>.</p>
          </Section>

          <Section title="What information we collect">
            <p style={{ marginBottom: '12px' }}>When you place an order we collect:</p>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><strong>Contact information</strong> — your full name, email address, and phone number</li>
              <li><strong>Delivery information</strong> — your delivery address if you choose delivery</li>
              <li><strong>Order details</strong> — the items you ordered, quantities, and special instructions</li>
              <li><strong>Payment information</strong> — processed securely by Square. We never see or store your card number.</li>
            </ul>
            <p style={{ marginTop: '12px' }}>We do not collect any information beyond what is needed to fulfill your order.</p>
          </Section>

          <Section title="How we use your information">
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>To process and fulfill your order</li>
              <li>To send you order confirmation and status updates by email and SMS</li>
              <li>To contact you about your order if needed</li>
              <li>To calculate delivery fees based on your address</li>
              <li>To improve our service over time</li>
            </ul>
            <p style={{ marginTop: '12px' }}>We do not sell, rent, or share your personal information with third parties for marketing purposes.</p>
          </Section>

          <Section title="Third-party services we use">
            <p style={{ marginBottom: '12px' }}>To operate our ordering system we use the following services, each with their own privacy policy:</p>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li><strong>Square</strong> — payment processing. Your card details go directly to Square and are never stored by us.</li>
              <li><strong>Supabase</strong> — secure database that stores your order information.</li>
              <li><strong>Zoho Mail</strong> — email delivery for order confirmations.</li>
              <li><strong>Amazon Web Services (SNS)</strong> — SMS text message delivery.</li>
              <li><strong>Google Maps</strong> — used to calculate delivery distance and fee based on your address.</li>
            </ul>
          </Section>

          <Section title="SMS messages">
            <p>By providing your phone number at checkout you consent to receive SMS messages from Edziban about your order status (confirmation, ready for pickup, out for delivery). Message and data rates may apply. You can opt out at any time by replying STOP to any message.</p>
          </Section>

          <Section title="Data retention">
            <p>We retain your order information for up to 3 years for business and tax record purposes. You may request deletion of your personal data at any time by emailing us at <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#C4622D' }}>{CONTACT_EMAIL}</a>.</p>
          </Section>

          <Section title="Your rights">
            <p style={{ marginBottom: '12px' }}>You have the right to:</p>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>Request a copy of the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Opt out of SMS communications at any time</li>
            </ul>
            <p style={{ marginTop: '12px' }}>To exercise any of these rights, contact us at <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#C4622D' }}>{CONTACT_EMAIL}</a>.</p>
          </Section>

          <Section title="Cookies">
            <p>Our website uses minimal cookies necessary for the checkout process to function (such as storing your cart). We do not use tracking cookies or advertising cookies.</p>
          </Section>

          <Section title="Changes to this policy">
            <p>We may update this Privacy Policy from time to time. The date at the top of this page will reflect when it was last changed. Continued use of our website after changes means you accept the updated policy.</p>
          </Section>

          <Section title="Contact us">
            <p>If you have any questions about this Privacy Policy, email us at <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#C4622D' }}>{CONTACT_EMAIL}</a>.</p>
          </Section>

          <div style={{ borderTop: '1px solid #E2CEB8', paddingTop: '28px', display: 'flex', gap: '24px' }}>
            <Link href="/terms" style={{ fontSize: '14px', color: '#C4622D', textDecoration: 'none', fontWeight: 600 }}>Terms & Conditions →</Link>
            <Link href="/" style={{ fontSize: '14px', color: '#6B4C3B', textDecoration: 'none' }}>Back to Home</Link>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
