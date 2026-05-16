import {
  eachDayOfInterval,
  endOfDay,
  format,
  startOfDay,
  subDays,
} from 'date-fns'
import type { Task, TaskPriority, TaskStatus } from '../shared/types'
import { STATUS_FLOW } from '../shared/types'

export interface DailyPoint {
  date: string // yyyy-MM-dd
  label: string // M/d
  completed: number
  created: number
  weekday: number // 0..6 (Sun..Sat)
}

export interface Summary {
  total: number
  byStatus: Record<TaskStatus, number>
  byPriority: Record<TaskPriority, number>
  completionRate: number
  avgCycleHours: number | null
  velocityPerWeek: number
  longestStreak: number
}

export function buildDailySeries(tasks: Task[], days = 28): DailyPoint[] {
  const end = endOfDay(new Date())
  const start = startOfDay(subDays(end, days - 1))
  const range = eachDayOfInterval({ start, end })

  const completedMap = new Map<string, number>()
  const createdMap = new Map<string, number>()

  for (const t of tasks) {
    const c = new Date(t.createdAt)
    if (c >= start && c <= end) {
      const k = format(c, 'yyyy-MM-dd')
      createdMap.set(k, (createdMap.get(k) ?? 0) + 1)
    }
    if (t.completedAt) {
      const d = new Date(t.completedAt)
      if (d >= start && d <= end) {
        const k = format(d, 'yyyy-MM-dd')
        completedMap.set(k, (completedMap.get(k) ?? 0) + 1)
      }
    }
  }

  return range.map((d) => {
    const key = format(d, 'yyyy-MM-dd')
    return {
      date: key,
      label: format(d, 'M/d'),
      completed: completedMap.get(key) ?? 0,
      created: createdMap.get(key) ?? 0,
      weekday: d.getDay(),
    }
  })
}

export function summarize(tasks: Task[]): Summary {
  const byStatus = STATUS_FLOW.reduce<Record<TaskStatus, number>>(
    (acc, s) => ({ ...acc, [s]: 0 }),
    {} as Record<TaskStatus, number>,
  )
  const byPriority: Record<TaskPriority, number> = { low: 0, medium: 0, high: 0, urgent: 0 }

  let totalCycleMs = 0
  let cycleCount = 0

  for (const t of tasks) {
    byStatus[t.status]++
    byPriority[t.priority]++
    if (t.completedAt) {
      totalCycleMs += new Date(t.completedAt).getTime() - new Date(t.createdAt).getTime()
      cycleCount++
    }
  }

  const total = tasks.length
  const completed = byStatus.done
  const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100)
  const avgCycleHours = cycleCount === 0 ? null : Math.round(totalCycleMs / cycleCount / 3_600_000)

  // Velocity = completed tasks in last 7 days
  const sevenAgo = subDays(new Date(), 7)
  const velocityPerWeek = tasks.filter(
    (t) => t.completedAt && new Date(t.completedAt) >= sevenAgo,
  ).length

  // Longest consecutive-day completion streak in the last 60 days
  const days = buildDailySeries(tasks, 60)
  let streak = 0
  let best = 0
  for (const d of days) {
    if (d.completed > 0) {
      streak++
      best = Math.max(best, streak)
    } else {
      streak = 0
    }
  }

  return {
    total,
    byStatus,
    byPriority,
    completionRate,
    avgCycleHours,
    velocityPerWeek,
    longestStreak: best,
  }
}

export interface HeatmapCell {
  /** ISO yyyy-MM-dd, or null for cells outside the range (padding) */
  date: string | null
  /** Completed count; 0 for in-range with no activity, -1 for padding */
  count: number
}

export interface HeatmapWeek {
  cells: HeatmapCell[] // length 7, Sun..Sat
}

export interface HeatmapData {
  weeks: HeatmapWeek[]
  /** Column index → first 3-letter month name to render above it */
  monthLabels: { col: number; label: string }[]
  max: number
  total: number
  daysWithActivity: number
  bestDay: { date: string; count: number } | null
  bestWeek: { firstDate: string; count: number } | null
  rangeStart: string
  rangeEnd: string
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function buildHeatmap(tasks: Task[], weeks = 53): HeatmapData {
  const today = startOfDay(new Date())
  const todayDow = today.getDay() // 0=Sun..6=Sat
  const thisWeekSunday = new Date(today.getTime() - todayDow * 86_400_000)
  const startSunday = new Date(thisWeekSunday.getTime() - (weeks - 1) * 7 * 86_400_000)

  const completedMap = new Map<string, number>()
  for (const t of tasks) {
    if (!t.completedAt) continue
    const d = startOfDay(new Date(t.completedAt))
    if (d < startSunday || d > today) continue
    const k = format(d, 'yyyy-MM-dd')
    completedMap.set(k, (completedMap.get(k) ?? 0) + 1)
  }

  const weeksOut: HeatmapWeek[] = []
  const rawLabels: { col: number; label: string }[] = []
  let max = 0
  let total = 0
  let daysWithActivity = 0
  let bestDay: { date: string; count: number } | null = null
  let bestWeek: { firstDate: string; count: number } | null = null

  for (let w = 0; w < weeks; w++) {
    const cells: HeatmapCell[] = []
    let weekTotal = 0
    let weekFirstDate = ''

    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(startSunday.getTime() + (w * 7 + d) * 86_400_000)
      if (cellDate > today) {
        cells.push({ date: null, count: -1 })
        continue
      }
      const key = format(cellDate, 'yyyy-MM-dd')
      if (!weekFirstDate) weekFirstDate = key
      const count = completedMap.get(key) ?? 0
      cells.push({ date: key, count })

      if (count > 0) {
        weekTotal += count
        total += count
        daysWithActivity++
        if (count > max) max = count
        if (!bestDay || count > bestDay.count) bestDay = { date: key, count }
      }

      // Label this column whenever the 1st of a month falls inside it.
      // GitHub does exactly this — clean and unambiguous, no mid-month labels.
      if (cellDate.getDate() === 1) {
        rawLabels.push({ col: w, label: MONTH_NAMES[cellDate.getMonth()] })
      }
    }

    if (weekFirstDate && (!bestWeek || weekTotal > bestWeek.count)) {
      bestWeek = { firstDate: weekFirstDate, count: weekTotal }
    }
    weeksOut.push({ cells })
  }

  // Dedupe and space labels so they can't visually collide. Drop any label that
  // sits within 3 columns of the previous one — at the rendered cell size that's
  // ~50px between labels, enough for any 3-letter month name.
  const monthLabels: { col: number; label: string }[] = []
  for (const m of rawLabels) {
    const last = monthLabels[monthLabels.length - 1]
    if (!last || m.col - last.col >= 3) monthLabels.push(m)
  }

  return {
    weeks: weeksOut,
    monthLabels,
    max,
    total,
    daysWithActivity,
    bestDay,
    bestWeek,
    rangeStart: format(startSunday, 'yyyy-MM-dd'),
    rangeEnd: format(today, 'yyyy-MM-dd'),
  }
}

export function buildStatusBreakdown(tasks: Task[]) {
  const s = summarize(tasks)
  return STATUS_FLOW.map((status) => ({
    status,
    value: s.byStatus[status],
  }))
}

export function buildPriorityBreakdown(tasks: Task[]) {
  const s = summarize(tasks)
  return (['urgent', 'high', 'medium', 'low'] as TaskPriority[]).map((priority) => ({
    priority,
    value: s.byPriority[priority],
  }))
}
