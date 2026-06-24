import Link from 'next/link'
import Footer from '@/components/Footer'

const LAST_UPDATED = 'June 23, 2026'
const CONTACT_EMAIL = 'admin@edzibancatering.com'
const PICKUP_LOCATION = 'Randolph, MA 02368'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '40px' }}>
      <h2 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: '20px', fontWeight: 700, color: '#1A0F0A', marginBottom: '14px' }}>{title}</h2>
      <div style={{ fontSize: '15px', color: '#4A2E20', lineHeight: 1.8 }}>{children}</div>
    </section>
  )
}

export default function TermsPage() {
  return (
    <>
      <div style={{ minHeight: '100vh', background: '#FFF8F0', paddingTop: '76px' }}>
        <div style={{ background: '#1A0F0A', padding: '56px 0 48px' }}>
          <div className="wrap">
            <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C4622D', marginBottom: '12px' }}>Legal</p>
            <h1 style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 700, color: '#FFF8F0', margin: '0 0 12px' }}>Terms & Conditions</h1>
            <p style={{ fontSize: '14px', color: '#6B4C3B' }}>Last updated: {LAST_UPDATED}</p>
          </div>
        </div>

        <div className="wrap" style={{ maxWidth: '720px', padding: '56px 24px 80px' }}>

          <Section title="About these terms">
            <p>These Terms & Conditions govern your use of edzibancatering.com and any orders placed through our website. By placing an order you agree to these terms. If you have questions, contact us at <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#C4622D' }}>{CONTACT_EMAIL}</a>.</p>
          </Section>

          <Section title="Ordering — Plate Orders">
            <p style={{ marginBottom: '12px' }}>Plate orders are same-day orders available Monday through Friday during our posted ordering hours.</p>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>Orders must be placed before the daily cutoff time posted on the ordering page.</li>
              <li>Payment is collected in full at the time of ordering.</li>
              <li>Your order is confirmed immediately upon successful payment.</li>
              <li><strong>Cancellations:</strong> Plate orders may be cancelled within 15 minutes of placing the order. After that, your order is being prepared and cannot be cancelled or refunded.</li>
              <li>If we are unable to fulfill your order for any reason, you will receive a full refund within 3–5 business days.</li>
            </ul>
          </Section>

          <Section title="Ordering — Event Catering">
            <p style={{ marginBottom: '12px' }}>Catering orders are for events including funerals, weddings, naming ceremonies, birthday parties, and corporate events.</p>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>All catering orders require a minimum of <strong>5 days advance notice</strong>.</li>
              <li>Payment is collected in full at the time of ordering.</li>
              <li>Orders are subject to review and confirmation. Regular catering orders are confirmed within <strong>24 hours</strong>. Corporate catering orders are confirmed within <strong>48 hours</strong>. You will receive a confirmation email once approved.</li>
              <li><strong>Cancellations:</strong> Catering orders cancelled more than 72 hours before the event date will receive a full refund. Cancellations within 72 hours of the event are non-refundable as ingredients and preparation will have begun.</li>
              <li>We reserve the right to decline any order that we cannot fulfill to our quality standards.</li>
            </ul>
          </Section>

          <Section title="Delivery">
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>We deliver to the Greater Boston area including Randolph, Avon, Brockton, and Boston, MA. Delivery availability is confirmed at checkout based on your address.</li>
              <li>Delivery fees are calculated based on distance from our kitchen in {PICKUP_LOCATION} and are shown before you complete payment.</li>
              <li>Estimated delivery times are provided as a guide only. We are not liable for delays caused by traffic or other factors outside our control.</li>
              <li>Pickup orders must be collected from {PICKUP_LOCATION}. The exact address will be provided when your order is ready.</li>
            </ul>
          </Section>

          <Section title="Food safety and allergens">
            <p style={{ marginBottom: '12px' }}>Our food is prepared in a home kitchen environment. We take food safety seriously, but please be aware:</p>
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>Our kitchen handles common allergens including nuts, gluten, dairy, eggs, and shellfish. We cannot guarantee a fully allergen-free environment.</li>
              <li>If you have a severe food allergy, please contact us before ordering at <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#C4622D' }}>{CONTACT_EMAIL}</a>.</li>
              <li>Edziban is not liable for allergic reactions resulting from undisclosed allergies.</li>
            </ul>
          </Section>

          <Section title="Payments and refunds">
            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <li>All payments are processed securely by Square. We accept all major credit and debit cards.</li>
              <li>Prices are listed in US dollars and include applicable fees.</li>
              <li>Refunds are issued to the original payment method and may take 3–5 business days to appear.</li>
              <li>Discount codes must be applied at checkout and cannot be applied after an order is placed. Codes cannot be combined.</li>
            </ul>
          </Section>

          <Section title="Loyalty rewards">
            <p>We may issue discount codes to valued customers at our discretion. Discount codes are personal, non-transferable, and valid for a single use unless otherwise stated. Codes have no cash value and cannot be exchanged for cash.</p>
          </Section>

          <Section title="Limitation of liability">
            <p>Edziban's total liability to you for any claim arising from your use of our service is limited to the amount you paid for the relevant order. We are not liable for indirect, incidental, or consequential damages of any kind.</p>
          </Section>

          <Section title="Changes to these terms">
            <p>We may update these Terms & Conditions at any time. The updated date at the top of this page reflects when changes were made. Continued use of our website after changes constitutes acceptance of the updated terms.</p>
          </Section>

          <Section title="Governing law">
            <p>These terms are governed by the laws of the Commonwealth of Massachusetts. Any disputes shall be resolved in the courts of Norfolk County, Massachusetts.</p>
          </Section>

          <Section title="Contact">
            <p>Questions about these terms? Email us at <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: '#C4622D' }}>{CONTACT_EMAIL}</a>.</p>
          </Section>

          <div style={{ borderTop: '1px solid #E2CEB8', paddingTop: '28px', display: 'flex', gap: '24px' }}>
            <Link href="/privacy" style={{ fontSize: '14px', color: '#C4622D', textDecoration: 'none', fontWeight: 600 }}>Privacy Policy →</Link>
            <Link href="/" style={{ fontSize: '14px', color: '#6B4C3B', textDecoration: 'none' }}>Back to Home</Link>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
