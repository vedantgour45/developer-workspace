/**
 * Centralized date formatting helpers — single source of truth across the
 * workspace. All MFEs mirror this file. Built on date-fns for consistent
 * output regardless of browser locale.
 */
import {
  format,
  formatDistanceToNowStrict,
  isToday,
  isYesterday,
  isTomorrow,
  parseISO as dfnsParseISO,
  startOfDay as dfnsStartOfDay,
} from 'date-fns'

export function parseDate(input: string | Date | null | undefined): Date | null {
  if (!input) return null
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input
  const d = input.length === 10 ? new Date(`${input}T00:00:00`) : dfnsParseISO(input)
  return Number.isNaN(d.getTime()) ? null : d
}

export function formatLong(input: string | Date | null | undefined): string {
  const d = parseDate(input)
  return d ? format(d, 'd MMM yyyy') : ''
}

export function formatShort(input: string | Date | null | undefined): string {
  const d = parseDate(input)
  return d ? format(d, 'd MMM yyyy') : ''
}

export function formatFriendly(input: string | Date | null | undefined): string {
  const d = parseDate(input)
  if (!d) return ''
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  if (isTomorrow(d)) return 'Tomorrow'
  return format(d, 'MMM d')
}

export function formatRelative(input: string | Date | null | undefined): string {
  const d = parseDate(input)
  if (!d) return ''
  return formatDistanceToNowStrict(d, { addSuffix: true })
    .replace(' seconds', 's')
    .replace(' second', 's')
    .replace(' minutes', 'm')
    .replace(' minute', 'm')
    .replace(' hours', 'h')
    .replace(' hour', 'h')
    .replace(' days', 'd')
    .replace(' day', 'd')
    .replace(' months', 'mo')
    .replace(' month', 'mo')
    .replace(' years', 'y')
    .replace(' year', 'y')
}

export function toISODate(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function dueDateTone(input: string | Date | null | undefined): 'past' | 'soon' | 'future' | 'none' {
  const d = parseDate(input)
  if (!d) return 'none'
  const today = dfnsStartOfDay(new Date()).getTime()
  const target = dfnsStartOfDay(d).getTime()
  const diffDays = Math.round((target - today) / 86_400_000)
  if (diffDays < 0) return 'past'
  if (diffDays <= 3) return 'soon'
  return 'future'
}

export function startOfDay(d: Date): Date {
  return dfnsStartOfDay(d)
}

/** Back-compat shim: returns { label, tone } for a due date. */
export function formatDue(input: string | Date | null | undefined): {
  label: string
  tone: 'past' | 'soon' | 'future' | 'none'
} {
  const d = parseDate(input)
  if (!d) return { label: 'No due date', tone: 'none' }
  return { label: formatFriendly(d), tone: dueDateTone(d) }
}

/** Back-compat shim: long form full date. */
export function fullDate(input: string | Date | null | undefined): string {
  return formatLong(input)
}
