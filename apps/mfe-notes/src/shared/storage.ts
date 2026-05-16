const PREFIX = 'dw:'

export const STORAGE_KEYS = {
  tasks: `${PREFIX}tasks`,
  activity: `${PREFIX}activity`,
  docs: `${PREFIX}docs`,
  activeDoc: `${PREFIX}docs:active`,
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

export function writeJSON<T>(key: StorageKey, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.warn('storage.write failed', key, e)
  }
}

export function readString(key: StorageKey, fallback = ''): string {
  try {
    return localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

export function writeString(key: StorageKey, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {}
}
