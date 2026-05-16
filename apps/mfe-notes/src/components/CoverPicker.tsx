import { useEffect, useRef, useState } from 'react'
import { COVER_PRESETS, coverStyle, type DocCover } from '../shared/types'

interface Props {
  value: DocCover
  onChange: (cover: DocCover) => void
}

export default function CoverPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="h-7 px-2.5 rounded-md bg-canvas/80 hover:bg-canvas border border-hairline-soft text-[12px] font-medium text-ink flex items-center gap-1.5 backdrop-blur-sm transition-colors"
        title="Change cover"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="m21 15-5-5L5 21" />
        </svg>
        {value.kind === 'none' ? 'Add cover' : 'Change cover'}
      </button>
      {open && (
        <div className="absolute top-full mt-2 left-0 z-30 w-72 rounded-lg bg-canvas border border-hairline shadow-[0_16px_40px_rgba(20,20,19,0.15)] p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted font-medium mb-2 px-1">
            Presets
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {COVER_PRESETS.map((preset, i) => {
              const isActive = JSON.stringify(preset) === JSON.stringify(value)
              return (
                <button
                  key={i}
                  onClick={() => {
                    onChange(preset)
                    setOpen(false)
                  }}
                  className={`relative h-14 rounded-md overflow-hidden border-2 transition-colors ${
                    isActive ? 'border-primary' : 'border-transparent hover:border-hairline'
                  }`}
                  style={preset.kind === 'none' ? { background: '#faf9f5' } : coverStyle(preset)}
                  aria-label={`Preset ${i + 1}`}
                >
                  {preset.kind === 'none' && (
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] text-muted">
                      None
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          {value.kind !== 'none' && (
            <button
              onClick={() => {
                onChange({ kind: 'none' })
                setOpen(false)
              }}
              className="mt-3 w-full h-8 rounded-md bg-canvas border border-hairline text-[12px] text-ink hover:border-ink/30"
            >
              Remove cover
            </button>
          )}
        </div>
      )}
    </div>
  )
}
