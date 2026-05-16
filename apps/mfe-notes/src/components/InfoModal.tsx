import { useEffect } from 'react'

interface Props {
  onClose: () => void
}

interface Row {
  label: string
  syntax: string
  result: React.ReactNode
}

const headings: Row[] = [
  { label: 'Heading 1', syntax: '# Big heading', result: <h1 className="font-display text-2xl text-ink m-0">Big heading</h1> },
  { label: 'Heading 2', syntax: '## Section heading', result: <h2 className="font-display text-xl text-ink m-0">Section heading</h2> },
  { label: 'Heading 3', syntax: '### Sub-section', result: <h3 className="font-display text-lg text-ink m-0">Sub-section</h3> },
]

const inline: Row[] = [
  { label: 'Bold', syntax: '**important**', result: <strong className="text-ink">important</strong> },
  { label: 'Italic', syntax: '*emphasis*', result: <em className="text-ink">emphasis</em> },
  { label: 'Inline code', syntax: '`useState()`', result: <code className="bg-surface-card text-ink px-1.5 py-0.5 rounded text-[13px] font-mono">useState()</code> },
  { label: 'Link', syntax: '[Anthropic](https://anthropic.com)', result: <a href="#" onClick={(e) => e.preventDefault()} className="text-primary underline underline-offset-2">Anthropic</a> },
  { label: 'Strikethrough', syntax: '~~done~~', result: <s className="text-muted">done</s> },
]

const lists: Row[] = [
  { label: 'Bullet list', syntax: '- First item\n- Second item', result: <ul className="m-0 pl-5 text-ink"><li>First item</li><li>Second item</li></ul> },
  { label: 'Numbered list', syntax: '1. Step one\n2. Step two', result: <ol className="m-0 pl-5 text-ink"><li>Step one</li><li>Step two</li></ol> },
  { label: 'Checklist', syntax: '- [ ] Open\n- [x] Done', result: <ul className="m-0 pl-1 list-none text-ink"><li><input type="checkbox" disabled className="mr-2 accent-primary" />Open</li><li><input type="checkbox" defaultChecked disabled className="mr-2 accent-primary" />Done</li></ul> },
]

const blocks: Row[] = [
  {
    label: 'Quote',
    syntax: '> A short pull-quote.',
    result: <blockquote className="border-l-2 border-primary bg-surface-soft pl-3 py-1.5 m-0 text-body-strong rounded-r">A short pull-quote.</blockquote>,
  },
  {
    label: 'Info callout',
    syntax: '> [!info]\n> This is informational.',
    result: (
      <div className="bg-accent-teal/10 border border-accent-teal/30 rounded-lg px-3 py-2 text-[#1f5d54] flex items-start gap-2">
        <span className="w-4 h-4 rounded-full bg-accent-teal text-white text-[11px] font-bold italic flex items-center justify-center flex-shrink-0 mt-0.5">i</span>
        <span>This is informational.</span>
      </div>
    ),
  },
  {
    label: 'Tip callout',
    syntax: '> [!tip]\n> Try the slash menu.',
    result: (
      <div className="bg-primary/10 border border-primary/30 rounded-lg px-3 py-2 text-[#7a3a25] flex items-start gap-2">
        <span className="text-primary text-[16px] leading-none flex-shrink-0 mt-0.5">★</span>
        <span>Try the slash menu.</span>
      </div>
    ),
  },
  {
    label: 'Warning callout',
    syntax: '> [!warning]\n> Heads up.',
    result: (
      <div className="bg-accent-amber/15 border border-accent-amber/35 rounded-lg px-3 py-2 text-[#7a4f1a] flex items-start gap-2">
        <span className="w-4 h-4 rounded-full bg-accent-amber text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">!</span>
        <span>Heads up.</span>
      </div>
    ),
  },
  {
    label: 'Divider',
    syntax: '---',
    result: <hr className="border-0 border-t border-hairline" />,
  },
  {
    label: 'Toggle (collapsible)',
    syntax: '<details>\n<summary>Open me</summary>\n\nHidden content.\n\n</details>',
    result: (
      <details className="border border-hairline rounded-lg px-3 py-2 bg-canvas">
        <summary className="cursor-pointer text-ink font-medium">Open me</summary>
        <p className="text-body mt-2 mb-0 text-sm">Hidden content.</p>
      </details>
    ),
  },
]

const code: Row[] = [
  {
    label: 'Code block',
    syntax: '```ts\nfunction hi() {\n  return "hello"\n}\n```',
    result: (
      <pre className="bg-surface-dark text-on-dark rounded-lg px-3 py-2 m-0 overflow-x-auto text-[12px] font-mono leading-relaxed">
{`function hi() {
  return "hello"
}`}
      </pre>
    ),
  },
  {
    label: 'Table',
    syntax: '| Name | Role |\n| --- | --- |\n| You | Owner |',
    result: (
      <table className="text-[13px] border-collapse">
        <thead>
          <tr>
            <th className="border border-hairline bg-surface-card px-2 py-1 text-left">Name</th>
            <th className="border border-hairline bg-surface-card px-2 py-1 text-left">Role</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-hairline px-2 py-1">You</td>
            <td className="border border-hairline px-2 py-1">Owner</td>
          </tr>
        </tbody>
      </table>
    ),
  },
]

