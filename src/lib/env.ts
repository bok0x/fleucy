import { z } from 'zod';

// Note: zod v4 is installed (4.3.6). z.string().url() and z.string().min()
// are fully supported in v4 — no syntax changes required from the v3 API.

const serverSchema = z.object({
  CLERK_SECRET_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  PIN_SESSION_SECRET: z.string().min(32, 'must be >=32 chars'),
});

const clientSchema = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

const prismaSchema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
});

let cachedClientEnv: z.infer<typeof clientSchema> | undefined;
let cachedServerEnv: z.infer<typeof serverSchema> | undefined;
let cachedPrismaEnv: z.infer<typeof prismaSchema> | undefined;

export function clientEnv() {
  cachedClientEnv ??= clientSchema.parse({
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  return cachedClientEnv;
}

export function serverEnv() {
  if (typeof window !== 'undefined') {
    throw new Error('serverEnv() called from client');
  }
  cachedServerEnv ??= serverSchema.parse({
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    PIN_SESSION_SECRET: process.env.PIN_SESSION_SECRET,
  });
  return cachedServerEnv;
}

export function prismaEnv() {
  if (typeof window !== 'undefined') {
    throw new Error('prismaEnv() called from client');
  }
  cachedPrismaEnv ??= prismaSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
  });
  return cachedPrismaEnv;
}
