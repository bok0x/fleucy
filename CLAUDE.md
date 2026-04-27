# Fleucy — Project Rules for Claude Code

## Stack (pinned versions as of Phase 0)

- **Framework:** Next.js 16.2.4 App Router + React 19 + TypeScript
- **Proxy (middleware):** `src/proxy.ts` — Next.js 16 renamed `middleware.ts` → `proxy.ts`
- **Styling:** Tailwind CSS v4.2.4 (CSS-first, `@theme` tokens) + shadcn/ui (new-york style)
- **Dark mode:** `.dark` CSS class via `next-themes` (NOT `@media prefers-color-scheme`)
- **Auth:** Clerk @nextjs 7.2.7 + custom bcrypt PIN gate (6-digit, `src/lib/auth/pin.ts`)
- **Session cookie:** HMAC-signed `pin_unlocked` cookie (`src/lib/auth/session.ts`)
- **Database:** Supabase Postgres + Storage (RLS on every user-data table)
- **ORM:** Prisma 7.8.0 — schema/migrations only; runtime uses `@supabase/supabase-js`
- **Prisma client:** generated to `src/generated/prisma/` (gitignored); adapter: `@prisma/adapter-pg`; singleton: `src/lib/prisma.ts`
- **Runtime DB client:** `@supabase/supabase-js` 2.x — carries Clerk JWT so RLS applies
- **Server state:** TanStack Query
- **UI state:** Zustand
- **Forms:** React Hook Form + Zod v4 (v3-compatible syntax works fine)
- **Toasts:** Sonner
- **Icons:** Lucide
- **Date:** Day.js (not installed yet — add in Phase 1)
- **Package manager:** pnpm 10.x (never npm or yarn)
- **Lint/format:** Biome v2 (`biome.json` at root)
- **Tests:** Vitest 4 (`pnpm test:run`)

## Critical Rules

1. **Money is `bigint` fen. Never floats.** 1 RMB = 100 fen. Use `src/lib/money` for all conversion and formatting.

2. **Every user-data table has `owner_id text` (Clerk user id) + RLS.** Policy: `auth.jwt() ->> 'sub' = owner_id`. Verify in any new table you create.

3. **Runtime queries use `@supabase/supabase-js` (RLS-aware).** `src/lib/prisma.ts` is for admin scripts only — never use it in Server Actions or pages. Use `supabaseAdmin()` from `src/lib/supabase/service-role.ts` for setup/admin operations.

4. **`updated_at` is NOT auto-set by Supabase JS.** Prisma's `@updatedAt` only applies when using PrismaClient. Raw Supabase JS queries rely on the Postgres trigger `trg_<table>_updated_at` (migration `20260427000200`). Do NOT add `updated_at` manually to every query — the trigger handles it.

5. **Server Actions for writes; Server Components for reads** where possible.

6. **Zod schemas are the source of truth** for form validation. Derive types with `z.infer`.

7. **`server-only` import** on any module that holds secrets (service-role client, `serverEnv()`).

8. **Migrations are append-only.** Never edit a shipped migration. New migrations go in `prisma/migrations/<timestamp>_<name>/migration.sql` and are applied with:
   ```bash
   pnpm tsx scripts/apply-sql-migration.ts <folder-name>
   ```
   Do NOT use `prisma migrate dev` — it fails through Supabase PgBouncer.

9. **Proxy file is `src/proxy.ts`** (Next.js 16 renamed middleware). The Clerk + PIN gate lives here. When adding new public routes, update `isPublicRoute` or `isAuthOnlyRoute` matchers.

10. **Phase boundaries.** Do not pull Phase 2+ features (budgets, recurring, charts, notifications) into Phase 1 MVP work. Phase 1 = accounts, categories, transactions, people, debts CRUD + basic dashboard widgets + settings (theme, PIN change).

## Commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Dev server (Turbopack, port 3000) |
| `pnpm build` | Production build |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | Biome check |
| `pnpm lint:fix` | Biome auto-fix |
| `pnpm test:run` | Vitest one-shot |
| `pnpm prisma generate` | Regenerate client after schema changes |
| `pnpm tsx scripts/apply-sql-migration.ts <folder>` | Apply a hand-written migration |

## File Conventions

- `src/proxy.ts` — Clerk + PIN gate (Next.js 16 proxy file, not middleware)
- `src/features/<domain>/` — vertical slices: `actions.ts`, `queries.ts`, `schemas.ts`, components
- `src/lib/` — horizontal infra (no domain logic)
- `src/components/ui/` — shadcn primitives only
- `src/components/layout/` — shell, sidebar, bottom-nav, header
- `src/app/(auth)/` — sign-in, sign-up, setup, lock (public + gated-by-clerk-only)
- `src/app/(app)/` — all user-facing routes (require Clerk session + PIN cookie)

## Commit Style

Conventional Commits: `feat:`, `fix:`, `chore:`, `test:`, `docs:`, `refactor:`. Subject ≤ 72 chars, imperative mood.

## Phase Roadmap

| Phase | Scope |
|---|---|
| **0 — Foundation** | Done. Auth, DB, shell, empty dashboard. |
| **1 — MVP** | Accounts, categories, transactions (TanStack Table), people, debts CRUD, receipt upload, basic dashboard widgets (net worth, this-month, accounts strip), PIN change in settings, CSV export |
| **2 — Smart** | Budgets, recurring rules, n8n workflows (Telegram reminders), notifications, charts, K |
| **3 — Polish** | OCR (Tesseract.js + chi_sim), Whisper voice, PDF reports, animations, danger zone |
| **4 — Future** | Web Push/PWA, multi-currency, i18n, bank CSV importer |

## n8n Workflows (Phase 2)

User runs self-hosted n8n on Contabo VPS. Workflow JSON files live in `n8n/`. When modified in n8n UI, re-export and commit. Two workflows planned:
- `fleucy-daily-evaluation.json` — daily 08:00, creates pending recurring transactions + notifications
- `fleucy-telegram-dispatch.json` — every 5 min, dispatches unread notifications to Telegram
