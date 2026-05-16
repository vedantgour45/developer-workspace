export type TaskStatus = 'backlog' | 'in_progress' | 'in_review' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Subtask {
  id: string
  title: string
  done: boolean
}

export interface Comment {
  id: string
  author: string
  body: string
  at: string
}

export interface AssigneeRef {
  id: string
  name: string
}

export interface Task {
  id: string
  key: string // e.g. DW-12 (Jira-style)
  title: string
  description: string // markdown supported
  status: TaskStatus
  priority: TaskPriority
  tags: string[]
  /** Legacy single-assignee text. */
  assignee: string
  /** Canonical multi-assignee list. */
  assignees: AssigneeRef[]
  storyPoints: number | null
  dueDate: string | null // ISO date (yyyy-MM-dd)
  subtasks: Subtask[]
  comments: Comment[]
  createdAt: string
  updatedAt: string
  completedAt: string | null
  order: number
  ownerName: string | null
}

export interface Profile {
  id: string
  name: string
  email: string
  avatarUrl: string
}

export interface ActivityEntry {
  id: string
  taskId: string
  taskTitle: string
  type: 'created' | 'moved' | 'edited' | 'completed' | 'deleted' | 'commented'
  fromStatus?: TaskStatus
  toStatus?: TaskStatus
  at: string
}

export type DocCover =
  | { kind: 'none' }
  | { kind: 'solid'; color: string }
  | { kind: 'gradient'; from: string; to: string }

export interface Doc {
  id: string
  title: string
  content: string
  emoji: string
  cover: DocCover
  tags: string[]
  createdAt: string
  updatedAt: string
  pinned: boolean
  ownerName: string | null
}

export const STATUS_LABEL: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
}
export const STATUS_FLOW: TaskStatus[] = ['backlog', 'in_progress', 'in_review', 'done']
export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}
export const PRIORITY_ORDER: Record<TaskPriority, number> = {
  low: 0,
  medium: 1,
  high: 2,
  urgent: 3,
}

export const STORY_POINTS: number[] = [1, 2, 3, 5, 8, 13]

export const DEFAULT_COVER: DocCover = { kind: 'none' }

export const COVER_PRESETS: DocCover[] = [
  { kind: 'none' },
  { kind: 'solid', color: '#efe9de' },
  { kind: 'solid', color: '#181715' },
  { kind: 'gradient', from: '#cc785c', to: '#e8a55a' },
  { kind: 'gradient', from: '#5db8a6', to: '#3d8a7f' },
  { kind: 'gradient', from: '#252320', to: '#4a4540' },
  { kind: 'gradient', from: '#f5d6c7', to: '#cc785c' },
]
