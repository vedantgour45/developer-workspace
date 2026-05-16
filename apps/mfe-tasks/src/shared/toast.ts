/**
 * MFE-side toast helper. Mirror of apps/host/src/shared/toast.ts —
 * the host owns the actual <Toaster> render, this just dispatches
 * window CustomEvents the host listens for.
 */

export type ToastKind = 'success' | 'error' | 'info' | 'loading'

export interface Toast {
  id: string
  kind: ToastKind
  title: string
  description?: string
  duration?: number
}

const SHOW_EVENT = 'dw:toast'
const DISMISS_EVENT = 'dw:toast:dismiss'

function genId(): string {
  return `t_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`
}

function defaultDuration(kind: ToastKind): number {
  if (kind === 'loading') return 0
  if (kind === 'error') return 6000
  return 3500
}

interface ToastOptions {
  description?: string
  duration?: number
  id?: string
}

function create(kind: ToastKind, title: string, opts: ToastOptions = {}): string {
  const id = opts.id ?? genId()
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<Toast>(SHOW_EVENT, {
        detail: {
          id,
          kind,
          title,
          description: opts.description,
          duration: opts.duration ?? defaultDuration(kind),
        },
      }),
    )
  }
  return id
}

export const toast = {
  success(title: string, opts?: ToastOptions) {
    return create('success', title, opts)
  },
  error(title: string, opts?: ToastOptions) {
    return create('error', title, opts)
  },
  info(title: string, opts?: ToastOptions) {
    return create('info', title, opts)
  },
  loading(title: string, opts?: ToastOptions) {
    return create('loading', title, opts)
  },
  dismiss(id: string) {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent<string>(DISMISS_EVENT, { detail: id }))
  },
}
