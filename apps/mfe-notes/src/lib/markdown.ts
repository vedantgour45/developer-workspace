// Lazy-imported marked + Notion-style callout pre-processing
let parserPromise: Promise<(src: string) => string> | null = null

function preprocessCallouts(src: string): string {
  // Convert `> [!info] ...` blockquote callouts into divs
  // Match a blockquote that starts with `> [!type]` and grab all subsequent `> ...` lines
  const re = /^(?:> \[!(?<type>info|warning|tip|note)\][^\n]*\n?)((?:^> [^\n]*\n?)*)/gim
  return src.replace(re, (_match, _t, body, ...rest) => {
    const groups = rest[rest.length - 1] as { type?: string } | undefined
    const type = (groups?.type ?? 'note').toLowerCase()
    const cleaned = String(body)
      .replace(/^> /gm, '')
      .replace(/^>$/gm, '')
      .trim()
    const firstLine = (_match as string).split('\n')[0].replace(/^>\s*\[![^\]]+\]\s*/, '')
    const inner = [firstLine, cleaned].filter(Boolean).join('\n')
    return `<div class="callout callout-${type}" data-type="${type}">\n\n${inner}\n\n</div>\n`
  })
}

export function getMarkdownParser(): Promise<(src: string) => string> {
  if (!parserPromise) {
    parserPromise = import('marked').then(({ marked }) => {
      marked.setOptions({ gfm: true, breaks: true })
      return (src: string) => {
        const pre = preprocessCallouts(src)
        const html = marked.parse(pre) as string
        // Mark checkboxes as data-pos for later interactivity by index
        let cbIndex = 0
        return html.replace(/<input([^>]*?)type="checkbox"([^>]*?)>/g, (_m, a, b) => {
          const checkedAttr = /checked/.test(a + b) ? 'checked' : ''
          const tag = `<input type="checkbox" data-cb="${cbIndex}" ${checkedAttr} />`
          cbIndex++
          return tag
        })
      }
    })
  }
  return parserPromise
}

export function fallbackPreview(src: string): string {
  return src
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/^/, '<p>')
    .concat('</p>')
}
