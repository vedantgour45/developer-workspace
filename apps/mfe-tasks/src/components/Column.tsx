import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Task, TaskStatus } from '../shared/types'
import TaskCard from './TaskCard'
import { cls } from '../shared/format'

interface Props {
  status: TaskStatus
  label: string
  tasks: Task[]
  onOpen: (task: Task) => void
  onAdd: (status: TaskStatus) => void
}

export default function Column({ status, label, tasks, onOpen, onAdd }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}`, data: { status } })
  const ids = tasks.map((t) => t.id)

  return (
    <section
      className={cls(
        'flex flex-col rounded-xl bg-surface-card/60 border border-hairline-soft transition-colors',
        isOver && 'border-primary/40 bg-primary/5',
      )}
    >
      <header className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <span className={cls('w-1.5 h-1.5 rounded-full', dotForStatus(status))} />
          <h2 className="text-[13px] font-medium text-ink tracking-wide uppercase">
            {label}
          </h2>
          <span className="text-xs text-muted font-mono">{tasks.length}</span>
        </div>
        <button
          onClick={() => onAdd(status)}
          className="w-7 h-7 rounded-md text-muted hover:text-ink hover:bg-canvas transition-colors flex items-center justify-center"
          aria-label={`Add task to ${label}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="w-3.5 h-3.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </header>
      <div
        ref={setNodeRef}
        className="flex-1 min-h-[120px] px-3 pb-3 space-y-2"
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            <button
              onClick={() => onAdd(status)}
              className="w-full text-left text-xs text-muted/80 italic px-3 py-6 rounded-lg border border-dashed border-hairline hover:border-primary/40 hover:text-muted transition-colors"
            >
              Drop tasks here, or click + to add.
            </button>
          ) : (
            tasks.map((t) => <TaskCard key={t.id} task={t} onOpen={onOpen} />)
          )}
        </SortableContext>
      </div>
    </section>
  )
}

function dotForStatus(status: TaskStatus): string {
  switch (status) {
    case 'backlog':
      return 'bg-muted'
    case 'in_progress':
      return 'bg-accent-teal'
    case 'in_review':
      return 'bg-accent-amber'
    case 'done':
      return 'bg-success'
  }
}
