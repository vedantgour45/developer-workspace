import { useAuth } from './AuthContext'
import AuthScreen from './AuthScreen'

interface Props {
  children: React.ReactNode
}

export default function AuthGate({ children }: Props) {
  const { status } = useAuth()

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-9 h-9">
            <div className="absolute inset-0 rounded-full border-2 border-hairline" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
          </div>
          <p className="text-sm text-muted">Signing you in…</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return <AuthScreen />
  }

  // authenticated or demo
  return <>{children}</>
}
