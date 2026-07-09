'use client'

import { useState } from 'react'

/** Auto-scrolling ticker with a real keyboard-operable pause control (hover-to-pause alone isn't enough for touch/keyboard users). */
export default function Marquee({ items }: { items: string[] }) {
  const [paused, setPaused] = useState(false)

  return (
    <div style={{ background: '#A85425', padding: '13px 0', overflow: 'hidden', position: 'relative' }}>
      <div aria-hidden="true" className="marquee-track" style={{
        display: 'flex',
        alignItems: 'center',
        whiteSpace: 'nowrap',
        animationPlayState: paused ? 'paused' : 'running',
      }}>
        {[...items, ...items].map((item, i) => (
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
      <button
        type="button"
        onClick={() => setPaused(p => !p)}
        aria-label={paused ? 'Play scrolling ticker' : 'Pause scrolling ticker'}
        style={{
          position: 'absolute', top: '50%', right: '14px', transform: 'translateY(-50%)',
          width: '24px', height: '24px', borderRadius: '50%',
          background: 'rgba(26,15,10,0.35)', border: 'none', color: '#FFF8F0',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        {paused ? (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
        )}
      </button>
    </div>
  )
}
