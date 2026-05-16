import { useEffect, useRef, useState } from 'react'
import { getMarkdownParser, fallbackPreview } from '../lib/markdown'

interface Props {
  content: string
  onToggleCheckbox?: (index: number, checked: boolean) => void
}

export default function MarkdownPreview({ content, onToggleCheckbox }: Props) {
  const [parser, setParser] = useState<((s: string) => string) | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let mounted = true
    getMarkdownParser().then((p) => {
      if (mounted) setParser(() => p)
    })
    return () => {
      mounted = false
    }
  }, [])

  // Hook checkbox clicks to caller
  useEffect(() => {
    if (!onToggleCheckbox) return
    const el = ref.current
    if (!el) return
    const handler = (e: Event) => {
      const target = e.target as HTMLInputElement
      if (target.tagName !== 'INPUT' || target.type !== 'checkbox') return
      const idx = Number(target.getAttribute('data-cb'))
      if (Number.isFinite(idx)) {
        onToggleCheckbox(idx, target.checked)
      }
    }
    el.addEventListener('change', handler)
    return () => el.removeEventListener('change', handler)
  }, [onToggleCheckbox, content])

  const html = parser ? parser(content) : fallbackPreview(content)

  return (
    <div
      ref={ref}
      className="dw-prose max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
