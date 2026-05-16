interface Props {
  size?: number
  className?: string
}

// BrandMark.tsx
export default function BrandMark({ size = 18, className = '' }: { size?: number; className?: string }) {
  const gap = Math.round(size * 0.16)
  const cell = Math.round((size - gap) / 2)

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap,
      }}
    >
      <div style={{ borderRadius: 2, background: 'currentColor', opacity: 0.8 }} />
      <div style={{ borderRadius: 2, background: 'currentColor', opacity: 0.8 }} />
      <div style={{ borderRadius: 2, background: 'currentColor', opacity: 0.8 }} />
      <div style={{ borderRadius: 2, background: '#D85A30' }} /> {/* coral active cell */}
    </div>
  )
}