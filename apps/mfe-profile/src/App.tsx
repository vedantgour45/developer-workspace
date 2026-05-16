import { useMemo, useState } from 'react'
import { useWorkspace } from './shared/useWorkspace'
import {
  buildDailySeries,
  buildHeatmap,
  buildPriorityBreakdown,
  buildStatusBreakdown,
  summarize,
} from './lib/analytics'
import { tasksToCsv, downloadCsv } from './lib/csv'
import StatCard from './components/StatCard'
import CompletionChart from './components/CompletionChart'
import { MemoPriorityBreakdown, MemoStatusBreakdown } from './components/BreakdownCharts'
import Heatmap from './components/Heatmap'
import TopTags from './components/TopTags'
import EmptyState from './components/EmptyState'
import { cls } from './shared/format'

type Range = 7 | 14 | 28

export default function App() {
  const { tasks } = useWorkspace()
  const [range, setRange] = useState<Range>(28)

  const summary = useMemo(() => summarize(tasks), [tasks])
  const daily = useMemo(() => buildDailySeries(tasks, range), [tasks, range])
  const heatmap = useMemo(() => buildHeatmap(tasks, 53), [tasks])
  const statusBreakdown = useMemo(() => buildStatusBreakdown(tasks), [tasks])
  const priorityBreakdown = useMemo(() => buildPriorityBreakdown(tasks), [tasks])
  const completedInRange = useMemo(
    () => daily.reduce((sum, d) => sum + d.completed, 0),
    [daily],
  )
  const createdInRange = useMemo(
    () => daily.reduce((sum, d) => sum + d.created, 0),
    [daily],
  )

  const exportCsv = () => {
    downloadCsv(`developer-workspace-tasks-${new Date().toISOString().slice(0, 10)}.csv`, tasksToCsv(tasks))
  }

  if (tasks.length === 0) return <EmptyState />

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-8 py-8 max-w-[1280px] mx-auto dw-fade-up">
      <header className="flex items-end justify-between flex-wrap gap-4 mb-7">
        <div>
          <h1 className="font-display text-[34px] leading-[1.05] text-ink">Analytics</h1>
          <p className="text-body mt-1.5 text-sm">
            Live read of your tasks. Numbers update the moment you move a card.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 bg-surface-card rounded-md p-0.5">
            {([7, 14, 28] as Range[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cls(
                  'px-3 h-8 rounded text-xs font-medium transition-colors',
                  range === r ? 'bg-canvas text-ink' : 'text-muted hover:text-ink',
                )}
              >
                {r}d
              </button>
            ))}
          </div>
          <button
            onClick={exportCsv}
            className="h-10 px-4 rounded-md bg-canvas border border-hairline hover:border-ink/30 text-sm font-medium text-ink inline-flex items-center gap-2 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Export CSV
          </button>
        </div>
      </header>

      {/* Stat row */}
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        <StatCard
          label="Completion rate"
          value={`${summary.completionRate}%`}
          hint={`${summary.byStatus.done} of ${summary.total} shipped`}
          tone="coral"
        />
        <StatCard
          label="Velocity / week"
          value={summary.velocityPerWeek}
          hint="Completed in last 7 days"
        />
        <StatCard
          label="Avg cycle"
          value={summary.avgCycleHours === null ? '—' : `${summary.avgCycleHours}h`}
          hint="Created → done"
        />
        <StatCard
          label="Longest streak"
          value={`${summary.longestStreak}d`}
          hint="Consecutive shipping days"
          tone="dark"
        />
      </div>

      {/* Completion chart + status pie */}
      <div className="grid gap-5 mt-5 [grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
        <section className="rounded-xl bg-canvas border border-hairline p-6 min-w-0">
          <div className="flex items-end justify-between mb-2">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted font-medium">
                Last {range} days
              </p>
              <h2 className="font-display text-xl text-ink mt-1">Created vs completed</h2>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted">In range</p>
              <p className="text-sm text-ink">
                <span className="font-medium">{completedInRange}</span> done · {createdInRange} created
              </p>
            </div>
          </div>
          <CompletionChart data={daily} />
        </section>

        <section className="rounded-xl bg-canvas border border-hairline p-6">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted font-medium">
            Status mix
          </p>
          <h2 className="font-display text-xl text-ink mt-1">Where things sit</h2>
          <div className="mt-2">
            <MemoStatusBreakdown data={statusBreakdown} />
          </div>
          <ul className="mt-2 space-y-1.5 text-sm">
            {statusBreakdown.map((s) => (
              <li key={s.status} className="flex items-center justify-between text-muted">
                <span className="capitalize">{s.status.replace('_', ' ')}</span>
                <span className="font-mono text-ink">{s.value}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Heatmap — full container width, LeetCode-style */}
      <section className="rounded-xl bg-surface-dark text-on-dark p-7 mt-5">
        <div className="flex items-start justify-between mb-5 gap-6 flex-wrap">
          <div>
            <h2 className="text-[15px] text-on-dark flex items-baseline" style={{ gap: 10 }}>
              <span className="font-display text-2xl text-on-dark">{heatmap.total}</span>
              <span>{heatmap.total === 1 ? 'task' : 'tasks'} completed in the past year</span>
            </h2>
            <p className="text-[12px] text-on-dark-soft mt-1">
              Each cell is one day. Coral intensity tracks how many tasks you completed.
            </p>
          </div>
          <dl className="flex items-center text-[12px]" style={{ gap: 28 }}>
            <div>
              <dt className="text-on-dark-soft">Total active days</dt>
              <dd className="font-display text-xl text-on-dark mt-0.5">{heatmap.daysWithActivity}</dd>
            </div>
            <div>
              <dt className="text-on-dark-soft">Max streak</dt>
              <dd className="font-display text-xl text-on-dark mt-0.5">{summary.longestStreak}d</dd>
            </div>
            <div>
              <dt className="text-on-dark-soft">Peak day</dt>
              <dd className="font-display text-xl text-on-dark mt-0.5">
                {heatmap.max}
              </dd>
            </div>
          </dl>
        </div>
        <Heatmap data={heatmap} />
      </section>

      {/* Priorities + tags */}
      <div className="grid gap-5 mt-5 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
        <section className="rounded-xl bg-canvas border border-hairline p-6">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted font-medium">
            By priority
          </p>
          <h2 className="font-display text-xl text-ink mt-1">Where attention goes</h2>
          <div className="mt-3">
            <MemoPriorityBreakdown data={priorityBreakdown} />
          </div>
        </section>

        <section className="rounded-xl bg-canvas border border-hairline p-6">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted font-medium">
            Top tags
          </p>
          <h2 className="font-display text-xl text-ink mt-1">Most active labels</h2>
          <div className="mt-5">
            <TopTags tasks={tasks} />
          </div>
        </section>
      </div>
      </div>
    </div>
  )
}
