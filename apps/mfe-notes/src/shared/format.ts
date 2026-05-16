import { formatRelative } from './dates'

/** @deprecated Use formatRelative from ./dates */
export function relativeTime(iso: string): string {
  return formatRelative(iso)
}

export function cls(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`
}

export function debounce<F extends (...args: never[]) => void>(fn: F, ms: number) {
  let t: ReturnType<typeof setTimeout> | null = null
  const debounced = (...args: Parameters<F>) => {
    if (t) clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
  debounced.cancel = () => {
    if (t) clearTimeout(t)
  }
  return debounced as F & { cancel: () => void }
}
