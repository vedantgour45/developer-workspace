/**
 * tasksRepo — Supabase-backed CRUD + Realtime for the tasks + activity tables.
 *
 * Maps between our app shape (camelCase) and the Postgres column shape
 * (snake_case). All write methods return the canonical row from the DB so
 * the caller can drop it into the store as-is.
 *
 * Subscriptions: `subscribeTasks` / `subscribeActivity` open a Realtime channel
 * and fire `onChange` whenever any row in the relevant table changes. Callers
 * pass a single callback that receives a fresh full snapshot, so we keep the
 * store reconciliation logic on the consumer side.
 */
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../shared/supabase'
import type {
  ActivityEntry,
  AssigneeRef,
  Comment,
  Profile,
  Subtask,
  Task,
  TaskPriority,
  TaskStatus,
} from '../shared/types'

export interface TaskRow {
  id: string
  key: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  tags: string[] | null
  assignee: string
  assignees: AssigneeRef[] | null
  story_points: number | null
  due_date: string | null
  subtasks: Subtask[] | null
  comments: Comment[] | null
  order: number
  owner_id: string | null
  owner_name: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

export interface ProfileRow {
  id: string
  name: string
  email: string | null
  avatar_url: string | null
}

export interface ActivityRow {
  id: string
  task_id: string
  task_title: string
  type: ActivityEntry['type']
  from_status: TaskStatus | null
  to_status: TaskStatus | null
  actor_id: string | null
  actor_name: string | null
  at: string
}

export const cloudEnabled = isSupabaseConfigured && !!supabase

// ----- Adapters -----

export function rowToTask(r: TaskRow): Task {
  const assignees = Array.isArray(r.assignees)
    ? r.assignees.filter(
        (a): a is AssigneeRef =>
          !!a && typeof a === 'object' && typeof a.id === 'string' && typeof a.name === 'string',
      )
    : []
  // Fallback: derive a single-element assignees list from the legacy
  // text column so older rows still render under the new model.
  const finalAssignees =
    assignees.length === 0 && r.assignee
      ? [{ id: r.owner_id ?? 'legacy', name: r.assignee }]
      : assignees
  return {
    id: r.id,
    key: r.key,
    title: r.title,
    description: r.description ?? '',
    status: r.status,
    priority: r.priority,
    tags: r.tags ?? [],
    assignee: r.assignee,
    assignees: finalAssignees,
    storyPoints: r.story_points,
    dueDate: r.due_date,
    subtasks: r.subtasks ?? [],
    comments: r.comments ?? [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    completedAt: r.completed_at,
    order: r.order,
    ownerName: r.owner_name,
  }
}

export function taskToInsert(t: Task, ownerId: string | null) {
  return {
    id: t.id,
    key: t.key,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    tags: t.tags,
    assignee: t.assignee,
    assignees: t.assignees,
    story_points: t.storyPoints,
    due_date: t.dueDate,
    subtasks: t.subtasks,
    comments: t.comments,
    order: t.order,
    owner_id: ownerId,
    owner_name: t.ownerName,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
    completed_at: t.completedAt,
  }
}

export function taskToPatch(patch: Partial<Task>) {
  const out: Record<string, unknown> = {}
  if (patch.key !== undefined) out.key = patch.key
  if (patch.title !== undefined) out.title = patch.title
  if (patch.description !== undefined) out.description = patch.description
  if (patch.status !== undefined) out.status = patch.status
  if (patch.priority !== undefined) out.priority = patch.priority
  if (patch.tags !== undefined) out.tags = patch.tags
  if (patch.assignee !== undefined) out.assignee = patch.assignee
  if (patch.assignees !== undefined) out.assignees = patch.assignees
  if (patch.storyPoints !== undefined) out.story_points = patch.storyPoints
  if (patch.dueDate !== undefined) out.due_date = patch.dueDate
  if (patch.subtasks !== undefined) out.subtasks = patch.subtasks
  if (patch.comments !== undefined) out.comments = patch.comments
  if (patch.order !== undefined) out.order = patch.order
  if (patch.completedAt !== undefined) out.completed_at = patch.completedAt
  if (patch.updatedAt !== undefined) out.updated_at = patch.updatedAt
  if (patch.ownerName !== undefined) out.owner_name = patch.ownerName
  return out
}

// ----- Profiles directory -----

export async function fetchProfiles(): Promise<Profile[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, avatar_url')
    .order('name', { ascending: true })
  if (error) {
    console.error('[tasksRepo] fetchProfiles failed:', error.message)
    return []
  }
  return (data as ProfileRow[]).map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email ?? '',
    avatarUrl: r.avatar_url ?? '',
  }))
}

