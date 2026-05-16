import { useEffect, useMemo, useState } from 'react'
import type { Task, TaskPriority, TaskStatus } from '../shared/types'
import { PRIORITY_LABEL, STATUS_FLOW, STATUS_LABEL, STORY_POINTS } from '../shared/types'
import { relativeTime, cls } from '../shared/format'
import { useBoardStore } from '../store/boardStore'
import { formatDue, fullDate } from '../shared/dates'
import { renderMiniMarkdown } from '../lib/miniMarkdown'
import Select from './ui/Select'
import DatePicker from './ui/DatePicker'
import ConfirmModal from './ui/ConfirmModal'
import AssigneePicker from './ui/AssigneePicker'
import { useCurrentUser } from '../shared/currentUser'
import { useKnownAssignees } from '../shared/useKnownAssignees'

interface Props {
  task: Task
  onClose: () => void
}

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent']

function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const initials = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase()
  return (
    <span
      className="rounded-full bg-surface-dark text-on-dark text-[11px] font-medium flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, fontSize: size <= 24 ? 10 : 11 }}
    >
      {initials}
    </span>
  )
}

const STATUS_SWATCH: Record<TaskStatus, string> = {
  backlog: '#8e8b82',
  in_progress: '#5db8a6',
  in_review: '#e8a55a',
  done: '#5db872',
}
const PRIORITY_SWATCH: Record<TaskPriority, string> = {
  low: '#8e8b82',
  medium: '#d4a017',
  high: '#cc785c',
  urgent: '#c64545',
}

