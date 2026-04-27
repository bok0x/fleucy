'use client';

import { useSession } from '@clerk/nextjs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { useMemo } from 'react';
import { clientEnv } from '@/lib/env';

/** Hook that returns a Supabase client with the live Clerk JWT injected per fetch. */
export function useSupabase(): SupabaseClient {
  const { session } = useSession();
  return useMemo(
    () =>
      createClient(clientEnv.NEXT_PUBLIC_SUPABASE_URL, clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
        global: {
          fetch: async (input, init) => {
            const token = (await session?.getToken({ template: 'supabase' })) ?? '';
            const headers = new Headers(init?.headers);
            if (token) headers.set('Authorization', `Bearer ${token}`);
            return fetch(input, { ...init, headers });
          },
        },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      }),
    [session],
  );
}
