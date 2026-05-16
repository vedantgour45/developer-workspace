import { useEffect, useState } from 'react'
import ConfirmModal from './ConfirmModal'
import { cloudEnabled } from '../shared/cloudRepo'
import { supabase } from '../auth/supabase'

interface Props {
  onClose: () => void
}

interface Shortcut {
  keys: string[]
  label: string
}

const navShortcuts: Shortcut[] = [
  { keys: ['G', 'D'], label: 'Go to Dashboard' },
  { keys: ['G', 'N'], label: 'Go to Notes' },
  { keys: ['G', 'T'], label: 'Go to Tasks' },
  { keys: ['G', 'A'], label: 'Go to Analytics' },
]

const tasksShortcuts: Shortcut[] = [
  { keys: ['N'], label: 'Create a new task' },
  { keys: ['/'], label: 'Focus the search bar' },
  { keys: ['Esc'], label: 'Close the task detail panel' },
  { keys: ['Cmd', 'Enter'], label: 'Submit a comment' },
]

const notesShortcuts: Shortcut[] = [
  { keys: ['/'], label: 'Open the block menu inside a doc' },
  { keys: ['Cmd', 'N'], label: 'New document' },
  { keys: ['Cmd', 'S'], label: 'Force-save the current document' },
  { keys: ['Cmd', 'P'], label: 'Cycle Write / Split / Read view' },
]

export default function HelpModal({ onClose }: Props) {
  const [confirmReset, setConfirmReset] = useState(false)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const performReset = async () => {
    if (cloudEnabled && supabase) {
      // Clear every row in the shared workspace. Affects every signed-in user.
      const tables = ['tasks', 'docs', 'activity'] as const
      const client = supabase
      await Promise.all(
        tables.map((t) => client.from(t).delete().neq('id', '__sentinel__')),
      )
    } else {
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith('dw:') && k !== 'dw:auth' && k !== 'dw:currentUser')
          .forEach((k) => localStorage.removeItem(k))
      } catch {}
    }
    window.location.reload()
  }

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dw-help-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'rgba(20,20,19,0.4)',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-xl bg-canvas border border-hairline overflow-hidden flex flex-col dw-fade-up"
        style={{
          width: '100%',
          maxWidth: 680,
          maxHeight: '85vh',
          boxShadow: '0 24px 60px rgba(20,20,19,0.25)',
        }}
      >
        <header className="px-7 py-5 border-b border-hairline-soft flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted font-medium">
              Help & shortcuts
            </p>
            <h2 id="dw-help-title" className="font-display text-[26px] text-ink mt-1 leading-tight">
              Move faster
            </h2>
            <p className="text-sm text-body mt-1">
              Keyboard shortcuts work wherever you are in the workspace.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-md text-muted hover:text-ink hover:bg-surface-card flex items-center justify-center flex-shrink-0"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="w-4 h-4">
              <path d="M6 6 18 18M18 6 6 18" />
            </svg>
          </button>
        </header>

        <div className="overflow-y-auto px-7 py-6 flex-1 space-y-7">
          <Section title="Navigation" rows={navShortcuts} />
          <Section title="Tasks" rows={tasksShortcuts} />
          <Section title="Notes" rows={notesShortcuts} />

          {/* Data & recovery */}
          <div>
            <h3 className="text-[11px] uppercase tracking-[0.16em] text-muted font-medium mb-3">
              Workspace data
            </h3>
            <div className="rounded-lg bg-surface-card/50 border border-hairline p-4">
              <p className="text-sm text-body leading-relaxed">
                {cloudEnabled ? (
                  <>
                    Your tasks, docs, and activity are synced to your shared{' '}
                    <span className="font-mono text-[12px] bg-canvas px-1.5 py-0.5 rounded border border-hairline">
                      Supabase
                    </span>{' '}
                    workspace. Changes appear live for every signed-in teammate.
                  </>
                ) : (
                  <>
                    Running in demo mode. Tasks, docs, and activity live in this
                    browser only. Sign in to sync across devices.
                  </>
                )}
              </p>
              <button
                onClick={() => setConfirmReset(true)}
                className="mt-3 h-9 px-4 rounded-md text-sm font-medium bg-canvas border border-hairline text-ink hover:border-error hover:text-error transition-colors"
              >
                Reset workspace data
              </button>
              <p className="text-[12px] text-muted mt-2">
                {cloudEnabled
                  ? 'Deletes every task, doc, and activity row from the shared workspace.'
                  : 'Clears local data and restores the sample workspace on reload.'}
              </p>
            </div>
          </div>
        </div>

        <footer className="px-7 py-4 border-t border-hairline-soft bg-surface-card/30 flex items-center justify-end">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-md text-sm font-medium bg-primary text-on-primary hover:bg-primary-active transition-colors"
          >
            Got it
          </button>
        </footer>
      </div>

      {confirmReset && (
        <ConfirmModal
          title="Reset workspace data?"
          message={
            cloudEnabled ? (
              <>
                Every task, document, and activity entry in the{' '}
                <strong className="text-ink">shared Supabase workspace</strong> will be permanently
                removed. Other signed-in teammates will lose this data too. This can't be undone.
              </>
            ) : (
              <>
                Every task, document, and activity entry stored in this browser will be permanently
                removed and re-seeded with the sample data. This can't be undone.
              </>
            )
          }
          confirmLabel="Reset everything"
          destructive
          onCancel={() => setConfirmReset(false)}
          onConfirm={performReset}
        />
      )}
    </div>
  )
}

function Section({ title, rows }: { title: string; rows: Shortcut[] }) {
  return (
    <div>
      <h3 className="text-[11px] uppercase tracking-[0.16em] text-muted font-medium mb-3">
        {title}
      </h3>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-4 text-sm">
            <span className="text-body flex-1">{r.label}</span>
            <span className="flex items-center gap-1 flex-shrink-0">
              {r.keys.map((k, i) => (
                <kbd
                  key={i}
                  className="inline-flex items-center justify-center min-w-[22px] h-6 px-1.5 rounded bg-canvas border border-hairline font-mono text-[11px] text-ink"
                >
                  {k}
                </kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
