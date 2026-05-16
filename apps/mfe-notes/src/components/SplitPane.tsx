import { useEffect, useRef, useState } from 'react'

interface Props {
  storageKey?: string
  /** Initial left-pane percentage (0-100). Default 50. */
  defaultLeft?: number
  /** Minimum pct each side can shrink to. Default 25. */
  min?: number
  leftHeader?: React.ReactNode
  rightHeader?: React.ReactNode
  left: React.ReactNode
  right: React.ReactNode
  showRight?: boolean
  showLeft?: boolean
}

export default function SplitPane({
  storageKey,
  defaultLeft = 50,
  min = 25,
  leftHeader,
  rightHeader,
  left,
  right,
  showLeft = true,
  showRight = true,
}: Props) {
  const [leftPct, setLeftPct] = useState<number>(() => {
    if (!storageKey) return defaultLeft
    try {
      const raw = localStorage.getItem(storageKey)
      const parsed = raw ? Number(raw) : NaN
      if (Number.isFinite(parsed) && parsed >= min && parsed <= 100 - min) return parsed
    } catch {}
    return defaultLeft
  })
  const [dragging, setDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!storageKey) return
    try {
      localStorage.setItem(storageKey, String(leftPct))
    } catch {}
  }, [leftPct, storageKey])

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setDragging(true)
    const onMove = (ev: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const pct = ((ev.clientX - rect.left) / rect.width) * 100
      const clamped = Math.min(100 - min, Math.max(min, pct))
      setLeftPct(clamped)
    }
    const onUp = () => {
      setDragging(false)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
  }

  const onDoubleClick = () => setLeftPct(50)

  // Solo modes (only one side visible) fall back to full-width
  if (showLeft && !showRight) {
    return (
      <div ref={containerRef} className="flex flex-col flex-1 min-h-0">
        {leftHeader}
        <div className="flex-1 min-h-0">{left}</div>
      </div>
    )
  }
  if (showRight && !showLeft) {
    return (
      <div ref={containerRef} className="flex flex-col flex-1 min-h-0">
        {rightHeader}
        <div className="flex-1 min-h-0">{right}</div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="flex flex-1 min-h-0 relative">
      <div
        className="flex flex-col min-h-0"
        style={{ width: `calc(${leftPct}% - 3px)` }}
      >
        {leftHeader}
        <div className="flex-1 min-h-0 overflow-hidden">{left}</div>
      </div>

      <div
        onMouseDown={onMouseDown}
        onDoubleClick={onDoubleClick}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize editor"
        title="Drag to resize · double-click to reset"
        className={`flex-shrink-0 cursor-col-resize relative group transition-colors ${
          dragging ? 'bg-primary' : 'bg-hairline-soft hover:bg-primary/60'
        }`}
        style={{ width: 6 }}
      >
        <span
          className={`absolute inset-y-0 left-1/2 -translate-x-1/2 w-px transition-colors ${
            dragging ? 'bg-primary' : 'bg-hairline group-hover:bg-primary/60'
          }`}
        />
        <span
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-9 rounded-full transition-opacity ${
            dragging ? 'opacity-100 bg-primary' : 'opacity-0 group-hover:opacity-100 bg-muted'
          }`}
        />
      </div>

      <div
        className="flex flex-col min-h-0"
        style={{ width: `calc(${100 - leftPct}% - 3px)` }}
      >
        {rightHeader}
        <div className="flex-1 min-h-0 overflow-hidden">{right}</div>
      </div>
    </div>
  )
}
