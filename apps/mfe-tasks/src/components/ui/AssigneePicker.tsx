/**
 * AssigneePicker — multi-select dropdown sourced from the union of:
 *   1) the public.profiles directory (every user who has signed in)
 *   2) the optional `extraOptions` prop (typically the union of every
 *      assignee already stamped on a task, so people who showed up in
 *      historical data are still pickable even if their profile row
 *      is missing).
 *
 * In demo mode (no Supabase) it falls back to a single-option list
 * containing only the current user.
 *
 * Renders a trigger that summarises the current selection (avatars +
 * "+N more") and a floating panel with viewport-clamped position. The
 * panel is portalled to document.body so it can't be clipped by an
 * ancestor with a transform (e.g. modal/drawer animations).
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { AssigneeRef, Profile } from '../../shared/types'
import { fetchProfiles, subscribeProfiles, cloudEnabled } from '../../store/tasksRepo'
import { readCurrentUser } from '../../shared/currentUser'

interface Props {
  value: AssigneeRef[]
  onChange: (next: AssigneeRef[]) => void
  /**
   * Additional people to include in the picker beyond the profiles table.
   * Use this to surface anyone already stamped on a task or doc whose
   * profile row may not exist (e.g. legacy data, deleted profile,
   * teammate who hasn't signed in on this build yet).
   */
  extraOptions?: AssigneeRef[]
  ariaLabel?: string
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function Avatar({ name, size = 22 }: { name: string; size?: number }) {
  return (
    <span
      className="rounded-full bg-surface-dark text-on-dark font-medium flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, fontSize: size <= 22 ? 10 : 11 }}
    >
      {initialsOf(name)}
    </span>
  )
}

export default function AssigneePicker({
  value,
  onChange,
  extraOptions,
  ariaLabel,
}: Props) {
  const [open, setOpen] = useState(false)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 260,
  })

  // Hydrate profile list. Cloud mode: query + subscribe.
  // Demo mode: synthesize from the current user broadcast.
  useEffect(() => {
    let cancelled = false
    if (!cloudEnabled) {
      const me = readCurrentUser()
      setProfiles([{ id: me.id || 'demo', name: me.name, email: me.email, avatarUrl: me.avatarUrl }])
      return
    }
    const reload = async () => {
      const next = await fetchProfiles()
      if (!cancelled) setProfiles(next)
    }
    void reload()
    const unsub = subscribeProfiles(() => {
      void reload()
    })
    return () => {
      cancelled = true
      unsub()
    }
  }, [])

  // Refetch profiles every time the dropdown opens. Catches newly signed-in
  // teammates without waiting for a Realtime echo or remount.
  useEffect(() => {
    if (!open || !cloudEnabled) return
    let cancelled = false
    void (async () => {
      const next = await fetchProfiles()
      if (!cancelled) setProfiles(next)
    })()
    return () => {
      cancelled = true
    }
  }, [open])

  // Merge profiles + extraOptions into the visible option list.
  // Dedup is keyed by lowercased name: each person should show up once,
  // even if they appear in both a profile row (real Supabase user id) and
  // a legacy task.assignee text field (synthetic 'legacy' id). When a
  // profile exists for that name, it wins so we keep the canonical id +
  // email — toggle()'s selection writes the canonical id back onto the
  // task.
  const options = useMemo<Profile[]>(() => {
    const byName = new Map<string, Profile>()
    const norm = (s: string) => s.trim().toLowerCase()
    // Profiles first — authoritative (real ids + emails).
    for (const p of profiles) {
      const key = norm(p.name)
      if (key) byName.set(key, p)
    }
    // Then extras — only if no profile already covers that name.
    for (const e of extraOptions ?? []) {
      const key = norm(e.name)
      if (!key || byName.has(key)) continue
      byName.set(key, { id: e.id, name: e.name, email: '', avatarUrl: '' })
    }
    return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [profiles, extraOptions])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!buttonRef.current?.contains(t) && !panelRef.current?.contains(t)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useLayoutEffect(() => {
    if (!open) return
    const reposition = () => {
      const btn = buttonRef.current
      if (!btn) return
      const rect = btn.getBoundingClientRect()
      const width = Math.max(260, rect.width)
      const margin = 8
      let left = rect.left
      if (left + width > window.innerWidth - margin) left = window.innerWidth - margin - width
      if (left < margin) left = margin
      let top = rect.bottom + 4
      const estimatedHeight = Math.min(options.length * 40 + 24, 280)
      if (top + estimatedHeight > window.innerHeight - margin) {
        top = Math.max(margin, rect.top - estimatedHeight - 4)
      }
      setPos({ top, left, width })
    }
    reposition()
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [open, options.length])

  // Match on id-or-name so we toggle correctly even when the option
  // came from extraOptions with a synthetic id (e.g. 'legacy').
  const isSelected = (p: Profile) =>
    value.some(
      (v) =>
        (v.id && p.id && v.id === p.id) ||
        v.name.toLowerCase() === p.name.toLowerCase(),
    )
  const toggle = (p: Profile) => {
    if (isSelected(p)) {
      onChange(
        value.filter(
          (v) =>
            !(
              (v.id && p.id && v.id === p.id) ||
              v.name.toLowerCase() === p.name.toLowerCase()
            ),
        ),
      )
    } else {
      onChange([...value, { id: p.id, name: p.name }])
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel ?? 'Pick assignees'}
        className="w-full min-h-10 px-3 py-1.5 rounded-md bg-canvas border border-hairline text-left text-sm text-ink hover:border-ink/30 focus:border-primary focus:outline-none flex items-center gap-2"
      >
        {value.length === 0 ? (
          <span className="text-muted-soft">Pick assignees…</span>
        ) : (
          <div className="flex items-center gap-1.5 flex-wrap">
            {value.slice(0, 3).map((a) => (
              <span
                key={a.id}
                className="inline-flex items-center gap-1.5 bg-surface-card rounded-full pr-2 pl-0.5 py-0.5"
              >
                <Avatar name={a.name} size={20} />
                <span className="text-[12px]">{a.name}</span>
              </span>
            ))}
            {value.length > 3 && (
              <span className="text-[11px] text-muted">+{value.length - 3} more</span>
            )}
          </div>
        )}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-3.5 h-3.5 text-muted ml-auto flex-shrink-0"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          role="listbox"
          aria-multiselectable
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: pos.width,
            zIndex: 60,
            maxHeight: 280,
            boxShadow: '0 16px 40px rgba(20,20,19,0.16)',
          }}
          className="rounded-lg bg-canvas border border-hairline overflow-y-auto py-1"
        >
          {options.length === 0 ? (
            <p className="px-3 py-3 text-[12px] text-muted-soft italic">
              No active users yet. Have a teammate sign in to populate this list.
            </p>
          ) : (
            options.map((p) => {
              const selected = isSelected(p)
              return (
                <button
                  key={`${p.id}:${p.name}`}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => toggle(p)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left text-[13px] hover:bg-surface-card transition-colors"
                >
                  <span
                    className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                      selected ? 'bg-primary border-primary text-on-primary' : 'border-hairline'
                    }`}
                  >
                    {selected && (
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-2.5 h-2.5"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                  </span>
                  <Avatar name={p.name} size={24} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-ink font-medium truncate">{p.name}</span>
                    {p.email && (
                      <span className="block text-[11px] text-muted truncate">{p.email}</span>
                    )}
                  </span>
                </button>
              )
            })
          )}
        </div>,
        document.body,
      )}
    </>
  )
}
