import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { useTasks, useDocs, useActivity } from '../shared/useTasks'
import {
  PRIORITY_ORDER,
  STATUS_LABEL,
  type Task,
  type TaskStatus,
} from '../shared/types'
import { useAuth } from '../auth/AuthContext'

const STATUS_FLOW: TaskStatus[] = ['backlog', 'in_progress', 'in_review', 'done']

/**
 * One-viewport dashboard.
 *  - Row 1: welcome + 3 quick stats
 *  - Row 2: hero — highlights the most pressing piece of work, with CTAs
 *  - Row 3: the three workspace destinations (Notes / Tasks / Analytics)
 *
 * Pipeline + activity widgets have moved out: the changelog feed now lives
 * at /changelog as its own route. The dashboard stays scroll-free.
 */

function firstName(full: string): string {
  const trimmed = full.trim()
  if (!trimmed) return 'there'
  return trimmed.split(/\s+/)[0]
}

function pickFocusTask(tasks: Task[]): Task | null {
  if (tasks.length === 0) return null
  // Prefer in-progress, then in-review, then backlog. Within each bucket,
  // rank by priority desc, then due-date asc, then most recently updated.
  const open = tasks.filter((t) => t.status !== 'done')
  if (open.length === 0) return null
  const statusRank: Record<TaskStatus, number> = {
    in_progress: 0,
    in_review: 1,
    backlog: 2,
    done: 3,
  }
  return open.slice().sort((a, b) => {
    if (statusRank[a.status] !== statusRank[b.status]) {
      return statusRank[a.status] - statusRank[b.status]
    }
    if (PRIORITY_ORDER[a.priority] !== PRIORITY_ORDER[b.priority]) {
      return PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority]
    }
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
    if (a.dueDate) return -1
    if (b.dueDate) return 1
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })[0]
}

