const PREFIX = 'dw:'

export const STORAGE_KEYS = {
  tasks: `${PREFIX}tasks`,
  activity: `${PREFIX}activity`,
  docs: `${PREFIX}docs`,
  seeded: `${PREFIX}seeded`,
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]

export function readJSON<T>(key: StorageKey, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}
