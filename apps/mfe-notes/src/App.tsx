import { useCallback, useEffect, useState } from 'react'
import { FileText } from 'lucide-react'
import DocList from './components/DocList'
import DocEditor from './components/DocEditor'
import NewDocModal from './components/NewDocModal'
import { useDocsStore } from './store/docsStore'

export default function App() {
  const docs = useDocsStore((s) => s.docs)
  const activeId = useDocsStore((s) => s.activeId)
  const setActive = useDocsStore((s) => s.setActive)

  const [newDocOpen, setNewDocOpen] = useState(false)
  const openNewDoc = useCallback(() => setNewDocOpen(true), [])

  // Ensure something is active when docs load
  useEffect(() => {
    if (docs.length === 0) return
    if (!activeId || !docs.find((d) => d.id === activeId)) {
      setActive(docs[0].id)
    }
  }, [docs, activeId, setActive])

  // Cmd/Ctrl+N → open the new-note modal (matches the "+" button flow).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        const tag = (e.target as HTMLElement | null)?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        e.preventDefault()
        openNewDoc()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openNewDoc])

  const active = docs.find((d) => d.id === activeId)

  return (
    <div className="h-full flex bg-canvas overflow-hidden">
      <DocList onNewDoc={openNewDoc} />
      {active ? (
        <DocEditor doc={active} />
      ) : (
        <div className="flex-1 flex items-center justify-center px-10">
          <div className="text-center max-w-sm dw-fade-up">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-surface-card text-primary flex items-center justify-center">
              <FileText size={28} strokeWidth={1.6} />
            </div>
            <h2 className="font-display text-2xl text-ink mt-5">No docs yet</h2>
            <p className="text-sm text-body mt-2">
              Start your first document. Type{' '}
              <kbd className="font-mono text-xs bg-surface-card px-1.5 py-0.5 rounded">/</kbd>{' '}
              inside any doc for the slash menu.
            </p>
            <button
              onClick={openNewDoc}
              className="mt-5 h-10 px-5 rounded-md bg-primary text-on-primary text-sm font-medium hover:bg-primary-active transition-colors"
            >
              New document
            </button>
          </div>
        </div>
      )}

      {newDocOpen && <NewDocModal onClose={() => setNewDocOpen(false)} />}
    </div>
  )
}
