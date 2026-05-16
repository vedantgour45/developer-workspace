/**
 * Host-side read-only repo. The host needs to render dashboard stats
 * from the same Supabase tables as the MFEs. This module exposes simple
 * fetchers + a single channel subscription factory.
 *
 * It mirrors the column-mapping logic from mfe-tasks/src/store/tasksRepo
 * and mfe-notes/src/store/docsRepo. Code duplication is acceptable — each
 * app is a separate federation bundle.
 */
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../auth/supabase'
import type {
  ActivityEntry,
  AssigneeRef,
  Comment,
  Doc,
  DocCover,
  Subtask,
  Task,
  TaskPriority,
  TaskStatus,
} from './types'

export const cloudEnabled = isSupabaseConfigured && !!supabase

interface TaskRow {
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

interface DocRow {
  id: string
  title: string
  content: string
  emoji: string
  cover: DocCover | null
  tags: string[] | null
  pinned: boolean
  owner_id: string | null
  owner_name: string | null
  created_at: string
  updated_at: string
}

interface ActivityRow {
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

function rowToTask(r: TaskRow): Task {
  const arr = Array.isArray(r.assignees)
    ? r.assignees.filter(
        (a): a is AssigneeRef =>
          !!a && typeof a === 'object' && typeof a.id === 'string' && typeof a.name === 'string',
      )
    : []
  const finalAssignees =
    arr.length === 0 && r.assignee
      ? [{ id: r.owner_id ?? 'legacy', name: r.assignee }]
      : arr
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

function rowToDoc(r: DocRow): Doc {
  return {
    id: r.id,
    title: r.title,
    content: r.content ?? '',
    emoji: r.emoji,
    cover: r.cover ?? { kind: 'none' },
    tags: r.tags ?? [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    pinned: r.pinned,
    ownerName: r.owner_name,
  }
}

function rowToActivity(r: ActivityRow): ActivityEntry {
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

export async function fetchAllTasks(): Promise<Task[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('status', { ascending: true })
    .order('order', { ascending: true })
  if (error) {
    console.error('[host cloudRepo] tasks fetch failed:', error.message)
    return []
  }
  return (data as TaskRow[]).map(rowToTask)
}

export async function fetchAllDocs(): Promise<Doc[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('docs')
    .select('*')
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false })
  if (error) {
    console.error('[host cloudRepo] docs fetch failed:', error.message)
    return []
  }
  return (data as DocRow[]).map(rowToDoc)
}

export async function fetchRecentActivity(limit = 150): Promise<ActivityEntry[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('activity')
    .select('*')
    .order('at', { ascending: false })
    .limit(limit)
  if (error) {
    console.error('[host cloudRepo] activity fetch failed:', error.message)
    return []
  }
  return (data as ActivityRow[]).map(rowToActivity)
}

export function subscribeTable(
  table: 'tasks' | 'docs' | 'activity',
  onChange: () => void,
): () => void {
  if (!supabase) return () => {}
  const channel: RealtimeChannel = supabase
    .channel(`dw-host:${table}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, () => onChange())
    .subscribe()
  return () => {
    supabase!.removeChannel(channel)
  }
}
