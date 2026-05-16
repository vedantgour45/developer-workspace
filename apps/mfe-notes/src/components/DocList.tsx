import { useEffect, useMemo, useState } from 'react'
import { FileText } from 'lucide-react'
import { useDocsStore } from '../store/docsStore'
import { cls, relativeTime } from '../shared/format'
import type { Doc } from '../shared/types'

const COLLAPSE_KEY = 'dw:docs:listCollapsed'

interface Props {
  /**
   * Opens the new-doc modal. The modal collects the title (and shows
   * the author) before actually creating the doc. Passed in from App
   * so we keep one modal instance shared between the sidebar "+"
   * button and the Cmd/Ctrl+N shortcut.
   */
  onNewDoc: () => void
}

export default function DocList({ onNewDoc }: Props) {
  const docs = useDocsStore((s) => s.docs)
  const activeId = useDocsStore((s) => s.activeId)
  const setActive = useDocsStore((s) => s.setActive)

  const [q, setQ] = useState('')
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
    } catch {}
  }, [collapsed])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return docs
    return docs.filter(
      (d) =>
        d.title.toLowerCase().includes(query) ||
        d.content.toLowerCase().includes(query) ||
        d.tags.some((t) => t.includes(query)),
    )
  }, [q, docs])

  const pinned = filtered.filter((d) => d.pinned)
  const rest = filtered
    .filter((d) => !d.pinned)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

  // Collapsed: narrow rail with emoji-only chips + collapse toggle
  if (collapsed) {
    return (
      <aside className="w-[56px] bg-surface-card/50 border-r border-hairline flex-shrink-0 flex flex-col">
        <div className="px-2 pt-4 pb-3 flex flex-col items-center gap-1">
          <button
            onClick={() => setCollapsed(false)}
            className="w-10 h-10 rounded-md text-muted hover:text-ink hover:bg-canvas flex items-center justify-center transition-colors"
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="m9 6 6 6-6 6" />
            </svg>
          </button>
          <button
            onClick={onNewDoc}
            className="w-10 h-10 rounded-md bg-primary text-on-primary hover:bg-primary-active flex items-center justify-center transition-colors"
            aria-label="New document"
            title="New document"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="w-4 h-4">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-1.5 pb-3 space-y-1">
          {[...pinned, ...rest].slice(0, 18).map((d) => (
            <button
              key={d.id}
              onClick={() => setActive(d.id)}
              className={cls(
                'w-full h-10 rounded-md flex items-center justify-center transition-colors',
                d.id === activeId
                  ? 'bg-canvas border border-hairline text-primary'
                  : 'hover:bg-canvas/60 text-muted',
              )}
              title={d.title || 'Untitled'}
              aria-label={d.title || 'Untitled'}
            >
              <FileText size={16} strokeWidth={1.6} />
            </button>
          ))}
        </div>
      </aside>
    )
  }

  return (
    <aside className="w-72 bg-surface-card/50 border-r border-hairline flex-shrink-0 flex flex-col">
      <header className="px-4 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted font-medium">
            Notes
          </p>
          <button
            onClick={() => setCollapsed(true)}
            className="w-7 h-7 rounded-md text-muted hover:text-ink hover:bg-canvas flex items-center justify-center transition-colors"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="relative flex-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4.3-4.3" strokeLinecap="round" />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="w-full h-9 pl-8 pr-3 rounded-md bg-canvas border border-hairline text-sm text-ink placeholder:text-muted-soft outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={onNewDoc}
            className="w-9 h-9 rounded-md bg-primary text-on-primary flex items-center justify-center hover:bg-primary-active transition-colors flex-shrink-0"
            aria-label="New document"
            title="New document (Cmd/Ctrl+N)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="w-4 h-4">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {pinned.length > 0 && (
          <>
            <p className="text-[10px] uppercase tracking-wider text-muted px-2 mb-1.5 mt-2 font-medium">
              Pinned
            </p>
            {pinned.map((d) => (
              <DocRow key={d.id} doc={d} active={d.id === activeId} onClick={() => setActive(d.id)} />
            ))}
          </>
        )}
        {rest.length > 0 && (
          <>
            <p className="text-[10px] uppercase tracking-wider text-muted px-2 mb-1.5 mt-3 font-medium">
              All notes
            </p>
            {rest.map((d) => (
              <DocRow key={d.id} doc={d} active={d.id === activeId} onClick={() => setActive(d.id)} />
            ))}
          </>
        )}
        {filtered.length === 0 && (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-muted">No notes match "{q}".</p>
            <button
              onClick={() => {
                setQ('')
                onNewDoc()
              }}
              className="mt-3 text-sm text-primary font-medium hover:underline"
            >
              Create new note →
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}

function DocRow({
  doc,
  active,
  onClick,
}: {
  doc: Doc
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cls(
        'w-full text-left px-3 py-2.5 rounded-md flex items-start gap-2.5 transition-colors',
        active ? 'bg-canvas border border-hairline' : 'hover:bg-canvas/60',
      )}
    >
      <span
        className={cls(
          'mt-0.5 flex-shrink-0',
          active ? 'text-primary' : 'text-muted',
        )}
      >
        <FileText size={16} strokeWidth={1.6} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-ink truncate">
          {doc.title || 'Untitled'}
        </span>
        <span className="block text-[11px] text-muted mt-0.5 truncate">
          {relativeTime(doc.updatedAt)}
          {doc.ownerName && <> · by {doc.ownerName}</>}
          {doc.tags.length > 0 && <> · {doc.tags.slice(0, 2).join(', ')}</>}
        </span>
      </span>
    </button>
  )
}
