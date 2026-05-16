import { create } from 'zustand'
import { STORAGE_KEYS, readJSON, writeJSON } from '../shared/storage'
import { emit } from '../shared/eventBus'
import { uid } from '../shared/format'
import { readCurrentUser } from '../shared/currentUser'
import { supabase } from '../shared/supabase'
import { toast } from '../shared/toast'
import {
  cloudEnabled,
  ensureCurrentProfile,
  fetchAllTasks,
  fetchRecentActivity,
  insertTask,
  patchTask,
  deleteTaskRow,
  bulkUpdateOrders,
  insertActivity,
  subscribeTasks,
  subscribeActivity,
} from './tasksRepo'
import type {
  ActivityEntry,
  Comment,
  Subtask,
  Task,
  TaskPriority,
  TaskStatus,
} from '../shared/types'

interface BoardState {
  tasks: Task[]
  activity: ActivityEntry[]
  ready: boolean
  cloud: boolean
  /**
   * Set of task ids that just transitioned into "done". TaskCard reads
   * this to render the celebratory confetti burst. Entries auto-expire
   * after ~900ms so the animation only plays once per move.
   */
  recentlyCompleted: Set<string>
  hydrate: () => Promise<void>
  nextKey: () => string
  createTask: (input: {
    title: string
    description?: string
    priority?: TaskPriority
    status?: TaskStatus
    tags?: string[]
    storyPoints?: number | null
    dueDate?: string | null
    /** When omitted, the creator is assigned by default. */
    assignees?: { id: string; name: string }[]
  }) => Promise<Task>
  updateTask: (id: string, patch: Partial<Omit<Task, 'subtasks' | 'comments'>>) => void
  deleteTask: (id: string) => void
  moveTask: (id: string, to: TaskStatus, newIndex: number) => void
  reorderWithin: (id: string, newIndex: number) => void
  addSubtask: (taskId: string, title: string) => void
  toggleSubtask: (taskId: string, subId: string) => void
  updateSubtask: (taskId: string, subId: string, title: string) => void
  deleteSubtask: (taskId: string, subId: string) => void
  addComment: (taskId: string, body: string) => void
  deleteComment: (taskId: string, commentId: string) => void
}

// --------- Local-mode helpers (demo / unauthenticated) ---------

function persistLocal(tasks: Task[]) {
  if (cloudEnabled) return
  writeJSON(STORAGE_KEYS.tasks, tasks)
}

function persistLocalActivity(activity: ActivityEntry[]) {
  if (cloudEnabled) return
  writeJSON(STORAGE_KEYS.activity, activity)
}

function normalizeTasks(raw: unknown): Task[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((t): t is Record<string, unknown> => !!t && typeof t === 'object')
    .map((t, i) => {
      const idStr = typeof t.id === 'string' ? t.id : `t_legacy_${i}`
      const title = typeof t.title === 'string' ? t.title : 'Untitled'
      const status: TaskStatus =
        t.status === 'backlog' || t.status === 'in_progress' || t.status === 'in_review' || t.status === 'done'
          ? (t.status as TaskStatus)
          : 'backlog'
      const priority: TaskPriority =
        t.priority === 'low' || t.priority === 'medium' || t.priority === 'high' || t.priority === 'urgent'
          ? (t.priority as TaskPriority)
          : 'medium'
      const tags = Array.isArray(t.tags) ? (t.tags as unknown[]).filter((x) => typeof x === 'string') as string[] : []
      const subtasks = Array.isArray(t.subtasks)
        ? ((t.subtasks as unknown[]).filter((s): s is Subtask =>
            !!s && typeof s === 'object' && typeof (s as Subtask).id === 'string',
          ))
        : []
      const comments = Array.isArray(t.comments)
        ? ((t.comments as unknown[]).filter((c): c is Comment =>
            !!c && typeof c === 'object' && typeof (c as Comment).id === 'string',
          ))
        : []
      const now = new Date().toISOString()
      const assigneeName = typeof t.assignee === 'string' ? t.assignee : 'You'
      const rawAssignees = Array.isArray(t.assignees) ? (t.assignees as unknown[]) : []
      const assignees = rawAssignees
        .filter(
          (a): a is { id: string; name: string } =>
            !!a &&
            typeof a === 'object' &&
            typeof (a as Record<string, unknown>).id === 'string' &&
            typeof (a as Record<string, unknown>).name === 'string',
        )
      return {
        id: idStr,
        key: typeof t.key === 'string' ? t.key : `DW-${i + 1}`,
        title,
        description: typeof t.description === 'string' ? t.description : '',
        status,
        priority,
        tags,
        assignee: assigneeName,
        assignees:
          assignees.length > 0
            ? assignees
            : [{ id: 'legacy', name: assigneeName }],
        storyPoints: typeof t.storyPoints === 'number' ? t.storyPoints : null,
        dueDate: typeof t.dueDate === 'string' ? t.dueDate : null,
        subtasks,
        comments,
        createdAt: typeof t.createdAt === 'string' ? t.createdAt : now,
        updatedAt: typeof t.updatedAt === 'string' ? t.updatedAt : now,
        completedAt: typeof t.completedAt === 'string' ? t.completedAt : null,
        order: typeof t.order === 'number' ? t.order : i,
        ownerName: typeof t.ownerName === 'string' ? t.ownerName : null,
      }
    })
}

