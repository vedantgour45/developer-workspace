import { memo, useMemo } from 'react'
import type { Task } from '../shared/types'

interface Props {
  tasks: Task[]
}

function TopTagsInner({ tasks }: Props) {
  const ranked = useMemo(() => {
    const counts = new Map<string, { total: number; done: number }>()
    for (const t of tasks) {
      for (const tag of t.tags) {
        const c = counts.get(tag) ?? { total: 0, done: 0 }
        c.total++
        if (t.status === 'done') c.done++
        counts.set(tag, c)
      }
    }
    return Array.from(counts.entries())
      .map(([tag, c]) => ({ tag, ...c, rate: c.total === 0 ? 0 : c.done / c.total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6)
  }, [tasks])

  if (ranked.length === 0) {
    return <p className="text-sm text-muted">No tags yet — add tags to tasks to see them here.</p>
  }

  const max = ranked[0].total
  return (
    <ul className="space-y-3">
      {ranked.map((r) => (
        <li key={r.tag} className="grid grid-cols-[80px_1fr_auto] items-center gap-3 text-sm">
          <span className="text-ink font-medium truncate">{r.tag}</span>
          <div className="h-2 rounded-full bg-surface-card overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${(r.total / max) * 100}%` }}
            />
          </div>
          <span className="text-xs text-muted font-mono w-20 text-right">
            {r.done}/{r.total} done
          </span>
        </li>
      ))}
    </ul>
  )
}

export default memo(TopTagsInner)
