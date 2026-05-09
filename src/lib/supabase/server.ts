import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseToken } from '@/lib/clerk/jwt';
import { clientEnv } from '@/lib/env';

/** Per-request Supabase client carrying the Clerk JWT so RLS applies. */
export async function supabaseServer() {
  const env = clientEnv();
  const token = await getSupabaseToken();
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
