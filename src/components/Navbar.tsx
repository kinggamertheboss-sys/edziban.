'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCart } from '@/context/CartContext'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()
  const { totalItems } = useCart()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => { setMenuOpen(false) }, [pathname])

  if (pathname.startsWith('/admin')) return null

  return (
    <header
      className="sticky top-0 z-50"
      style={{
        backgroundColor: scrolled ? 'rgba(255,248,240,0.96)' : '#FFF8F0',
        borderBottom: `1px solid ${scrolled ? 'rgba(226,206,184,0.9)' : '#E2CEB8'}`,
        boxShadow: scrolled ? '0 4px 24px rgba(26,15,10,0.08)' : 'none',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        transition: 'box-shadow 0.3s ease, background-color 0.3s ease, backdrop-filter 0.3s ease',
      }}
    >
      <div className="wrap">
        <div className="flex items-center justify-between" style={{ height: '76px' }}>

          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src="/full_logo_name.png"
              alt="Edziban"
              width={220}
              height={68}
              className="h-14 w-auto object-contain"
              style={{ mixBlendMode: 'multiply' }}
              priority
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {[{ href: '/', label: 'Home' }, { href: '/menu', label: 'Menu' }, { href: '/corporate', label: 'Corporate' }].map(link => (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  color: pathname === link.href ? '#C4622D' : '#6B4C3B',
                  textDecoration: 'none',
                  transition: 'color 0.18s',
                }}
              >
                {link.label}
              </Link>
            ))}

            <Link
              href="/menu"
              style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                padding: '10px 24px',
                borderRadius: '100px',
                background: '#C4622D',
                color: '#FFF8F0',
                textDecoration: 'none',
                boxShadow: '0 4px 20px rgba(196,98,45,0.28)',
                transition: 'transform 0.2s cubic-bezier(0.22,1,0.36,1), box-shadow 0.2s',
              }}
            >
              Order Now
              {totalItems > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-8px', right: '-8px',
                    fontSize: '11px', fontWeight: 800,
                    width: '20px', height: '20px',
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#1A0F0A', color: '#FFF8F0',
                  }}
                >
                  {totalItems}
                </span>
              )}
            </Link>
          </nav>

          {/* Mobile */}
          <div className="md:hidden flex items-center gap-3">
            {totalItems > 0 && (
              <Link href="/menu">
                <span style={{
                  fontSize: '11px', fontWeight: 800,
                  width: '24px', height: '24px',
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: '#C4622D', color: '#FFF8F0',
                }}>
                  {totalItems}
                </span>
              </Link>
            )}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
              style={{
                padding: '8px', borderRadius: '8px',
                background: 'transparent', border: 'none',
                color: '#4A2E20', cursor: 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {menuOpen ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div
          className="md:hidden"
          style={{
            borderTop: '1px solid #E2CEB8',
            background: '#FFF8F0',
            padding: '20px 24px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          {[{ href: '/', label: 'Home' }, { href: '/menu', label: 'Menu' }, { href: '/corporate', label: 'Corporate' }].map(link => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: pathname === link.href ? '#C4622D' : '#4A2E20',
                textDecoration: 'none',
                letterSpacing: '0.03em',
              }}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/menu"
            style={{
              marginTop: '4px',
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              padding: '14px',
              borderRadius: '12px',
              background: '#C4622D',
              color: '#FFF8F0',
              textDecoration: 'none',
              textAlign: 'center',
            }}
          >
            Order Now
          </Link>
        </div>
      )}
    </header>
  )
}