const shortcuts: { keys: string[]; label: string }[] = [
  { keys: ['/'], label: 'Open the block menu (insert headings, lists, code, callouts…)' },
  { keys: ['Cmd', 'N'], label: 'Create a new document' },
  { keys: ['Cmd', 'S'], label: 'Force-save the current document' },
  { keys: ['Cmd', 'P'], label: 'Cycle through Write / Split / Read views' },
  { keys: ['Esc'], label: 'Close any open modal or menu' },
]

export default function InfoModal({ onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dw-info-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'rgba(20,20,19,0.4)',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-xl bg-canvas border border-hairline overflow-hidden flex flex-col dw-fade-up"
        style={{
          width: '100%',
          maxWidth: 860,
          maxHeight: '88vh',
          boxShadow: '0 24px 60px rgba(20,20,19,0.25)',
        }}
      >
        {/* Header */}
        <header className="px-7 py-5 border-b border-hairline-soft flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted font-medium">
              Reference
            </p>
            <h2 id="dw-info-title" className="font-display text-[26px] text-ink mt-1 leading-tight">
              How to write notes
            </h2>
            <p className="text-sm text-body mt-1">
              Notes uses plain Markdown plus a few extras. Type these in the editor on the left — the rendered preview on the right shows what they become.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-md text-muted hover:text-ink hover:bg-surface-card flex items-center justify-center flex-shrink-0"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" className="w-4 h-4">
              <path d="M6 6 18 18M18 6 6 18" />
            </svg>
          </button>
        </header>

        {/* Body */}
        <div className="overflow-y-auto px-7 py-6 flex-1 space-y-9">
          <Section title="Headings" rows={headings} />
          <Section title="Highlight text" rows={inline} />
          <Section title="Lists & checklists" rows={lists} />
          <Section title="Quotes & callouts" rows={blocks} />
          <Section title="Code & tables" rows={code} />

          {/* Slash menu */}
          <div>
            <h3 className="text-[11px] uppercase tracking-[0.16em] text-muted font-medium mb-3">
              The slash menu
            </h3>
            <div className="rounded-lg bg-surface-card/60 border border-hairline p-4 text-sm text-body leading-relaxed">
              Inside any document, type{' '}
              <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded bg-canvas border border-hairline font-mono text-[12px] text-ink">
                /
              </kbd>{' '}
              to open the block menu. Keep typing to filter (try{' '}
              <span className="font-mono text-[12px] bg-canvas border border-hairline rounded px-1.5 py-0.5">
                /h2
              </span>
              ,{' '}
              <span className="font-mono text-[12px] bg-canvas border border-hairline rounded px-1.5 py-0.5">
                /todo
              </span>
              ,{' '}
              <span className="font-mono text-[12px] bg-canvas border border-hairline rounded px-1.5 py-0.5">
                /code
              </span>
              ,{' '}
              <span className="font-mono text-[12px] bg-canvas border border-hairline rounded px-1.5 py-0.5">
                /callout
              </span>
              ). Press <Kbd>↑</Kbd> <Kbd>↓</Kbd> to navigate, <Kbd>Enter</Kbd> to insert,{' '}
              <Kbd>Esc</Kbd> to cancel.
            </div>
          </div>

          {/* Keyboard shortcuts */}
          <div>
            <h3 className="text-[11px] uppercase tracking-[0.16em] text-muted font-medium mb-3">
              Keyboard shortcuts
            </h3>
            <ul className="space-y-2">
              {shortcuts.map((s) => (
                <li key={s.label} className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-body flex-1">{s.label}</span>
                  <span className="flex items-center gap-1 flex-shrink-0">
                    {s.keys.map((k, i) => (
                      <Kbd key={i}>{k}</Kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <footer className="px-7 py-4 border-t border-hairline-soft bg-surface-card/30 flex items-center justify-between">
          <p className="text-[12px] text-muted">
            Markdown is portable — copy any doc, paste it into GitHub, your IDE, or anywhere that renders Markdown.
          </p>
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-md text-sm font-medium bg-primary text-on-primary hover:bg-primary-active transition-colors"
          >
            Got it
          </button>
        </footer>
      </div>
    </div>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[22px] h-6 px-1.5 rounded bg-canvas border border-hairline font-mono text-[11px] text-ink">
      {children}
    </kbd>
  )
}

function Section({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <div>
      <h3 className="text-[11px] uppercase tracking-[0.16em] text-muted font-medium mb-3">
        {title}
      </h3>
      <div className="rounded-lg border border-hairline-soft overflow-hidden">
        {rows.map((r, i) => (
          <div
            key={r.label}
            style={{
              display: 'grid',
              gridTemplateColumns: '110px 1fr 1fr',
              alignItems: 'flex-start',
              borderTop: i === 0 ? 'none' : '1px solid #ebe6df',
              padding: '12px 14px',
              gap: 16,
            }}
          >
            <span className="text-[12px] text-muted font-medium pt-0.5">{r.label}</span>
            <pre className="font-mono text-[12px] text-body-strong whitespace-pre-wrap leading-relaxed m-0 bg-surface-card/50 px-2.5 py-1.5 rounded">
              {r.syntax}
            </pre>
            <div className="text-[14px] text-body leading-relaxed">{r.result}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
