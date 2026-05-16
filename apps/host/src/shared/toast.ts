/**
 * Cross-MFE toast bus.
 *
 * The host renders a single <Toaster> at the top of the page. Anywhere
 * in any app — host or remote MFE — can fire `toast.success(...)`,
 * `toast.error(...)`, etc., and the Toaster catches the window event
 * and renders the notification.
 *
 * Each app keeps its own copy of this file (identical contents) so MFEs
 * can dispatch without importing host code. The actual rendering is
 * centralised in the host, so toast styling stays consistent.
 */

export type ToastKind = 'success' | 'error' | 'info' | 'loading'

export interface Toast {
  id: string
  kind: ToastKind
  title: string
  description?: string
  /** ms before auto-dismiss. 0 = no auto-dismiss (typical for `loading`). */
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

function dispatchShow(toast: Toast): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<Toast>(SHOW_EVENT, { detail: toast }))
}

function dispatchDismiss(id: string): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<string>(DISMISS_EVENT, { detail: id }))
}

interface ToastOptions {
  description?: string
  duration?: number
  /** Replaces an existing toast (typically a loading one) in place. */
  id?: string
}

function create(kind: ToastKind, title: string, opts: ToastOptions = {}): string {
  const id = opts.id ?? genId()
  dispatchShow({
    id,
    kind,
    title,
    description: opts.description,
    duration: opts.duration ?? defaultDuration(kind),
  })
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
    dispatchDismiss(id)
  },
}

/** Subscribe the toaster to incoming events. Returns an unsubscribe fn. */
export function subscribeToasts(
  onShow: (t: Toast) => void,
  onDismiss: (id: string) => void,
): () => void {
  const showHandler = (e: Event) => {
    const detail = (e as CustomEvent<Toast>).detail
    if (detail) onShow(detail)
  }
  const dismissHandler = (e: Event) => {
    const detail = (e as CustomEvent<string>).detail
    if (typeof detail === 'string') onDismiss(detail)
  }
  window.addEventListener(SHOW_EVENT, showHandler)
  window.addEventListener(DISMISS_EVENT, dismissHandler)
  return () => {
    window.removeEventListener(SHOW_EVENT, showHandler)
    window.removeEventListener(DISMISS_EVENT, dismissHandler)
  }
}
