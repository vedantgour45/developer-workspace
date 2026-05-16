import type { Task } from '../shared/types'

const HEADERS = [
  'id',
  'title',
  'status',
  'priority',
  'tags',
  'assignee',
  'createdAt',
  'updatedAt',
  'completedAt',
  'cycleHours',
]

function quote(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function tasksToCsv(tasks: Task[]): string {
  const rows = tasks.map((t) => {
    const cycle =
      t.completedAt && t.createdAt
        ? Math.round(
            (new Date(t.completedAt).getTime() - new Date(t.createdAt).getTime()) / 3_600_000,
          )
        : ''
    return [
      t.id,
      t.title,
      t.status,
      t.priority,
      t.tags.join('|'),
      t.assignee,
      t.createdAt,
      t.updatedAt,
      t.completedAt ?? '',
      cycle,
    ]
      .map(quote)
      .join(',')
  })
  return [HEADERS.join(','), ...rows].join('\n')
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
