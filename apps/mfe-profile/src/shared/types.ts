export type TaskStatus = 'backlog' | 'in_progress' | 'in_review' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  tags: string[]
  assignee: string
  createdAt: string
  updatedAt: string
  completedAt: string | null
  order: number
}

export interface ActivityEntry {
  id: string
  taskId: string
  taskTitle: string
  type: 'created' | 'moved' | 'edited' | 'completed' | 'deleted'
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
