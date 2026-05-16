import type { TaskPriority } from '../shared/types'
import { PRIORITY_LABEL } from '../shared/types'
import { cls } from '../shared/format'
import Select from './ui/Select'

export type DueFilter = 'all' | 'overdue' | 'today' | 'thisWeek' | 'noDate'

export interface BoardFilters {
  query: string
  priorities: Set<TaskPriority>
  tag: string | null
  assignee: string | null
  due: DueFilter
}

interface Props {
  filters: BoardFilters
  allTags: string[]
  allAssignees: string[]
  onChange: (next: BoardFilters) => void
  total: number
  visible: number
}

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent']

export default function FilterBar({ filters, allTags, allAssignees, onChange, total, visible }: Props) {
  const togglePriority = (p: TaskPriority) => {
    const next = new Set(filters.priorities)
    if (next.has(p)) next.delete(p)
    else next.add(p)
    onChange({ ...filters, priorities: next })
  }
  const clear = () =>
    onChange({ query: '', priorities: new Set(), tag: null, assignee: null, due: 'all' })
  const isActive =
    filters.query.length > 0 ||
    filters.priorities.size > 0 ||
    filters.tag !== null ||
    filters.assignee !== null ||
    filters.due !== 'all'

  return (
    <div className="flex flex-wrap items-center gap-2 px-1">
      <div className="relative flex-1 min-w-[220px]">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4.3-4.3" strokeLinecap="round" />
        </svg>
        <input
          value={filters.query}
          onChange={(e) => onChange({ ...filters, query: e.target.value })}
          placeholder="Search tasks…"
          className="w-full h-9 pl-9 pr-3 rounded-md bg-canvas border border-hairline text-sm text-ink placeholder:text-muted-soft focus:border-primary outline-none transition-colors"
        />
      </div>

      <div className="flex items-center gap-0.5 bg-canvas border border-hairline rounded-md p-0.5">
        {PRIORITIES.map((p) => {
          const active = filters.priorities.has(p)
          return (
            <button
              key={p}
              onClick={() => togglePriority(p)}
              className={cls(
                'px-2.5 h-7 rounded text-xs font-medium transition-colors',
                active ? 'bg-ink text-on-dark' : 'text-muted hover:text-ink',
              )}
            >
              {PRIORITY_LABEL[p]}
            </button>
          )
        })}
      </div>

      <Select<DueFilter>
        value={filters.due}
        onChange={(v) => onChange({ ...filters, due: v })}
        options={[
          { value: 'all', label: 'Any date' },
          { value: 'overdue', label: 'Overdue' },
          { value: 'today', label: 'Due today' },
          { value: 'thisWeek', label: 'Due this week' },
          { value: 'noDate', label: 'No date' },
        ]}
        size="md"
        ariaLabel="Due date filter"
      />

      {allAssignees.length > 1 && (
        <Select
          value={filters.assignee ?? '__all__'}
          onChange={(v) => onChange({ ...filters, assignee: v === '__all__' ? null : v })}
          options={[
            { value: '__all__', label: 'All assignees' },
            ...allAssignees.map((a) => ({ value: a, label: a })),
          ]}
          size="md"
          ariaLabel="Assignee filter"
        />
      )}

      {allTags.length > 0 && (
        <Select
          value={filters.tag ?? '__all__'}
          onChange={(v) => onChange({ ...filters, tag: v === '__all__' ? null : v })}
          options={[
            { value: '__all__', label: 'All labels' },
            ...allTags.map((t) => ({ value: t, label: t })),
          ]}
          size="md"
          ariaLabel="Label filter"
        />
      )}

      <div className="ml-auto flex items-center gap-3">
        <span className="text-xs text-muted">
          <span className="text-ink font-medium">{visible}</span> / {total}
        </span>
        {isActive && (
          <button
            onClick={clear}
            className="text-xs font-medium text-primary hover:text-primary-active"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  )
}
