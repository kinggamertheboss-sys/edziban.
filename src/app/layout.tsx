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
