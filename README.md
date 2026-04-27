# Fleucy

Private personal finance OS. Single user. RMB-denominated. Premium feel.

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind v4 · shadcn/ui · Clerk · Supabase · Prisma 7 · TanStack Query · Zustand · Sonner · Lucide · Biome · Vitest

## Local Development

### Prerequisites
- Node.js 24.x
- pnpm 10.x (`npm install -g pnpm@latest`)
- A Supabase project (see `supabase/README.md`)
- A Clerk application (see `src/lib/clerk/SETUP.md`)

### Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Configure secrets
cp .env.example .env.local
# Fill in all values — see supabase/README.md and src/lib/clerk/SETUP.md

# 3. Generate Prisma client
pnpm prisma generate

# 4. Apply pending migrations (if any)
pnpm tsx scripts/apply-sql-migration.ts <migration-folder>

# 5. Start dev server
pnpm dev
```

Then open http://localhost:3000. First visit → `/sign-up` → set PIN → dashboard.

## Commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm build` | Production build |
| `pnpm typecheck` | Type check |
| `pnpm lint` / `pnpm lint:fix` | Biome |
| `pnpm test` / `pnpm test:run` | Vitest |
| `pnpm prisma generate` | Regenerate client |
| `pnpm tsx scripts/apply-sql-migration.ts <folder>` | Apply migration |

## Project Structure

```
src/
├── proxy.ts              Next.js 16 route interceptor (Clerk + PIN gate)
├── app/
│   ├── (auth)/           Sign-in, sign-up, setup wizard, lock screen
│   └── (app)/            Gated routes (Clerk session + PIN cookie required)
├── components/
│   ├── ui/               shadcn primitives
│   └── layout/           Shell, sidebar, bottom-nav, header
├── features/             Domain slices (added Phase 1+)
├── lib/
│   ├── auth/             PIN bcrypt + HMAC session cookie
│   ├── clerk/            JWT template helper
│   ├── money/            Fen <-> display conversion (bigint only)
│   └── supabase/         Server, browser, service-role clients
└── providers/            Theme + TanStack Query providers
```

## Architecture

```
Browser --HTTPS--> Vercel (Next.js 16)
                      | Supabase JS (Clerk JWT -> RLS)
                      v
                   Supabase (Postgres + Storage)
                      ^
                   n8n on Contabo (Phase 2 -- daily cron + Telegram dispatch)
```

## Deploy

Push to GitHub → import in Vercel → set env vars from `.env.example` → deploy.
See `src/lib/clerk/SETUP.md` for the Clerk JWT template setup (required for Supabase RLS).

## Environment Variables

See `.env.example` for the full list. Required:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`, `DIRECT_URL`
- `PIN_SESSION_SECRET` (32+ bytes random hex)
