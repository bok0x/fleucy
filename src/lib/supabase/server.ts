import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseToken } from '@/lib/clerk/jwt';
import { clientEnv } from '@/lib/env';

/** Per-request Supabase client carrying the Clerk JWT so RLS applies. */
export async function supabaseServer() {
  const token = await getSupabaseToken();
  return createClient(clientEnv.NEXT_PUBLIC_SUPABASE_URL, clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
