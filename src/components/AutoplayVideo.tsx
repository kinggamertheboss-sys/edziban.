'use client'

import { useRef, useState, type CSSProperties } from 'react'
import { useReducedMotion } from '@/lib/useReducedMotion'

interface AutoplayVideoProps {
  src: string
  ariaLabel?: string
  style?: CSSProperties
  /** Adds a visible pause/play toggle. Only set this when the video is NOT nested inside a <Link>/<button> — a toggle button inside another interactive element is invalid HTML. */
  pausable?: boolean
}

/** Muted, looping background video that respects prefers-reduced-motion (shows a static first frame instead of autoplaying) and, when `pausable`, exposes a real pause/play control. */
export default function AutoplayVideo({ src, ariaLabel, style, pausable = false }: AutoplayVideoProps) {
  const reducedMotion = useReducedMotion()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [paused, setPaused] = useState(false)

  function togglePlay() {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      v.play()
      setPaused(false)
    } else {
      v.pause()
      setPaused(true)
    }
  }

  return (
    <>
      <video
        ref={videoRef}
        src={src}
        muted
        loop={!reducedMotion}
        autoPlay={!reducedMotion}
        playsInline
        aria-label={ariaLabel}
        style={style}
      />
      {pausable && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label={paused ? 'Play video' : 'Pause video'}
          style={{
            position: 'absolute', bottom: '12px', right: '12px', zIndex: 2,
            width: '30px', height: '30px', borderRadius: '50%',
            background: 'rgba(0,0,0,0.5)', border: 'none', color: '#FFF8F0',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          {paused ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
          )}
        </button>
      )}
    </>
  )
}
