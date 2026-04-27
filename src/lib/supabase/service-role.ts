import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { serverEnv } from '@/lib/env';

/**
 * Bypasses RLS. Use ONLY for the one-time setup wizard and admin tasks.
 * Never call from a client component or untrusted route.
 */
export function supabaseAdmin() {
  const env = serverEnv();
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
