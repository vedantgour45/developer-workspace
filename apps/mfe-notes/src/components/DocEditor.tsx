import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDocsStore } from '../store/docsStore'
import { debounce, relativeTime } from '../shared/format'
import { filterCommands, type SlashCommand } from '../lib/slashCommands'
import { printDoc, PdfServiceError } from '../lib/printDoc'
import { toast } from '../shared/toast'
import SlashCommandMenu from './SlashCommandMenu'
import MarkdownPreview from './MarkdownPreview'
import InfoModal from './InfoModal'
import ConfirmModal from './ui/ConfirmModal'
import ActionMenu from './ActionMenu'
import SplitPane from './SplitPane'
import type { Doc } from '../shared/types'
import { COVER_PRESETS, coverStyle } from '../shared/types'
import { FileText } from 'lucide-react'

type SaveState = 'idle' | 'saving' | 'saved'
type ViewMode = 'split' | 'write' | 'read'

interface Props {
  doc: Doc
}

// Per-doc emoji customization has been retired in favour of a unified
// lucide FileText icon. `doc.emoji` is still persisted in the DB for
// backward compat with older rows but is no longer surfaced in the UI.

export default function DocEditor({ doc }: Props) {
  const update = useDocsStore((s) => s.updateDoc)
  const remove = useDocsStore((s) => s.deleteDoc)
  const togglePin = useDocsStore((s) => s.togglePin)
  const duplicate = useDocsStore((s) => s.duplicateDoc)

  const [title, setTitle] = useState(doc.title)
  const [content, setContent] = useState(doc.content)
  const [tagInput, setTagInput] = useState('')
  const [view, setView] = useState<ViewMode>('split')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [infoOpen, setInfoOpen] = useState(false)
  const [coverOpen, setCoverOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [tagsOpen, setTagsOpen] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Slash menu state
  const [slashOpen, setSlashOpen] = useState(false)
  const [slashQuery, setSlashQuery] = useState('')
  const [slashIndex, setSlashIndex] = useState(0)
  const slashAnchor = useRef<{ start: number; pos: { top: number; left: number } } | null>(null)
  const commands = useMemo(() => filterCommands(slashQuery), [slashQuery])

  useEffect(() => {
    setTitle(doc.title)
    setContent(doc.content)
    setSaveState('idle')
    setTagsOpen(false)
  }, [doc.id])

  const persist = useMemo(
    () =>
      debounce((patch: Partial<Doc>) => {
        update(doc.id, patch)
        setSaveState('saved')
      }, 450),
    [doc.id, update],
  )
  useEffect(() => () => persist.cancel(), [persist])

  const onContentChange = (next: string) => {
    setContent(next)
    setSaveState('saving')
    persist({ content: next })
  }
  const onTitleChange = (next: string) => {
    setTitle(next)
    setSaveState('saving')
    persist({ title: next.trim() || 'Untitled' })
  }
  const onTagsCommit = () => {
    const next = tagInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
    if (next.length === 0) return
    if (next.every((t) => doc.tags.includes(t))) {
      setTagInput('')
      return
    }
    update(doc.id, { tags: Array.from(new Set([...doc.tags, ...next])) })
    setTagInput('')
  }
  const removeTag = (t: string) => update(doc.id, { tags: doc.tags.filter((x) => x !== t) })

  const updateSlashFromCaret = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    const cursor = el.selectionStart
    const before = content.slice(0, cursor)
    const newlineIdx = before.lastIndexOf('\n')
    const lineStart = newlineIdx + 1
    const line = before.slice(lineStart)
    const slashIdx = line.lastIndexOf('/')
    if (slashIdx === -1) {
      setSlashOpen(false)
      return
    }
    const after = line.slice(slashIdx)
    if (/\s/.test(after)) {
      setSlashOpen(false)
      return
    }
    // Viewport-fixed coordinates: textarea's bounding rect (in viewport
    // coords) + caret offset within the textarea. The slash menu portals
    // to document.body and uses position: fixed, so we feed it viewport
    // coords directly. Earlier the math translated to the outer
    // container's coordinate space, which didn't match the actual
    // positioned ancestor → menu drifted to the bottom of the editor.
    const rect = el.getBoundingClientRect()
    const caretCoords = approximateCaretCoords(el, lineStart + slashIdx)
    slashAnchor.current = {
      start: lineStart + slashIdx,
      pos: {
        top: rect.top + caretCoords.top + 4,
        left: rect.left + caretCoords.left,
      },
    }
    setSlashQuery(after.slice(1))
    setSlashIndex(0)
    setSlashOpen(true)
  }, [content])

  const insertCommand = (cmd: SlashCommand) => {
    const el = textareaRef.current
    if (!el || !slashAnchor.current) return
    const { start } = slashAnchor.current
    const end = el.selectionStart
    const nextContent = content.slice(0, start) + cmd.insert + content.slice(end)
    setSlashOpen(false)
    setContent(nextContent)
    persist({ content: nextContent })
    requestAnimationFrame(() => {
      const offset = cmd.cursorOffset ?? 0
      const caret = start + cmd.insert.length - offset
      el.focus()
      el.setSelectionRange(caret, caret)
    })
  }

  const onEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (slashOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSlashIndex((i) => (i + 1) % commands.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSlashIndex((i) => (i - 1 + commands.length) % commands.length)
        return
      }
      if ((e.key === 'Enter' || e.key === 'Tab') && commands[slashIndex]) {
        e.preventDefault()
        insertCommand(commands[slashIndex])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setSlashOpen(false)
        return
      }
    }
    if (e.key === 'Enter') {
      const el = e.currentTarget
      const before = content.slice(0, el.selectionStart)
      const lineStart = before.lastIndexOf('\n') + 1
      const line = before.slice(lineStart)
      const match = line.match(/^(\s*)([-*]|\d+\.|\[[ x]\])\s/)
      if (match && line.trim().length === match[0].trim().length) {
        e.preventDefault()
        const next = content.slice(0, lineStart) + content.slice(el.selectionStart)
        setContent(next)
        persist({ content: next })
        requestAnimationFrame(() => {
          el.focus()
          el.setSelectionRange(lineStart, lineStart)
        })
      }
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        persist.cancel()
        update(doc.id, { title: title.trim() || 'Untitled', content })
        setSaveState('saved')
        // Auto-save runs continuously on every keystroke; this toast
        // only fires when the user explicitly hits Cmd/Ctrl+S so it
        // confirms the deliberate save.
        toast.success('Saved successfully')
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        setView((v) => (v === 'split' ? 'read' : v === 'read' ? 'write' : 'split'))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [persist, update, doc.id, title, content])

  const stats = useMemo(() => {
    const text = content.replace(/```[\s\S]*?```/g, '').trim()
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0
    return { words, chars: content.length }
  }, [content])

  const handleCheckboxToggle = useCallback(
    (index: number, checked: boolean) => {
      let count = 0
      const next = content.replace(/(^[\t ]*[-*]\s+)\[[ xX]\]/gm, (m, prefix) => {
        const result = count === index ? `${prefix}[${checked ? 'x' : ' '}]` : m
        count++
        return result
      })
      if (next !== content) {
        setContent(next)
        persist.cancel()
        update(doc.id, { content: next })
        setSaveState('saved')
      }
    },
    [content, persist, update, doc.id],
  )

  const [pdfBusy, setPdfBusy] = useState(false)
  const downloadPDF = async () => {
    if (pdfBusy) return
    setPdfBusy(true)
    // Show a loading toast and replace it with success/error when done.
    const toastId = toast.loading('Generating PDF…', {
      description: title || doc.title || 'Untitled',
    })
    try {
      await printDoc({
        title: title || doc.title,
        content,
        authorName: doc.ownerName,
      })
      toast.success('PDF downloaded successfully', { id: toastId })
    } catch (err) {
      const message =
        err instanceof PdfServiceError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'PDF generation failed.'
      toast.error('PDF generation failed', {
        id: toastId,
        description: message,
      })
      console.error('[pdf]', err)
    } finally {
      setPdfBusy(false)
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative flex-1 flex flex-col bg-canvas min-w-0 h-full"
    >
      {/* Optional cover banner (compact: 96px) */}
      {doc.cover.kind !== 'none' && (
        <div
          className="relative flex-shrink-0"
          style={{ height: 96, ...coverStyle(doc.cover) }}
        />
      )}

      {/* Compact title bar */}
      <header
        className={`px-7 ${doc.cover.kind !== 'none' ? 'pt-3 -mt-6' : 'pt-5'} pb-3 flex-shrink-0`}
      >
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="w-12 h-12 rounded-md bg-surface-card text-primary flex items-center justify-center flex-shrink-0"
          >
            <FileText size={22} strokeWidth={1.6} />
          </span>

          <input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Untitled"
            className="flex-1 font-display text-[28px] leading-tight text-ink bg-transparent border-0 outline-none placeholder:text-muted-soft min-w-0"
          />

          {/* View toggle */}
          <div className="flex items-center gap-0.5 bg-surface-card rounded-md p-0.5 flex-shrink-0">
            {(['write', 'split', 'read'] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-2.5 h-7 rounded text-[11px] font-medium capitalize transition-colors ${
                  view === v ? 'bg-canvas text-ink' : 'text-muted hover:text-ink'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Info button — visible, prominent */}
          <button
            type="button"
            onClick={() => setInfoOpen(true)}
            className="w-8 h-8 rounded-md text-muted hover:text-ink hover:bg-surface-card flex items-center justify-center transition-colors flex-shrink-0"
            title="How to write notes — formatting reference"
            aria-label="Markdown reference"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
          </button>

          {/* Action menu */}
          <ActionMenu
            items={[
              {
                label: doc.pinned ? 'Unpin' : 'Pin to top',
                icon: (
                  <svg viewBox="0 0 24 24" fill={doc.pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <path d="M12 17v5M8 2h8l-2 5 3 4H7l3-4-2-5Z" />
                  </svg>
                ),
                onClick: () => togglePin(doc.id),
              },
              {
                label: doc.cover.kind === 'none' ? 'Add cover' : 'Change cover',
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="m21 15-5-5L5 21" />
                  </svg>
                ),
                onClick: () => setCoverOpen(true),
              },
              {
                label: 'Edit tags',
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z" />
                    <path d="M7 7h.01" />
                  </svg>
                ),
                onClick: () => setTagsOpen((o) => !o),
              },
              {
                label: 'Duplicate',
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <rect x="8" y="8" width="12" height="12" rx="2" />
                    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
                  </svg>
                ),
                onClick: () => duplicate(doc.id),
              },
              {
                label: pdfBusy ? 'Generating PDF…' : 'Download as PDF',
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
                ),
                onClick: () => void downloadPDF(),
              },
              { divider: true },
              {
                label: 'Delete document',
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  </svg>
                ),
                destructive: true,
                onClick: () => setConfirmDelete(true),
              },
            ]}
          />
        </div>

        {/* Inline tag chips (always visible if any, or when opened) */}
        {(doc.tags.length > 0 || tagsOpen) && (
          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            {doc.tags.map((t) => (
              <span
                key={t}
                className="text-xs font-medium text-ink bg-surface-card px-2 py-0.5 rounded-full inline-flex items-center gap-1"
              >
                {t}
                <button
                  onClick={() => removeTag(t)}
                  className="text-muted hover:text-error"
                  aria-label={`Remove ${t}`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-2.5 h-2.5">
                    <path d="M6 6 18 18M18 6 6 18" />
                  </svg>
                </button>
              </span>
            ))}
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onBlur={onTagsCommit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  onTagsCommit()
                }
              }}
              placeholder="+ Add tag"
              className="h-6 px-2 rounded-full bg-transparent border border-dashed border-hairline text-xs text-ink outline-none focus:border-primary placeholder:text-muted-soft w-24"
            />
          </div>
        )}

        {/* Status strip */}
        <div className="flex items-center gap-3 mt-2 text-[12px] text-muted">
          <SaveIndicator state={saveState} updatedAt={doc.updatedAt} />
          {doc.ownerName && (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="w-4 h-4 rounded-full bg-surface-dark text-on-dark text-[9px] font-medium flex items-center justify-center"
                  title={`Created by ${doc.ownerName}`}
                >
                  {doc.ownerName
                    .split(/\s+/)
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()}
                </span>
                <span>by {doc.ownerName}</span>
              </span>
            </>
          )}
          <span>·</span>
          <span>
            {stats.words} {stats.words === 1 ? 'word' : 'words'}
          </span>
          <span>·</span>
          <span>{stats.chars} chars</span>
        </div>
      </header>

      {/* Body — resizable split pane */}
      <SplitPane
        storageKey="dw:docs:splitPct"
        defaultLeft={50}
        showLeft={view === 'write' || view === 'split'}
        showRight={view === 'read' || view === 'split'}
        leftHeader={
          <PaneHeader label="Input" hint="Markdown — type / for blocks" />
        }
        rightHeader={<PaneHeader label="Preview" hint="What others will read" />}
        left={
          <div className="relative h-full">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => {
                onContentChange(e.target.value)
                updateSlashFromCaret()
              }}
              onKeyDown={onEditorKeyDown}
              onSelect={updateSlashFromCaret}
              onClick={updateSlashFromCaret}
              onBlur={() => setTimeout(() => setSlashOpen(false), 120)}
              spellCheck
              placeholder="Start writing… or type / for the block menu."
              className="absolute inset-0 w-full h-full px-8 py-6 bg-canvas text-ink text-[15px] leading-7 outline-none border-0 resize-none font-mono"
            />
            {slashOpen && (
              <SlashCommandMenu
                items={commands}
                active={slashIndex}
                setActive={setSlashIndex}
                onPick={insertCommand}
                onClose={() => setSlashOpen(false)}
                position={slashAnchor.current?.pos ?? { top: 80, left: 24 }}
              />
            )}
          </div>
        }
        right={
          <div className="h-full overflow-y-auto px-8 py-6 bg-canvas">
            <MarkdownPreview content={content} onToggleCheckbox={handleCheckboxToggle} />
          </div>
        }
      />

      {/* Cover picker dropdown — anchored to top-right of cover banner area */}
      {coverOpen && (
        <CoverInlinePicker
          value={doc.cover}
          onChange={(c) => {
            update(doc.id, { cover: c })
            setCoverOpen(false)
          }}
          onClose={() => setCoverOpen(false)}
        />
      )}

      {infoOpen && <InfoModal onClose={() => setInfoOpen(false)} />}

      {confirmDelete && (
        <ConfirmModal
          title={`Delete "${doc.title || 'Untitled'}"?`}
          message="This document and its contents will be permanently removed from this workspace."
          confirmLabel="Delete"
          destructive
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            setConfirmDelete(false)
            remove(doc.id)
          }}
        />
      )}
    </div>
  )
}

