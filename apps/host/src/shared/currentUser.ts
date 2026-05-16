/**
 * Cross-MFE current-user broadcasting via localStorage + storage events.
 *
 * The host owns the auth state (Supabase lives in the host). MFEs are headless
 * to auth but need to know who's signed in for things like task `assignee` and
 * comment author. The host writes a small "current user" snapshot under
 * `dw:currentUser` on every auth change; each MFE has a matching reader that
 * subscribes to `storage` events to stay in sync.
 */

export interface CurrentUserSnapshot {
  /** Stable id (Supabase user id). Empty in demo mode. */
  id: string
  /** Best display name: full_name → name → email local part → 'You'. */
  name: string
  /** Email if available. */
  email: string
  /** Avatar URL if the OAuth provider gave us one. */
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

export function writeCurrentUser(snapshot: CurrentUserSnapshot | null): void {
  try {
    if (!snapshot) {
      localStorage.removeItem(KEY)
    } else {
      localStorage.setItem(KEY, JSON.stringify(snapshot))
    }
  } catch {}
}

/** Subscribe to changes. Calls `cb` immediately + on every `storage` event. */
export function subscribeCurrentUser(cb: (u: CurrentUserSnapshot) => void): () => void {
  cb(readCurrentUser())
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) cb(readCurrentUser())
  }
  window.addEventListener('storage', onStorage)
  return () => window.removeEventListener('storage', onStorage)
}
