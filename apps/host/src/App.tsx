import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import MainLayout from './layouts/MainLayout'
import Overview from './pages/Overview'
import Changelog from './pages/Changelog'
import BoardApp from './remotes/BoardApp'
import DocsApp from './remotes/DocsApp'
import AnalyticsApp from './remotes/AnalyticsApp'
import { seedIfEmpty } from './shared/seed'

export default function App() {
  useEffect(() => {
    seedIfEmpty()
  }, [])

  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<Overview />} />
        <Route path="board/*" element={<BoardApp />} />
        <Route path="docs/*" element={<DocsApp />} />
        <Route path="analytics/*" element={<AnalyticsApp />} />
        <Route path="changelog" element={<Changelog />} />
        {/* Legacy redirects so old links don't 404 */}
        <Route path="tasks/*" element={<Navigate to="/board" replace />} />
        <Route path="notes/*" element={<Navigate to="/docs" replace />} />
        <Route path="profile/*" element={<Navigate to="/analytics" replace />} />
      </Route>
    </Routes>
  )
}
