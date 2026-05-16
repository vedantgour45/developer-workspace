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
  // Accept both ISO 8601 ("2026-05-22T14:30:00.000Z") and date-only ("2026-05-22")
  const d = input.length === 10 ? new Date(`${input}T00:00:00`) : dfnsParseISO(input)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Full long date — "22 May 2026" */
export function formatLong(input: string | Date | null | undefined): string {
  const d = parseDate(input)
  return d ? format(d, 'd MMM yyyy') : ''
}

/** Short date with year — "22 May 2026" (same as long for now; reserved for variation) */
export function formatShort(input: string | Date | null | undefined): string {
  const d = parseDate(input)
  return d ? format(d, 'd MMM yyyy') : ''
}

/** Compact date for cards — "May 22" (no year) or "Today" / "Tomorrow" / "Yesterday" */
export function formatFriendly(input: string | Date | null | undefined): string {
  const d = parseDate(input)
  if (!d) return ''
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  if (isTomorrow(d)) return 'Tomorrow'
  return format(d, 'MMM d')
}

/** Relative time — "5m ago", "2h ago", "3d ago", "in 2d" */
export function formatRelative(input: string | Date | null | undefined): string {
  const d = parseDate(input)
  if (!d) return ''
  return formatDistanceToNowStrict(d, { addSuffix: true })
    .replace('seconds', 's')
    .replace('second', 's')
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

/** ISO date string — "2026-05-22" */
export function toISODate(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

/** Today's ISO date — "2026-05-22" */
export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

/** Due-date tone for a given ISO — 'past' if overdue, 'soon' if within 3 days, else 'future' */
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
