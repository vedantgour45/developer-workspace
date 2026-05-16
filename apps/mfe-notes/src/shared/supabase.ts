import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * MFE-side Supabase client. The host owns the auth flow (sign-in, refresh,
 * sign-out). This client reads the same session from localStorage (storageKey
 * 'dw:auth') so queries authenticate as the signed-in user.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey && url.startsWith('http'))

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storageKey: 'dw:auth',
      },
    })
  : null
