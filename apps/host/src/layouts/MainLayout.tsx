import { Outlet } from 'react-router-dom'
import Header from '../components/Header'
import Toaster from '../components/Toaster'

export default function MainLayout() {
  return (
    <div className="h-screen flex flex-col bg-canvas overflow-hidden">
      <Header />
      <main className="flex-1 min-w-0 min-h-0 overflow-hidden">
        <Outlet />
      </main>
      <Toaster />
    </div>
  )
}
