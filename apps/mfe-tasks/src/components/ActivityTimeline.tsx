import { useBoardStore } from '../store/boardStore'
import { STATUS_LABEL } from '../shared/types'
import { relativeTime } from '../shared/format'

const iconForType: Record<string, string> = {
  created: 'M12 5v14M5 12h14',
  moved: 'M5 12h14M13 6l6 6-6 6',
  edited: 'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z',
  completed: 'M20 6 9 17l-5-5',
  deleted: 'M6 6 18 18M18 6 6 18',
  commented: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z',
}

export default function ActivityTimeline() {
  const activity = useBoardStore((s) => s.activity).slice(0, 14)

  return (
    <aside className="w-72 flex-shrink-0 rounded-xl bg-surface-dark text-on-dark p-5 hidden xl:flex flex-col min-h-0 max-h-full">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-[0.16em] text-on-dark-soft font-medium">
          Activity
        </p>
        <span className="text-[11px] text-on-dark-soft">{activity.length}</span>
      </div>
      <h2 className="font-display text-lg mt-1.5">Recent events</h2>

      {activity.length === 0 ? (
        <p className="text-sm text-on-dark-soft mt-6">Nothing yet. Create a task to get started.</p>
      ) : (
        <ol className="mt-5 space-y-3.5 overflow-y-auto pr-1 -mr-2 flex-1">
          {activity.map((e, i) => (
            <li key={e.id} className="relative pl-6">
              <span
                className="absolute left-1.5 top-2 bottom-0 w-px bg-surface-dark-elevated"
                style={{ display: i === activity.length - 1 ? 'none' : undefined }}
              />
              <span className="absolute left-0 top-1 w-3 h-3 rounded-full bg-surface-dark-elevated border border-on-dark-soft/30 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-2 h-2 text-primary">
                  <path d={iconForType[e.type] ?? iconForType.edited} />
                </svg>
              </span>
              <p className="text-[13px] text-on-dark leading-snug">{e.taskTitle}</p>
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
    </aside>
  )
}
