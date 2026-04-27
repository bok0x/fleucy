# Supabase Setup (manual, one-time)

## Create the Project

1. https://supabase.com/dashboard → New project → name `fleucy`
2. Choose region nearest to you (Singapore / Tokyo for Asia)
3. Generate and save a strong DB password
4. Wait ~2 min for provisioning

## Copy Values to `.env.local`

From **Settings → API**:
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` key (reveal) → `SUPABASE_SERVICE_ROLE_KEY`

From **Settings → Database → Connection string**:
- **Transaction pooling** tab (port 6543) → `DATABASE_URL` (replace `[YOUR-PASSWORD]`)
- **Session / Direct** tab (port 5432) → `DIRECT_URL` (replace `[YOUR-PASSWORD]`)

## Create Storage Buckets

Storage → New bucket (both private):
- `receipts`
- `avatars`

(Storage policies are applied by migration `20260427000100_rls_views_storage`.)

## Clerk JWT Template

Required for Supabase RLS to validate Clerk sessions. See `src/lib/clerk/SETUP.md`.

## Migrations

All migrations are in `prisma/migrations/`. Apply hand-written ones with:

```bash
pnpm tsx scripts/apply-sql-migration.ts <migration-folder-name>
```

**Do NOT use `prisma migrate dev`** — it fails through Supabase PgBouncer.

## Default Data

Default categories (10 expense + 6 income) and `app_settings` are inserted by the
`/setup` wizard on first sign-in. No seed script needed.

## Applied Migrations

| Migration | Purpose |
|---|---|
| `20260427000000_init` | All 11 tables + enums + indexes |
| `20260427000100_rls_views_storage` | RLS policies, views, storage policies, dedup index |
| `20260427000200_updated_at_trigger` | DEFAULT now() + triggers for `updated_at` columns |
