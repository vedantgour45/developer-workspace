import type { Task, Doc, ActivityEntry } from './types'

export type WorkspaceEvent =
  | { type: 'task:created'; task: Task }
  | { type: 'task:updated'; task: Task }
  | { type: 'task:deleted'; taskId: string }
  | { type: 'task:moved'; task: Task; from: Task['status']; to: Task['status'] }
  | { type: 'activity:logged'; entry: ActivityEntry }
  | { type: 'doc:created'; doc: Doc }
  | { type: 'doc:updated'; doc: Doc }
  | { type: 'doc:deleted'; docId: string }

const EVENT_NAME = 'dw:workspace-event'

export function emit(event: WorkspaceEvent): void {
  window.dispatchEvent(new CustomEvent<WorkspaceEvent>(EVENT_NAME, { detail: event }))
}

export function subscribe(handler: (event: WorkspaceEvent) => void): () => void {
  const listener = (e: Event) => {
    const ce = e as CustomEvent<WorkspaceEvent>
    handler(ce.detail)
  }
  window.addEventListener(EVENT_NAME, listener)
  return () => window.removeEventListener(EVENT_NAME, listener)
}
