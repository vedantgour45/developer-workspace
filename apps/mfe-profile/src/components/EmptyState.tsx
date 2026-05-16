export default function EmptyState() {
  return (
    <div className="min-h-full flex items-center justify-center p-10">
      <div className="text-center max-w-md dw-fade-up">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-surface-card flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 text-primary">
            <path d="M4 19V5M4 19h16M8 16V11M13 16V8M18 16v-3" />
          </svg>
        </div>
        <h2 className="font-display text-2xl text-ink mt-5">Nothing to chart yet</h2>
        <p className="text-sm text-body mt-2">
          Create a few tasks and your charts populate here automatically.
        </p>
        <a
          href="/board"
          className="mt-5 inline-flex h-10 px-5 items-center rounded-md bg-primary text-on-primary text-sm font-medium hover:bg-primary-active transition-colors"
        >
          Open Tasks →
        </a>
      </div>
    </div>
  )
}
