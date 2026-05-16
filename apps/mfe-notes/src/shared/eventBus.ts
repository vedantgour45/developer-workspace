import type { Doc } from './types'

export type WorkspaceEvent =
  | { type: 'doc:created'; doc: Doc }
  | { type: 'doc:updated'; doc: Doc }
  | { type: 'doc:deleted'; docId: string }

const EVENT_NAME = 'dw:workspace-event'

export function emit(event: WorkspaceEvent): void {
  window.dispatchEvent(new CustomEvent<WorkspaceEvent>(EVENT_NAME, { detail: event }))
}
