/**
 * Toaster — global notification container, portalled to <body> so it
 * floats above every MFE and modal. Listens for `dw:toast` window
 * events emitted by any app and stacks the resulting toasts at
 * top-center of the viewport. See ../shared/toast.ts for the API.
 */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, AlertCircle, Info, Loader2, X } from 'lucide-react'
import { subscribeToasts, type Toast, type ToastKind } from '../shared/toast'

interface VisibleToast extends Toast {
  /** Set when leaving so we can play the exit animation. */
  leaving?: boolean
}

const PALETTE: Record<
  ToastKind,
  { bg: string; border: string; text: string; iconColor: string }
> = {
  success: {
    bg: '#edfce9',
    border: 'rgba(0, 96, 51, 0.30)',
    text: '#003c33',
    iconColor: '#3d8a7f',
  },
  error: {
    bg: '#fff5f3',
    border: 'rgba(176, 62, 37, 0.35)',
    text: '#b03e25',
    iconColor: '#c64545',
  },
  info: {
    bg: '#f1f5ff',
    border: 'rgba(76, 110, 230, 0.30)',
    text: '#1863dc',
    iconColor: '#1863dc',
  },
  loading: {
    bg: '#141413',
    border: 'rgba(255, 255, 255, 0.10)',
    text: '#f5f1ea',
    iconColor: '#f5f1ea',
  },
}

function IconFor({ kind, color }: { kind: ToastKind; color: string }) {
  const props = { size: 18, strokeWidth: 1.8, style: { color, flexShrink: 0 } }
  if (kind === 'success') return <CheckCircle2 {...props} />
  if (kind === 'error') return <AlertCircle {...props} />
  if (kind === 'info') return <Info {...props} />
  return (
    <Loader2
      {...props}
      style={{
        ...props.style,
        animation: 'dw-spin 0.9s linear infinite',
      }}
    />
  )
}

export default function Toaster() {
  const [toasts, setToasts] = useState<VisibleToast[]>([])

  // Subscribe to the cross-MFE event bus. Logs in dev so we can verify
  // the events are reaching the host listener from MFE code paths.
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[toaster] mounted — listening for dw:toast / dw:toast:dismiss')
    }
    return subscribeToasts(
      (t) => {
        if (import.meta.env.DEV) console.log('[toaster] show', t)
        setToasts((prev) => {
          // If the id already exists (e.g. loading → success transition),
          // replace it in place instead of stacking a duplicate.
          const existing = prev.findIndex((p) => p.id === t.id)
          if (existing >= 0) {
            const next = prev.slice()
            next[existing] = t
            return next
          }
          return [...prev, t]
        })
      },
      (id) => {
        if (import.meta.env.DEV) console.log('[toaster] dismiss', id)
        setToasts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, leaving: true } : p)),
        )
        // Remove after the exit animation runs (180ms).
        window.setTimeout(() => {
          setToasts((prev) => prev.filter((p) => p.id !== id))
        }, 200)
      },
    )
  }, [])

  // Auto-dismiss timers.
  useEffect(() => {
    const timers = toasts
      .filter((t) => !t.leaving && t.duration && t.duration > 0)
      .map((t) =>
        window.setTimeout(() => {
          window.dispatchEvent(new CustomEvent<string>('dw:toast:dismiss', { detail: t.id }))
        }, t.duration),
      )
    return () => {
      timers.forEach((id) => window.clearTimeout(id))
    }
  }, [toasts])

  // Always render the portal container so the listener is live from the
  // first paint. An empty toasts array renders an empty div — no DOM cost.
  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 80,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        alignItems: 'center',
        pointerEvents: 'none',
        maxWidth: 'calc(100vw - 32px)',
      }}
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((t) => (
        <ToastItem
          key={t.id}
          toast={t}
          onDismiss={() => {
            window.dispatchEvent(
              new CustomEvent<string>('dw:toast:dismiss', { detail: t.id }),
            )
          }}
        />
      ))}
    </div>,
    document.body,
  )
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: VisibleToast
  onDismiss: () => void
}) {
  const palette = PALETTE[toast.kind]
  return (
    <div
      role={toast.kind === 'error' ? 'alert' : 'status'}
      style={{
        background: palette.bg,
        color: palette.text,
        border: `1px solid ${palette.border}`,
        borderRadius: 10,
        padding: '10px 14px 10px 12px',
        minWidth: 260,
        maxWidth: 480,
        boxShadow: '0 12px 32px rgba(20,20,19,0.18)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        pointerEvents: 'auto',
        animation: toast.leaving
          ? 'dw-toast-out 180ms ease-out forwards'
          : 'dw-toast-in 180ms ease-out',
      }}
    >
      <IconFor kind={toast.kind} color={palette.iconColor} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 500,
            lineHeight: 1.35,
          }}
        >
          {toast.title}
        </p>
        {toast.description && (
          <p
            style={{
              margin: '3px 0 0',
              fontSize: 12,
              lineHeight: 1.4,
              opacity: 0.78,
            }}
          >
            {toast.description}
          </p>
        )}
      </div>
      {toast.kind !== 'loading' && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          style={{
            background: 'transparent',
            border: 0,
            color: 'inherit',
            cursor: 'pointer',
            padding: 0,
            opacity: 0.6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 1,
            marginLeft: 2,
          }}
        >
          <X size={14} strokeWidth={1.8} />
        </button>
      )}
    </div>
  )
}
