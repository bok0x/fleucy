import { describe, expect, it, vi } from 'vitest';

// server-only throws in jsdom/non-server environments — mock it out
vi.mock('server-only', () => ({}));

// env.ts validates env vars at module load time; stub out both exports so the
// supabase client modules can be imported without real env vars in test.
vi.mock('@/lib/env', () => ({
  clientEnv: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_stub',
    NEXT_PUBLIC_SUPABASE_URL: 'https://stub.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-stub',
  },
  serverEnv: () => ({
    CLERK_SECRET_KEY: 'sk_test_stub',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-stub',
    DATABASE_URL: 'postgresql://stub',
    DIRECT_URL: 'postgresql://stub',
    PIN_SESSION_SECRET: 'stub-secret-at-least-32-characters-long',
  }),
}));

describe('supabase clients module imports', () => {
  it('admin client module loads', async () => {
    // Server-only module — vitest jsdom environment doesn't fully simulate "server"
    // but the import itself shouldn't throw at module-eval time
    const mod = await import('@/lib/supabase/service-role');
    expect(typeof mod.supabaseAdmin).toBe('function');
  });
  it('server client module loads', async () => {
    const mod = await import('@/lib/supabase/server');
    expect(typeof mod.supabaseServer).toBe('function');
  });
});
