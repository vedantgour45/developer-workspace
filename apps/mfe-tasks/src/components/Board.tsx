import { useMemo, useState, useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import Column from './Column'
import TaskCard from './TaskCard'
import FilterBar, { type BoardFilters } from './FilterBar'
import TaskDetail from './TaskDetail'
import NewTaskModal from './NewTaskModal'
import ActivityModal from './ActivityModal'
import { useBoardStore } from '../store/boardStore'
import { STATUS_FLOW, STATUS_LABEL, type Task, type TaskStatus } from '../shared/types'
import { startOfDay } from '../shared/dates'

export default function Board() {
  const tasks = useBoardStore((s) => s.tasks)
  const activity = useBoardStore((s) => s.activity)
  const move = useBoardStore((s) => s.moveTask)
  const [activityOpen, setActivityOpen] = useState(false)

  const [filters, setFilters] = useState<BoardFilters>({
    query: '',
    priorities: new Set(),
    tag: null,
    assignee: null,
    due: 'all',
  })
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Task | null>(null)
  const [newFor, setNewFor] = useState<TaskStatus | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const allTags = useMemo(() => Array.from(new Set(tasks.flatMap((t) => t.tags))).sort(), [tasks])
  const allAssignees = useMemo(
    () =>
      Array.from(
        new Set(tasks.flatMap((t) => t.assignees.map((a) => a.name))),
      ).sort(),
    [tasks],
  )

  const visible = useMemo(() => {
    const q = filters.query.trim().toLowerCase()
    const today = startOfDay(new Date()).getTime()
    const weekEnd = today + 7 * 86_400_000
    return tasks.filter((t) => {
      if (filters.priorities.size > 0 && !filters.priorities.has(t.priority)) return false
      if (filters.tag && !t.tags.includes(filters.tag)) return false
      if (filters.assignee && !t.assignees.some((a) => a.name === filters.assignee)) return false
      if (filters.due !== 'all') {
        if (filters.due === 'noDate' && t.dueDate) return false
        if (filters.due !== 'noDate' && !t.dueDate) return false
        if (t.dueDate) {
          const due = startOfDay(new Date(t.dueDate)).getTime()
          if (filters.due === 'overdue' && (due >= today || t.status === 'done')) return false
          if (filters.due === 'today' && due !== today) return false
          if (filters.due === 'thisWeek' && (due < today || due > weekEnd)) return false
        }
      }
      if (!q) return true
      return (
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.includes(q)) ||
        t.key.toLowerCase().includes(q)
      )
    })
  }, [tasks, filters])

  const columns = useMemo(() => {
    const byStatus: Record<TaskStatus, Task[]> = {
      backlog: [],
      in_progress: [],
      in_review: [],
      done: [],
    }
    for (const t of visible) byStatus[t.status].push(t)
    for (const s of STATUS_FLOW) byStatus[s].sort((a, b) => a.order - b.order)
    return byStatus
  }, [visible])

  const activeTask = useMemo(() => tasks.find((t) => t.id === activeId) ?? null, [activeId, tasks])

  useEffect(() => {
    if (!selected) return
    const fresh = tasks.find((t) => t.id === selected.id)
    if (!fresh) setSelected(null)
    else if (fresh !== selected) setSelected(fresh)
  }, [tasks, selected])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        setNewFor('backlog')
      } else if (e.key === '/') {
        e.preventDefault()
        const el = document.querySelector<HTMLInputElement>('input[placeholder^="Search tasks"]')
        el?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id))

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = e
    if (!over) return
    const activeTaskObj = tasks.find((t) => t.id === active.id)
    if (!activeTaskObj) return

    const overId = String(over.id)
    let toStatus: TaskStatus | null = null
    let newIndex = 0

    if (overId.startsWith('col:')) {
      toStatus = overId.slice(4) as TaskStatus
      newIndex = columns[toStatus].length
    } else {
      const overTask = tasks.find((t) => t.id === overId)
      if (!overTask) return
      toStatus = overTask.status
      const col = columns[toStatus]
      newIndex = col.findIndex((t) => t.id === overId)
      if (newIndex < 0) newIndex = col.length
    }

    move(activeTaskObj.id, toStatus, newIndex)
  }

  const stats = useMemo(() => {
    const total = tasks.length
    const done = tasks.filter((t) => t.status === 'done').length
    const points = tasks.reduce((acc, t) => acc + (t.storyPoints ?? 0), 0)
    return { total, done, points }
  }, [tasks])

  return (
    <div className="flex flex-col flex-1 min-h-0 px-7 pt-6 pb-3 dw-fade-up">
      <header className="flex items-end justify-between flex-wrap gap-3 mb-3 flex-shrink-0">
        <div>
          <h1 className="font-display text-[34px] leading-[1.05] text-ink">Tasks</h1>
          <p className="text-body mt-1 text-sm">
            <span className="text-ink font-medium">{stats.total}</span> tasks
            <span className="text-muted mx-1">·</span>
            <span className="text-ink font-medium">{stats.done}</span> shipped
            <span className="text-muted mx-1">·</span>
            <span className="text-ink font-medium">{stats.points}</span> total points
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActivityOpen(true)}
            className="h-9 px-4 rounded-pill bg-canvas border border-hairline text-ink hover:border-ink text-sm font-medium transition-colors inline-flex items-center gap-2"
            title="View activity"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
            Activity
            {activity.length > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-surface-card text-[11px] font-medium text-ink">
                {activity.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setNewFor('backlog')}
            className="h-9 px-4 rounded-pill bg-primary text-on-primary text-sm font-medium hover:bg-primary-active transition-colors inline-flex items-center gap-2"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New task
          </button>
        </div>
      </header>

      <div className="mb-4 flex-shrink-0">
        <FilterBar
          filters={filters}
          onChange={setFilters}
          allTags={allTags}
          allAssignees={allAssignees}
          total={tasks.length}
          visible={visible.length}
        />
      </div>

      <div className="flex-1 min-h-0">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 min-w-0 h-full overflow-y-auto pb-3">
            {STATUS_FLOW.map((s) => (
              <Column
                key={s}
                status={s}
                label={STATUS_LABEL[s]}
                tasks={columns[s]}
                onOpen={setSelected}
                onAdd={(st) => setNewFor(st)}
              />
            ))}
          </div>
          <DragOverlay>
            {activeTask ? <TaskCard task={activeTask} onOpen={() => {}} overlay /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {activityOpen && <ActivityModal onClose={() => setActivityOpen(false)} />}

      {selected && <TaskDetail task={selected} onClose={() => setSelected(null)} />}
      {newFor && <NewTaskModal initialStatus={newFor} onClose={() => setNewFor(null)} />}
    </div>
  )
}
