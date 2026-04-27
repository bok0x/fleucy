import { auth } from '@clerk/nextjs/server';

/**
 * Returns a Supabase-compatible JWT for the current request.
 * Returns null if no Clerk session exists.
 */
export async function getSupabaseToken(): Promise<string | null> {
  const { getToken } = await auth();
  return getToken({ template: 'supabase' });
}
