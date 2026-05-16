export type DocCover =
  | { kind: 'none' }
  | { kind: 'solid'; color: string }
  | { kind: 'gradient'; from: string; to: string }

export interface Doc {
  id: string
  title: string
  content: string
  emoji: string
  cover: DocCover
  tags: string[]
  createdAt: string
  updatedAt: string
  pinned: boolean
  /** Display label for the task creator. */
  ownerName: string | null
}

export const COVER_PRESETS: DocCover[] = [
  { kind: 'none' },
  { kind: 'solid', color: '#efe9de' },
  { kind: 'solid', color: '#181715' },
  { kind: 'gradient', from: '#cc785c', to: '#e8a55a' },
  { kind: 'gradient', from: '#5db8a6', to: '#3d8a7f' },
  { kind: 'gradient', from: '#252320', to: '#4a4540' },
  { kind: 'gradient', from: '#f5d6c7', to: '#cc785c' },
]

export function coverStyle(cover: DocCover): React.CSSProperties {
  if (cover.kind === 'solid') return { background: cover.color }
  if (cover.kind === 'gradient') return { background: `linear-gradient(135deg, ${cover.from}, ${cover.to})` }
  return {}
}
