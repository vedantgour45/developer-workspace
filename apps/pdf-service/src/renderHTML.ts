/**
 * Renders a doc + author into a complete HTML document tuned for print.
 * The same CSS is inlined here so the Puppeteer page is fully
 * self-contained — no external assets except web fonts.
 *
 * Mirrors apps/mfe-notes/src/shared print styles. Kept here so the
 * service is independently deployable.
 */
import { marked } from 'marked'

marked.setOptions({ gfm: true, breaks: true })

function escapeHTML(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Notion-style callouts: `> [!info] ...` blockquotes → callout div.
function preprocessCallouts(src: string): string {
  const re = /^(?:> \[!(?<type>info|warning|tip|note)\][^\n]*\n?)((?:^> [^\n]*\n?)*)/gim
  return src.replace(re, (match, _t, body, ...rest) => {
    const groups = rest[rest.length - 1] as { type?: string } | undefined
    const type = (groups?.type ?? 'note').toLowerCase()
    const cleaned = String(body).replace(/^> /gm, '').replace(/^>$/gm, '').trim()
    const firstLine = ((match as string).split('\n')[0] ?? '').replace(
      /^>\s*\[![^\]]+\]\s*/,
      '',
    )
    const inner = [firstLine, cleaned].filter(Boolean).join('\n')
    return `<div class="callout callout-${type}" data-type="${type}">\n\n${inner}\n\n</div>\n`
  })
}

const PRINT_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600&family=JetBrains+Mono:wght@400;500&display=swap');

  @page {
    size: Letter;
    margin: 18mm 16mm;
  }

  * { box-sizing: border-box; }

  html, body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    color: #212121;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 11pt;
    line-height: 1.55;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .dw-print-doc { padding: 0; }

  .dw-print-doc > header {
    margin: 0 0 14mm;
    padding: 0 0 6mm;
    border-bottom: 1px solid #d9d9dd;
  }
  .dw-print-doc > header .meta {
    font-size: 9pt;
    color: #75758a;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    margin: 0 0 4mm;
  }
  .dw-print-doc > header h1 {
    font-family: 'Space Grotesk', 'Inter', system-ui, sans-serif;
    font-weight: 500;
    letter-spacing: -0.02em;
    color: #141413;
    font-size: 26pt;
    line-height: 1.1;
    margin: 0;
  }

  .dw-prose h1, .dw-prose h2, .dw-prose h3, .dw-prose h4 {
    font-family: 'Space Grotesk', 'Inter', system-ui, sans-serif;
    font-weight: 500;
    letter-spacing: -0.02em;
    color: #141413;
    line-height: 1.2;
    page-break-after: avoid;
  }
  .dw-prose h1 { font-size: 22pt; margin: 0.6em 0 0.4em; }
  .dw-prose h2 { font-size: 17pt; margin: 1.3em 0 0.4em; }
  .dw-prose h3 { font-size: 14pt; margin: 1.2em 0 0.35em; }
  .dw-prose h4 { font-size: 12pt; margin: 1em 0 0.3em; }
  .dw-prose p { margin: 0 0 0.9em; }
  .dw-prose ul, .dw-prose ol { margin: 0 0 1em 1.3em; padding: 0; }
  .dw-prose li { margin: 0.2em 0; }

  .dw-prose strong { color: #000; font-weight: 600; }
  .dw-prose em { font-style: italic; }
  .dw-prose a { color: #1863dc; text-decoration: underline; text-underline-offset: 2px; }
  .dw-prose hr { border: 0; border-top: 1px solid #d9d9dd; margin: 1.4em 0; }

  .dw-prose blockquote {
    border-left: 3px solid #17171c;
    background: #f7f7f5;
    margin: 1em 0;
    padding: 0.6em 1em;
    border-radius: 0 6px 6px 0;
  }

  .dw-prose code:not(pre code) {
    background: #f2f2f2;
    padding: 0.12em 0.36em;
    border-radius: 3px;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 0.88em;
  }

  /* Wrap long lines so they can't overflow the page width */
  .dw-prose pre {
    background: #f7f7f5;
    color: #141413;
    border: 1px solid #d9d9dd;
    padding: 12pt 14pt;
    border-radius: 8px;
    margin: 1em 0;
    font-size: 9.5pt;
    line-height: 1.5;
    overflow: visible;
    page-break-inside: auto;
  }
  .dw-prose pre code {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    background: transparent;
    color: inherit;
    padding: 0;
    white-space: pre-wrap;
    word-break: break-word;
    overflow-wrap: anywhere;
  }

  .dw-prose table {
    border-collapse: collapse;
    width: 100%;
    margin: 1em 0;
    font-size: 10pt;
    page-break-inside: auto;
  }
  .dw-prose th, .dw-prose td {
    border: 1px solid #d9d9dd;
    padding: 6px 10px;
    text-align: left;
  }
  .dw-prose th { background: #eeece7; font-weight: 600; }

  .dw-prose .callout {
    border-radius: 8px;
    padding: 10px 14px;
    margin: 1em 0;
    border: 1px solid;
    page-break-inside: avoid;
  }
  .dw-prose .callout-info { background: #f1f5ff; border-color: rgba(76,110,230,0.3); color: #1863dc; }
  .dw-prose .callout-warning { background: rgba(255,119,89,0.12); border-color: rgba(255,119,89,0.35); color: #b03e25; }
  .dw-prose .callout-tip { background: #edfce9; border-color: rgba(0,60,51,0.3); color: #003c33; }
  .dw-prose .callout-note { background: #f7f7f5; border-color: #d9d9dd; color: #212121; }

  .dw-prose input[type='checkbox'] {
    margin-right: 6px;
    accent-color: #17171c;
    width: 12px;
    height: 12px;
    vertical-align: -1px;
  }
  .dw-prose li:has(> input[type='checkbox']) {
    list-style: none;
    margin-left: -1.3em;
    padding-left: 0;
  }

  .dw-prose p, .dw-prose li { orphans: 3; widows: 3; }
`

export interface RenderInput {
  title: string
  content: string
  authorName: string | null
}

export function renderPrintHTML({ title, content, authorName }: RenderInput): string {
  const safeTitle = title.trim() || 'Untitled'
  const preprocessed = preprocessCallouts(content || '')
  const bodyHTML = marked.parse(preprocessed) as string
  const dateLabel = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHTML(safeTitle)}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
  <article class="dw-print-doc">
    <header>
      <p class="meta">${
        authorName ? `by ${escapeHTML(authorName)} · ` : ''
      }${escapeHTML(dateLabel)}</p>
      <h1>${escapeHTML(safeTitle)}</h1>
    </header>
    <div class="dw-prose">
${bodyHTML}
    </div>
  </article>
</body>
</html>`
}
