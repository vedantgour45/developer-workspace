/**
 * Confetti — a tiny, on-brand celebration burst rendered on a TaskCard
 * when its status flips to "done". Deliberately minimal:
 *  - 10 small (5px) particles in the brand palette only
 *  - radial burst from the card centre, ~32-56px reach
 *  - 650-850ms total duration then unmounts
 *
 * No external library — just inline-positioned spans with a single
 * keyframe (dw-confetti, defined in index.css).
 */
import { useMemo } from 'react'

// Brand-friendly palette — no rainbow. These match the design system
// (coral, near-black, soft green/teal, amber).
const PALETTE = ['#ff7759', '#5db8a6', '#e8a55a', '#5db872', '#17171c']

interface Particle {
  id: number
  dx: number
  dy: number
  color: string
  duration: number
  delay: number
  size: number
  rotate: number
}

function buildParticles(count: number): Particle[] {
  const out: Particle[] = []
  for (let i = 0; i < count; i++) {
    // Evenly spaced around the card with a touch of jitter so it doesn't
    // look like a clock face.
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4
    const distance = 28 + Math.random() * 28
    out.push({
      id: i,
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance,
      color: PALETTE[i % PALETTE.length] ?? '#ff7759',
      duration: 650 + Math.random() * 220,
      delay: Math.random() * 60,
      size: 4 + Math.round(Math.random() * 2),
      rotate: (Math.random() - 0.5) * 200,
    })
  }
  return out
}

export default function Confetti() {
  const particles = useMemo(() => buildParticles(10), [])
  return (
    <span
      aria-hidden
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 0,
        height: 0,
        pointerEvents: 'none',
        zIndex: 5,
      }}
    >
      {particles.map((p) => (
        <span
          key={p.id}
          style={
            {
              position: 'absolute',
              top: 0,
              left: 0,
              width: p.size,
              height: p.size,
              borderRadius: 1,
              background: p.color,
              transform: 'translate(-50%, -50%) scale(0.2)',
              opacity: 0,
              animation: `dw-confetti ${p.duration}ms cubic-bezier(0.18, 0.78, 0.32, 1) ${p.delay}ms forwards`,
              ['--dx' as string]: `${p.dx}px`,
              ['--dy' as string]: `${p.dy}px`,
              ['--rot' as string]: `${p.rotate}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  )
}
