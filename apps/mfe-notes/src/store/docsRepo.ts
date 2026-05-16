/**
 * docsRepo — Supabase-backed CRUD + Realtime for the docs table.
 */
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../shared/supabase'
import type { Doc, DocCover } from '../shared/types'

export interface DocRow {
  id: string
  title: string
  content: string
  emoji: string
  cover: DocCover | null
  tags: string[] | null
  pinned: boolean
  owner_id: string | null
  owner_name: string | null
  created_at: string
  updated_at: string
}

export const cloudEnabled = isSupabaseConfigured && !!supabase

export function rowToDoc(r: DocRow): Doc {
  return {
    id: r.id,
    title: r.title,
    content: r.content ?? '',
    emoji: r.emoji,
    cover: r.cover ?? { kind: 'none' },
    tags: r.tags ?? [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    pinned: r.pinned,
    ownerName: r.owner_name,
  }
}

export function docToInsert(d: Doc, ownerId: string | null) {
  return {
    id: d.id,
    title: d.title,
    content: d.content,
    emoji: d.emoji,
    cover: d.cover,
    tags: d.tags,
    pinned: d.pinned,
    owner_id: ownerId,
    owner_name: d.ownerName,
    created_at: d.createdAt,
    updated_at: d.updatedAt,
  }
}

export function docToPatch(patch: Partial<Doc>) {
  const out: Record<string, unknown> = {}
  if (patch.title !== undefined) out.title = patch.title
  if (patch.content !== undefined) out.content = patch.content
  if (patch.emoji !== undefined) out.emoji = patch.emoji
  if (patch.cover !== undefined) out.cover = patch.cover
  if (patch.tags !== undefined) out.tags = patch.tags
  if (patch.pinned !== undefined) out.pinned = patch.pinned
  if (patch.updatedAt !== undefined) out.updated_at = patch.updatedAt
  if (patch.ownerName !== undefined) out.owner_name = patch.ownerName
  return out
}

export async function fetchAllDocs(): Promise<Doc[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('docs')
    .select('*')
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false })
  if (error) {
    console.error('[docsRepo] fetchAllDocs failed:', error.message)
    return []
  }
  return (data as DocRow[]).map(rowToDoc)
}

export async function insertDoc(doc: Doc, ownerId: string | null): Promise<Doc | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('docs')
    .insert(docToInsert(doc, ownerId))
    .select('*')
    .single()
  if (error) {
    console.error('[docsRepo] insertDoc failed:', error.message)
    return null
  }
  return rowToDoc(data as DocRow)
}

export async function patchDoc(id: string, patch: Partial<Doc>): Promise<Doc | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('docs')
    .update(docToPatch(patch))
    .eq('id', id)
    .select('*')
    .single()
  if (error) {
    console.error('[docsRepo] patchDoc failed:', error.message)
    return null
  }
  return rowToDoc(data as DocRow)
}

export async function deleteDocRow(id: string): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase.from('docs').delete().eq('id', id)
  if (error) {
    console.error('[docsRepo] deleteDocRow failed:', error.message)
    return false
  }
  return true
}

export function subscribeDocs(onChange: () => void): () => void {
  if (!supabase) return () => {}
  const channel: RealtimeChannel = supabase
    .channel('dw:docs')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'docs' },
      () => onChange(),
    )
    .subscribe()
  return () => {
    supabase!.removeChannel(channel)
  }
}
