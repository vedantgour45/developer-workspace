import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * The workspace runs in two modes:
 *   1. **Configured mode**: VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set.
 *      The workspace is gated behind sign-in.
 *   2. **Demo mode**: env vars empty/missing. No auth, localStorage-only.
 */
export const isSupabaseConfigured = Boolean(url && anonKey && url.startsWith('http'))

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'dw:auth',
      },
    })
  : null
