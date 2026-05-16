import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Task } from '../shared/types'
import { cls } from '../shared/format'
import { formatDue } from '../shared/dates'
import { useBoardStore } from '../store/boardStore'
import Confetti from './Confetti'

interface Props {
  task: Task
  onOpen: (task: Task) => void
  overlay?: boolean
}

const priorityIcon: Record<Task['priority'], { color: string; arrows: number }> = {
  urgent: { color: '#c64545', arrows: 3 },
  high: { color: '#cc785c', arrows: 2 },
  medium: { color: '#d4a017', arrows: 1 },
  low: { color: '#8e8b82', arrows: -1 },
}

function PriorityIcon({ priority }: { priority: Task['priority'] }) {
  const { color, arrows } = priorityIcon[priority]
  // arrows > 0 = up arrows (high), -1 = down arrow (low)
  if (arrows < 0) {
    return (
      <svg viewBox="0 0 12 12" className="w-3 h-3" aria-label={priority}>
        <path d="M6 9 2 5h8L6 9Z" fill={color} />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 12 12" className="w-3 h-3" aria-label={priority}>
      {Array.from({ length: arrows }).map((_, i) => (
        <path key={i} d={`M6 ${2 + i * 3.2} 2 ${6 + i * 3.2}h8L6 ${2 + i * 3.2}Z`} fill={color} />
      ))}
    </svg>
  )
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <span
      className="w-5 h-5 rounded-full bg-surface-dark text-on-dark text-[10px] font-medium flex items-center justify-center flex-shrink-0"
      title={name}
    >
      {initials}
    </span>
  )
}

export default function TaskCard({ task, onOpen, overlay = false }: Props) {
  const sortable = useSortable({ id: task.id, data: { task } })
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = sortable

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: overlay ? undefined : transition,
  }
  const subDone = task.subtasks.filter((s) => s.done).length
  const subTotal = task.subtasks.length
  // Confetti only fires for cards whose id sits in the store's
  // recently-completed set. The set self-clears after ~900ms, which
  // is also the lifetime of the confetti animation.
  const justCompleted = useBoardStore((s) => s.recentlyCompleted.has(task.id))
  const due = formatDue(task.dueDate)
  const dueColor =
    due.tone === 'past'
      ? 'text-error bg-error/10'
      : due.tone === 'soon'
        ? 'text-[#8a5a14] bg-accent-amber/20'
        : 'text-muted bg-surface-card'

  return (
    <article
      ref={setNodeRef}
      style={{ ...style, position: 'relative' }}
      {...attributes}
      {...listeners}
      onClick={() => !isDragging && onOpen(task)}
      className={cls(
        'group rounded-lg bg-canvas border border-hairline p-3 cursor-grab active:cursor-grabbing',
        'hover:border-primary/40 hover:shadow-[0_2px_6px_rgba(20,20,19,0.04)] transition-all',
        isDragging && !overlay && 'opacity-30',
        overlay && 'shadow-[0_12px_32px_rgba(20,20,19,0.18)] border-primary/40 rotate-[1.5deg]',
      )}
    >
      {justCompleted && <Confetti />}
      <h3 className="text-[13.5px] font-medium text-ink leading-snug">{task.title}</h3>

      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {task.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className="text-[10px] font-medium text-muted bg-surface-card px-1.5 py-0.5 rounded"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {subTotal > 0 && (
        <div className="mt-2.5 flex items-center gap-2 text-[11px] text-muted">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          <span>{subDone} / {subTotal}</span>
          <div className="flex-1 h-1 rounded-full bg-hairline overflow-hidden">
            <div
              className="h-full bg-primary"
              style={{ width: subTotal === 0 ? 0 : `${(subDone / subTotal) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-3 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-mono text-[10px] text-muted">{task.key}</span>
          <PriorityIcon priority={task.priority} />
          {task.dueDate && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${dueColor}`}>
              {due.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {task.storyPoints !== null && (
            <span className="w-5 h-5 rounded-full bg-surface-card text-ink text-[10px] font-medium flex items-center justify-center" title={`${task.storyPoints} story points`}>
              {task.storyPoints}
            </span>
          )}
          {task.comments.length > 0 && (
            <span className="flex items-center gap-0.5 text-muted text-[10px]" title={`${task.comments.length} comments`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="w-3 h-3">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
              </svg>
              {task.comments.length}
            </span>
          )}
          <AssigneeStack assignees={task.assignees} />
        </div>
      </div>
    </article>
  )
}

function AssigneeStack({ assignees }: { assignees: { id: string; name: string }[] }) {
  if (assignees.length === 0) return null
  const shown = assignees.slice(0, 3)
  const extra = assignees.length - shown.length
  return (
    <span className="flex items-center -space-x-1.5">
      {shown.map((a) => (
        <span
          key={a.id}
          className="ring-1 ring-canvas rounded-full"
          title={a.name}
        >
          <Avatar name={a.name} />
        </span>
      ))}
      {extra > 0 && (
        <span
          className="ring-1 ring-canvas rounded-full bg-surface-card text-ink text-[10px] font-medium flex items-center justify-center"
          style={{ width: 22, height: 22 }}
          title={`${extra} more`}
        >
          +{extra}
        </span>
      )}
    </span>
  )
}