function loadLocalTasks(): Task[] {
  const raw = readJSON<unknown>(STORAGE_KEYS.tasks, [])
  const normalized = normalizeTasks(raw)
  if (Array.isArray(raw) && normalized.length === raw.length) {
    const ok = (raw as unknown[]).every((t) => {
      const o = t as Record<string, unknown>
      return (
        o &&
        typeof o.key === 'string' &&
        Array.isArray(o.tags) &&
        Array.isArray(o.subtasks) &&
        Array.isArray(o.comments)
      )
    })
    if (!ok) writeJSON(STORAGE_KEYS.tasks, normalized)
  } else {
    writeJSON(STORAGE_KEYS.tasks, normalized)
  }
  return normalized
}

// --------- Helpers ---------

async function currentActor(): Promise<{ id: string | null; name: string }> {
  if (!supabase) return { id: null, name: readCurrentUser().name }
  const { data } = await supabase.auth.getUser()
  return { id: data.user?.id ?? null, name: readCurrentUser().name }
}

function logActivityLocal(entry: ActivityEntry, activity: ActivityEntry[]): ActivityEntry[] {
  const next = [entry, ...activity].slice(0, 150)
  if (!cloudEnabled) writeJSON(STORAGE_KEYS.activity, next)
  emit({ type: 'activity:logged', entry })
  return next
}

// --------- Store ---------

/** Mark a task as recently-completed; auto-clears after the confetti runs. */
function markCompleted(id: string, set: (fn: (s: BoardState) => Partial<BoardState>) => void) {
  set((s) => {
    const next = new Set(s.recentlyCompleted)
    next.add(id)
    return { recentlyCompleted: next }
  })
  setTimeout(() => {
    set((s) => {
      const next = new Set(s.recentlyCompleted)
      next.delete(id)
      return { recentlyCompleted: next }
    })
  }, 900)
}

