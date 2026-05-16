import type { Task, Doc, ActivityEntry } from './types'
import { STORAGE_KEYS, readJSON, writeJSON } from './storage'
import { cloudEnabled } from './cloudRepo'

const NOW = Date.now()
const day = (offset: number) => new Date(NOW - offset * 86_400_000).toISOString()
const dueIn = (days: number) => {
  const d = new Date(NOW + days * 86_400_000)
  return d.toISOString().slice(0, 10)
}

/** Sample tasks omit the new multi-assignee fields; seedIfEmpty fills them in. */
type SeedTask = Omit<Task, 'assignees' | 'ownerName'>
const sampleTasks: SeedTask[] = [
  {
    id: 't_1',
    key: 'DW-1',
    title: 'Design workspace overview',
    description:
      '## Overview\n\nSketch the wireframe for the cross-app dashboard, including live counts, recent activity stream, and the pipeline rollup.\n\n- Sketch in Figma\n- Validate with two engineers\n- Hand off final spec',
    status: 'done',
    priority: 'high',
    tags: ['design', 'dashboard'],
    assignee: 'You',
    storyPoints: 5,
    dueDate: dueIn(-3),
    subtasks: [
      { id: 's_1', title: 'Wireframe in Figma', done: true },
      { id: 's_2', title: 'Get stakeholder feedback', done: true },
      { id: 's_3', title: 'Hand off to engineering', done: true },
    ],
    comments: [
      { id: 'c_1', author: 'You', body: 'Sign-off received from design lead.', at: day(2) },
    ],
    createdAt: day(10),
    updatedAt: day(2),
    completedAt: day(2),
    order: 0,
  },
  {
    id: 't_2',
    key: 'DW-2',
    title: 'Drag and drop on the board',
    description:
      'Implement keyboard-accessible drag and drop with DragOverlay, sortable columns, and per-column ordering persistence.',
    status: 'done',
    priority: 'high',
    tags: ['feature', 'a11y'],
    assignee: 'You',
    storyPoints: 8,
    dueDate: dueIn(-1),
    subtasks: [
      { id: 's_4', title: 'Wire DndContext + sensors', done: true },
      { id: 's_5', title: 'Sortable columns', done: true },
      { id: 's_6', title: 'Keyboard navigation', done: true },
    ],
    comments: [],
    createdAt: day(8),
    updatedAt: day(4),
    completedAt: day(4),
    order: 1,
  },
  {
    id: 't_3',
    key: 'DW-3',
    title: 'Slash command menu for the editor',
    description:
      'Add `/` trigger detection inside the Notes editor with a floating menu of insertable blocks.\n\n> Inspired by Notion. Keep keyboard navigation tight.',
    status: 'in_review',
    priority: 'medium',
    tags: ['editor'],
    assignee: 'You',
    storyPoints: 5,
    dueDate: dueIn(1),
    subtasks: [
      { id: 's_7', title: 'Detect / trigger reliably', done: true },
      { id: 's_8', title: 'Floating menu with arrow nav', done: true },
      { id: 's_9', title: 'Insert block at caret', done: false },
    ],
    comments: [
      { id: 'c_2', author: 'You', body: 'Caret math feels right after the rewrite. Ready for review.', at: day(1) },
    ],
    createdAt: day(6),
    updatedAt: day(1),
    completedAt: null,
    order: 0,
  },
  {
    id: 't_4',
    key: 'DW-4',
    title: 'Productivity heatmap',
    description:
      'Aggregate completion counts per day for the last 12 weeks. Heavily memoize the input so the chart never blocks the main thread.',
    status: 'in_progress',
    priority: 'high',
    tags: ['analytics', 'perf'],
    assignee: 'You',
    storyPoints: 3,
    dueDate: dueIn(3),
    subtasks: [
      { id: 's_10', title: 'Aggregator function', done: true },
      { id: 's_11', title: 'GitHub-style 7×12 grid', done: true },
      { id: 's_12', title: 'Tooltip on hover', done: false },
    ],
    comments: [],
    createdAt: day(5),
    updatedAt: day(0),
    completedAt: null,
    order: 0,
  },
  {
    id: 't_5',
    key: 'DW-5',
    title: 'Export tasks as CSV',
    description: 'Write a small RFC-4180 safe CSV serializer. Download via Blob URL.',
    status: 'in_progress',
    priority: 'medium',
    tags: ['export'],
    assignee: 'You',
    storyPoints: 2,
    dueDate: dueIn(5),
    subtasks: [
      { id: 's_13', title: 'Quote escaping', done: true },
      { id: 's_14', title: 'Download via Blob', done: true },
    ],
    comments: [],
    createdAt: day(4),
    updatedAt: day(0),
    completedAt: null,
    order: 1,
  },
  {
    id: 't_6',
    key: 'DW-6',
    title: 'Reconcile design tokens',
    description:
      'Make every app pull from one source of truth for color, spacing, type, and radii.',
    status: 'backlog',
    priority: 'medium',
    tags: ['design-system'],
    assignee: 'You',
    storyPoints: 5,
    dueDate: dueIn(7),
    subtasks: [],
    comments: [],
    createdAt: day(3),
    updatedAt: day(3),
    completedAt: null,
    order: 0,
  },
  {
    id: 't_7',
    key: 'DW-7',
    title: 'Empty-state illustrations',
    description: 'Draw lightweight inline SVGs for empty columns and no-doc states.',
    status: 'backlog',
    priority: 'low',
    tags: ['polish'],
    assignee: 'You',
    storyPoints: 2,
    dueDate: null,
    subtasks: [],
    comments: [],
    createdAt: day(2),
    updatedAt: day(2),
    completedAt: null,
    order: 1,
  },
  {
    id: 't_8',
    key: 'DW-8',
    title: 'Keyboard shortcuts overlay',
    description: 'Cmd+/ opens a cheat sheet listing every shortcut available in the current section.',
    status: 'backlog',
    priority: 'low',
    tags: ['a11y', 'polish'],
    assignee: 'You',
    storyPoints: 3,
    dueDate: null,
    subtasks: [],
    comments: [],
    createdAt: day(1),
    updatedAt: day(1),
    completedAt: null,
    order: 2,
  },
]

