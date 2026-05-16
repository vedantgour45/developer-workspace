import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export interface MenuItem {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  destructive?: boolean
}

interface Props {
  items: (MenuItem | { divider: true })[]
  label?: string
}

export default function ActionMenu({ items, label = 'More actions' }: Props) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 220,
  })

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!buttonRef.current?.contains(t) && !panelRef.current?.contains(t)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Compute panel position right-aligned to the trigger; clamp inside the viewport.
  useLayoutEffect(() => {
    if (!open) return
    const reposition = () => {
      const btn = buttonRef.current
      if (!btn) return
      const rect = btn.getBoundingClientRect()
      const width = 220
      const margin = 8
      // Right-align panel to the button's right edge
      let left = rect.right - width
      // Clamp inside viewport
      if (left < margin) left = margin
      if (left + width > window.innerWidth - margin) left = window.innerWidth - margin - width
      let top = rect.bottom + 4
      // Flip up if not enough room below
      const estimatedHeight = items.length * 36 + 16
      if (top + estimatedHeight > window.innerHeight - margin) {
        top = Math.max(margin, rect.top - estimatedHeight - 4)
      }
      setPos({ top, left, width })
    }
    reposition()
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [open, items.length])

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        className="w-8 h-8 rounded-md text-muted hover:text-ink hover:bg-surface-card flex items-center justify-center transition-colors"
        title={label}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <circle cx="5" cy="12" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="19" cy="12" r="1.5" />
        </svg>
      </button>
      {open && (
        <div
          ref={panelRef}
          role="menu"
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: pos.width,
            zIndex: 50,
            boxShadow: '0 12px 32px rgba(0,0,0,0.16)',
          }}
          className="rounded-md bg-canvas border border-hairline overflow-hidden"
        >
          {items.map((item, i) => {
            if ('divider' in item) {
              return <div key={`d-${i}`} className="h-px bg-hairline-soft my-1" />
            }
            return (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  item.onClick()
                }}
                className={`w-full flex items-center gap-2.5 text-left px-3 py-2 text-[13px] transition-colors ${
                  item.destructive
                    ? 'text-body hover:bg-error/10 hover:text-error'
                    : 'text-body hover:bg-surface-card'
                }`}
              >
                {item.icon && (
                  <span className="w-4 h-4 flex items-center justify-center text-muted flex-shrink-0">
                    {item.icon}
                  </span>
                )}
                <span className="flex-1 truncate">{item.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}
