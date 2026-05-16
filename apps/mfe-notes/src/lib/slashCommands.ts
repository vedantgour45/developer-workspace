export interface SlashCommand {
  id: string
  label: string
  hint: string
  group: 'Basics' | 'Lists' | 'Callouts' | 'Code & Data' | 'Inline'
  keywords: string[]
  insert: string
  cursorOffset?: number
}

export const SLASH_COMMANDS: SlashCommand[] = [
  // Basics
  { id: 'text', label: 'Text', hint: 'Plain paragraph', group: 'Basics', keywords: ['text', 'paragraph', 'p'], insert: '' },
  { id: 'h1', label: 'Heading 1', hint: 'Big section heading', group: 'Basics', keywords: ['h1', 'heading', 'title'], insert: '# ' },
  { id: 'h2', label: 'Heading 2', hint: 'Medium section heading', group: 'Basics', keywords: ['h2', 'heading'], insert: '## ' },
  { id: 'h3', label: 'Heading 3', hint: 'Small section heading', group: 'Basics', keywords: ['h3', 'heading'], insert: '### ' },
  { id: 'divider', label: 'Divider', hint: 'Horizontal rule', group: 'Basics', keywords: ['divider', 'rule', 'hr', 'line'], insert: '\n---\n' },

  // Lists
  { id: 'bullet', label: 'Bulleted list', hint: 'Unordered list', group: 'Lists', keywords: ['list', 'bullet', 'ul'], insert: '- ' },
  { id: 'numbered', label: 'Numbered list', hint: 'Ordered list', group: 'Lists', keywords: ['number', 'ordered', 'ol'], insert: '1. ' },
  { id: 'todo', label: 'To-do list', hint: 'Checklist with tappable boxes', group: 'Lists', keywords: ['todo', 'task', 'checklist', 'check'], insert: '- [ ] ' },
  { id: 'toggle', label: 'Toggle', hint: 'Collapsible details block', group: 'Lists', keywords: ['toggle', 'collapse', 'details', 'expand'], insert: '<details>\n<summary>Click to expand</summary>\n\nHidden content here.\n\n</details>\n' },

  // Callouts
  { id: 'callout-info', label: 'Info callout', hint: 'Teal-tinted block', group: 'Callouts', keywords: ['callout', 'info', 'note'], insert: '> [!info]\n> ' },
  { id: 'callout-warn', label: 'Warning callout', hint: 'Amber-tinted block', group: 'Callouts', keywords: ['warning', 'caution'], insert: '> [!warning]\n> ' },
  { id: 'callout-tip', label: 'Tip callout', hint: 'Coral-tinted block', group: 'Callouts', keywords: ['tip', 'highlight'], insert: '> [!tip]\n> ' },
  { id: 'quote', label: 'Quote', hint: 'Indented blockquote', group: 'Callouts', keywords: ['quote', 'blockquote'], insert: '> ' },

  // Code & data
  { id: 'code', label: 'Code block', hint: 'Monospace fenced block', group: 'Code & Data', keywords: ['code', 'pre', 'snippet', 'fence'], insert: '```ts\n\n```', cursorOffset: 4 },
  { id: 'table', label: 'Table', hint: '3-column starter', group: 'Code & Data', keywords: ['table', 'grid'], insert: '| Column A | Column B | Column C |\n| --- | --- | --- |\n| | | |\n| | | |\n' },

  // Inline
  { id: 'inline', label: 'Inline code', hint: 'Monospace span', group: 'Inline', keywords: ['inline', 'code', 'span'], insert: '``', cursorOffset: 1 },
  { id: 'link', label: 'Link', hint: 'Hyperlink', group: 'Inline', keywords: ['link', 'url', 'href'], insert: '[label](https://)', cursorOffset: 9 },
  { id: 'bold', label: 'Bold', hint: 'Strong emphasis', group: 'Inline', keywords: ['bold', 'strong'], insert: '****', cursorOffset: 2 },
  { id: 'italic', label: 'Italic', hint: 'Light emphasis', group: 'Inline', keywords: ['italic', 'em'], insert: '**', cursorOffset: 1 },
  { id: 'date', label: 'Today', hint: 'Insert today\'s date', group: 'Inline', keywords: ['date', 'today'], insert: today() },
]

function today(): string {
  const d = new Date()
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

export function filterCommands(query: string): SlashCommand[] {
  const q = query.toLowerCase().trim()
  if (!q) return SLASH_COMMANDS
  return SLASH_COMMANDS.filter(
    (c) =>
      c.label.toLowerCase().includes(q) ||
      c.keywords.some((k) => k.includes(q)) ||
      c.id.includes(q),
  )
}