/**
 * Safety net: idempotently upsert the current signed-in user into the
 * profiles directory. The host's AuthContext does this on every auth
 * state change, but if that ever silently fails (race with table
 * creation, transient network blip) the MFE store also calls this on
 * hydrate so the picker is never missing its own row.
 */
export async function ensureCurrentProfile(snapshot: {
  id: string
  name: string
  email: string
  avatarUrl: string
}): Promise<void> {
  if (!supabase || !snapshot.id || snapshot.id === 'demo') return
  const { error } = await supabase.from('profiles').upsert(
    {
      id: snapshot.id,
      name: snapshot.name,
      email: snapshot.email,
      avatar_url: snapshot.avatarUrl,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  )
  if (error) console.warn('[tasksRepo] ensureCurrentProfile failed:', error.message)
}

export function subscribeProfiles(onChange: () => void): () => void {
  if (!supabase) return () => {}
  const channel: RealtimeChannel = supabase
    .channel('dw:profiles')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'profiles' },
      () => onChange(),
    )
    .subscribe()
  return () => {
    supabase!.removeChannel(channel)
  }
}

export function rowToActivity(r: ActivityRow): ActivityEntry {
  return {
    id: r.id,
    taskId: r.task_id,
    taskTitle: r.task_title,
    type: r.type,
    fromStatus: r.from_status ?? undefined,
    toStatus: r.to_status ?? undefined,
    at: r.at,
  }
}

export function activityToInsert(
  entry: ActivityEntry,
  actor: { id: string | null; name: string | null },
) {
  return {
    id: entry.id,
    task_id: entry.taskId,
    task_title: entry.taskTitle,
    type: entry.type,
    from_status: entry.fromStatus ?? null,
    to_status: entry.toStatus ?? null,
    actor_id: actor.id,
    actor_name: actor.name,
    at: entry.at,
  }
}

// ----- Read -----

export async function fetchAllTasks(): Promise<Task[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('status', { ascending: true })
    .order('order', { ascending: true })
  if (error) {
    console.error('[tasksRepo] fetchAllTasks failed:', error.message)
    return []
  }
  return (data as TaskRow[]).map(rowToTask)
}

export async function fetchRecentActivity(limit = 150): Promise<ActivityEntry[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('activity')
    .select('*')
    .order('at', { ascending: false })
    .limit(limit)
  if (error) {
    console.error('[tasksRepo] fetchRecentActivity failed:', error.message)
    return []
  }
  return (data as ActivityRow[]).map(rowToActivity)
}

// ----- Write -----

export async function insertTask(task: Task, ownerId: string | null): Promise<Task | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('tasks')
    .insert(taskToInsert(task, ownerId))
    .select('*')
    .single()
  if (error) {
    console.error('[tasksRepo] insertTask failed:', error.message)
    return null
  }
  return rowToTask(data as TaskRow)
}

export async function patchTask(id: string, patch: Partial<Task>): Promise<Task | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('tasks')
    .update(taskToPatch(patch))
    .eq('id', id)
    .select('*')
    .single()
  if (error) {
    console.error('[tasksRepo] patchTask failed:', error.message)
    return null
  }
  return rowToTask(data as TaskRow)
}

export async function deleteTaskRow(id: string): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) {
    console.error('[tasksRepo] deleteTaskRow failed:', error.message)
    return false
  }
  return true
}

export async function bulkUpdateOrders(
  updates: { id: string; status: TaskStatus; order: number }[],
): Promise<void> {
  if (!supabase || updates.length === 0) return
  // Use parallel patches — Supabase doesn't expose a true bulk-update.
  await Promise.all(
    updates.map((u) =>
      supabase!
        .from('tasks')
        .update({ status: u.status, order: u.order, updated_at: new Date().toISOString() })
        .eq('id', u.id),
    ),
  )
}

export async function insertActivity(
  entry: ActivityEntry,
  actor: { id: string | null; name: string | null },
): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('activity').insert(activityToInsert(entry, actor))
  if (error) {
    console.error('[tasksRepo] insertActivity failed:', error.message)
  }
}

// ----- Realtime -----

export function subscribeTasks(onChange: () => void): () => void {
  if (!supabase) return () => {}
  const channel: RealtimeChannel = supabase
    .channel('dw:tasks')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tasks' },
      () => onChange(),
    )
    .subscribe()
  return () => {
    supabase!.removeChannel(channel)
  }
}

export function subscribeActivity(onChange: () => void): () => void {
  if (!supabase) return () => {}
  const channel: RealtimeChannel = supabase
    .channel('dw:activity')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'activity' },
      () => onChange(),
    )
    .subscribe()
  return () => {
    supabase!.removeChannel(channel)
  }
}
