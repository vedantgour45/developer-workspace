/**
 * useKnownAssignees — returns one {id, name} entry per unique person seen
 * across every task (in `assignees`, the legacy `assignee` text,
 * `ownerName`, and `comments[].author`). When the same person shows up
 * with both a real id (from task.assignees) and a synthetic `legacy` id
 * (from text fields), the real id wins.
 *
 * Feeds the AssigneePicker so historical names stay pickable even if
 * their `profiles` row is missing.
 */
import { useMemo } from 'react'
import { useBoardStore } from '../store/boardStore'
import type { AssigneeRef } from './types'

const SYNTHETIC = new Set(['legacy', 'demo', ''])

export function useKnownAssignees(): AssigneeRef[] {
  const tasks = useBoardStore((s) => s.tasks)
  return useMemo(() => {
    // Keyed by lowercased name so each person collapses to one entry.
    const byName = new Map<string, AssigneeRef>()
    const add = (id: string, name: string) => {
      const trimmed = name?.trim()
      if (!trimmed) return
      const key = trimmed.toLowerCase()
      const incomingHasRealId = !!id && !SYNTHETIC.has(id)
      const existing = byName.get(key)
      // First seen wins, OR upgrade an existing legacy entry to a real-id one.
      if (!existing) {
        byName.set(key, { id: id || 'legacy', name: trimmed })
      } else if (incomingHasRealId && SYNTHETIC.has(existing.id)) {
        byName.set(key, { id, name: trimmed })
      }
    }
    for (const t of tasks) {
      for (const a of t.assignees) add(a.id, a.name)
      add('legacy', t.assignee)
      if (t.ownerName) add('legacy', t.ownerName)
      for (const c of t.comments) add('legacy', c.author)
    }
    return Array.from(byName.values())
  }, [tasks])
}
