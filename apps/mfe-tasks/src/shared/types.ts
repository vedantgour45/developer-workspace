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

/** A user picked from the profiles directory. */
export interface AssigneeRef {
  id: string
  name: string
}

export interface Task {
  id: string
  key: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  tags: string[]
  /** Legacy single-assignee text. Used as a display fallback for tasks
   *  created before multi-assignee landed. */
  assignee: string
  /** Multi-assignee — the canonical source going forward. */
  assignees: AssigneeRef[]
  storyPoints: number | null
  dueDate: string | null
  subtasks: Subtask[]
  comments: Comment[]
  createdAt: string
  updatedAt: string
  completedAt: string | null
  order: number
  /** Who created the task. Display label in shared workspaces. */
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
