import { useEffect, useState } from 'react'
import { STORAGE_KEYS, readJSON } from './storage'
import { subscribe } from './eventBus'
import {
  cloudEnabled,
  fetchAllTasks,
  fetchAllDocs,
  fetchRecentActivity,
  subscribeTable,
} from './cloudRepo'
import type { Task, Doc, ActivityEntry } from './types'

/**
 * Host data hooks. Two modes:
 *  - Cloud mode (`cloudEnabled`): fetch from Supabase + subscribe to
 *    Realtime so the dashboard reflects live changes from any user.
 *  - Demo mode: read the localStorage mirror, listen to the in-process
 *    event bus + cross-tab storage events.
 */

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(() =>
    cloudEnabled ? [] : readJSON(STORAGE_KEYS.tasks, [] as Task[]),
  )

  useEffect(() => {
    if (cloudEnabled) {
      let cancelled = false
      const reload = async () => {
        const rows = await fetchAllTasks()
        if (!cancelled) setTasks(rows)
      }
      void reload()
      const unsub = subscribeTable('tasks', () => {
        void reload()
      })
      return () => {
        cancelled = true
        unsub()
      }
    }
    const reload = () => setTasks(readJSON(STORAGE_KEYS.tasks, [] as Task[]))
    const unsubscribe = subscribe((event) => {
      if (event.type.startsWith('task:')) reload()
    })
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.tasks) reload()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      unsubscribe()
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  return tasks
}

export function useActivity() {
  const [activity, setActivity] = useState<ActivityEntry[]>(() =>
    cloudEnabled ? [] : readJSON(STORAGE_KEYS.activity, [] as ActivityEntry[]),
  )

  useEffect(() => {
    if (cloudEnabled) {
      let cancelled = false
      const reload = async () => {
        const rows = await fetchRecentActivity()
        if (!cancelled) setActivity(rows)
      }
      void reload()
      const unsub = subscribeTable('activity', () => {
        void reload()
      })
      return () => {
        cancelled = true
        unsub()
      }
    }
    const reload = () => setActivity(readJSON(STORAGE_KEYS.activity, [] as ActivityEntry[]))
    const unsubscribe = subscribe((event) => {
      if (event.type === 'activity:logged') reload()
    })
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.activity) reload()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      unsubscribe()
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  return activity
}

export function useDocs() {
  const [docs, setDocs] = useState<Doc[]>(() =>
    cloudEnabled ? [] : readJSON(STORAGE_KEYS.docs, [] as Doc[]),
  )

  useEffect(() => {
    if (cloudEnabled) {
      let cancelled = false
      const reload = async () => {
        const rows = await fetchAllDocs()
        if (!cancelled) setDocs(rows)
      }
      void reload()
      const unsub = subscribeTable('docs', () => {
        void reload()
      })
      return () => {
        cancelled = true
        unsub()
      }
    }
    const reload = () => setDocs(readJSON(STORAGE_KEYS.docs, [] as Doc[]))
    const unsubscribe = subscribe((event) => {
      if (event.type.startsWith('doc:')) reload()
    })
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.docs) reload()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      unsubscribe()
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  return docs
}
