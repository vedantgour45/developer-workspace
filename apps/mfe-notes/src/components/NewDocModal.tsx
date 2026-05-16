/**
 * NewDocModal — opened when the user clicks "+" or hits Cmd/Ctrl+N.
 * Collects a title up front and shows the author (the signed-in user)
 * so the user has confirmation of who the note is attributed to before
 * the doc actually gets created. Submit calls createDoc({ title }) and
 * navigates to the new note.
 */
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useDocsStore } from '../store/docsStore'
import { readCurrentUser } from '../shared/currentUser'

const schema = z.object({
  title: z
    .string()
    .min(1, 'Give your note a title.')
    .max(120, 'Keep the title under 120 characters.'),
})

type Values = z.infer<typeof schema>

interface Props {
  onClose: () => void
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function NewDocModal({ onClose }: Props) {
  const create = useDocsStore((s) => s.createDoc)
  const me = readCurrentUser()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
    setFocus,
  } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { title: '' },
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

  const onSubmit = async ({ title }: Values) => {
    await create({ title: title.trim() })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-ink/30"
      style={{ backdropFilter: 'blur(2px)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-doc-title"
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl bg-canvas border border-hairline dw-fade-up"
        style={{ boxShadow: '0 20px 60px rgba(20,20,19,0.18)' }}
        noValidate
      >
        <header className="px-6 pt-6 pb-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted font-medium">
            New note
          </p>
          <h2 id="new-doc-title" className="font-display text-2xl text-ink mt-1">
            Start a new doc
          </h2>
        </header>

        <div className="px-6 pb-2 space-y-4">
          {/* Title */}
          <label className="block">
            <span className="text-[11px] uppercase tracking-wider text-muted font-medium">
              Title
            </span>
            <input
              {...register('title')}
              placeholder="Untitled"
              className={`mt-1.5 w-full h-11 px-3 rounded-md bg-canvas border text-[15px] text-ink outline-none transition-colors ${
                errors.title
                  ? 'border-error focus:border-error'
                  : 'border-hairline focus:border-primary'
              }`}
              aria-invalid={!!errors.title}
            />
            {errors.title && (
              <p className="mt-1 text-[12px] text-error">{errors.title.message}</p>
            )}
          </label>

          {/* Author (read-only display) */}
          <div>
            <span className="text-[11px] uppercase tracking-wider text-muted font-medium">
              Author
            </span>
            <div className="mt-1.5 flex items-center gap-2.5 h-11 px-3 rounded-md bg-surface-card border border-hairline-soft">
              <span
                className="rounded-full bg-surface-dark text-on-dark text-[11px] font-medium flex items-center justify-center flex-shrink-0"
                style={{ width: 28, height: 28 }}
              >
                {initialsOf(me.name)}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-ink truncate">
                  {me.name}
                </span>
                {me.email && (
                  <span className="block text-[11px] text-muted truncate">
                    {me.email}
                  </span>
                )}
              </span>
            </div>
          </div>
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
            {isSubmitting ? 'Creating…' : 'Create note'}
          </button>
        </footer>
      </form>
    </div>
  )
}
