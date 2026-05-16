import { Suspense, lazy } from 'react'
import ErrorBoundary from '../components/ErrorBoundary'
import LoadingFallback from '../components/LoadingFallback'

const RemoteBoard = lazy(() => import('board/RemoteApp'))

export default function BoardApp() {
  return (
    <ErrorBoundary sectionName="Tasks">
      <Suspense fallback={<LoadingFallback label="Loading Tasks…" />}>
        <RemoteBoard />
      </Suspense>
    </ErrorBoundary>
  )
}