export default function Overview() {
  const tasks = useTasks()
  const docs = useDocs()
  const activity = useActivity()
  const { user } = useAuth()

  const displayName = useMemo(() => {
    const meta = (user?.user_metadata ?? {}) as { full_name?: string; name?: string }
    const candidate =
      (meta.full_name && meta.full_name.trim()) ||
      (meta.name && meta.name.trim()) ||
      (user?.email ? user.email.split('@')[0] : '')
    return firstName(candidate)
  }, [user])

  const stats = useMemo(() => {
    const byStatus = STATUS_FLOW.reduce<Record<TaskStatus, number>>(
      (acc, s) => ({ ...acc, [s]: 0 }),
      {} as Record<TaskStatus, number>,
    )
    for (const t of tasks) byStatus[t.status]++
    const total = tasks.length
    const done = byStatus.done
    const active = total - done
    const dueSoon = tasks.filter(
      (t) =>
        t.dueDate &&
        t.status !== 'done' &&
        new Date(t.dueDate).getTime() - Date.now() < 3 * 86_400_000,
    ).length
    return { byStatus, total, done, active, dueSoon }
  }, [tasks])

  const focus = useMemo(() => pickFocusTask(tasks), [tasks])
  const pinnedDoc = useMemo(() => docs.find((d) => d.pinned) ?? docs[0] ?? null, [docs])

  const todayLabel = format(new Date(), 'EEEE, d MMMM')

  return (
    <div
      className="h-full w-full overflow-hidden"
      style={{
        display: 'grid',
        gridTemplateRows: 'auto 1fr auto',
        gap: 18,
        padding: '20px 28px 24px',
        maxWidth: 1280,
        margin: '0 auto',
      }}
    >
      {/* Row 1 — welcome + stats */}
      <header
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
        className="dw-fade-up"
      >
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted font-medium">
            Good to see you
          </p>
          <h1 className="font-display text-[32px] leading-[1.05] text-ink mt-1">
            Welcome back, {displayName}.
          </h1>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, minWidth: 280 }}>
          <Stat label="Open" value={stats.active} />
          <Stat label="Shipped" value={stats.done} />
          <Stat label="Due soon" value={stats.dueSoon} accent={stats.dueSoon > 0} />
        </div>
      </header>

      {/* Row 2 — hero (fills remaining vertical space) */}
      <section
        className="relative rounded-2xl bg-surface-dark text-on-dark overflow-hidden dw-fade-up"
        style={{
          padding: 28,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
          gap: 24,
          minHeight: 0,
        }}
      >
        {/* Decorative coral wash */}
        <span
          aria-hidden
          className="absolute top-[-120px] right-[-120px] w-[360px] h-[360px] rounded-full pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at center, rgba(255,119,89,0.32), rgba(255,119,89,0) 65%)',
          }}
        />
        <span
          aria-hidden
          className="absolute bottom-[-200px] left-[-100px] w-[400px] h-[400px] rounded-full pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at center, rgba(93,184,166,0.18), rgba(93,184,166,0) 65%)',
          }}
        />

        {/* Left — focus statement */}
        <div className="relative z-10 flex flex-col justify-between min-h-0">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-on-dark-soft font-medium">
              {todayLabel} · your focus
            </p>
            <h2 className="font-display text-[40px] leading-[1.02] mt-3">
              {focus ? 'Pick up where you left off.' : 'A clean slate today.'}
            </h2>
            <p className="text-on-dark-soft mt-3 text-[15px] leading-relaxed max-w-[420px]">
              {focus ? (
                <>
                  Your top priority is{' '}
                  <strong className="text-on-dark font-medium">{focus.title}</strong>
                  {' — '}
                  {STATUS_LABEL[focus.status].toLowerCase()}
                  {focus.dueDate && (
                    <>, due {format(new Date(focus.dueDate), 'd MMM')}</>
                  )}
                  .
                </>
              ) : tasks.length === 0 ? (
                <>Spin up your first task to start building momentum.</>
              ) : (
                <>Every open task is shipped. Treat yourself.</>
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 mt-6">
            <Link
              to="/board"
              className="inline-flex items-center gap-1.5 h-10 px-5 rounded-pill bg-primary text-on-primary text-[13px] font-medium hover:bg-primary-active transition-colors"
            >
              {focus ? 'Open in Tasks' : 'Plan your day'}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-3.5 h-3.5"
              >
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              to="/changelog"
              className="inline-flex items-center gap-1.5 h-10 px-5 rounded-pill border border-on-dark/25 text-on-dark text-[13px] font-medium hover:bg-on-dark/10 transition-colors"
            >
              View changelog
            </Link>
          </div>
        </div>

        {/* Right — at-a-glance panel */}
        <div className="relative z-10 flex flex-col gap-3 min-h-0">
          <HeroPanel
            label="On deck"
            empty={tasks.filter((t) => t.status !== 'done').length === 0}
            emptyText="No open tasks."
          >
            <ul className="space-y-2">
              {tasks
                .filter((t) => t.status !== 'done')
                .slice(0, 3)
                .map((t) => (
                  <li key={t.id} className="flex items-center gap-2 text-[13px]">
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{
                        background:
                          t.priority === 'urgent'
                            ? '#ff7759'
                            : t.priority === 'high'
                              ? '#e8a55a'
                              : '#8e9ba8',
                      }}
                    />
                    <span className="text-on-dark truncate">{t.title}</span>
                    <span className="ml-auto text-[10px] text-on-dark-soft uppercase tracking-wider flex-shrink-0">
                      {STATUS_LABEL[t.status]}
                    </span>
                  </li>
                ))}
            </ul>
          </HeroPanel>

          <HeroPanel
            label="Recently in notes"
            empty={!pinnedDoc}
            emptyText="No notes yet."
          >
            {pinnedDoc && (
              <Link to="/docs" className="flex items-start gap-2.5 group">
                <span className="text-xl leading-none mt-0.5">{pinnedDoc.emoji}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[14px] font-medium text-on-dark truncate group-hover:underline">
                    {pinnedDoc.title || 'Untitled'}
                  </span>
                  {pinnedDoc.ownerName && (
                    <span className="block text-[11px] text-on-dark-soft truncate">
                      by {pinnedDoc.ownerName}
                    </span>
                  )}
                </span>
              </Link>
            )}
          </HeroPanel>

          <HeroPanel
            label="Activity"
            empty={activity.length === 0}
            emptyText="No activity logged."
          >
            <div className="flex items-baseline justify-between">
              <p className="font-display text-2xl text-on-dark leading-none">{activity.length}</p>
              <Link
                to="/changelog"
                className="text-[12px] text-on-dark-soft hover:text-on-dark underline-offset-2 hover:underline"
              >
                View →
              </Link>
            </div>
            <p className="text-[11px] text-on-dark-soft mt-1">
              {activity.length === 1 ? 'event recorded' : 'events recorded'}
            </p>
          </HeroPanel>
        </div>
      </section>

      {/* Row 3 — destinations */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 12,
        }}
      >
        <AppCard
          to="/docs"
          title="Notes"
          blurb="Long-form docs and references."
          primary={`${docs.length}`}
          primaryLabel="documents"
          secondary={`${docs.filter((d) => d.pinned).length} pinned`}
        />
        <AppCard
          to="/board"
          title="Tasks"
          blurb="Kanban with priorities and due dates."
          primary={`${stats.active}`}
          primaryLabel="active"
          secondary={`${stats.done} shipped · ${stats.dueSoon} due soon`}
        />
        <AppCard
          to="/analytics"
          title="Analytics"
          blurb="Velocity and completion insights."
          primary={`${stats.total === 0 ? 0 : Math.round((stats.done / stats.total) * 100)}%`}
          primaryLabel="completion"
          secondary={`${activity.length} recent events`}
        />
      </section>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div
      className={`rounded-lg ${
        accent ? 'bg-primary text-on-primary' : 'bg-canvas border border-hairline'
      }`}
      style={{ padding: '8px 12px' }}
    >
      <p
        className={`text-[10px] uppercase tracking-[0.14em] font-medium ${
          accent ? 'text-on-primary/85' : 'text-muted'
        }`}
      >
        {label}
      </p>
      <p
        className={`font-display mt-0.5 ${accent ? 'text-on-primary' : 'text-ink'}`}
        style={{ fontSize: 22, lineHeight: 1 }}
      >
        {value}
      </p>
    </div>
  )
}