function PaneHeader({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="flex items-center gap-2 px-6 h-9 border-b border-t border-hairline-soft bg-surface-card/40 flex-shrink-0">
      <span className="text-[10px] uppercase tracking-[0.18em] font-medium text-muted">
        {label}
      </span>
      {hint && <span className="text-[11px] text-muted-soft">— {hint}</span>}
    </div>
  )
}

function SaveIndicator({ state, updatedAt }: { state: SaveState; updatedAt: string }) {
  if (state === 'saving') {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-accent-amber animate-pulse" /> Saving…
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-success" />
      Saved {relativeTime(updatedAt)}
    </span>
  )
}

/** Inline cover picker — preset grid + remove option, anchored top-right */
function CoverInlinePicker({
  value,
  onChange,
  onClose,
}: {
  value: Doc['cover']
  onChange: (c: Doc['cover']) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute top-3 right-3 z-30 w-72 rounded-lg bg-canvas border border-hairline p-3"
      style={{ boxShadow: '0 16px 40px rgba(20,20,19,0.16)' }}
    >
      <p className="text-[10px] uppercase tracking-wider text-muted font-medium mb-2 px-1">
        Cover presets
      </p>
      <div className="grid grid-cols-4 gap-1.5">
        {COVER_PRESETS.map((preset, i) => {
          const isActive = JSON.stringify(preset) === JSON.stringify(value)
          return (
            <button
              key={i}
              onClick={() => onChange(preset)}
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
          onClick={() => onChange({ kind: 'none' })}
          className="mt-3 w-full h-8 rounded-md bg-canvas border border-hairline text-[12px] text-ink hover:border-ink/30"
        >
          Remove cover
        </button>
      )}
    </div>
  )
}

function approximateCaretCoords(el: HTMLTextAreaElement, pos: number): { top: number; left: number } {
  const div = document.createElement('div')
  const style = window.getComputedStyle(el)
  for (const prop of [
    'boxSizing',
    'width',
    'paddingTop',
    'paddingRight',
    'paddingBottom',
    'paddingLeft',
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'fontFamily',
    'fontSize',
    'fontWeight',
    'lineHeight',
    'letterSpacing',
    'whiteSpace',
    'wordSpacing',
  ] as const) {
    ;(div.style as unknown as Record<string, string>)[prop] = style[prop]
  }
  div.style.position = 'absolute'
  div.style.visibility = 'hidden'
  div.style.whiteSpace = 'pre-wrap'
  div.style.wordWrap = 'break-word'
  div.style.top = '0'
  div.style.left = '0'

  const before = el.value.slice(0, pos)
  div.textContent = before
  const marker = document.createElement('span')
  marker.textContent = '​'
  div.appendChild(marker)
  document.body.appendChild(div)
  const { offsetTop, offsetLeft } = marker
  const lineHeight = parseFloat(style.lineHeight) || 18
  document.body.removeChild(div)
  return { top: offsetTop + lineHeight - el.scrollTop, left: offsetLeft - el.scrollLeft }
}
