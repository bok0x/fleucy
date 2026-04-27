/**
 * Applies a hand-written SQL migration file to the Supabase Postgres DB
 * and records it in _prisma_migrations.
 *
 * Usage: pnpm tsx scripts/apply-sql-migration.ts <migration-folder-name>
 *
 * Required because Prisma 7's schema engine fails through Supabase PgBouncer.
 * postgres.js works fine in transaction-pool mode.
 */
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { config } from 'dotenv';
import postgres from 'postgres';

config({ path: '.env.local' });

const folder = process.argv[2];
if (!folder) {
  console.error('Usage: pnpm tsx scripts/apply-sql-migration.ts <migration-folder>');
  process.exit(1);
}

const migrationPath = join('prisma', 'migrations', folder, 'migration.sql');
const sql = readFileSync(migrationPath, 'utf8');
const checksum = createHash('sha256').update(sql).digest('hex');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL not set in .env.local');
  process.exit(1);
}

const client = postgres(databaseUrl, { prepare: false, max: 1 });

async function alreadyApplied(): Promise<boolean> {
  const rows = await client`
    select 1 from _prisma_migrations
    where migration_name = ${folder} and finished_at is not null
    limit 1
  `;
  return rows.length > 0;
}

async function recordMigration(_durationMs: number) {
  await client`
    insert into _prisma_migrations (id, checksum, migration_name, started_at, finished_at, applied_steps_count)
    values (${randomUUID()}, ${checksum}, ${folder}, now(), now(), 1)
  `;
}

(async () => {
  try {
    if (await alreadyApplied()) {
      console.log(`Migration ${folder} already applied — skipping.`);
      process.exit(0);
    }
    console.log(`Applying ${folder}...`);
    const t0 = Date.now();
    // postgres.js .unsafe() lets us run multi-statement SQL
    await client.unsafe(sql);
    const ms = Date.now() - t0;
    await recordMigration(ms);
    console.log(`✓ Applied ${folder} in ${ms}ms`);
    process.exit(0);
  } catch (e: unknown) {
    console.error('FAILED:', e instanceof Error ? e.message : e);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
