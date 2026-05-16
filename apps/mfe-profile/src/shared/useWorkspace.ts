import { useEffect, useState } from 'react'
import { STORAGE_KEYS, readJSON } from './storage'
import { subscribe } from './eventBus'
import type { ActivityEntry, Task } from './types'

export function useWorkspace() {
  const [tasks, setTasks] = useState<Task[]>(() => readJSON(STORAGE_KEYS.tasks, [] as Task[]))
  const [activity, setActivity] = useState<ActivityEntry[]>(() =>
    readJSON(STORAGE_KEYS.activity, [] as ActivityEntry[]),
  )

  useEffect(() => {
    const reload = () => {
      setTasks(readJSON(STORAGE_KEYS.tasks, [] as Task[]))
      setActivity(readJSON(STORAGE_KEYS.activity, [] as ActivityEntry[]))
    }
    const unsub = subscribe(reload)
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.tasks || e.key === STORAGE_KEYS.activity) reload()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      unsub()
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  return { tasks, activity }
}
