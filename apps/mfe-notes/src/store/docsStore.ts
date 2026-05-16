import { create } from 'zustand'
import { STORAGE_KEYS, readJSON, writeJSON, readString, writeString } from '../shared/storage'
import { emit } from '../shared/eventBus'
import { uid } from '../shared/format'
import { supabase } from '../shared/supabase'
import { readCurrentUser } from '../shared/currentUser'
import { toast } from '../shared/toast'
import {
  cloudEnabled,
  fetchAllDocs,
  insertDoc,
  patchDoc,
  deleteDocRow,
  subscribeDocs,
} from './docsRepo'
import type { Doc, DocCover } from '../shared/types'

interface DocsState {
  docs: Doc[]
  activeId: string | null
  ready: boolean
  cloud: boolean
  hydrate: () => Promise<void>
  setActive: (id: string | null) => void
  createDoc: (initial?: Partial<Doc>) => Promise<Doc>
  updateDoc: (id: string, patch: Partial<Doc>) => void
  deleteDoc: (id: string) => void
  togglePin: (id: string) => void
  duplicateDoc: (id: string) => Promise<Doc | null>
}

function normalize(d: Doc): Doc {
  const cover = d.cover ?? ({ kind: 'none' } as DocCover)
  const ownerName = d.ownerName ?? null
  return { ...d, cover, ownerName }
}

function persistLocal(docs: Doc[]) {
  if (cloudEnabled) return
  writeJSON(STORAGE_KEYS.docs, docs)
}

async function currentOwnerId(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

export const useDocsStore = create<DocsState>((set, get) => ({
  docs: cloudEnabled ? [] : readJSON(STORAGE_KEYS.docs, [] as Doc[]).map(normalize),
  activeId: readString(STORAGE_KEYS.activeDoc) || null,
  ready: !cloudEnabled,
  cloud: cloudEnabled,

  hydrate: async () => {
    if (!cloudEnabled) {
      set({
        docs: readJSON(STORAGE_KEYS.docs, [] as Doc[]).map(normalize),
        ready: true,
      })
      return
    }
    const docs = await fetchAllDocs()
    set({ docs, ready: true })
  },

  setActive: (id) => {
    writeString(STORAGE_KEYS.activeDoc, id ?? '')
    set({ activeId: id })
  },

  createDoc: async (initial) => {
    const now = new Date().toISOString()
    const me = readCurrentUser()
    const doc: Doc = {
      id: uid('d'),
      title: initial?.title ?? 'Untitled',
      content: initial?.content ?? '',
      emoji: initial?.emoji ?? '📝',
      cover: initial?.cover ?? { kind: 'none' },
      tags: initial?.tags ?? [],
      createdAt: now,
      updatedAt: now,
      pinned: false,
      ownerName: me.name,
    }
    const docs = [doc, ...get().docs]
    persistLocal(docs)
    writeString(STORAGE_KEYS.activeDoc, doc.id)
    set({ docs, activeId: doc.id })
    emit({ type: 'doc:created', doc })
    toast.success('Note created', { description: doc.title || 'Untitled' })

    if (cloudEnabled) {
      const ownerId = await currentOwnerId()
      const inserted = await insertDoc(doc, ownerId)
      if (inserted) {
        set((s) => ({ docs: s.docs.map((d) => (d.id === inserted.id ? inserted : d)) }))
      }
    }
    return doc
  },

  updateDoc: (id, patch) => {
    const now = new Date().toISOString()
    let updated: Doc | null = null
    const docs = get().docs.map((d) => {
      if (d.id !== id) return d
      updated = { ...d, ...patch, updatedAt: now }
      return updated
    })
    if (!updated) return
    persistLocal(docs)
    set({ docs })
    emit({ type: 'doc:updated', doc: updated })

    if (cloudEnabled) {
      void patchDoc(id, { ...patch, updatedAt: now })
    }
  },

  deleteDoc: (id) => {
    const target = get().docs.find((d) => d.id === id)
    const docs = get().docs.filter((d) => d.id !== id)
    persistLocal(docs)
    const wasActive = get().activeId === id
    const nextActive = wasActive ? docs[0]?.id ?? null : get().activeId
    writeString(STORAGE_KEYS.activeDoc, nextActive ?? '')
    set({ docs, activeId: nextActive })
    emit({ type: 'doc:deleted', docId: id })
    if (target) toast.success('Note deleted', { description: target.title || 'Untitled' })

    if (cloudEnabled) {
      void deleteDocRow(id)
    }
  },

  togglePin: (id) => {
    const doc = get().docs.find((d) => d.id === id)
    if (!doc) return
    get().updateDoc(id, { pinned: !doc.pinned })
    toast.success(doc.pinned ? 'Unpinned note' : 'Pinned note', {
      description: doc.title || 'Untitled',
    })
  },

  duplicateDoc: async (id) => {
    const source = get().docs.find((d) => d.id === id)
    if (!source) return null
    return get().createDoc({
      title: `${source.title} (copy)`,
      content: source.content,
      emoji: source.emoji,
      cover: source.cover,
      tags: source.tags,
    })
  },
}))

// --------- Cloud bootstrap ---------

if (cloudEnabled) {
  void useDocsStore.getState().hydrate()

  supabase?.auth.onAuthStateChange((_event) => {
    void useDocsStore.getState().hydrate()
  })

  subscribeDocs(async () => {
    const docs = await fetchAllDocs()
    useDocsStore.setState({ docs })
    emit({ type: 'doc:updated', doc: docs[0] ?? ({} as Doc) })
  })
}
