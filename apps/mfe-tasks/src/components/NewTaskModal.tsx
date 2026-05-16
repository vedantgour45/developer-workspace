import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { TaskPriority, TaskStatus } from '../shared/types'
import { PRIORITY_LABEL, STATUS_FLOW, STATUS_LABEL, STORY_POINTS } from '../shared/types'
import { useBoardStore } from '../store/boardStore'
import { cls } from '../shared/format'
import Select from './ui/Select'
import DatePicker from './ui/DatePicker'
import AssigneePicker from './ui/AssigneePicker'
import { useKnownAssignees } from '../shared/useKnownAssignees'

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

// ---------- Zod schema ----------
const assigneeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
})

const newTaskSchema = z.object({
  title: z
    .string()
    .min(1, 'Give the task a title.')
    .max(120, 'Keep the title under 120 characters.'),
  description: z.string().max(2000, 'Description is too long.'),
  status: z.enum(['backlog', 'in_progress', 'in_review', 'done']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  dueDate: z.string().nullable(),
  storyPoints: z.number().int().positive().nullable(),
  tagsRaw: z.string().max(200, 'Too many labels.'),
  assignees: z.array(assigneeSchema),
})

type NewTaskValues = z.infer<typeof newTaskSchema>

interface Props {
  initialStatus: TaskStatus
  onClose: () => void
}

export default function NewTaskModal({ initialStatus, onClose }: Props) {
  const create = useBoardStore((s) => s.createTask)
  const knownAssignees = useKnownAssignees()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting, isValid },
    setFocus,
  } = useForm<NewTaskValues>({
    resolver: zodResolver(newTaskSchema),
    mode: 'onChange',
    defaultValues: {
      title: '',
      description: '',
      status: initialStatus,
      priority: 'medium',
      dueDate: null,
      storyPoints: null,
      tagsRaw: '',
      assignees: [],
    },
  })

  useEffect(() => {
    setFocus('title')
  }, [setFocus])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const onSubmit = async (values: NewTaskValues) => {
    await create({
      title: values.title,
      description: values.description,
      status: values.status,
      priority: values.priority,
      storyPoints: values.storyPoints,
      dueDate: values.dueDate,
      tags: (values.tagsRaw ?? '')
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
      assignees: values.assignees,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-ink/30 backdrop-blur-[2px]">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-xl rounded-xl bg-canvas border border-hairline shadow-[0_20px_60px_rgba(20,20,19,0.18)] dw-fade-up"
        noValidate
      >
        <header className="px-6 pt-6 pb-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted font-medium">
            New task
          </p>
          <h2 className="font-display text-2xl text-ink mt-1">Capture the work</h2>
        </header>
        <div className="px-6 pb-2 space-y-4">
          {/* Title */}
          <div>
            <input
              {...register('title')}
              placeholder="What needs to happen?"
              className={cls(
                'w-full font-display text-[22px] text-ink bg-transparent border-0 border-b outline-none py-2',
                errors.title ? 'border-error' : 'border-hairline focus:border-primary',
              )}
            />
            {errors.title && (
              <p className="mt-1 text-[12px] text-error">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <textarea
              {...register('description')}
              placeholder="Add a short description (optional). Markdown supported."
              rows={3}
              className={cls(
                'w-full text-sm text-body bg-canvas border rounded-md p-3 outline-none resize-y',
                errors.description ? 'border-error' : 'border-hairline focus:border-primary',
              )}
            />
            {errors.description && (
              <p className="mt-1 text-[12px] text-error">{errors.description.message}</p>
            )}
          </div>

          {/* Column + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] uppercase tracking-wider text-muted font-medium">
                Column
              </span>
              <div className="mt-1.5">
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select<TaskStatus>
                      value={field.value}
                      onChange={field.onChange}
                      options={STATUS_FLOW.map((s) => ({
                        value: s,
                        label: STATUS_LABEL[s],
                        swatch: STATUS_SWATCH[s],
                      }))}
                      size="md"
                      fullWidth
                      ariaLabel="Column"
                    />
                  )}
                />
              </div>
            </label>
            <label className="block">
              <span className="text-[11px] uppercase tracking-wider text-muted font-medium">
                Priority
              </span>
              <div className="mt-1.5">
                <Controller
                  control={control}
                  name="priority"
                  render={({ field }) => (
                    <Select<TaskPriority>
                      value={field.value}
                      onChange={field.onChange}
                      options={(['low', 'medium', 'high', 'urgent'] as TaskPriority[]).map(
                        (p) => ({
                          value: p,
                          label: PRIORITY_LABEL[p],
                          swatch: PRIORITY_SWATCH[p],
                        }),
                      )}
                      size="md"
                      fullWidth
                      ariaLabel="Priority"
                    />
                  )}
                />
              </div>
            </label>
          </div>

          {/* Assignees */}
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-muted font-medium">
              Assignees
            </span>
            <div className="mt-1.5">
              <Controller
                control={control}
                name="assignees"
                render={({ field }) => (
                  <AssigneePicker
                    value={field.value}
                    onChange={field.onChange}
                    extraOptions={knownAssignees}
                  />
                )}
              />
            </div>
          </label>

          {/* Due date + Story points */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-muted font-medium">
                Due date
              </span>
              <div className="mt-1.5">
                <Controller
                  control={control}
                  name="dueDate"
                  render={({ field }) => (
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Pick a date"
                      ariaLabel="Due date"
                    />
                  )}
                />
              </div>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-muted font-medium">
                Story points
              </span>
              <Controller
                control={control}
                name="storyPoints"
                render={({ field }) => (
                  <div className="flex gap-1 mt-1.5">
                    {STORY_POINTS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => field.onChange(field.value === p ? null : p)}
                        className={cls(
                          'flex-1 h-10 rounded-md text-sm font-medium transition-colors',
                          field.value === p
                            ? 'bg-primary text-on-primary'
                            : 'bg-surface-card text-ink hover:bg-surface-cream-strong',
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>
          </div>

          {/* Labels */}
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-muted font-medium">
              Labels
            </span>
            <input
              {...register('tagsRaw')}
              placeholder="comma, separated, labels"
              className={cls(
                'w-full h-10 mt-1.5 px-3 rounded-md bg-canvas border text-sm text-ink outline-none',
                errors.tagsRaw ? 'border-error' : 'border-hairline focus:border-primary',
              )}
            />
            {errors.tagsRaw && (
              <p className="mt-1 text-[12px] text-error">{errors.tagsRaw.message}</p>
            )}
          </label>
        </div>
        <footer className="px-6 pb-6 pt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-md text-sm font-medium text-ink bg-canvas border border-hairline hover:border-ink/30"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="h-10 px-5 rounded-md text-sm font-medium bg-primary text-on-primary hover:bg-primary-active transition-colors disabled:bg-primary-disabled disabled:text-muted"
          >
            {isSubmitting ? 'Creating…' : 'Create task'}
          </button>
        </footer>
      </form>
    </div>
  )
}
