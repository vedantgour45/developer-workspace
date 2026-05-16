import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { SlashCommand } from '../lib/slashCommands'
import { cls } from '../shared/format'

interface Props {
  items: SlashCommand[]
  active: number
  setActive: (i: number) => void
  onPick: (cmd: SlashCommand) => void
  onClose: () => void
  /**
   * Viewport (fixed) coordinates of the caret. The menu attaches just
   * below this point and flips up if there isn't room. Portalled to
   * document.body to escape any transform ancestors.
   */
  position: { top: number; left: number }
}

const MENU_WIDTH = 320
const ESTIMATED_HEIGHT = 380

export default function SlashCommandMenu({ items, active, setActive, onPick, onClose, position }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [clamped, setClamped] = useState(position)

  // Clamp position into the viewport — flip up if no room below, shift
  // left if it would overflow the right edge.
  useLayoutEffect(() => {
    const margin = 8
    let top = position.top
    let left = position.left
    if (left + MENU_WIDTH > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - margin - MENU_WIDTH)
    }
    if (left < margin) left = margin
    if (top + ESTIMATED_HEIGHT > window.innerHeight - margin) {
      // Flip up: position the menu's BOTTOM at the caret line top.
      top = Math.max(margin, position.top - ESTIMATED_HEIGHT - 24)
    }
    setClamped({ top, left })
  }, [position.top, position.left])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [onClose])

  useEffect(() => {
    const el = ref.current?.querySelector<HTMLButtonElement>(`[data-i="${active}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  if (items.length === 0) return null

  // Group commands keeping their original index for keyboard nav
  const indexed = items.map((c, i) => ({ ...c, _idx: i }))
  const groups = indexed.reduce<Record<string, typeof indexed>>((acc, c) => {
    if (!acc[c.group]) acc[c.group] = []
    acc[c.group].push(c)
    return acc
  }, {})
  const groupOrder = ['Basics', 'Lists', 'Callouts', 'Code & Data', 'Inline']

  return createPortal(
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: clamped.top,
        left: clamped.left,
        width: MENU_WIDTH,
        zIndex: 60,
        boxShadow: '0 16px 40px rgba(20,20,19,0.15)',
      }}
      className="bg-canvas border border-hairline rounded-lg overflow-hidden"
    >
      <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-muted font-medium bg-surface-card/50 border-b border-hairline-soft">
        Insert block
      </div>
      <ul className="max-h-[340px] overflow-y-auto py-1">
        {groupOrder
          .filter((g) => groups[g])
          .map((g) => (
            <li key={g}>
              <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-soft font-medium">
                {g}
              </div>
              <ul>
                {groups[g].map((c) => (
                  <li key={c.id}>
                    <button
                      data-i={c._idx}
                      onMouseEnter={() => setActive(c._idx)}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        onPick(c)
                      }}
                      className={cls(
                        'w-full text-left px-3 py-2 flex items-center gap-3 transition-colors',
                        c._idx === active ? 'bg-primary/10' : 'hover:bg-surface-card/60',
                      )}
                    >
                      <span className="w-7 h-7 rounded-md bg-surface-card flex items-center justify-center text-muted flex-shrink-0">
                        <IconFor id={c.id} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm text-ink font-medium">{c.label}</span>
                        <span className="block text-[11px] text-muted">{c.hint}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
      </ul>
      <div className="px-3 py-1.5 text-[10px] text-muted border-t border-hairline-soft flex items-center justify-between bg-surface-card/30">
        <span>↑↓ navigate</span>
        <span>↵ insert</span>
        <span>esc close</span>
      </div>
    </div>,
    document.body,
  )
}

function IconFor({ id }: { id: string }) {
  const cls = 'w-3.5 h-3.5'
  switch (id) {
    case 'text':
      return <span className="text-[10px] font-bold font-mono">T</span>
    case 'h1':
      return <span className="text-[10px] font-bold font-mono">H1</span>
    case 'h2':
      return <span className="text-[10px] font-bold font-mono">H2</span>
    case 'h3':
      return <span className="text-[10px] font-bold font-mono">H3</span>
    case 'todo':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={cls}>
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      )
    case 'bullet':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className={cls}>
          <path d="M9 6h12M9 12h12M9 18h12" />
          <circle cx="4" cy="6" r="1" fill="currentColor" />
          <circle cx="4" cy="12" r="1" fill="currentColor" />
          <circle cx="4" cy="18" r="1" fill="currentColor" />
        </svg>
      )
    case 'numbered':
      return <span className="text-[10px] font-bold font-mono">1.</span>
    case 'toggle':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={cls}>
          <path d="m9 6 6 6-6 6" />
        </svg>
      )
    case 'quote':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cls}>
          <path d="M7 7h4v4H8v2c0 1.1.9 2 2 2v2c-2.2 0-4-1.8-4-4V7zm9 0h4v4h-3v2c0 1.1.9 2 2 2v2c-2.2 0-4-1.8-4-4V7z" />
        </svg>
      )
    case 'callout-info':
      return (
        <svg viewBox="0 0 24 24" fill="#5db8a6" className={cls}>
          <circle cx="12" cy="12" r="10" />
          <path fill="white" d="M11 7h2v2h-2zm0 4h2v6h-2z" />
        </svg>
      )
    case 'callout-warn':
      return (
        <svg viewBox="0 0 24 24" fill="#e8a55a" className={cls}>
          <path d="M12 2 1 21h22Z" />
          <path fill="white" d="M11 10h2v5h-2zm0 6h2v2h-2z" />
        </svg>
      )
    case 'callout-tip':
      return <span className="text-[12px] text-primary leading-none">★</span>
    case 'code':
    case 'inline':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={cls}>
          <path d="m16 18 6-6-6-6M8 6l-6 6 6 6" />
        </svg>
      )
    case 'divider':
      return <span className="text-[14px] leading-none">—</span>
    case 'table':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={cls}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
        </svg>
      )
    case 'link':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className={cls}>
          <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07L11 5" />
          <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07L13 19" />
        </svg>
      )
    case 'bold':
      return <span className="text-[11px] font-extrabold font-mono">B</span>
    case 'italic':
      return <span className="text-[11px] italic font-serif font-bold">I</span>
    case 'date':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className={cls}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      )
    default:
      return null
  }
}
