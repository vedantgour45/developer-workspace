import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from './supabase'
import { writeCurrentUser, DEMO_USER, type CurrentUserSnapshot } from '../shared/currentUser'

function snapshotFromUser(user: User | null): CurrentUserSnapshot | null {
  if (!user) return null
  const meta = (user.user_metadata ?? {}) as {
    full_name?: string
    name?: string
    avatar_url?: string
  }
  const name =
    (meta.full_name && meta.full_name.trim()) ||
    (meta.name && meta.name.trim()) ||
    (user.email ? user.email.split('@')[0] : 'You')
  return {
    id: user.id,
    name,
    email: user.email ?? '',
    avatarUrl: meta.avatar_url ?? '',
  }
}

/**
 * Upsert the current user into the public.profiles directory. Other tabs /
 * MFEs read this table to populate the "assignees" dropdown. Best-effort —
 * we don't block the sign-in flow if it fails.
 */
async function syncProfile(user: User | null) {
  if (!supabase || !user) return
  const snap = snapshotFromUser(user)
  if (!snap) return
  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: snap.id,
        name: snap.name,
        email: snap.email,
        avatar_url: snap.avatarUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
  if (error) console.warn('[auth] profile upsert failed:', error.message)
}

export type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated' | 'demo'

export interface AuthState {
  status: AuthStatus
  user: User | null
  session: Session | null
  /** True when env vars are present and auth is enforced. */
  enforced: boolean
  signInWithPassword: (email: string, password: string) => Promise<void>
  signUpWithPassword: (
    email: string,
    password: string,
    name: string,
  ) => Promise<{ needsConfirmation: boolean }>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<AuthStatus>(() =>
    isSupabaseConfigured ? 'loading' : 'demo',
  )

  useEffect(() => {
    if (!supabase) {
      // Demo mode — broadcast a generic "You" so MFEs have something to render.
      writeCurrentUser(DEMO_USER)
      return
    }
    let mounted = true

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return
      if (error) {
        console.error('[auth] getSession failed:', error.message)
        setStatus('unauthenticated')
        writeCurrentUser(null)
        return
      }
      setSession(data.session ?? null)
      setStatus(data.session ? 'authenticated' : 'unauthenticated')
      writeCurrentUser(snapshotFromUser(data.session?.user ?? null))
      void syncProfile(data.session?.user ?? null)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null)
      setStatus(nextSession ? 'authenticated' : 'unauthenticated')
      writeCurrentUser(snapshotFromUser(nextSession?.user ?? null))
      void syncProfile(nextSession?.user ?? null)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase is not configured')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signUpWithPassword = useCallback(
    async (
      email: string,
      password: string,
      name: string,
    ): Promise<{ needsConfirmation: boolean }> => {
      if (!supabase) throw new Error('Supabase is not configured')
      const trimmedName = name.trim()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Stash the display name in user_metadata. snapshotFromUser /
          // syncProfile both prefer this over the email local part.
          data: trimmedName ? { full_name: trimmedName, name: trimmedName } : undefined,
        },
      })
      if (error) throw error
      // If session is null, the project requires email confirmation.
      return { needsConfirmation: !data.session }
    },
    [],
  )

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) throw new Error('Supabase is not configured')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // After Google's redirect, come back to the workspace
        redirectTo: window.location.origin + '/',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    if (error) throw error
    // signInWithOAuth navigates the browser; nothing further to do here.
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('[auth] signOut failed:', error.message)
      throw error
    }
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      status,
      user: session?.user ?? null,
      session,
      enforced: isSupabaseConfigured,
      signInWithPassword,
      signUpWithPassword,
      signInWithGoogle,
      signOut,
    }),
    [status, session, signInWithPassword, signUpWithPassword, signInWithGoogle, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