export default function TaskDetail({ task, onClose }: Props) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description)
  const [editingDesc, setEditingDesc] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [newSub, setNewSub] = useState('')
  const [newComment, setNewComment] = useState('')
  const [confirmDeleteTask, setConfirmDeleteTask] = useState(false)
  const [pendingDeleteSub, setPendingDeleteSub] = useState<{ id: string; title: string } | null>(null)
  const [pendingDeleteComment, setPendingDeleteComment] = useState<{ id: string; body: string } | null>(null)
  const me = useCurrentUser()
  const knownAssignees = useKnownAssignees()

  const update = useBoardStore((s) => s.updateTask)
  const remove = useBoardStore((s) => s.deleteTask)
  const addSubtask = useBoardStore((s) => s.addSubtask)
  const toggleSubtask = useBoardStore((s) => s.toggleSubtask)
  const updateSubtask = useBoardStore((s) => s.updateSubtask)
  const deleteSubtask = useBoardStore((s) => s.deleteSubtask)
  const addComment = useBoardStore((s) => s.addComment)
  const deleteComment = useBoardStore((s) => s.deleteComment)

  useEffect(() => {
    setTitle(task.title)
    setDescription(task.description)
    setEditingDesc(false)
  }, [task.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const commit = (patch: Partial<Task>) => update(task.id, patch)
  const addTag = () => {
    const t = tagInput.trim().toLowerCase()
    if (!t || task.tags.includes(t)) return
    commit({ tags: [...task.tags, t] })
    setTagInput('')
  }
  const removeTag = (t: string) => commit({ tags: task.tags.filter((x) => x !== t) })
  const submitSubtask = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSub.trim()) return
    addSubtask(task.id, newSub)
    setNewSub('')
  }
  const submitComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return
    addComment(task.id, newComment)
    setNewComment('')
  }
  const subDone = task.subtasks.filter((s) => s.done).length

  const due = formatDue(task.dueDate)
  const descriptionHtml = useMemo(() => renderMiniMarkdown(task.description), [task.description])

  const statusOptions = STATUS_FLOW.map((s) => ({
    value: s,
    label: STATUS_LABEL[s],
    swatch: STATUS_SWATCH[s],
  }))
  const priorityOptions = PRIORITIES.map((p) => ({
    value: p,
    label: PRIORITY_LABEL[p],
    swatch: PRIORITY_SWATCH[p],
  }))

  return (
    <div className="fixed inset-0 z-40 flex" role="dialog" aria-modal="true">
      <button
        onClick={onClose}
        aria-label="Close"
        className="flex-1 bg-ink/30 backdrop-blur-[2px]"
      />
      <aside className="w-full max-w-[640px] bg-canvas border-l border-hairline overflow-y-auto dw-fade-up">
        {/* Header */}
        <header className="px-7 pt-5 pb-4 border-b border-hairline-soft flex items-center justify-between sticky top-0 bg-canvas z-10">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-mono text-xs text-muted">{task.key}</span>
            <Select<TaskStatus>
              value={task.status}
              onChange={(v) => commit({ status: v })}
              options={statusOptions}
              ariaLabel="Status"
            />
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setConfirmDeleteTask(true)}
              className="w-8 h-8 rounded-md text-muted hover:text-error hover:bg-error/10 flex items-center justify-center"
              aria-label="Delete task"
              title="Delete task"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-md text-muted hover:text-ink hover:bg-surface-card flex items-center justify-center"
              aria-label="Close"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="w-4 h-4">
                <path d="M6 6 18 18M18 6 6 18" />
              </svg>
            </button>
          </div>
        </header>

        <div className="px-7 py-6">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title.trim() && title !== task.title && commit({ title: title.trim() })}
            className="w-full font-display text-[28px] text-ink leading-tight bg-transparent border-0 outline-none focus:bg-surface-card/40 rounded px-2 -mx-2"
          />

          {/* Property strip */}
          <dl className="mt-5 grid grid-cols-[110px_1fr] gap-y-2 text-sm">
            {task.ownerName && (
              <>
                <dt className="text-muted">Created by</dt>
                <dd className="flex items-center gap-2">
                  <Avatar name={task.ownerName} size={24} />
                  <span className="text-ink">{task.ownerName}</span>
                </dd>
              </>
            )}

            <dt className="text-muted">Assignees</dt>
            <dd>
              <AssigneePicker
                value={task.assignees}
                onChange={(next) =>
                  commit({
                    assignees: next,
                    // Keep the legacy single-assignee text in sync with the
                    // first picked person so older readers still see a name.
                    assignee: next[0]?.name ?? task.assignee,
                  })
                }
                extraOptions={knownAssignees}
              />
            </dd>

            <dt className="text-muted">Priority</dt>
            <dd>
              <Select<TaskPriority>
                value={task.priority}
                onChange={(v) => commit({ priority: v })}
                options={priorityOptions}
                ariaLabel="Priority"
              />
            </dd>

            <dt className="text-muted">Story points</dt>
            <dd className="flex flex-wrap gap-1">
              {STORY_POINTS.map((p) => (
                <button
                  key={p}
                  onClick={() => commit({ storyPoints: task.storyPoints === p ? null : p })}
                  className={cls(
                    'w-7 h-7 rounded text-[12px] font-medium transition-colors',
                    task.storyPoints === p
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-card text-ink hover:bg-surface-cream-strong',
                  )}
                >
                  {p}
                </button>
              ))}
              {task.storyPoints !== null && (
                <button
                  onClick={() => commit({ storyPoints: null })}
                  className="h-7 px-2 rounded text-[11px] font-medium text-muted hover:text-ink hover:bg-surface-card ml-1 self-center inline-flex items-center gap-1 transition-colors"
                  title="Clear story points"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="w-3 h-3">
                    <path d="M6 6 18 18M18 6 6 18" />
                  </svg>
                  Clear
                </button>
              )}
            </dd>

            <dt className="text-muted">Due date</dt>
            <dd>
              <DatePicker
                value={task.dueDate}
                onChange={(v) => commit({ dueDate: v })}
                tone={due.tone === 'past' ? 'past' : due.tone === 'soon' ? 'soon' : 'default'}
                placeholder="Pick a due date"
                ariaLabel="Due date"
              />
            </dd>

            <dt className="text-muted">Labels</dt>
            <dd className="flex flex-wrap gap-1.5 items-center">
              {task.tags.map((t) => (
                <span
                  key={t}
                  className="text-xs font-medium text-ink bg-surface-card px-2 py-0.5 rounded inline-flex items-center gap-1"
                >
                  {t}
                  <button
                    onClick={() => removeTag(t)}
                    className="text-muted hover:text-error"
                    aria-label={`Remove ${t}`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-2.5 h-2.5">
                      <path d="M6 6 18 18M18 6 6 18" />
                    </svg>
                  </button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="+ Add label"
                className="h-6 px-2 rounded bg-transparent border border-dashed border-hairline text-xs text-ink outline-none focus:border-primary w-24"
              />
            </dd>
          </dl>

          {/* Description */}
          <section className="mt-7">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] uppercase tracking-[0.16em] text-muted font-medium">
                Description
              </h3>
              {!editingDesc && (
                <button
                  onClick={() => setEditingDesc(true)}
                  className="text-[12px] text-primary hover:text-primary-active font-medium"
                >
                  Edit
                </button>
              )}
            </div>
            {editingDesc ? (
              <div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={8}
                  className="w-full text-[14px] text-body bg-canvas border border-hairline rounded-md p-3 outline-none focus:border-primary leading-relaxed resize-y font-mono"
                  placeholder="Add a description… Markdown supported."
                  autoFocus
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => {
                      setDescription(task.description)
                      setEditingDesc(false)
                    }}
                    className="h-8 px-3 rounded-md text-sm font-medium text-ink bg-canvas border border-hairline hover:border-ink/30"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      commit({ description })
                      setEditingDesc(false)
                    }}
                    className="h-8 px-3 rounded-md text-sm font-medium bg-primary text-on-primary hover:bg-primary-active"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : task.description ? (
              <div
                onClick={() => setEditingDesc(true)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setEditingDesc(true)}
                className="dw-task-desc cursor-text text-[14px] text-body leading-relaxed p-3 -mx-3 rounded-md hover:bg-surface-card/50 transition-colors"
                dangerouslySetInnerHTML={{ __html: descriptionHtml }}
              />
            ) : (
              <button
                onClick={() => setEditingDesc(true)}
                className="w-full text-left text-sm text-muted-soft italic p-3 -mx-3 rounded-md hover:bg-surface-card/50 transition-colors"
              >
                Add a description…
              </button>
            )}
          </section>

          {/* Subtasks */}
          <section className="mt-7">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] uppercase tracking-[0.16em] text-muted font-medium">
                Subtasks
              </h3>
              {task.subtasks.length > 0 && (
                <span className="text-[11px] text-muted">
                  {subDone} of {task.subtasks.length} done
                </span>
              )}
            </div>
            {task.subtasks.length > 0 && (
              <div className="h-1 rounded-full bg-hairline overflow-hidden mb-3">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(subDone / task.subtasks.length) * 100}%` }}
                />
              </div>
            )}
            <ul className="space-y-1">
              {task.subtasks.map((s) => (
                <li key={s.id} className="group flex items-center gap-2 py-1 px-2 -mx-2 rounded hover:bg-surface-card/50">
                  <button
                    onClick={() => toggleSubtask(task.id, s.id)}
                    className={cls(
                      'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors',
                      s.done ? 'bg-primary border-primary text-on-primary' : 'border-hairline hover:border-ink',
                    )}
                    aria-pressed={s.done}
                  >
                    {s.done && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                  <input
                    value={s.title}
                    onChange={(e) => updateSubtask(task.id, s.id, e.target.value)}
                    className={cls(
                      'flex-1 text-sm bg-transparent border-0 outline-none focus:bg-canvas focus:px-1.5 focus:py-0.5 focus:rounded',
                      s.done ? 'text-muted line-through' : 'text-ink',
                    )}
                  />
                  <button
                    onClick={() => setPendingDeleteSub({ id: s.id, title: s.title })}
                    className="text-muted hover:text-error opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Delete subtask"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="w-3.5 h-3.5">
                      <path d="M6 6 18 18M18 6 6 18" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
            <form
              onSubmit={submitSubtask}
              className="flex items-center gap-2 mt-2 py-1 px-2 -mx-2 rounded focus-within:bg-surface-card/40 transition-colors"
            >
              <span className="w-4 h-4 rounded border border-dashed border-hairline flex-shrink-0" />
              <input
                value={newSub}
                onChange={(e) => setNewSub(e.target.value)}
                placeholder="Add a subtask…"
                className="flex-1 text-sm bg-transparent border-0 outline-none placeholder:text-muted-soft py-1"
              />
              {newSub.trim() && (
                <button
                  type="submit"
                  className="h-7 px-3 rounded-md text-[11px] font-medium bg-primary text-on-primary hover:bg-primary-active transition-colors flex-shrink-0"
                >
                  Add
                </button>
              )}
            </form>
          </section>

          {/* Comments */}
          <section className="mt-7">
            <h3 className="text-[11px] uppercase tracking-[0.16em] text-muted font-medium mb-3">
              Activity
            </h3>
            {task.comments.length === 0 ? (
              <p className="text-sm text-muted-soft italic mb-3">No comments yet.</p>
            ) : (
              <ul className="space-y-3 mb-4">
                {task.comments.slice().reverse().map((c) => (
                  <li key={c.id} className="group flex gap-3">
                    <Avatar name={c.author} size={28} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="text-sm font-medium text-ink">{c.author}</span>
                        <span className="text-[11px] text-muted">{relativeTime(c.at)}</span>
                        <button
                          onClick={() => setPendingDeleteComment({ id: c.id, body: c.body })}
                          className="ml-auto text-[11px] text-muted hover:text-error opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Delete
                        </button>
                      </div>
                      <p className="text-sm text-body whitespace-pre-wrap leading-relaxed">{c.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={submitComment} className="flex gap-3">
              <Avatar name={me.name} size={28} />
              <div className="flex-1">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault()
                      submitComment(e as unknown as React.FormEvent)
                    }
                  }}
                  rows={2}
                  placeholder="Add a comment… (Cmd+Enter to send)"
                  className="w-full text-sm text-body bg-canvas border border-hairline rounded-md p-3 outline-none focus:border-primary leading-relaxed resize-y"
                />
                {newComment.trim() && (
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setNewComment('')}
                      className="h-8 px-3 rounded-md text-sm font-medium text-muted hover:text-ink"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="h-8 px-3 rounded-md text-sm font-medium bg-primary text-on-primary hover:bg-primary-active"
                    >
                      Comment
                    </button>
                  </div>
                )}
              </div>
            </form>
          </section>

          {/* Metadata footer */}
          <footer className="mt-8 pt-5 border-t border-hairline-soft text-[12px] text-muted flex flex-wrap gap-x-5 gap-y-1">
            <span>Created {relativeTime(task.createdAt)}</span>
            <span>Updated {relativeTime(task.updatedAt)}</span>
            {task.completedAt && <span>Completed {fullDate(task.completedAt)}</span>}
          </footer>
        </div>
      </aside>

      {confirmDeleteTask && (
        <ConfirmModal
          title={`Delete ${task.key}?`}
          message={
            <>
              <strong className="text-ink">{task.title}</strong> and all of its subtasks and
              comments will be permanently removed. This can't be undone.
            </>
          }
          confirmLabel="Delete task"
          destructive
          onCancel={() => setConfirmDeleteTask(false)}
          onConfirm={() => {
            setConfirmDeleteTask(false)
            remove(task.id)
            onClose()
          }}
        />
      )}

      {pendingDeleteSub && (
        <ConfirmModal
          title="Delete subtask?"
          message={
            <>
              <strong className="text-ink">{pendingDeleteSub.title || 'Untitled'}</strong> will be
              removed from this task.
            </>
          }
          confirmLabel="Delete"
          destructive
          onCancel={() => setPendingDeleteSub(null)}
          onConfirm={() => {
            deleteSubtask(task.id, pendingDeleteSub.id)
            setPendingDeleteSub(null)
          }}
        />
      )}

      {pendingDeleteComment && (
        <ConfirmModal
          title="Delete comment?"
          message="This comment will be permanently removed from the task's activity."
          confirmLabel="Delete"
          destructive
          onCancel={() => setPendingDeleteComment(null)}
          onConfirm={() => {
            deleteComment(task.id, pendingDeleteComment.id)
            setPendingDeleteComment(null)
          }}
        />
      )}
    </div>
  )
}