function HeroPanel({
  label,
  empty,
  emptyText,
  children,
}: {
  label: string
  empty: boolean
  emptyText: string
  children: React.ReactNode
}) {
  return (
    <div
      className="rounded-lg p-3 border"
      style={{
        background: 'rgba(255,255,255,0.04)',
        borderColor: 'rgba(255,255,255,0.08)',
      }}
    >
      <p className="text-[10px] uppercase tracking-[0.16em] text-on-dark-soft font-medium mb-2">
        {label}
      </p>
      {empty ? (
        <p className="text-[12px] text-on-dark-soft italic">{emptyText}</p>
      ) : (
        children
      )}
    </div>
  )
}

function AppCard({
  to,
  title,
  blurb,
  primary,
  primaryLabel,
  secondary,
}: {
  to: string
  title: string
  blurb: string
  primary: string
  primaryLabel: string
  secondary: string
}) {
  return (
    <Link
      to={to}
      className="group relative rounded-xl bg-surface-card border border-hairline p-4 hover:border-primary/40 transition-colors block dw-fade-up"
    >
      <h3 className="font-display text-lg text-ink leading-tight">{title}</h3>
      <p className="text-[12px] text-body mt-1 leading-snug">{blurb}</p>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="font-display text-[26px] text-ink leading-none">{primary}</p>
          <p className="text-[11px] text-muted mt-1">{primaryLabel}</p>
        </div>
        <p className="text-[11px] text-muted text-right max-w-[160px] leading-tight">
          {secondary}
        </p>
      </div>
      <span className="absolute top-3 right-3 text-muted group-hover:text-primary transition-colors">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="w-4 h-4"
        >
          <path d="M7 17 17 7M9 7h8v8" />
        </svg>
      </span>
    </Link>
  )
}
