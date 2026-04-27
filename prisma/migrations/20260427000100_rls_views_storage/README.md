# Hand-written follow-up to init migration

Prisma manages tables but not RLS, views, storage policies, or partial indexes.
This migration adds:
- RLS on every user-data table with `owner_id = clerk_user_id()` policy
- Storage policies on `receipts/<owner_id>/...` and `avatars/<owner_id>/...`
- Views: `v_account_balances`, `v_monthly_summary`, `v_debt_summary`
- Unique partial index for notification dedup

Applied via the `scripts/apply-sql-migration.ts` script using postgres.js
(Prisma 7's schema engine doesn't work with Supabase PgBouncer in this environment).
After apply, a row is inserted into `_prisma_migrations` to record it.
