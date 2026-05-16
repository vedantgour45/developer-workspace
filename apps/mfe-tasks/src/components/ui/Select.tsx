import { useEffect, useRef, useState } from 'react'

export interface SelectOption<T extends string = string> {
  value: T
  label: string
  hint?: string
  /** Optional small color dot/swatch shown beside the label */
  swatch?: string
}

interface Props<T extends string = string> {
  value: T
  onChange: (value: T) => void
  options: SelectOption<T>[]
  size?: 'sm' | 'md'
  placeholder?: string
  className?: string
  fullWidth?: boolean
  ariaLabel?: string
}

export default function Select<T extends string = string>({
  value,
  onChange,
  options,
  size = 'sm',
  placeholder,
  className = '',
  fullWidth = false,
  ariaLabel,
}: Props<T>) {
  const [open, setOpen] = useState(false)
  const [focusedIdx, setFocusedIdx] = useState(0)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    setFocusedIdx(Math.max(0, options.findIndex((o) => o.value === value)))
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!buttonRef.current?.contains(t) && !panelRef.current?.contains(t)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open, options, value])

  const onKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        setOpen(true)
      }
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      buttonRef.current?.focus()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIdx((i) => (i + 1) % options.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIdx((i) => (i - 1 + options.length) % options.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const opt = options[focusedIdx]
      if (opt) {
        onChange(opt.value)
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
  }

  const h = size === 'sm' ? 28 : 36
  const px = size === 'sm' ? 10 : 12
  const fs = size === 'sm' ? 13 : 14

  return (
    <div className={`relative ${fullWidth ? 'w-full' : 'inline-block'} ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKey}
        style={{ height: h, paddingInline: px, fontSize: fs }}
        className={`w-full inline-flex items-center justify-between gap-2 rounded-md bg-canvas border border-hairline text-ink hover:border-ink/30 focus:border-primary focus:outline-none transition-colors text-left`}
      >
        <span className="flex items-center gap-2 min-w-0 truncate">
          {selected?.swatch && (
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: selected.swatch }}
            />
          )}
          <span className="truncate">
            {selected?.label ?? (
              <span className="text-muted-soft">{placeholder ?? 'Select…'}</span>
            )}
          </span>
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-3 h-3 text-muted flex-shrink-0"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          ref={panelRef}
          role="listbox"
          tabIndex={-1}
          onKeyDown={onKey}
          className="absolute z-30 mt-1 min-w-full rounded-md bg-canvas border border-hairline overflow-hidden"
          style={{
            boxShadow: '0 12px 32px rgba(20,20,19,0.16)',
            maxHeight: 280,
            overflowY: 'auto',
            minWidth: 'max-content',
          }}
        >
          {options.map((o, i) => {
            const isSelected = o.value === value
            const isFocused = i === focusedIdx
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setFocusedIdx(i)}
                onClick={() => {
                  onChange(o.value)
                  setOpen(false)
                  buttonRef.current?.focus()
                }}
                className={`w-full flex items-center gap-2.5 text-left px-3 py-2 text-[13px] transition-colors ${
                  isFocused ? 'bg-surface-card' : 'bg-canvas'
                } ${isSelected ? 'text-ink font-medium' : 'text-body'}`}
              >
                {o.swatch && (
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: o.swatch }}
                  />
                )}
                <span className="flex-1 truncate">{o.label}</span>
                {o.hint && <span className="text-[11px] text-muted flex-shrink-0">{o.hint}</span>}
                {isSelected && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-primary flex-shrink-0">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
