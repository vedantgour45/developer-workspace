import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  /** ISO date yyyy-MM-dd, or null */
  value: string | null
  onChange: (next: string | null) => void
  placeholder?: string
  /** Visual tone for the trigger button — past dates use error, soon dates amber */
  tone?: 'default' | 'past' | 'soon'
  ariaLabel?: string
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function parseISO(s: string | null): Date | null {
  if (!s) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(d.getTime()) ? null : d
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatHuman(iso: string): string {
  const d = parseISO(iso)
  if (!d) return iso
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`
}

export default function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  tone = 'default',
  ariaLabel,
}: Props) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    const d = parseISO(value) ?? new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const selected = parseISO(value)
  const today = new Date()

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

  // When opening, jump view to selected month if any
  useEffect(() => {
    if (!open) return
    const d = parseISO(value) ?? new Date()
    setViewMonth(new Date(d.getFullYear(), d.getMonth(), 1))
  }, [open, value])

  // Position the calendar in viewport (fixed) so it can't get clipped by the
  // task drawer or window edge. Left-aligned to the trigger by default —
  // mirrors the original "popover directly under the button" feel — and
  // only flips when it would overflow the right edge or bottom.
  useLayoutEffect(() => {
    if (!open) return
    const reposition = () => {
      const btn = buttonRef.current
      if (!btn) return
      const rect = btn.getBoundingClientRect()
      const width = 264
      const margin = 8
      // Left-align to the trigger button — keep the popover visually tight.
      let left = rect.left
      // If it would overflow the right edge, shift back left.
      if (left + width > window.innerWidth - margin) {
        left = Math.max(margin, window.innerWidth - margin - width)
      }
      if (left < margin) left = margin
      let top = rect.bottom + 4
      // Estimated panel height: header (~32) + dayrow (~22) + 6 rows of 30 + footer (~36) + padding
      const estimatedHeight = 32 + 22 + 6 * 30 + 36 + 24
      if (top + estimatedHeight > window.innerHeight - margin) {
        top = Math.max(margin, rect.top - estimatedHeight - 4)
      }
      setPos({ top, left })
    }
    reposition()
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [open, viewMonth])

  const days = useMemo(() => {
    const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1)
    const lastOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0)
    const out: (Date | null)[] = []
    // Pad to Sunday start of week
    for (let i = 0; i < firstOfMonth.getDay(); i++) out.push(null)
    for (let d = 1; d <= lastOfMonth.getDate(); d++) {
      out.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d))
    }
    while (out.length % 7 !== 0) out.push(null)
    return out
  }, [viewMonth])

  const goPrev = () =>
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
  const goNext = () =>
    setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))

  const toneStyles =
    tone === 'past'
      ? { background: 'rgba(198,69,69,0.10)', borderColor: 'rgba(198,69,69,0.35)', color: '#c64545' }
      : tone === 'soon'
        ? { background: 'rgba(232,165,90,0.15)', borderColor: 'rgba(232,165,90,0.45)', color: '#8a5a14' }
        : undefined

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        style={{ height: 28, paddingInline: 10, fontSize: 13, ...(toneStyles ?? {}) }}
        className={`inline-flex items-center gap-1.5 rounded-md border transition-colors ${
          !toneStyles
            ? 'bg-canvas border-hairline text-ink hover:border-ink/30 focus:border-primary'
            : 'hover:opacity-90'
        } focus:outline-none`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        <span>{value ? formatHuman(value) : <span className="text-muted-soft">{placeholder}</span>}</span>
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Date picker"
          className="rounded-lg bg-canvas border border-hairline p-3"
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: 264,
            zIndex: 60,
            boxShadow: '0 16px 40px rgba(20,20,19,0.16)',
          }}
        >
          {/* Month nav */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={goPrev}
              className="w-7 h-7 rounded-md text-muted hover:text-ink hover:bg-surface-card flex items-center justify-center transition-colors"
              aria-label="Previous month"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <span className="text-[13px] font-medium text-ink">
              {MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
            </span>
            <button
              type="button"
              onClick={goNext}
              className="w-7 h-7 rounded-md text-muted hover:text-ink hover:bg-surface-card flex items-center justify-center transition-colors"
              aria-label="Next month"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>

          {/* Day-of-week header */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {DAY_LABELS.map((d) => (
              <span
                key={d}
                className="text-[10px] uppercase tracking-wider text-muted text-center font-medium"
                style={{ height: 22, lineHeight: '22px' }}
              >
                {d}
              </span>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {days.map((d, i) => {
              if (!d) return <span key={`pad-${i}`} style={{ height: 30 }} />
              const isSelected = selected && sameDay(d, selected)
              const isToday = sameDay(d, today)
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  onClick={() => {
                    onChange(toISO(d))
                    setOpen(false)
                    buttonRef.current?.focus()
                  }}
                  aria-label={isToday ? `${d.getDate()} (today)` : `${d.getDate()}`}
                  aria-current={isToday ? 'date' : undefined}
                  className={`relative text-[12px] rounded-md transition-colors ${
                    isSelected
                      ? 'bg-primary text-on-primary font-medium'
                      : isToday
                        ? 'bg-primary/10 ring-1 ring-primary text-primary font-semibold hover:bg-primary/15'
                        : 'text-ink hover:bg-surface-card'
                  }`}
                  style={{ height: 30 }}
                >
                  {d.getDate()}
                  {isToday && !isSelected && (
                    <span
                      aria-hidden
                      className="absolute left-1/2 -translate-x-1/2 bottom-1 w-1 h-1 rounded-full bg-primary"
                    />
                  )}
                </button>
              )
            })}
          </div>

          {/* Footer actions */}
          <div className="mt-2 pt-2 border-t border-hairline-soft flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                onChange(toISO(new Date()))
                setOpen(false)
                buttonRef.current?.focus()
              }}
              className="text-[12px] font-medium text-primary hover:text-primary-active"
            >
              Today
            </button>
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange(null)
                  setOpen(false)
                  buttonRef.current?.focus()
                }}
                className="text-[12px] font-medium text-muted hover:text-error"
              >
                Clear
              </button>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