const sampleActivity: ActivityEntry[] = [
  { id: 'a_1', taskId: 't_2', taskTitle: 'Drag and drop on the board', type: 'completed', toStatus: 'done', at: day(4) },
  { id: 'a_2', taskId: 't_3', taskTitle: 'Slash command menu for the editor', type: 'moved', fromStatus: 'in_progress', toStatus: 'in_review', at: day(1) },
  { id: 'a_3', taskId: 't_4', taskTitle: 'Productivity heatmap', type: 'edited', at: day(0) },
  { id: 'a_4', taskId: 't_5', taskTitle: 'Export tasks as CSV', type: 'edited', at: day(0) },
  { id: 'a_5', taskId: 't_1', taskTitle: 'Design workspace overview', type: 'completed', toStatus: 'done', at: day(2) },
]

const sampleDocs: Doc[] = [
  {
    id: 'd_1',
    title: 'Welcome to your workspace',
    emoji: '👋',
    cover: { kind: 'gradient', from: '#cc785c', to: '#e8a55a' },
    content: `# Welcome to your workspace

This is your home for notes, tasks, and insights — one place to plan and ship the work you care about.

> Tip: type \`/\` anywhere on this page to open the block menu. It's the fastest way to add headings, lists, code, callouts, and more.

## What lives here

- **Notes** — long-form docs, design specs, meeting notes
- **Tasks** — the kanban board, with priorities, due dates, and subtasks
- **Analytics** — at-a-glance read of your throughput

## Quick start

1. Open **Notes** and write your first doc — your scratchpad is empty.
2. Open **Tasks** and drag the cards between columns to see how it moves.
3. Come back to the **Dashboard** for the live rollup.

## Keyboard shortcuts

- \`N\` — new task (on the board)
- \`/\` — search tasks / open block menu in notes
- \`Cmd+S\` — force save the current doc

Happy building.
`,
    tags: ['getting-started'],
    createdAt: day(12),
    updatedAt: day(0),
    pinned: true,
    ownerName: 'You',
  },
  {
    id: 'd_2',
    title: 'Design system',
    emoji: '🎨',
    cover: { kind: 'solid', color: '#efe9de' },
    content: `# Design system

A warm cream canvas paired with coral CTAs and dark navy product surfaces.

## Colors

- Canvas \`#faf9f5\` — page floor
- Coral \`#cc785c\` — primary CTAs
- Navy \`#181715\` — product mockup surfaces

## Type

Serif display headlines for tone, humanist sans body for clarity. Negative letter-spacing on display sizes is non-negotiable.

## Spacing

4px base. Section rhythm at 96px; card padding at 32px.

\`\`\`ts
export const tokens = {
  canvas: '#faf9f5',
  ink: '#141413',
  primary: '#cc785c',
}
\`\`\`
`,
    tags: ['design-system', 'reference'],
    createdAt: day(9),
    updatedAt: day(5),
    pinned: false,
    ownerName: 'You',
  },
  {
    id: 'd_3',
    title: 'Sprint plan',
    emoji: '🗒️',
    cover: { kind: 'none' },
    content: `# Sprint plan

## Goals
- [x] Ship the kanban board with full DnD
- [x] Land the notes editor with slash commands
- [ ] Heatmap on the analytics page
- [ ] Polish empty states everywhere

## Risks
- Accessibility story for DnD needs a screen-reader pass
- Recharts + date-fns bundle size

## Notes

Type \`/\` to drop in a block anywhere in this doc.
`,
    tags: ['planning'],
    createdAt: day(2),
    updatedAt: day(0),
    pinned: false,
    ownerName: 'You',
  },
]

export function seedIfEmpty(): void {
  // In cloud mode the source of truth is Supabase. Don't pollute localStorage
  // with sample data the app won't read anyway.
  if (cloudEnabled) return
  if (localStorage.getItem(STORAGE_KEYS.seeded) === '2') return
  if (!readJSON(STORAGE_KEYS.tasks, null as Task[] | null)) {
    const hydrated: Task[] = sampleTasks.map((t) => ({
      ...t,
      assignees: [{ id: 'demo', name: t.assignee }],
      ownerName: t.assignee,
    }))
    writeJSON(STORAGE_KEYS.tasks, hydrated)
  }
  if (!readJSON(STORAGE_KEYS.activity, null as ActivityEntry[] | null)) {
    writeJSON(STORAGE_KEYS.activity, sampleActivity)
  }
  if (!readJSON(STORAGE_KEYS.docs, null as Doc[] | null)) {
    writeJSON(STORAGE_KEYS.docs, sampleDocs)
  }
  localStorage.setItem(STORAGE_KEYS.seeded, '2')
}
