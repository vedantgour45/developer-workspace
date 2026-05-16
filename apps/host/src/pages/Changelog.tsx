import { useMemo } from 'react'
import { useActivity } from '../shared/useTasks'
import { STATUS_LABEL } from '../shared/types'
import { format, isToday, isYesterday } from 'date-fns'

type Group = { key: string; label: string; entries: ReturnType<typeof useActivity> }

function groupLabel(date: Date): string {
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'EEEE, d MMM yyyy')
}

const TYPE_LABEL: Record<string, string> = {
  created: 'created',
  edited: 'edited',
  moved: 'moved',
  completed: 'completed',
  deleted: 'deleted',
  commented: 'commented on',
}

const TYPE_DOT: Record<string, string> = {
  created: '#5db8a6',
  edited: '#8e8b82',
  moved: '#7c8aa0',
  completed: '#5db872',
  deleted: '#c64545',
  commented: '#cc785c',
}

/**
 * Changelog — the full activity feed, grouped by day. Same data as the
 * dashboard's "What changed" widget used to show, now a destination of
 * its own from the header nav.
 */
export default function Changelog() {
  const activity = useActivity()

  const groups: Group[] = useMemo(() => {
    const sorted = activity
      .slice()
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    const buckets = new Map<string, typeof activity>()
    for (const e of sorted) {
      const key = format(new Date(e.at), 'yyyy-MM-dd')
      const list = buckets.get(key) ?? []
      list.push(e)
      buckets.set(key, list)
    }
    return Array.from(buckets.entries()).map(([key, entries]) => ({
      key,
      label: groupLabel(new Date(key)),
      entries,
    }))
  }, [activity])

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[860px] mx-auto px-8 py-10 dw-fade-up">
        <header className="mb-10">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted font-medium">
            Changelog
          </p>
          <h1 className="font-display text-[40px] leading-[1.05] text-ink mt-2">
            Everything that's changed.
          </h1>
          <p className="text-body mt-3 max-w-xl text-[15px]">
            Every task created, moved, completed, or commented on across the workspace —
            grouped by day, newest first.
          </p>
        </header>

        {groups.length === 0 ? (
          <div className="rounded-xl border border-hairline bg-surface-card/40 p-10 text-center">
            <p className="font-display text-xl text-ink">No activity yet.</p>
            <p className="text-sm text-muted mt-2">
              As you create and move tasks, the timeline will fill in here.
            </p>
          </div>
        ) : (
          <ul className="space-y-10">
            {groups.map((g) => (
              <li key={g.key}>
                <div className="flex items-baseline gap-3 mb-4">
                  <h2 className="font-display text-xl text-ink leading-none">{g.label}</h2>
                  <span className="text-[11px] uppercase tracking-wider text-muted font-medium">
                    {g.entries.length} {g.entries.length === 1 ? 'event' : 'events'}
                  </span>
                </div>
                <ul className="relative border-l border-hairline-soft pl-5 space-y-3">
                  {g.entries.map((e) => (
                    <li key={e.id} className="relative">
                      <span
                        aria-hidden
                        className="absolute -left-[27px] top-1.5 w-2.5 h-2.5 rounded-full ring-2 ring-canvas"
                        style={{ background: TYPE_DOT[e.type] ?? '#8e8b82' }}
                      />
                      <div className="flex items-baseline justify-between gap-4">
                        <p className="text-[14px] text-ink leading-snug">
                          <span className="font-medium">{e.taskTitle}</span>
                          <span className="text-muted"> · {TYPE_LABEL[e.type] ?? e.type}</span>
                          {e.fromStatus && e.toStatus && (
                            <span className="text-muted">
                              {' '}
                              · {STATUS_LABEL[e.fromStatus]} → {STATUS_LABEL[e.toStatus]}
                            </span>
                          )}
                          {!e.fromStatus && e.toStatus && (
                            <span className="text-muted"> · {STATUS_LABEL[e.toStatus]}</span>
                          )}
                        </p>
                        <span className="text-[11px] text-muted font-mono flex-shrink-0">
                          {format(new Date(e.at), 'HH:mm')}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
