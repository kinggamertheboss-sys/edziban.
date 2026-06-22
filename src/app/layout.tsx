import type { Metadata } from 'next'
import { Playfair_Display, Inter, Cormorant_Garamond } from 'next/font/google'
import './globals.css'
import { CartProvider } from '@/context/CartContext'
import Navbar from '@/components/Navbar'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-cormorant',
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: "Edziban – Ghana's finest, delivered to you.",
  description: 'Authentic Ghanaian food and drinks sourced from real Ghanaian home cooks, delivered to your door in the Boston area.',
  icons: {
    icon: '/The_Single_E.png',
    shortcut: '/The_Single_E.png',
    apple: '/The_Single_E.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${playfair.variable} ${inter.variable} ${cormorant.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-cream antialiased">
        <a
          href="#main-content"
          style={{
            position: 'absolute',
            top: '-40px',
            left: '16px',
            zIndex: 9999,
            background: '#1A0F0A',
            color: '#FFF8F0',
            padding: '10px 20px',
            borderRadius: '0 0 8px 8px',
            fontSize: '14px',
            fontWeight: 700,
            textDecoration: 'none',
            transition: 'top 0.2s',
          }}
          onFocus={e => { (e.currentTarget as HTMLAnchorElement).style.top = '0' }}
          onBlur={e => { (e.currentTarget as HTMLAnchorElement).style.top = '-40px' }}
        >
          Skip to main content
        </a>
        <CartProvider>
          <Navbar />
          <div style={{ paddingTop: '76px' }}>
            {children}
          </div>
        </CartProvider>
      </body>
    </html>
  )
}
