// Tiny zero-dependency markdown renderer for task descriptions.
// Handles the inline + block subset users actually type in a task description:
// **bold**, *italic*, `inline code`, [text](url), > quote, # heading, lists,
// fenced code blocks, line breaks. Output is HTML-escaped before pattern
// substitution so it's safe to inject into the DOM.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function inline(s: string): string {
  return s
    // images first so the URL doesn't get caught by link regex
    .replace(/`([^`\n]+?)`/g, '<code class="mini-md-code">$1</code>')
    .replace(/\*\*([^*\n][^*]*?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^\*])\*([^*\n][^*]*?)\*([^\*]|$)/g, '$1<em>$2</em>$3')
    .replace(/~~([^~\n]+?)~~/g, '<s>$1</s>')
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="mini-md-link">$1</a>',
    )
}

export function renderMiniMarkdown(src: string): string {
  if (!src) return ''
  const escaped = escapeHtml(src)
  const lines = escaped.split('\n')
  const out: string[] = []
  let inFence = false
  let fenceBuf: string[] = []
  let listType: 'ul' | 'ol' | null = null
  let paraBuf: string[] = []

  const flushPara = () => {
    if (paraBuf.length === 0) return
    out.push(`<p>${inline(paraBuf.join(' '))}</p>`)
    paraBuf = []
  }
  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`)
      listType = null
    }
  }

  for (const raw of lines) {
    const line = raw

    // Fenced code block toggle
    if (line.trim().startsWith('```')) {
      if (inFence) {
        flushPara()
        closeList()
        out.push(`<pre class="mini-md-pre"><code>${fenceBuf.join('\n')}</code></pre>`)
        fenceBuf = []
        inFence = false
      } else {
        flushPara()
        closeList()
        inFence = true
      }
      continue
    }
    if (inFence) {
      fenceBuf.push(line)
      continue
    }

    // Blank line ends paragraph and list
    if (!line.trim()) {
      flushPara()
      closeList()
      continue
    }

    // Heading
    const h = line.match(/^(#{1,3})\s+(.*)$/)
    if (h) {
      flushPara()
      closeList()
      const level = h[1].length
      out.push(`<h${level} class="mini-md-h${level}">${inline(h[2])}</h${level}>`)
      continue
    }

    // Quote
    if (line.startsWith('> ')) {
      flushPara()
      closeList()
      out.push(`<blockquote class="mini-md-quote">${inline(line.slice(2))}</blockquote>`)
      continue
    }

    // Unordered list
    const ul = line.match(/^[-*]\s+(.*)$/)
    if (ul) {
      flushPara()
      if (listType !== 'ul') {
        closeList()
        out.push('<ul class="mini-md-list">')
        listType = 'ul'
      }
      out.push(`<li>${inline(ul[1])}</li>`)
      continue
    }

    // Ordered list
    const ol = line.match(/^\d+\.\s+(.*)$/)
    if (ol) {
      flushPara()
      if (listType !== 'ol') {
        closeList()
        out.push('<ol class="mini-md-list">')
        listType = 'ol'
      }
      out.push(`<li>${inline(ol[1])}</li>`)
      continue
    }

    // Otherwise it's paragraph content
    closeList()
    paraBuf.push(line)
  }

  if (inFence) {
    // Unterminated code block — still render what's there
    out.push(`<pre class="mini-md-pre"><code>${fenceBuf.join('\n')}</code></pre>`)
  }
  flushPara()
  closeList()

  return out.join('\n')
}
