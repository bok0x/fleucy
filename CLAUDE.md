# Fleucy — Project Rules

## Stack

- **Framework:** Next.js 16.2.4 App Router + React 19 + TypeScript
- **Proxy:** `src/proxy.ts` — Next.js 16 renamed `middleware.ts` → `proxy.ts`
- **Styling:** Tailwind CSS v4.2.4 (`@theme` tokens) + shadcn/ui new-york; dark mode via `.dark` class (NOT `@media`)
- **Auth:** Clerk @nextjs 7.2.7 + bcrypt 6-digit PIN gate (`src/lib/auth/pin.ts`); HMAC-signed `pin_unlocked` cookie (`src/lib/auth/session.ts`)
- **Database:** Supabase Postgres + Storage — RLS on every user-data table
- **ORM:** Prisma 7.8.0 — schema/migrations only; runtime uses `@supabase/supabase-js`; client → `src/generated/prisma/` (gitignored); singleton: `src/lib/prisma.ts`
- **Runtime DB:** `@supabase/supabase-js` 2.x — carries Clerk JWT so RLS applies
- **State:** TanStack Query (server) + Zustand (UI)
- **Forms:** React Hook Form + Zod v4 (v3 syntax works)
- **UI:** Sonner (toasts) + Lucide (icons)
- **Date:** Day.js — not installed yet, add in Phase 1
- **Pkg mgr:** pnpm 10.x (never npm or yarn)
- **Lint:** Biome v2 (`biome.json`)
- **Tests:** Vitest 4 (`pnpm test:run`)

## Critical Rules

1. **Money is `bigint` fen. Never floats.** 1 RMB = 100 fen. Use `src/lib/money` for all conversion/formatting.

2. **Every user-data table has `owner_id text` (Clerk user id) + RLS.** Policy: `auth.jwt() ->> 'sub' = owner_id`.

3. **Runtime queries use `@supabase/supabase-js` (RLS-aware).** `src/lib/prisma.ts` is for admin scripts only. Use `supabaseAdmin()` from `src/lib/supabase/service-role.ts` for setup/admin.

4. **`updated_at` is NOT auto-set by Supabase JS.** The Postgres trigger `trg_<table>_updated_at` (migration `20260427000200`) handles it. Do NOT add `updated_at` manually.

5. **Server Actions for writes; Server Components for reads** where possible.

6. **Zod schemas are the source of truth** for validation. Derive types with `z.infer`.

7. **`server-only` import** on any module holding secrets (service-role client, `serverEnv()`).

8. **Migrations are append-only.** Never edit shipped migrations. Add to `prisma/migrations/<timestamp>_<name>/migration.sql`, apply with:
   ```bash
   pnpm tsx scripts/apply-sql-migration.ts <folder-name>
   ```
   Do NOT use `prisma migrate dev` — fails via Supabase PgBouncer.

9. **Proxy file is `src/proxy.ts`** (Next.js 16). Clerk + PIN gate lives here. Update `isPublicRoute`/`isAuthOnlyRoute` for new public routes.

10. **Phase boundaries.** No Phase 2+ features in Phase 1. Phase 1 = accounts, categories, transactions, people, debts CRUD + dashboard widgets + settings (theme, PIN change).

## Commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Dev server (Turbopack, port 3000) |
| `pnpm build` | Production build |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` / `pnpm lint:fix` | Biome check / auto-fix |
| `pnpm test:run` | Vitest one-shot |
| `pnpm prisma generate` | Regenerate client after schema changes |
| `pnpm tsx scripts/apply-sql-migration.ts <folder>` | Apply migration |

## File Conventions

- `src/proxy.ts` — Clerk + PIN gate
- `src/features/<domain>/` — vertical slices: `actions.ts`, `queries.ts`, `schemas.ts`, components
- `src/lib/` — horizontal infra (no domain logic)
- `src/components/ui/` — shadcn primitives; `src/components/layout/` — shell, sidebar, nav, header
- `src/app/(auth)/` — public + Clerk-gated routes; `src/app/(app)/` — requires Clerk + PIN cookie

## Commit Style

Conventional Commits: `feat:`, `fix:`, `chore:`, `test:`, `docs:`, `refactor:`. Subject ≤ 72 chars, imperative mood.

## Phase Roadmap

| Phase | Scope |
|---|---|
| **0 — Foundation** | Done. Auth, DB, shell, empty dashboard. |
| **1 — MVP** | Accounts, categories, transactions, people, debts CRUD + dashboard widgets + settings |
| **2 — Smart** | Budgets, recurring rules, n8n/Telegram, notifications, charts |
| **3 — Polish** | OCR, Whisper voice, PDF reports, animations |
| **4 — Future** | PWA, multi-currency, i18n, bank CSV importer |

## n8n Workflows (Phase 2)

Self-hosted on Contabo VPS. JSONs live in `n8n/`. Re-export and commit after UI edits.
- `fleucy-daily-evaluation.json` — 08:00 daily: recurring transactions + notifications
- `fleucy-telegram-dispatch.json` — every 5 min: dispatch unread notifications to Telegram
