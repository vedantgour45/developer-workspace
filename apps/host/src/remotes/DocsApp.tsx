import { Suspense, lazy } from 'react'
import ErrorBoundary from '../components/ErrorBoundary'
import LoadingFallback from '../components/LoadingFallback'

const RemoteDocs = lazy(() => import('docs/RemoteApp'))

export default function DocsApp() {
  return (
    <ErrorBoundary sectionName="Notes">
      <Suspense fallback={<LoadingFallback label="Loading Notes…" />}>
        <RemoteDocs />
      </Suspense>
    </ErrorBoundary>
  )
}
