import { Suspense, lazy } from 'react'
import ErrorBoundary from '../components/ErrorBoundary'
import LoadingFallback from '../components/LoadingFallback'

const RemoteAnalytics = lazy(() => import('analytics/RemoteApp'))

export default function AnalyticsApp() {
  return (
    <ErrorBoundary sectionName="Analytics">
      <Suspense fallback={<LoadingFallback label="Loading Analytics…" />}>
        <RemoteAnalytics />
      </Suspense>
    </ErrorBoundary>
  )
}
