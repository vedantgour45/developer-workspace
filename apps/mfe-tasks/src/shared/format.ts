import { formatRelative } from './dates'

/** @deprecated Use formatRelative from ./dates instead. Kept as a back-compat shim. */
export function relativeTime(iso: string): string {
  return formatRelative(iso)
}

export function cls(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`
}
