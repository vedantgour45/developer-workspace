import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  sectionName?: string
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[workspace] Section failed to load:', error, info.componentStack)
  }

  private retry = () => this.setState({ hasError: false })

  render() {
    if (!this.state.hasError) return this.props.children
    if (this.props.fallback) return this.props.fallback

    const { sectionName = 'this section' } = this.props
    return (
      <div className="min-h-full flex items-center justify-center p-8 bg-canvas">
        <div className="max-w-md w-full text-center dw-fade-up">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-surface-card flex items-center justify-center mb-5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-primary">
              <path d="M12 9v4M12 17h.01" />
              <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            </svg>
          </div>
          <h2 className="font-display text-2xl text-ink">We couldn't load {sectionName}</h2>
          <p className="text-sm text-body mt-2 leading-relaxed">
            Something went wrong opening this page. Try again — if it keeps happening, refresh the workspace.
          </p>
          <div className="mt-6 inline-flex gap-2">
            <button
              onClick={this.retry}
              className="h-10 px-5 rounded-md bg-primary text-on-primary text-sm font-medium hover:bg-primary-active transition-colors"
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="h-10 px-5 rounded-md bg-canvas text-ink text-sm font-medium border border-hairline hover:border-ink/30 transition-colors"
            >
              Refresh workspace
            </button>
          </div>
        </div>
      </div>
    )
  }
}
