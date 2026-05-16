import { useEffect, useRef } from 'react'

interface Props {
  title: string
  message?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      else if (e.key === 'Enter') onConfirm()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    confirmRef.current?.focus()
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onCancel, onConfirm])

  return (
    <div
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'rgba(20,20,19,0.45)',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-xl bg-canvas border border-hairline dw-fade-up"
        style={{ width: '100%', maxWidth: 440, boxShadow: '0 24px 60px rgba(20,20,19,0.25)', padding: 24 }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0"
            style={{
              background: destructive ? 'rgba(198,69,69,0.12)' : 'rgba(204,120,92,0.12)',
              color: destructive ? '#c64545' : '#cc785c',
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M12 9v4M12 17h.01" />
              <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-xl text-ink leading-tight">{title}</h3>
            {message && <div className="text-sm text-body mt-2 leading-relaxed">{message}</div>}
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onCancel}
            className="h-9 px-4 rounded-md text-sm font-medium text-ink bg-canvas border border-hairline hover:border-ink/30 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className="h-9 px-4 rounded-md text-sm font-medium text-on-primary transition-colors"
            style={{ background: destructive ? '#c64545' : '#cc785c' }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.background = destructive ? '#a83838' : '#a9583e'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.background = destructive ? '#c64545' : '#cc785c'
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