export const useBoardStore = create<BoardState>((set, get) => ({
  tasks: cloudEnabled ? [] : loadLocalTasks(),
  activity: cloudEnabled ? [] : readJSON(STORAGE_KEYS.activity, [] as ActivityEntry[]),
  ready: !cloudEnabled,
  cloud: cloudEnabled,
  recentlyCompleted: new Set<string>(),

  hydrate: async () => {
    if (!cloudEnabled) {
      set({
        tasks: loadLocalTasks(),
        activity: readJSON(STORAGE_KEYS.activity, [] as ActivityEntry[]).filter(
          (e): e is ActivityEntry => !!e && typeof e === 'object',
        ),
        ready: true,
      })
      return
    }
    // Safety net: make sure the signed-in user's profile row exists so the
    // assignee picker always lists them. Host's AuthContext also does this;
    // this re-ups in case that ran before the table existed.
    const me = readCurrentUser()
    void ensureCurrentProfile(me)
    const [tasks, activity] = await Promise.all([fetchAllTasks(), fetchRecentActivity()])
    set({ tasks, activity, ready: true })
  },

  nextKey: () => {
    const tasks = get().tasks
    const max = tasks.reduce((m, t) => {
      const n = Number(t.key?.split('-')[1] ?? 0)
      return Number.isFinite(n) ? Math.max(m, n) : m
    }, 0)
    return `DW-${max + 1}`
  },

  createTask: async (input) => {
    const now = new Date().toISOString()
    const status = input.status ?? 'backlog'
    const existing = get().tasks.filter((t) => t.status === status)
    const me = readCurrentUser()
    // Default to assigning the creator if no explicit picks.
    const assignees =
      input.assignees && input.assignees.length > 0
        ? input.assignees
        : [{ id: me.id, name: me.name }]
    const task: Task = {
      id: uid('t'),
      key: get().nextKey(),
      title: input.title.trim(),
      description: input.description?.trim() ?? '',
      status,
      priority: input.priority ?? 'medium',
      tags: input.tags ?? [],
      assignee: assignees[0]?.name ?? me.name,
      assignees,
      storyPoints: input.storyPoints ?? null,
      dueDate: input.dueDate ?? null,
      subtasks: [],
      comments: [],
      createdAt: now,
      updatedAt: now,
      completedAt: status === 'done' ? now : null,
      order: existing.length,
      ownerName: me.name,
    }
    // Optimistic local insert
    const tasks = [...get().tasks, task]
    const activityEntry: ActivityEntry = {
      id: uid('a'),
      taskId: task.id,
      taskTitle: task.title,
      type: 'created',
      toStatus: task.status,
      at: now,
    }
    const activity = logActivityLocal(activityEntry, get().activity)
    persistLocal(tasks)
    set({ tasks, activity })
    emit({ type: 'task:created', task })
    toast.success('Task created', { description: task.title })
    // If the task was created directly in "done", celebrate.
    if (status === 'done') markCompleted(task.id, set)

    if (cloudEnabled) {
      const actor = await currentActor()
      const inserted = await insertTask(task, actor.id)
      if (inserted) {
        // Reconcile in case the DB returned different timestamps
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === inserted.id ? inserted : t)),
        }))
      }
      await insertActivity(activityEntry, { id: actor.id, name: actor.name })
    }
    return task
  },

  updateTask: (id, patch) => {
    const now = new Date().toISOString()
    const current = get().tasks.find((t) => t.id === id)
    if (!current) return
    const wasCompleted = current.status === 'done'
    const isCompleted = (patch.status ?? current.status) === 'done'
    const updated: Task = {
      ...current,
      ...patch,
      updatedAt: now,
      completedAt: isCompleted ? (wasCompleted ? current.completedAt : now) : null,
    }
    const tasks = get().tasks.map((t) => (t.id === id ? updated : t))
    const activityEntry: ActivityEntry = {
      id: uid('a'),
      taskId: id,
      taskTitle: updated.title,
      type: 'edited',
      at: now,
    }
    const activity = logActivityLocal(activityEntry, get().activity)
    persistLocal(tasks)
    set({ tasks, activity })
    emit({ type: 'task:updated', task: updated })
    // Fire-and-forget toasts. We avoid spamming on every keystroke
    // edit because callers debounce: title/description blurs and
    // explicit field changes are coarse enough.
    if (!wasCompleted && isCompleted) {
      toast.success('Task completed', { description: updated.title })
      markCompleted(id, set)
    } else {
      toast.success('Task updated', { description: updated.title })
    }

    if (cloudEnabled) {
      void patchTask(id, {
        ...patch,
        updatedAt: now,
        completedAt: updated.completedAt,
      })
      void currentActor().then((actor) =>
        insertActivity(activityEntry, { id: actor.id, name: actor.name }),
      )
    }
  },

  deleteTask: (id) => {
    const target = get().tasks.find((t) => t.id === id)
    if (!target) return
    const tasks = get().tasks.filter((t) => t.id !== id)
    const now = new Date().toISOString()
    const activityEntry: ActivityEntry = {
      id: uid('a'),
      taskId: id,
      taskTitle: target.title,
      type: 'deleted',
      at: now,
    }
    const activity = logActivityLocal(activityEntry, get().activity)
    persistLocal(tasks)
    set({ tasks, activity })
    emit({ type: 'task:deleted', taskId: id })
    toast.success('Task deleted', { description: target.title })

    if (cloudEnabled) {
      void deleteTaskRow(id)
      void currentActor().then((actor) =>
        insertActivity(activityEntry, { id: actor.id, name: actor.name }),
      )
    }
  },

  moveTask: (id, to, newIndex) => {
    const now = new Date().toISOString()
    const tasks = get().tasks.slice()
    const idx = tasks.findIndex((t) => t.id === id)
    if (idx === -1) return
    const task = tasks[idx]
    const from = task.status
    if (from === to) {
      get().reorderWithin(id, newIndex)
      return
    }
    const moved: Task = {
      ...task,
      status: to,
      order: newIndex,
      updatedAt: now,
      completedAt: to === 'done' ? now : null,
    }
    tasks[idx] = moved

    const source = tasks
      .filter((t) => t.status === from && t.id !== id)
      .sort((a, b) => a.order - b.order)
      .map((t, i) => ({ ...t, order: i }))

    const targetCol = tasks
      .filter((t) => t.status === to)
      .sort((a, b) => a.order - b.order)
    const targetWithout = targetCol.filter((t) => t.id !== id)
    targetWithout.splice(Math.min(newIndex, targetWithout.length), 0, moved)
    const reorderedTarget = targetWithout.map((t, i) => ({ ...t, order: i }))

    const next = tasks.map((t) => {
      const s = source.find((x) => x.id === t.id)
      if (s) return s
      const r = reorderedTarget.find((x) => x.id === t.id)
      if (r) return r
      return t
    })

    persistLocal(next)
    const isCompletion = to === 'done'
    const activityEntry: ActivityEntry = {
      id: uid('a'),
      taskId: id,
      taskTitle: moved.title,
      type: isCompletion ? 'completed' : 'moved',
      fromStatus: from,
      toStatus: to,
      at: now,
    }
    const activity = logActivityLocal(activityEntry, get().activity)
    set({ tasks: next, activity })
    emit({ type: 'task:moved', task: moved, from, to })

    // Celebrate completions; quietly note routine moves.
    if (isCompletion) {
      toast.success('Task completed', { description: moved.title })
      markCompleted(id, set)
    }

    if (cloudEnabled) {
      // Persist the moved task's new fields + the order shifts in both columns
      const orderUpdates = [
        ...source.map((t) => ({ id: t.id, status: t.status, order: t.order })),
        ...reorderedTarget.map((t) => ({ id: t.id, status: t.status, order: t.order })),
      ]
      void patchTask(id, {
        status: to,
        order: newIndex,
        completedAt: moved.completedAt,
        updatedAt: now,
      })
      void bulkUpdateOrders(orderUpdates.filter((u) => u.id !== id))
      void currentActor().then((actor) =>
        insertActivity(activityEntry, { id: actor.id, name: actor.name }),
      )
    }
  },

  reorderWithin: (id, newIndex) => {
    const tasks = get().tasks.slice()
    const target = tasks.find((t) => t.id === id)
    if (!target) return
    const col = tasks
      .filter((t) => t.status === target.status)
      .sort((a, b) => a.order - b.order)
    const without = col.filter((t) => t.id !== id)
    without.splice(Math.min(newIndex, without.length), 0, target)
    const reordered = without.map((t, i) => ({ ...t, order: i }))
    const next = tasks.map((t) => reordered.find((r) => r.id === t.id) ?? t)
    persistLocal(next)
    set({ tasks: next })
    emit({ type: 'task:updated', task: { ...target, order: reordered.findIndex((r) => r.id === id) } })

    if (cloudEnabled) {
      void bulkUpdateOrders(
        reordered.map((t) => ({ id: t.id, status: t.status, order: t.order })),
      )
    }
  },

  addSubtask: (taskId, title) => {
    const trimmed = title.trim()
    if (!trimmed) return
    const sub: Subtask = { id: uid('s'), title: trimmed, done: false }
    const now = new Date().toISOString()
    const tasks = get().tasks.map((t) =>
      t.id === taskId ? { ...t, subtasks: [...t.subtasks, sub], updatedAt: now } : t,
    )
    persistLocal(tasks)
    set({ tasks })
    const t = tasks.find((x) => x.id === taskId)
    if (t) {
      emit({ type: 'task:updated', task: t })
      if (cloudEnabled) {
        void patchTask(taskId, { subtasks: t.subtasks, updatedAt: now })
      }
    }
  },

  toggleSubtask: (taskId, subId) => {
    const now = new Date().toISOString()
    const tasks = get().tasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            subtasks: t.subtasks.map((s) => (s.id === subId ? { ...s, done: !s.done } : s)),
            updatedAt: now,
          }
        : t,
    )
    persistLocal(tasks)
    set({ tasks })
    const t = tasks.find((x) => x.id === taskId)
    if (t) {
      emit({ type: 'task:updated', task: t })
      if (cloudEnabled) {
        void patchTask(taskId, { subtasks: t.subtasks, updatedAt: now })
      }
    }
  },

  updateSubtask: (taskId, subId, title) => {
    const now = new Date().toISOString()
    const tasks = get().tasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            subtasks: t.subtasks.map((s) => (s.id === subId ? { ...s, title } : s)),
            updatedAt: now,
          }
        : t,
    )
    persistLocal(tasks)
    set({ tasks })
    const t = tasks.find((x) => x.id === taskId)
    if (t && cloudEnabled) {
      void patchTask(taskId, { subtasks: t.subtasks, updatedAt: now })
    }
  },

  deleteSubtask: (taskId, subId) => {
    const now = new Date().toISOString()
    const tasks = get().tasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            subtasks: t.subtasks.filter((s) => s.id !== subId),
            updatedAt: now,
          }
        : t,
    )
    persistLocal(tasks)
    set({ tasks })
    const t = tasks.find((x) => x.id === taskId)
    if (t && cloudEnabled) {
      void patchTask(taskId, { subtasks: t.subtasks, updatedAt: now })
    }
  },

  addComment: (taskId, body) => {
    const trimmed = body.trim()
    if (!trimmed) return
    const now = new Date().toISOString()
    const comment: Comment = { id: uid('c'), author: readCurrentUser().name, body: trimmed, at: now }
    const tasks = get().tasks.map((t) =>
      t.id === taskId ? { ...t, comments: [...t.comments, comment], updatedAt: now } : t,
    )
    persistLocal(tasks)
    const target = tasks.find((t) => t.id === taskId)
    let activity = get().activity
    let activityEntry: ActivityEntry | null = null
    if (target) {
      activityEntry = {
        id: uid('a'),
        taskId,
        taskTitle: target.title,
        type: 'commented',
        at: now,
      }
      activity = logActivityLocal(activityEntry, activity)
    }
    set({ tasks, activity })
    if (target) {
      emit({ type: 'task:updated', task: target })
      toast.success('Comment posted')
    }

    if (target && cloudEnabled) {
      void patchTask(taskId, { comments: target.comments, updatedAt: now })
      if (activityEntry) {
        void currentActor().then((actor) =>
          insertActivity(activityEntry!, { id: actor.id, name: actor.name }),
        )
      }
    }
  },

  deleteComment: (taskId, commentId) => {
    const now = new Date().toISOString()
    const tasks = get().tasks.map((t) =>
      t.id === taskId
        ? { ...t, comments: t.comments.filter((c) => c.id !== commentId), updatedAt: now }
        : t,
    )
    persistLocal(tasks)
    set({ tasks })
    const t = tasks.find((x) => x.id === taskId)
    if (t && cloudEnabled) {
      void patchTask(taskId, { comments: t.comments, updatedAt: now })
    }
  },
}))

// --------- Cloud bootstrap ---------
// If Supabase is configured, hydrate from the network on app start and
// subscribe to Realtime so remote changes from other users / tabs land in
// the store. The store transitions out of `ready: false` once data loads.

if (cloudEnabled) {
  // Eagerly load on module init — the App also calls hydrate(), so
  // dual-calls are idempotent.
  void useBoardStore.getState().hydrate()

  // Refetch on auth changes so the user sees a fresh dataset post sign-in.
  supabase?.auth.onAuthStateChange((_event) => {
    void useBoardStore.getState().hydrate()
  })

  subscribeTasks(async () => {
    const tasks = await fetchAllTasks()
    useBoardStore.setState({ tasks })
    emit({ type: 'task:updated', task: tasks[0] ?? ({} as Task) })
  })
  subscribeActivity(async () => {
    const activity = await fetchRecentActivity()
    useBoardStore.setState({ activity })
  })
}

// Suppress unused-import warning when persistLocalActivity is referenced
// in a future branch — currently only used through logActivityLocal.
void persistLocalActivity
