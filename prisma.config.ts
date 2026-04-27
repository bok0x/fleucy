// Prisma 7 config — loads from .env.local (Next.js convention).
// In Prisma 7, datasource URLs are configured here, not in schema.prisma.
// We append ?pgbouncer=true to use simple query protocol (no prepared statements)
// which is required when connecting through Supabase's PgBouncer (port 6543).
import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Load .env.local first (Next.js convention), fall back to .env
config({ path: '.env.local' });
config(); // no-op if vars already set

const directUrl = process.env.DIRECT_URL;
const databaseUrl = process.env.DATABASE_URL;

if (!directUrl || !databaseUrl) {
  throw new Error('DIRECT_URL and DATABASE_URL must be set in .env.local for Prisma CLI to work');
}

// Add pgbouncer=true to disable prepared statements (required for PgBouncer transaction mode)
const poolerUrl = databaseUrl.includes('?')
  ? `${databaseUrl}&pgbouncer=true`
  : `${databaseUrl}?pgbouncer=true`;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: poolerUrl,
  },
});
