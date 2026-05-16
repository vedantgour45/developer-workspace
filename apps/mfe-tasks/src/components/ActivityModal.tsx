import { useEffect } from 'react'
import { useBoardStore } from '../store/boardStore'
import { STATUS_LABEL } from '../shared/types'
import { relativeTime } from '../shared/format'

interface Props {
  onClose: () => void
}

const iconForType: Record<string, string> = {
  created: 'M12 5v14M5 12h14',
  moved: 'M5 12h14M13 6l6 6-6 6',
  edited: 'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z',
  completed: 'M20 6 9 17l-5-5',
  deleted: 'M6 6 18 18M18 6 6 18',
  commented: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z',
}

export default function ActivityModal({ onClose }: Props) {
  const activity = useBoardStore((s) => s.activity)

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

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dw-activity-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-xl bg-surface-dark text-on-dark overflow-hidden flex flex-col dw-fade-up"
        style={{
          width: '100%',
          maxWidth: 560,
          maxHeight: '82vh',
          boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
        }}
      >
        <header className="px-6 py-5 border-b border-surface-dark-soft flex items-start justify-between gap-3 flex-shrink-0">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-on-dark-soft font-medium">
              Activity
            </p>
            <h2 id="dw-activity-title" className="font-display text-2xl text-on-dark mt-1 leading-tight">
              {activity.length === 0
                ? 'No events yet'
                : `${activity.length} ${activity.length === 1 ? 'event' : 'events'}`}
            </h2>
            <p className="text-[12px] text-on-dark-soft mt-1">
              Every move, edit, comment, and completion across the board.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-md text-on-dark-soft hover:text-on-dark hover:bg-surface-dark-soft flex items-center justify-center flex-shrink-0"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="w-4 h-4">
              <path d="M6 6 18 18M18 6 6 18" />
            </svg>
          </button>
        </header>

        <div className="overflow-y-auto flex-1 px-6 py-5">
          {activity.length === 0 ? (
            <p className="text-sm text-on-dark-soft">Move or edit a task and events will show up here.</p>
          ) : (
            <ol className="space-y-3.5">
              {activity.map((e, i) => (
                <li key={e.id} className="relative pl-7">
                  {i < activity.length - 1 && (
                    <span className="absolute left-[7px] top-3 bottom-[-14px] w-px bg-surface-dark-soft" />
                  )}
                  <span className="absolute left-0 top-1 w-[15px] h-[15px] rounded-full bg-surface-dark-elevated border border-on-dark-soft/30 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-2 h-2 text-coral">
                      <path d={iconForType[e.type] ?? iconForType.edited} />
                    </svg>
                  </span>
                  <p className="text-[14px] text-on-dark leading-snug">{e.taskTitle}</p>
                  <p className="text-[11px] text-on-dark-soft mt-0.5 capitalize">
                    {e.type}
                    {e.fromStatus && e.toStatus && (
                      <>
                        {' '}
                        · {STATUS_LABEL[e.fromStatus]} → {STATUS_LABEL[e.toStatus]}
                      </>
                    )}
                    {!e.fromStatus && e.toStatus && <> · → {STATUS_LABEL[e.toStatus]}</>}
                    <span className="mx-1.5">·</span>
                    {relativeTime(e.at)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  )
}
