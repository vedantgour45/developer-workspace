/**
 * Reads the current user broadcast by the host. Falls back to DEMO_USER when
 * running standalone or in demo mode.
 */

export interface CurrentUserSnapshot {
  id: string
  name: string
  email: string
  avatarUrl: string
}

const KEY = 'dw:currentUser'

export const DEMO_USER: CurrentUserSnapshot = {
  id: 'demo',
  name: 'You',
  email: '',
  avatarUrl: '',
}

export function readCurrentUser(): CurrentUserSnapshot {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEMO_USER
    const parsed = JSON.parse(raw) as Partial<CurrentUserSnapshot>
    return {
      id: typeof parsed.id === 'string' ? parsed.id : '',
      name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name : 'You',
      email: typeof parsed.email === 'string' ? parsed.email : '',
      avatarUrl: typeof parsed.avatarUrl === 'string' ? parsed.avatarUrl : '',
    }
  } catch {
    return DEMO_USER
  }
}

export function subscribeCurrentUser(cb: (u: CurrentUserSnapshot) => void): () => void {
  cb(readCurrentUser())
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) cb(readCurrentUser())
  }
  window.addEventListener('storage', onStorage)
  return () => window.removeEventListener('storage', onStorage)
}

/** Convenience hook for components. */
import { useEffect, useState } from 'react'
export function useCurrentUser(): CurrentUserSnapshot {
  const [user, setUser] = useState<CurrentUserSnapshot>(() => readCurrentUser())
  useEffect(() => subscribeCurrentUser(setUser), [])
  return user
}
