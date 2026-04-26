# Fleucy — Phase 0 (Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a runnable, deployable Next.js app shell with full database schema + RLS, Clerk auth, custom PIN gate, theme-aware layout, first-run setup wizard, `/lock` PIN keypad, and an empty dashboard. After Phase 0, the user can sign up, set a PIN, bind Telegram, log in, and land on a placeholder dashboard. No business features yet.

**Architecture:** Next.js 15 App Router on Vercel → Supabase Postgres + Storage (RLS-locked by Clerk user id via JWT template) → Clerk for primary auth → custom HMAC-signed cookie + bcrypt PIN as the daily app lock. Prisma owns schema and migrations; runtime queries go through `@supabase/supabase-js` so RLS applies. n8n on user's Contabo handles all scheduled jobs (introduced in Phase 2 — not in this plan).

**Tech Stack:** Next.js 15, React 19, TypeScript, pnpm, Tailwind CSS v4, shadcn/ui, Clerk, Supabase, Prisma, Zod, TanStack Query, Zustand, Sonner, Lucide, Day.js, Biome, Husky, Vitest.

**Spec reference:** `C:\Users\wokao\.claude\plans\i-want-to-build-parallel-lynx.md`

---

## File Structure (created in this phase)

```
e:\Claude Project\Daily Expensise\
├── .env.example, .env.local (gitignored), .gitignore
├── README.md, CLAUDE.md
├── biome.json, tsconfig.json, next.config.ts
├── package.json, pnpm-lock.yaml, vercel.json
├── .husky/pre-commit
├── prisma/
│   ├── schema.prisma                       full schema (all phases' tables)
│   └── migrations/
│       ├── 20260426000000_init/migration.sql                 (auto, from prisma migrate)
│       └── 20260426000100_rls_views_storage/migration.sql    (hand-written)
├── supabase/
│   ├── seed.sql                            default categories + app_settings row
│   └── README.md                           manual setup steps (project create, JWT secret, buckets)
├── n8n/
│   └── README.md                           placeholder; workflows added in P2
├── public/                                 (Next.js default)
└── src/
    ├── middleware.ts                       Clerk + PIN gate
    ├── app/
    │   ├── layout.tsx                      root: theme + Clerk + Sonner + TanStack Query providers
    │   ├── globals.css                     Tailwind v4 + theme tokens
    │   ├── page.tsx                        redirect to /dashboard or /setup
    │   ├── (auth)/
    │   │   ├── layout.tsx                  centered card layout
    │   │   ├── sign-in/[[...sign-in]]/page.tsx     Clerk SignIn
    │   │   ├── sign-up/[[...sign-up]]/page.tsx     Clerk SignUp (only reachable in setup)
    │   │   ├── setup/
    │   │   │   ├── page.tsx                wizard router (step 1=clerk, 2=pin, 3=telegram)
    │   │   │   ├── pin-step.tsx
    │   │   │   ├── telegram-step.tsx
    │   │   │   └── actions.ts              server actions: setPin, saveTelegram, completeSetup
    │   │   └── lock/
    │   │       ├── page.tsx                PIN keypad
    │   │       └── actions.ts              verifyPin server action
    │   └── (app)/
    │       ├── layout.tsx                  shell: sidebar (desktop) + bottom-nav (mobile) + header bell
    │       └── dashboard/page.tsx          empty placeholder
    ├── components/
    │   ├── ui/                             shadcn primitives: button, input, card, dialog, drawer,
    │   │                                    dropdown-menu, form, label, select, separator, skeleton,
    │   │                                    sonner, tabs, tooltip
    │   └── layout/
    │       ├── sidebar.tsx                 desktop nav
    │       ├── bottom-nav.tsx              mobile nav
    │       ├── header.tsx                  top bar with theme toggle + bell + user menu
    │       ├── theme-toggle.tsx
    │       └── shell.tsx                   wraps sidebar + main + bottom-nav
    ├── lib/
    │   ├── env.ts                          zod-validated env loader
    │   ├── supabase/
    │   │   ├── server.ts                   server client (Clerk JWT injected)
    │   │   ├── browser.ts                  browser client (Clerk JWT injected)
    │   │   └── service-role.ts             admin client (server only, used by setup actions)
    │   ├── prisma/
    │   │   └── index.ts                    Prisma client singleton (server-only, used by scripts)
    │   ├── clerk/
    │   │   └── jwt.ts                      helper: getSupabaseToken()
    │   ├── auth/
    │   │   ├── pin.ts                      hashPin, verifyPin (bcrypt) + cookie helpers
    │   │   └── session.ts                  signed cookie sign/verify (HMAC)
    │   ├── money/
    │   │   └── index.ts                    fenToDisplay, displayToFen, formatRMB
    │   ├── date/
    │   │   └── index.ts                    Day.js setup with utc + timezone + relativeTime
    │   └── utils/
    │       └── cn.ts                       tailwind-merge + clsx
    ├── stores/
    │   └── ui.ts                           Zustand: theme override, mobile-nav-open
    ├── providers/
    │   ├── theme-provider.tsx
    │   ├── query-provider.tsx              TanStack Query
    │   └── clerk-provider.tsx              wraps ClerkProvider with localized appearance
    └── tests/
        ├── unit/
        │   ├── money.test.ts
        │   ├── pin.test.ts
        │   └── session.test.ts
        └── setup.ts                        Vitest setup
```

**Files explicitly NOT in Phase 0 (deferred to later phases):** all `src/features/*`, charts, recharts wrappers, forms beyond PIN, transactions/accounts/debts pages, notifications page, settings page (only theme + PIN change shipped in P1), n8n workflows, voice, OCR, PDF, Framer Motion.

---

## Conventions for All Tasks

- **Working directory:** `e:\Claude Project\Daily Expensise` (all paths relative unless noted).
- **Shell:** bash (use forward slashes, `/dev/null`).
- **Package manager:** pnpm only. Never `npm` / `yarn`.
- **Test runner:** Vitest. Run with `pnpm test` (watch) or `pnpm test:run` (one-shot).
- **Lint/format:** Biome. Run with `pnpm lint` and `pnpm format`.
- **Type check:** `pnpm typecheck` → `tsc --noEmit`.
- **Each task ends with a commit.** Use Conventional Commits (`feat:`, `chore:`, `test:`, `docs:`, `refactor:`).
- **Money is `bigint` fen.** Never floats. 1 RMB = 100 fen.
- **When a step says "Run X — Expected: Y", the engineer must verify the actual output matches before proceeding.**

---

## Task 1: Initialize Next.js + TypeScript + pnpm

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `next-env.d.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css` (all by `create-next-app`)
- Create: `.gitignore`
- Create: `.nvmrc`

- [ ] **Step 1: Verify Node.js ≥ 20.11 and pnpm ≥ 9 are installed**

```bash
node --version
pnpm --version
```

Expected: `v20.11.x` or higher; `9.x.x` or higher. If pnpm missing: `npm install -g pnpm@latest`.

- [ ] **Step 2: Scaffold Next.js app in current directory**

From the project root (`e:\Claude Project\Daily Expensise`):

```bash
pnpm dlx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --turbopack --no-git
```

When prompted for "Ok to proceed?" answer Yes. The `.` installs in current directory.

Expected output: project scaffolded; `package.json`, `src/app/`, `tailwind.config.ts` (will be removed in Task 3 — switching to v4 css-first), `eslint.config.mjs` created.

- [ ] **Step 3: Pin Node version**

Create `.nvmrc`:

```
20.11.1
```

- [ ] **Step 4: Initialize git and stage**

```bash
git init
git branch -M main
git add -A
git commit -m "chore: initialize next.js project scaffold"
```

Expected: clean commit, repo on `main`.

- [ ] **Step 5: Verify dev server starts**

```bash
pnpm dev
```

Expected: `Ready in <Nms` and "Local: http://localhost:3000". Open it; the default Next.js page renders. Stop with Ctrl-C.

---

## Task 2: Replace ESLint with Biome + add Husky + lint-staged

**Files:**
- Delete: `eslint.config.mjs`
- Create: `biome.json`
- Create: `.husky/pre-commit`
- Modify: `package.json`

- [ ] **Step 1: Remove ESLint**

```bash
pnpm remove eslint eslint-config-next @eslint/eslintrc
rm eslint.config.mjs
```

- [ ] **Step 2: Add Biome, Husky, lint-staged**

```bash
pnpm add -D @biomejs/biome husky lint-staged
```

- [ ] **Step 3: Initialize Biome config**

Create `biome.json`:

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": { "ignoreUnknown": true, "ignore": [".next", "node_modules", "prisma/migrations"] },
  "formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2, "lineWidth": 100 },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "style": { "noNonNullAssertion": "off", "useImportType": "error" },
      "correctness": { "noUnusedImports": "error", "noUnusedVariables": "warn" },
      "suspicious": { "noExplicitAny": "warn" }
    }
  },
  "javascript": { "formatter": { "quoteStyle": "single", "trailingCommas": "all", "semicolons": "always" } },
  "json": { "formatter": { "trailingCommas": "none" } }
}
```

- [ ] **Step 4: Update package.json scripts**

Replace the `scripts` block in `package.json`:

```json
"scripts": {
  "dev": "next dev --turbopack",
  "build": "next build",
  "start": "next start",
  "lint": "biome check .",
  "lint:fix": "biome check --write .",
  "format": "biome format --write .",
  "typecheck": "tsc --noEmit",
  "test": "vitest",
  "test:run": "vitest run",
  "prepare": "husky"
}
```

- [ ] **Step 5: Install Husky pre-commit hook**

```bash
pnpm exec husky init
```

This creates `.husky/pre-commit` containing `npm test`. Replace its contents with:

```bash
#!/usr/bin/env sh
pnpm lint && pnpm typecheck
```

Add a `lint-staged` block to `package.json` at top level:

```json
"lint-staged": {
  "*.{ts,tsx,js,jsx,json}": ["biome check --write --no-errors-on-unmatched"]
}
```

- [ ] **Step 6: Verify**

```bash
pnpm lint
pnpm typecheck
```

Expected: both exit 0.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: replace ESLint with Biome, add Husky + lint-staged"
```

---

## Task 3: Install Tailwind v4 (replaces v3 from scaffold) + theme tokens

**Files:**
- Modify: `package.json` (deps), `src/app/globals.css`
- Delete: `tailwind.config.ts`, `postcss.config.mjs` (recreated for v4)

- [ ] **Step 1: Remove v3 Tailwind**

```bash
pnpm remove tailwindcss postcss autoprefixer
rm -f tailwind.config.ts postcss.config.mjs postcss.config.js
```

- [ ] **Step 2: Install Tailwind v4 + plugin**

```bash
pnpm add -D tailwindcss@next @tailwindcss/postcss@next
```

- [ ] **Step 3: Recreate `postcss.config.mjs`**

Create `postcss.config.mjs`:

```js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

- [ ] **Step 4: Replace `src/app/globals.css` with v4 + tokens**

Overwrite `src/app/globals.css`:

```css
@import "tailwindcss";

@theme {
  --color-bg: oklch(99% 0 0);
  --color-fg: oklch(20% 0 0);
  --color-muted: oklch(65% 0 0);
  --color-card: oklch(100% 0 0);
  --color-border: oklch(92% 0 0);
  --color-primary: oklch(60% 0.18 250);
  --color-primary-fg: oklch(99% 0 0);
  --color-success: oklch(70% 0.15 145);
  --color-warning: oklch(75% 0.15 80);
  --color-danger: oklch(60% 0.22 25);
  --radius-card: 14px;
}

@media (prefers-color-scheme: dark) {
  @theme {
    --color-bg: oklch(15% 0 0);
    --color-fg: oklch(98% 0 0);
    --color-muted: oklch(60% 0 0);
    --color-card: oklch(20% 0 0);
    --color-border: oklch(28% 0 0);
    --color-primary: oklch(70% 0.18 250);
  }
}

html, body { background: var(--color-bg); color: var(--color-fg); }
* { border-color: var(--color-border); }
```

- [ ] **Step 5: Verify build still works**

```bash
pnpm dev
```

Open http://localhost:3000 — page should render with the new background. Stop with Ctrl-C.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: upgrade to Tailwind v4 with @theme tokens for light/dark"
```

---

## Task 4: Initialize shadcn/ui + add base primitives

**Files:**
- Create: `components.json`, `src/lib/utils/cn.ts`
- Create: `src/components/ui/*` (added by CLI)

- [ ] **Step 1: Create `cn` utility first (shadcn expects it)**

```bash
mkdir -p src/lib/utils
```

Create `src/lib/utils/cn.ts`:

```ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

```bash
pnpm add clsx tailwind-merge
```

- [ ] **Step 2: Initialize shadcn for Tailwind v4**

```bash
pnpm dlx shadcn@latest init -d
```

Choose: **Style**: New York, **Base color**: Neutral, **CSS variables**: Yes. Confirm path defaults (writes `components.json`).

- [ ] **Step 3: Adjust `components.json` aliases**

Open `components.json` and ensure aliases reflect our structure:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "ui": "@/components/ui",
    "utils": "@/lib/utils/cn",
    "hooks": "@/hooks",
    "lib": "@/lib"
  },
  "iconLibrary": "lucide"
}
```

- [ ] **Step 4: Add the Phase 0 primitives**

```bash
pnpm dlx shadcn@latest add button input label card dialog drawer dropdown-menu form select separator skeleton sonner tabs tooltip
```

Accept all overwrite prompts. This installs `lucide-react`, `react-hook-form`, `@hookform/resolvers`, `zod`, `sonner`, `@radix-ui/*` as needed.

- [ ] **Step 5: Verify**

```bash
pnpm typecheck
pnpm lint
```

Expected: both pass. (If Biome flags shadcn-generated code: it's fine; the `noNonNullAssertion: off` rule covers most. Run `pnpm lint:fix` if auto-fixable.)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: initialize shadcn/ui with Phase 0 primitives"
```

---

## Task 5: Install remaining Phase 0 deps + Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`, `src/tests/setup.ts`

- [ ] **Step 1: Install runtime deps**

```bash
pnpm add @clerk/nextjs @supabase/supabase-js @supabase/ssr @prisma/client zustand @tanstack/react-query @tanstack/react-query-devtools dayjs bcryptjs
pnpm add -D prisma vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom @types/bcryptjs
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

- [ ] **Step 3: Create `src/tests/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 4: Smoke-test Vitest**

Create `src/tests/unit/smoke.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

describe('smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

```bash
pnpm test:run
```

Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: add runtime deps + Vitest setup"
```

---

## Task 6: Env loader with Zod

**Files:**
- Create: `src/lib/env.ts`, `.env.example`
- Modify: `.gitignore` (ensure `.env.local`)

- [ ] **Step 1: Confirm `.gitignore` ignores env files**

Open `.gitignore` and ensure these lines exist (Next.js scaffold includes most):

```
.env*.local
.env
```

- [ ] **Step 2: Create `.env.example`**

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/lock
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/setup

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Prisma (Supabase Postgres direct connection — port 5432, NOT pooler)
DATABASE_URL="postgresql://postgres.<project>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.<project>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres"

# PIN session
PIN_SESSION_SECRET=
```

Copy it to `.env.local` and leave values blank for now (Task 12 fills them in):

```bash
cp .env.example .env.local
```

- [ ] **Step 3: Create env loader**

Create `src/lib/env.ts`:

```ts
import { z } from 'zod';

const serverSchema = z.object({
  CLERK_SECRET_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  PIN_SESSION_SECRET: z.string().min(32, 'must be >=32 chars'),
});

const clientSchema = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export const clientEnv = clientSchema.parse({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

export function serverEnv() {
  if (typeof window !== 'undefined') {
    throw new Error('serverEnv() called from client');
  }
  return serverSchema.parse({
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    PIN_SESSION_SECRET: process.env.PIN_SESSION_SECRET,
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add zod-validated env loader and .env.example"
```

---

## Task 7: Manual Supabase project setup (one-time, documented)

**Files:**
- Create: `supabase/README.md`

This is a manual step — a human creates the Supabase project. Document it so it's repeatable.

- [ ] **Step 1: Create the project**

In your browser:

1. Go to https://supabase.com/dashboard, sign in.
2. New Project → name `fleucy`, region nearest to you, generate strong DB password (save it).
3. Wait for provisioning (~2 min).

- [ ] **Step 2: Copy values into `.env.local`**

In Supabase dashboard → Settings → API, copy:
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (treat as secret)

In Settings → Database → Connection string → URI:
- "Connection pooling" tab, mode "Transaction", copy URL → `DATABASE_URL` (note: includes `?pgbouncer=true`)
- Same panel, mode "Session" or "Direct connection" → `DIRECT_URL`

- [ ] **Step 3: Create Supabase Storage buckets**

Storage → New bucket:
- Name: `receipts`, Public: **off**
- Name: `avatars`, Public: **off**

(Policies are added by migration later.)

- [ ] **Step 4: Document in `supabase/README.md`**

```markdown
# Supabase Setup (manual, one-time)

1. Create project at https://supabase.com/dashboard
2. Copy URL + anon + service-role keys into `.env.local`
3. Copy DATABASE_URL (pooled) and DIRECT_URL (direct) from Settings → Database
4. Create Storage buckets: `receipts` (private), `avatars` (private)
5. Configure Clerk JWT (see `src/lib/clerk/jwt.ts` and Task 12).

After this, run:
- `pnpm prisma migrate deploy` — applies schema
- `pnpm tsx supabase/seed.ts` — seeds default categories
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs: add manual Supabase setup instructions"
```

---

## Task 8: Prisma schema (full — all phases' tables defined now)

**Files:**
- Create: `prisma/schema.prisma`

- [ ] **Step 1: Initialize Prisma**

```bash
pnpm dlx prisma init --datasource-provider postgresql
```

This creates `prisma/schema.prisma` and adds `DATABASE_URL` to `.env` — delete that line from `.env` (we use `.env.local`).

```bash
rm .env
```

- [ ] **Step 2: Replace `prisma/schema.prisma` with the full schema**

```prisma
// Fleucy schema — all phases. RLS enabled in companion migration (see migrations/20260426000100_rls_views_storage).
// Money is bigint fen (1 RMB = 100 fen). owner_id is the Clerk user id (text).

generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native"]
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum AccountKind {
  cash
  bank
  mobile_wallet
}

enum TxType {
  income
  expense
}

enum Cadence {
  daily
  weekly
  monthly
  yearly
}

enum DebtDirection {
  owed_to_me
  i_owe
}

enum DebtStatus {
  open
  partially_paid
  settled
  written_off
}

enum NotificationKind {
  recurring_due
  debt_due
  budget_overrun
  low_balance
}

enum Severity {
  info
  warning
  critical
}

model Account {
  id                          String        @id @default(uuid()) @db.Uuid
  ownerId                     String        @map("owner_id")
  name                        String
  kind                        AccountKind
  icon                        String        @default("wallet")
  color                       String        @default("#3b82f6")
  openingBalanceFen           BigInt        @default(0) @map("opening_balance_fen")
  lowBalanceThresholdFen      BigInt?       @map("low_balance_threshold_fen")
  isArchived                  Boolean       @default(false) @map("is_archived")
  sortOrder                   Int           @default(0) @map("sort_order")
  createdAt                   DateTime      @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt                   DateTime      @updatedAt @map("updated_at") @db.Timestamptz(6)

  transactions                Transaction[] @relation("AccountTransactions")
  recurringRules              RecurringRule[]
  debtsOriginated             Debt[]        @relation("DebtOriginAccount")
  debtPayments                DebtPayment[]

  @@index([ownerId])
  @@map("accounts")
}

model Category {
  id            String        @id @default(uuid()) @db.Uuid
  ownerId       String        @map("owner_id")
  type          TxType
  name          String
  icon          String        @default("circle")
  color         String        @default("#6b7280")
  isSystem      Boolean       @default(false) @map("is_system")
  sortOrder     Int           @default(0) @map("sort_order")
  createdAt     DateTime      @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt     DateTime      @updatedAt @map("updated_at") @db.Timestamptz(6)

  transactions     Transaction[]
  recurringRules   RecurringRule[]
  budgets          Budget[]

  @@index([ownerId, type])
  @@map("categories")
}

model Person {
  id                String   @id @default(uuid()) @db.Uuid
  ownerId           String   @map("owner_id")
  fullName          String   @map("full_name")
  phone             String?
  email             String?
  relationshipTag   String?  @map("relationship_tag")
  notes             String?
  avatarUrl         String?  @map("avatar_url")
  createdAt         DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt         DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  debts             Debt[]

  @@index([ownerId])
  @@map("people")
}

model Transaction {
  id                String           @id @default(uuid()) @db.Uuid
  ownerId           String           @map("owner_id")
  accountId         String           @map("account_id") @db.Uuid
  categoryId        String           @map("category_id") @db.Uuid
  type              TxType
  amountFen         BigInt           @map("amount_fen")
  occurredAt        DateTime         @map("occurred_at") @db.Timestamptz(6)
  note              String?
  receiptUrl        String?          @map("receipt_url")
  recurringRuleId   String?          @map("recurring_rule_id") @db.Uuid
  isPending         Boolean          @default(false) @map("is_pending")
  debtId            String?          @map("debt_id") @db.Uuid
  createdAt         DateTime         @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt         DateTime         @updatedAt @map("updated_at") @db.Timestamptz(6)
  deletedAt         DateTime?        @map("deleted_at") @db.Timestamptz(6)

  account           Account          @relation("AccountTransactions", fields: [accountId], references: [id], onDelete: Restrict)
  category          Category         @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  recurringRule     RecurringRule?   @relation(fields: [recurringRuleId], references: [id], onDelete: SetNull)
  debt              Debt?            @relation(fields: [debtId], references: [id], onDelete: SetNull)

  @@index([ownerId, occurredAt(sort: Desc)])
  @@index([ownerId, accountId])
  @@index([ownerId, categoryId])
  @@index([ownerId, isPending])
  @@map("transactions")
}

model Debt {
  id                  String         @id @default(uuid()) @db.Uuid
  ownerId             String         @map("owner_id")
  personId            String         @map("person_id") @db.Uuid
  direction           DebtDirection
  principalFen        BigInt         @map("principal_fen")
  description         String?
  dueDate             DateTime?      @map("due_date") @db.Date
  status              DebtStatus     @default(open)
  originAccountId     String?        @map("origin_account_id") @db.Uuid
  createdAt           DateTime       @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt           DateTime       @updatedAt @map("updated_at") @db.Timestamptz(6)

  person              Person         @relation(fields: [personId], references: [id], onDelete: Restrict)
  originAccount       Account?       @relation("DebtOriginAccount", fields: [originAccountId], references: [id], onDelete: SetNull)
  payments            DebtPayment[]
  transactions        Transaction[]

  @@index([ownerId, status])
  @@index([ownerId, personId])
  @@index([ownerId, dueDate])
  @@map("debts")
}

model DebtPayment {
  id          String   @id @default(uuid()) @db.Uuid
  ownerId     String   @map("owner_id")
  debtId      String   @map("debt_id") @db.Uuid
  accountId   String   @map("account_id") @db.Uuid
  amountFen   BigInt   @map("amount_fen")
  paidAt      DateTime @map("paid_at") @db.Timestamptz(6)
  note        String?
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  debt        Debt     @relation(fields: [debtId], references: [id], onDelete: Cascade)
  account     Account  @relation(fields: [accountId], references: [id], onDelete: Restrict)

  @@index([ownerId, debtId])
  @@map("debt_payments")
}

model RecurringRule {
  id                       String   @id @default(uuid()) @db.Uuid
  ownerId                  String   @map("owner_id")
  name                     String
  type                     TxType
  accountId                String   @map("account_id") @db.Uuid
  categoryId               String   @map("category_id") @db.Uuid
  amountFen                BigInt   @map("amount_fen")
  cadence                  Cadence
  dayOfMonth               Int?     @map("day_of_month")
  dayOfWeek                Int?     @map("day_of_week")
  startDate                DateTime @map("start_date") @db.Date
  endDate                  DateTime? @map("end_date") @db.Date
  lastGeneratedForDate     DateTime? @map("last_generated_for_date") @db.Date
  isActive                 Boolean  @default(true) @map("is_active")
  createdAt                DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt                DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  account                  Account  @relation(fields: [accountId], references: [id], onDelete: Restrict)
  category                 Category @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  transactions             Transaction[]

  @@index([ownerId, isActive])
  @@map("recurring_rules")
}

model Budget {
  id                  String   @id @default(uuid()) @db.Uuid
  ownerId             String   @map("owner_id")
  categoryId          String?  @map("category_id") @db.Uuid
  monthlyLimitFen     BigInt   @map("monthly_limit_fen")
  createdAt           DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt           DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  category            Category? @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@unique([ownerId, categoryId], map: "budgets_owner_category_unique")
  @@map("budgets")
}

model Notification {
  id                 String           @id @default(uuid()) @db.Uuid
  ownerId            String           @map("owner_id")
  kind               NotificationKind
  severity           Severity         @default(info)
  title              String
  body               String
  linkTo             String?          @map("link_to")
  relatedId          String?          @map("related_id") @db.Uuid
  createdAt          DateTime         @default(now()) @map("created_at") @db.Timestamptz(6)
  readAt             DateTime?        @map("read_at") @db.Timestamptz(6)
  dismissedAt        DateTime?        @map("dismissed_at") @db.Timestamptz(6)
  telegramSentAt     DateTime?        @map("telegram_sent_at") @db.Timestamptz(6)

  @@index([ownerId, createdAt(sort: Desc)])
  @@index([ownerId, telegramSentAt])
  @@map("notifications")
}

model AuthPin {
  ownerId          String   @id @map("owner_id")
  pinHash          String   @map("pin_hash")
  failedAttempts   Int      @default(0) @map("failed_attempts")
  lockedUntil      DateTime? @map("locked_until") @db.Timestamptz(6)
  updatedAt        DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  @@map("auth_pin")
}

model AppSettings {
  ownerId                    String   @id @map("owner_id")
  baseCurrency               String   @default("CNY") @map("base_currency")
  theme                      String   @default("system")
  pinLockMinutes             Int      @default(10) @map("pin_lock_minutes")
  reminderDaysBeforeDue      Int      @default(3) @map("reminder_days_before_due")
  telegramChatId             String?  @map("telegram_chat_id")
  telegramEnabled            Boolean  @default(false) @map("telegram_enabled")
  setupCompletedAt           DateTime? @map("setup_completed_at") @db.Timestamptz(6)
  updatedAt                  DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  @@map("app_settings")
}
```

- [ ] **Step 3: Generate Prisma client**

```bash
pnpm prisma generate
```

Expected: "Generated Prisma Client (...) to ./node_modules/@prisma/client".

- [ ] **Step 4: Apply initial migration to Supabase**

Make sure `.env.local` has `DATABASE_URL` and `DIRECT_URL` filled (from Task 7).

```bash
pnpm prisma migrate dev --name init
```

Expected: a migration is created in `prisma/migrations/<timestamp>_init/migration.sql` and applied to Supabase. Verify in Supabase dashboard → Database → Tables that all 11 tables exist.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(db): add full Prisma schema and initial migration"
```

---

## Task 9: Hand-written RLS + storage policies + views migration

**Files:**
- Create: `prisma/migrations/20260426000100_rls_views_storage/migration.sql`
- Create: `prisma/migrations/20260426000100_rls_views_storage/README.md`

- [ ] **Step 1: Create migration directory**

```bash
mkdir -p prisma/migrations/20260426000100_rls_views_storage
```

- [ ] **Step 2: Write the migration SQL**

Create `prisma/migrations/20260426000100_rls_views_storage/migration.sql`:

```sql
-- ===========================================
-- Enable RLS on all user-data tables
-- ===========================================
alter table accounts          enable row level security;
alter table categories        enable row level security;
alter table people            enable row level security;
alter table transactions      enable row level security;
alter table debts             enable row level security;
alter table debt_payments     enable row level security;
alter table recurring_rules   enable row level security;
alter table budgets           enable row level security;
alter table notifications     enable row level security;
alter table auth_pin          enable row level security;
alter table app_settings      enable row level security;

-- ===========================================
-- Helper: extract Clerk user id from JWT 'sub' claim
-- ===========================================
create or replace function public.clerk_user_id() returns text
  language sql stable
  as $$ select coalesce(auth.jwt() ->> 'sub', '') $$;

-- ===========================================
-- Owner-only policy for each table
-- ===========================================
create policy "owner_all_accounts" on accounts
  for all using (owner_id = public.clerk_user_id())
  with check (owner_id = public.clerk_user_id());

create policy "owner_all_categories" on categories
  for all using (owner_id = public.clerk_user_id())
  with check (owner_id = public.clerk_user_id());

create policy "owner_all_people" on people
  for all using (owner_id = public.clerk_user_id())
  with check (owner_id = public.clerk_user_id());

create policy "owner_all_transactions" on transactions
  for all using (owner_id = public.clerk_user_id())
  with check (owner_id = public.clerk_user_id());

create policy "owner_all_debts" on debts
  for all using (owner_id = public.clerk_user_id())
  with check (owner_id = public.clerk_user_id());

create policy "owner_all_debt_payments" on debt_payments
  for all using (owner_id = public.clerk_user_id())
  with check (owner_id = public.clerk_user_id());

create policy "owner_all_recurring_rules" on recurring_rules
  for all using (owner_id = public.clerk_user_id())
  with check (owner_id = public.clerk_user_id());

create policy "owner_all_budgets" on budgets
  for all using (owner_id = public.clerk_user_id())
  with check (owner_id = public.clerk_user_id());

create policy "owner_all_notifications" on notifications
  for all using (owner_id = public.clerk_user_id())
  with check (owner_id = public.clerk_user_id());

create policy "owner_all_auth_pin" on auth_pin
  for all using (owner_id = public.clerk_user_id())
  with check (owner_id = public.clerk_user_id());

create policy "owner_all_app_settings" on app_settings
  for all using (owner_id = public.clerk_user_id())
  with check (owner_id = public.clerk_user_id());

-- ===========================================
-- Storage bucket policies (receipts, avatars)
-- Path convention: <bucket>/<owner_id>/<filename>
-- ===========================================
create policy "owner_read_receipts" on storage.objects
  for select using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = public.clerk_user_id()
  );

create policy "owner_write_receipts" on storage.objects
  for insert with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = public.clerk_user_id()
  );

create policy "owner_delete_receipts" on storage.objects
  for delete using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = public.clerk_user_id()
  );

create policy "owner_read_avatars" on storage.objects
  for select using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = public.clerk_user_id()
  );

create policy "owner_write_avatars" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = public.clerk_user_id()
  );

create policy "owner_delete_avatars" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = public.clerk_user_id()
  );

-- ===========================================
-- Views (computed, RLS inherited via underlying tables)
-- ===========================================

-- v_account_balances: opening + sum income - sum expense, confirmed only
create or replace view v_account_balances
  with (security_invoker = true) as
select
  a.id                                                       as account_id,
  a.owner_id,
  a.name,
  a.kind,
  a.opening_balance_fen
    + coalesce(sum(t.amount_fen) filter (where t.type = 'income'), 0)
    - coalesce(sum(t.amount_fen) filter (where t.type = 'expense'), 0)         as balance_fen,
  a.low_balance_threshold_fen
from accounts a
left join transactions t
  on t.account_id = a.id
  and t.deleted_at is null
  and t.is_pending = false
where a.is_archived = false
group by a.id, a.owner_id, a.name, a.kind, a.opening_balance_fen, a.low_balance_threshold_fen;

-- v_monthly_summary: per-month income/expense/net by category
create or replace view v_monthly_summary
  with (security_invoker = true) as
select
  date_trunc('month', t.occurred_at)::date  as month,
  t.owner_id,
  t.category_id,
  t.type,
  sum(t.amount_fen)                          as total_fen,
  count(*)                                   as txn_count
from transactions t
where t.deleted_at is null and t.is_pending = false
group by 1, 2, 3, 4;

-- v_debt_summary: per-direction totals + overdue list
create or replace view v_debt_summary
  with (security_invoker = true) as
select
  d.owner_id,
  d.direction,
  count(*) filter (where d.status in ('open','partially_paid'))                as open_count,
  coalesce(sum(d.principal_fen) filter (where d.status in ('open','partially_paid')), 0)
    - coalesce(
        (select sum(p.amount_fen)
         from debt_payments p
         where p.debt_id = any (array_agg(d.id) filter (where d.status in ('open','partially_paid')))),
        0
      )                                                                         as outstanding_fen,
  count(*) filter (where d.status in ('open','partially_paid') and d.due_date < current_date) as overdue_count
from debts d
group by d.owner_id, d.direction;

-- ===========================================
-- Notification dedup index (one per kind+related_id+day-bucket)
-- ===========================================
create unique index notifications_dedup_daily
  on notifications (owner_id, kind, related_id, (date_trunc('day', created_at)))
  where dismissed_at is null;
```

- [ ] **Step 3: Document the migration**

Create `prisma/migrations/20260426000100_rls_views_storage/README.md`:

```markdown
# Hand-written follow-up to Prisma init

Prisma manages tables but not RLS, views, storage policies, or partial indexes.
This migration adds:
- RLS on every user-data table with `owner_id = clerk_user_id()` policy
- Storage policies on `receipts/<owner_id>/...` and `avatars/<owner_id>/...`
- Views: `v_account_balances`, `v_monthly_summary`, `v_debt_summary`
- Unique partial index for notification dedup

These must be applied AFTER `migration.sql` in the parent migration. Prisma will
treat this as an applied migration once it appears in `_prisma_migrations` after
running `prisma migrate deploy`.
```

- [ ] **Step 4: Apply the migration**

```bash
pnpm prisma migrate deploy
```

Expected: "Applied migration: 20260426000100_rls_views_storage". Verify in Supabase → Authentication → Policies that each table has 1 policy named `owner_all_<tablename>`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(db): add RLS, storage policies, and computed views"
```

---

## Task 10: Seed script — default categories + app_settings shell

**Files:**
- Create: `supabase/seed.ts`
- Create: `src/lib/prisma/index.ts`
- Modify: `package.json` (add `seed` script)

- [ ] **Step 1: Create Prisma singleton**

```bash
mkdir -p src/lib/prisma
```

Create `src/lib/prisma/index.ts`:

```ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'] });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

- [ ] **Step 2: Write the seed script**

Note: this script seeds for a SPECIFIC `ownerId` passed as env var. It is run by the app's setup wizard server action via spawning, OR manually for testing. We default to "system_template" which the wizard later clones.

Actually — better approach: do NOT seed via standalone script. Have the setup wizard insert defaults inline. Skip the seed script for now; document that defaults are inserted in the setup action (Task 22).

Update `supabase/README.md`:

Append at the end:

```markdown
## Default categories

Default categories and the `app_settings` row are inserted by the
`/setup` wizard's `completeSetup` server action (see `src/app/(auth)/setup/actions.ts`),
not by a standalone seed script. This guarantees they're tied to the actual
authenticated user's id rather than a placeholder.
```

- [ ] **Step 3: Add `tsx` for any future ad-hoc scripts**

```bash
pnpm add -D tsx
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add Prisma client singleton; document setup-wizard seeding"
```

---

## Task 11: Money utilities — TDD

**Files:**
- Create: `src/lib/money/index.ts`, `src/tests/unit/money.test.ts`

- [ ] **Step 1: Write failing tests**

```bash
mkdir -p src/lib/money
```

Create `src/tests/unit/money.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { displayToFen, fenToDisplay, formatRMB } from '@/lib/money';

describe('fenToDisplay', () => {
  it('converts whole yuan', () => {
    expect(fenToDisplay(10000n)).toBe('100.00');
  });
  it('converts fractional yuan', () => {
    expect(fenToDisplay(12345n)).toBe('123.45');
  });
  it('handles zero', () => {
    expect(fenToDisplay(0n)).toBe('0.00');
  });
  it('handles negative', () => {
    expect(fenToDisplay(-50n)).toBe('-0.50');
  });
});

describe('displayToFen', () => {
  it('converts whole yuan', () => {
    expect(displayToFen('100')).toBe(10000n);
  });
  it('converts decimal yuan', () => {
    expect(displayToFen('123.45')).toBe(12345n);
  });
  it('rounds extra precision', () => {
    expect(displayToFen('1.999')).toBe(200n);
  });
  it('strips currency symbol and commas', () => {
    expect(displayToFen('¥1,234.50')).toBe(123450n);
  });
  it('throws on garbage', () => {
    expect(() => displayToFen('abc')).toThrow();
  });
});

describe('formatRMB', () => {
  it('prepends symbol with two decimals', () => {
    expect(formatRMB(12345n)).toBe('¥123.45');
  });
  it('inserts thousands separators', () => {
    expect(formatRMB(123456789n)).toBe('¥1,234,567.89');
  });
  it('handles negative with sign before symbol', () => {
    expect(formatRMB(-12345n)).toBe('-¥123.45');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test:run src/tests/unit/money.test.ts
```

Expected: All fail with "Cannot find module '@/lib/money'".

- [ ] **Step 3: Implement**

Create `src/lib/money/index.ts`:

```ts
export function fenToDisplay(fen: bigint): string {
  const negative = fen < 0n;
  const abs = negative ? -fen : fen;
  const yuan = abs / 100n;
  const cents = abs % 100n;
  const centsStr = cents.toString().padStart(2, '0');
  return `${negative ? '-' : ''}${yuan}.${centsStr}`;
}

export function displayToFen(input: string): bigint {
  const cleaned = input.replace(/[¥,\s]/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) {
    throw new Error(`Invalid money string: ${input}`);
  }
  const negative = cleaned.startsWith('-');
  const abs = negative ? cleaned.slice(1) : cleaned;
  const [whole, frac = ''] = abs.split('.');
  const fracPadded = (frac + '00').slice(0, 3);
  // round half-away-from-zero based on the third digit
  const wholeFen = BigInt(whole) * 100n + BigInt(fracPadded.slice(0, 2));
  const rounded = Number(fracPadded.charAt(2)) >= 5 ? wholeFen + 1n : wholeFen;
  return negative ? -rounded : rounded;
}

export function formatRMB(fen: bigint): string {
  const negative = fen < 0n;
  const abs = negative ? -fen : fen;
  const yuan = abs / 100n;
  const cents = abs % 100n;
  const centsStr = cents.toString().padStart(2, '0');
  // insert thousands separators
  const yuanStr = yuan.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}¥${yuanStr}.${centsStr}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test:run src/tests/unit/money.test.ts
```

Expected: 12 passed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(money): add fen<->display utilities with full test coverage"
```

---

## Task 12: Manual Clerk app setup + JWT template (one-time, documented)

**Files:**
- Create: `src/lib/clerk/jwt.ts`
- Create: `src/lib/clerk/SETUP.md`

This is a manual step performed once in Clerk + Supabase dashboards.

- [ ] **Step 1: Create Clerk application**

In browser:
1. Go to https://dashboard.clerk.com → Add application → name `fleucy`.
2. Enable: **Email** + **Passkey**. Disable everything else.
3. Settings → Restrictions → "Allow sign-ups": **off** (you'll create the only user via `/setup`, then close it).
4. Copy `Publishable key` → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `Secret key` → `CLERK_SECRET_KEY`.

- [ ] **Step 2: Get Supabase JWT secret**

In Supabase dashboard → Settings → API → JWT Settings → "JWT Secret". Copy it (used in next step).

- [ ] **Step 3: Create JWT template in Clerk**

In Clerk dashboard → Configure → JWT Templates → New template:
- Name: `supabase`
- Signing algorithm: HS256
- Signing key: paste the Supabase JWT secret from Step 2
- Claims (JSON):

```json
{
  "aud": "authenticated",
  "role": "authenticated",
  "sub": "{{user.id}}",
  "email": "{{user.primary_email_address}}"
}
```

Save template.

- [ ] **Step 4: Document in `src/lib/clerk/SETUP.md`**

```bash
mkdir -p src/lib/clerk
```

Create `src/lib/clerk/SETUP.md`:

```markdown
# Clerk + Supabase JWT integration

One-time setup linking Clerk's session to Supabase RLS.

1. Get Supabase JWT secret: Supabase dashboard → Settings → API → JWT Settings.
2. In Clerk dashboard → JWT Templates → New template:
   - Name: `supabase`
   - Algorithm: HS256
   - Signing key: paste Supabase JWT secret
   - Claims:
     ```json
     {
       "aud": "authenticated",
       "role": "authenticated",
       "sub": "{{user.id}}",
       "email": "{{user.primary_email_address}}"
     }
     ```

After this, `await clerkClient.session.getToken({template: 'supabase'})`
returns a Supabase-compatible JWT whose `sub` claim is the Clerk user id.
Our RLS policies use `auth.jwt() ->> 'sub' = owner_id`.

If you rotate the Supabase JWT secret you MUST update the template's signing key.
```

- [ ] **Step 5: Generate `PIN_SESSION_SECRET`**

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Paste the output as `PIN_SESSION_SECRET` value in `.env.local`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "docs: add Clerk + Supabase JWT integration setup instructions"
```

---

## Task 13: Supabase clients (server + browser + service-role) wired to Clerk JWT

**Files:**
- Create: `src/lib/supabase/server.ts`, `src/lib/supabase/browser.ts`, `src/lib/supabase/service-role.ts`
- Create: `src/lib/clerk/jwt.ts`

- [ ] **Step 1: JWT helper**

```bash
mkdir -p src/lib/clerk src/lib/supabase
```

Create `src/lib/clerk/jwt.ts`:

```ts
import { auth } from '@clerk/nextjs/server';

/**
 * Returns a Supabase-compatible JWT for the current request.
 * Returns null if no Clerk session exists.
 */
export async function getSupabaseToken(): Promise<string | null> {
  const { getToken } = await auth();
  return getToken({ template: 'supabase' });
}
```

- [ ] **Step 2: Server client (RLS-aware)**

Create `src/lib/supabase/server.ts`:

```ts
import { createClient } from '@supabase/supabase-js';
import { clientEnv } from '@/lib/env';
import { getSupabaseToken } from '@/lib/clerk/jwt';

/** Per-request Supabase client carrying the Clerk JWT so RLS applies. */
export async function supabaseServer() {
  const token = await getSupabaseToken();
  return createClient(clientEnv.NEXT_PUBLIC_SUPABASE_URL, clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
```

- [ ] **Step 3: Browser client**

Create `src/lib/supabase/browser.ts`:

```ts
'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { useSession } from '@clerk/nextjs';
import { useMemo } from 'react';
import { clientEnv } from '@/lib/env';

/** Hook that returns a Supabase client with the live Clerk JWT injected per fetch. */
export function useSupabase(): SupabaseClient {
  const { session } = useSession();
  return useMemo(
    () =>
      createClient(clientEnv.NEXT_PUBLIC_SUPABASE_URL, clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
        global: {
          fetch: async (input, init) => {
            const token = (await session?.getToken({ template: 'supabase' })) ?? '';
            const headers = new Headers(init?.headers);
            if (token) headers.set('Authorization', `Bearer ${token}`);
            return fetch(input, { ...init, headers });
          },
        },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      }),
    [session],
  );
}
```

- [ ] **Step 4: Service-role client (bypasses RLS, server-only)**

Create `src/lib/supabase/service-role.ts`:

```ts
import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { serverEnv } from '@/lib/env';

/**
 * Bypasses RLS. Use ONLY for the one-time setup wizard and admin tasks.
 * Never call from a client component or untrusted route.
 */
export function supabaseAdmin() {
  const env = serverEnv();
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
```

- [ ] **Step 5: Add `server-only` package**

```bash
pnpm add server-only
```

- [ ] **Step 6: Verify typecheck**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(supabase): add server, browser, and service-role clients with Clerk JWT"
```

---

## Task 14: PIN bcrypt utilities — TDD

**Files:**
- Create: `src/lib/auth/pin.ts`, `src/tests/unit/pin.test.ts`

- [ ] **Step 1: Write failing tests**

```bash
mkdir -p src/lib/auth
```

Create `src/tests/unit/pin.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { hashPin, verifyPin, isValidPin } from '@/lib/auth/pin';

describe('isValidPin', () => {
  it('accepts 4-6 digit pins', () => {
    expect(isValidPin('1234')).toBe(true);
    expect(isValidPin('123456')).toBe(true);
  });
  it('rejects too short', () => {
    expect(isValidPin('123')).toBe(false);
  });
  it('rejects too long', () => {
    expect(isValidPin('1234567')).toBe(false);
  });
  it('rejects non-digits', () => {
    expect(isValidPin('12a4')).toBe(false);
  });
  it('rejects empty', () => {
    expect(isValidPin('')).toBe(false);
  });
});

describe('hashPin/verifyPin', () => {
  it('hashes a pin and verifies it', async () => {
    const hash = await hashPin('1234');
    expect(hash).not.toBe('1234');
    expect(hash.length).toBeGreaterThan(20);
    expect(await verifyPin('1234', hash)).toBe(true);
  });
  it('rejects wrong pin', async () => {
    const hash = await hashPin('1234');
    expect(await verifyPin('5678', hash)).toBe(false);
  });
  it('produces different hashes for same pin (salt)', async () => {
    const a = await hashPin('1234');
    const b = await hashPin('1234');
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 2: Run to verify fail**

```bash
pnpm test:run src/tests/unit/pin.test.ts
```

Expected: All fail with module not found.

- [ ] **Step 3: Implement**

Create `src/lib/auth/pin.ts`:

```ts
import bcrypt from 'bcryptjs';

const BCRYPT_COST = 12;

export function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, BCRYPT_COST);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}
```

- [ ] **Step 4: Run to verify pass**

```bash
pnpm test:run src/tests/unit/pin.test.ts
```

Expected: 8 passed. (Bcrypt with cost 12 is ~150ms per op; tests take ~1s.)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(auth): add PIN bcrypt utilities with tests"
```

---

## Task 15: Signed cookie session — TDD

**Files:**
- Create: `src/lib/auth/session.ts`, `src/tests/unit/session.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/tests/unit/session.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { signSession, verifySession } from '@/lib/auth/session';

const SECRET = 'a'.repeat(64);

describe('signSession/verifySession', () => {
  it('round-trips a payload', () => {
    const token = signSession({ userId: 'u_1', exp: Date.now() + 60_000 }, SECRET);
    const result = verifySession(token, SECRET);
    expect(result?.userId).toBe('u_1');
  });
  it('returns null on tampered payload', () => {
    const token = signSession({ userId: 'u_1', exp: Date.now() + 60_000 }, SECRET);
    const tampered = token.slice(0, -2) + 'XX';
    expect(verifySession(tampered, SECRET)).toBeNull();
  });
  it('returns null when expired', () => {
    const token = signSession({ userId: 'u_1', exp: Date.now() - 1 }, SECRET);
    expect(verifySession(token, SECRET)).toBeNull();
  });
  it('returns null when secret differs', () => {
    const token = signSession({ userId: 'u_1', exp: Date.now() + 60_000 }, SECRET);
    expect(verifySession(token, 'b'.repeat(64))).toBeNull();
  });
  it('returns null on garbage input', () => {
    expect(verifySession('garbage', SECRET)).toBeNull();
    expect(verifySession('', SECRET)).toBeNull();
  });
});
```

- [ ] **Step 2: Verify they fail**

```bash
pnpm test:run src/tests/unit/session.test.ts
```

- [ ] **Step 3: Implement**

Create `src/lib/auth/session.ts`:

```ts
import { createHmac, timingSafeEqual } from 'node:crypto';

export interface SessionPayload {
  userId: string;
  /** Unix ms */
  exp: number;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function fromB64url(input: string): Buffer {
  return Buffer.from(input, 'base64url');
}

export function signSession(payload: SessionPayload, secret: string): string {
  const json = JSON.stringify(payload);
  const body = b64url(json);
  const sig = b64url(createHmac('sha256', secret).update(body).digest());
  return `${body}.${sig}`;
}

export function verifySession(token: string, secret: string): SessionPayload | null {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;

  const expected = createHmac('sha256', secret).update(body).digest();
  let provided: Buffer;
  try {
    provided = fromB64url(sig);
  } catch {
    return null;
  }
  if (provided.length !== expected.length) return null;
  if (!timingSafeEqual(provided, expected)) return null;

  try {
    const payload = JSON.parse(fromB64url(body).toString('utf8')) as SessionPayload;
    if (typeof payload.userId !== 'string' || typeof payload.exp !== 'number') return null;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Verify pass**

```bash
pnpm test:run src/tests/unit/session.test.ts
```

Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(auth): add HMAC-signed session cookie utilities with tests"
```

---

## Task 16: PIN cookie helpers + verify Server Action

**Files:**
- Modify: `src/lib/auth/pin.ts` (add cookie helpers)
- Create: `src/app/(auth)/lock/actions.ts`

- [ ] **Step 1: Extend `src/lib/auth/pin.ts` with cookie helpers**

Append to `src/lib/auth/pin.ts`:

```ts
import { cookies } from 'next/headers';
import { signSession, verifySession } from './session';
import { serverEnv } from '@/lib/env';

const COOKIE_NAME = 'pin_unlocked';

export async function setPinCookie(userId: string, lockMinutes: number): Promise<void> {
  const env = serverEnv();
  const exp = Date.now() + lockMinutes * 60_000;
  const token = signSession({ userId, exp }, env.PIN_SESSION_SECRET);
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(exp),
  });
}

export async function clearPinCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function readPinCookie(): Promise<{ userId: string } | null> {
  const env = serverEnv();
  const jar = await cookies();
  const value = jar.get(COOKIE_NAME)?.value;
  if (!value) return null;
  const payload = verifySession(value, env.PIN_SESSION_SECRET);
  return payload ? { userId: payload.userId } : null;
}
```

- [ ] **Step 2: Create the verify Server Action**

```bash
mkdir -p "src/app/(auth)/lock"
```

Create `src/app/(auth)/lock/actions.ts`:

```ts
'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/service-role';
import { isValidPin, setPinCookie, verifyPin } from '@/lib/auth/pin';

const inputSchema = z.object({ pin: z.string() });

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: 'invalid_format' | 'no_pin_set' | 'wrong_pin' | 'locked'; lockedUntilMs?: number; remaining?: number };

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export async function verifyPinAction(formData: FormData): Promise<VerifyResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const parsed = inputSchema.safeParse({ pin: formData.get('pin') });
  if (!parsed.success || !isValidPin(parsed.data.pin)) {
    return { ok: false, reason: 'invalid_format' };
  }

  const admin = supabaseAdmin();
  const { data: row, error } = await admin
    .from('auth_pin')
    .select('pin_hash, failed_attempts, locked_until')
    .eq('owner_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!row) return { ok: false, reason: 'no_pin_set' };

  const lockedUntilMs = row.locked_until ? new Date(row.locked_until).getTime() : 0;
  if (lockedUntilMs > Date.now()) {
    return { ok: false, reason: 'locked', lockedUntilMs };
  }

  const ok = await verifyPin(parsed.data.pin, row.pin_hash);
  if (!ok) {
    const newFailed = row.failed_attempts + 1;
    const shouldLock = newFailed >= MAX_ATTEMPTS;
    await admin
      .from('auth_pin')
      .update({
        failed_attempts: shouldLock ? 0 : newFailed,
        locked_until: shouldLock ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null,
      })
      .eq('owner_id', userId);
    return shouldLock
      ? { ok: false, reason: 'locked', lockedUntilMs: Date.now() + LOCK_MINUTES * 60_000 }
      : { ok: false, reason: 'wrong_pin', remaining: MAX_ATTEMPTS - newFailed };
  }

  // success → reset attempts, fetch lock minutes, set cookie
  const { data: settings } = await admin
    .from('app_settings')
    .select('pin_lock_minutes')
    .eq('owner_id', userId)
    .single();
  await admin.from('auth_pin').update({ failed_attempts: 0, locked_until: null }).eq('owner_id', userId);
  await setPinCookie(userId, settings?.pin_lock_minutes ?? 10);
  return { ok: true };
}

export async function lockNowAction(): Promise<void> {
  const { clearPinCookie } = await import('@/lib/auth/pin');
  await clearPinCookie();
  redirect('/lock');
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(auth): add PIN cookie helpers and verify Server Action with lockout"
```

---

## Task 17: Middleware — Clerk + PIN gate

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Create middleware**

Create `src/middleware.ts`:

```ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session';

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)']);
const isLockRoute = createRouteMatcher(['/lock(.*)']);
const isSetupRoute = createRouteMatcher(['/setup(.*)']);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return NextResponse.next();

  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }

  // Setup route: allowed only if setup not complete (we let the page itself enforce this).
  if (isSetupRoute(req)) return NextResponse.next();

  // Lock route: allowed when authenticated; PIN cookie not required (that's what we set here).
  if (isLockRoute(req)) return NextResponse.next();

  // All other routes require valid PIN cookie
  const cookie = req.cookies.get('pin_unlocked')?.value;
  const secret = process.env.PIN_SESSION_SECRET;
  if (!cookie || !secret) {
    return NextResponse.redirect(new URL('/lock', req.url));
  }
  const payload = verifySession(cookie, secret);
  if (!payload || payload.userId !== userId) {
    return NextResponse.redirect(new URL('/lock', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)', '/'],
};
```

- [ ] **Step 2: Wrap root layout in `<ClerkProvider>`**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fleucy',
  description: 'Personal finance OS',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className="min-h-screen antialiased">
          {children}
          <Toaster richColors position="top-right" />
        </body>
      </html>
    </ClerkProvider>
  );
}
```

- [ ] **Step 3: Verify**

```bash
pnpm typecheck
pnpm lint
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(auth): add Clerk middleware + PIN gate for /(app) routes"
```

---

## Task 18: Sign-in / Sign-up Clerk routes

**Files:**
- Create: `src/app/(auth)/layout.tsx`, `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`, `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`

- [ ] **Step 1: Auth layout (centered card)**

```bash
mkdir -p "src/app/(auth)"
mkdir -p "src/app/(auth)/sign-in/[[...sign-in]]"
mkdir -p "src/app/(auth)/sign-up/[[...sign-up]]"
```

Create `src/app/(auth)/layout.tsx`:

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-12">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
```

- [ ] **Step 2: Sign-in page**

Create `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`:

```tsx
import { SignIn } from '@clerk/nextjs';

export default function Page() {
  return (
    <SignIn
      forceRedirectUrl="/lock"
      signUpUrl="/sign-up"
      appearance={{ elements: { card: 'shadow-none border border-[var(--color-border)]' } }}
    />
  );
}
```

- [ ] **Step 3: Sign-up page**

Create `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`:

```tsx
import { SignUp } from '@clerk/nextjs';

export default function Page() {
  return (
    <SignUp
      forceRedirectUrl="/setup"
      signInUrl="/sign-in"
      appearance={{ elements: { card: 'shadow-none border border-[var(--color-border)]' } }}
    />
  );
}
```

- [ ] **Step 4: Smoke test**

```bash
pnpm dev
```

Visit http://localhost:3000/sign-in. Clerk widget renders. Visit http://localhost:3000/sign-up. Sign-up widget renders. Stop dev server.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(auth): add Clerk sign-in and sign-up pages"
```

---

## Task 19: Lock page (PIN keypad)

**Files:**
- Create: `src/app/(auth)/lock/page.tsx`, `src/app/(auth)/lock/keypad.tsx`

- [ ] **Step 1: Create the keypad client component**

Create `src/app/(auth)/lock/keypad.tsx`:

```tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Delete, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { verifyPinAction } from './actions';

export function Keypad() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get('next') ?? '/dashboard';

  const submit = (value: string) => {
    if (value.length < 4) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('pin', value);
      const result = await verifyPinAction(fd);
      if (result.ok) {
        router.replace(next);
        return;
      }
      setPin('');
      switch (result.reason) {
        case 'invalid_format':
          setError('PIN must be 4–6 digits');
          break;
        case 'no_pin_set':
          toast.error('No PIN set. Complete setup first.');
          router.replace('/setup');
          break;
        case 'wrong_pin':
          setError(`Incorrect PIN. ${result.remaining} attempt${result.remaining === 1 ? '' : 's'} remaining.`);
          break;
        case 'locked': {
          const minutes = Math.ceil(((result.lockedUntilMs ?? Date.now()) - Date.now()) / 60_000);
          setError(`Locked for ${minutes} more minute${minutes === 1 ? '' : 's'}.`);
          break;
        }
      }
    });
  };

  const tap = (digit: string) => {
    if (pending) return;
    setError(null);
    const next = (pin + digit).slice(0, 6);
    setPin(next);
    if (next.length >= 6) submit(next);
  };

  const back = () => {
    if (pending) return;
    setError(null);
    setPin((p) => p.slice(0, -1));
  };

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <Lock className="size-8 text-[var(--color-muted)]" aria-hidden />
      <h1 className="text-xl font-semibold">Enter your PIN</h1>

      <div className="flex gap-3" aria-live="polite">
        {Array.from({ length: 6 }).map((_, i) => (
          <span
            key={i}
            className="size-3 rounded-full border border-[var(--color-border)]"
            style={{ background: i < pin.length ? 'var(--color-primary)' : 'transparent' }}
          />
        ))}
      </div>

      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

      <div className="grid grid-cols-3 gap-3">
        {['1','2','3','4','5','6','7','8','9'].map((d) => (
          <Button
            key={d}
            type="button"
            variant="outline"
            className="h-14 w-14 text-lg"
            onClick={() => tap(d)}
            disabled={pending}
          >
            {d}
          </Button>
        ))}
        <div />
        <Button type="button" variant="outline" className="h-14 w-14 text-lg" onClick={() => tap('0')} disabled={pending}>
          0
        </Button>
        <Button type="button" variant="ghost" className="h-14 w-14" onClick={back} disabled={pending} aria-label="Backspace">
          <Delete className="size-5" />
        </Button>
      </div>

      <button
        type="button"
        onClick={() => submit(pin)}
        disabled={pin.length < 4 || pending}
        className="text-sm text-[var(--color-muted)] underline-offset-4 hover:underline disabled:opacity-40"
      >
        Submit
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Lock page**

Create `src/app/(auth)/lock/page.tsx`:

```tsx
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/service-role';
import { Keypad } from './keypad';

export default async function LockPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const admin = supabaseAdmin();
  const { data: pin } = await admin.from('auth_pin').select('owner_id').eq('owner_id', userId).maybeSingle();
  if (!pin) redirect('/setup');

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)]">
      <Keypad />
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(auth): add /lock page with PIN keypad"
```

---

## Task 20: Setup wizard — multi-step flow

**Files:**
- Create: `src/app/(auth)/setup/page.tsx`, `pin-step.tsx`, `telegram-step.tsx`, `actions.ts`

- [ ] **Step 1: Setup actions**

```bash
mkdir -p "src/app/(auth)/setup"
```

Create `src/app/(auth)/setup/actions.ts`:

```ts
'use server';

import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/service-role';
import { hashPin, isValidPin, setPinCookie } from '@/lib/auth/pin';

const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Food',          icon: 'utensils',     color: '#f97316' },
  { name: 'Transport',     icon: 'car',          color: '#0ea5e9' },
  { name: 'Shopping',      icon: 'shopping-bag', color: '#a855f7' },
  { name: 'Subscriptions', icon: 'repeat',       color: '#14b8a6' },
  { name: 'Bills',         icon: 'receipt',      color: '#64748b' },
  { name: 'Entertainment', icon: 'film',         color: '#ec4899' },
  { name: 'Health',        icon: 'heart-pulse',  color: '#ef4444' },
  { name: 'Education',     icon: 'book-open',    color: '#22c55e' },
  { name: 'Loans Out',     icon: 'arrow-up-right', color: '#f59e0b' },
  { name: 'Other',         icon: 'circle',       color: '#6b7280' },
];

const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Salary',      icon: 'briefcase',       color: '#16a34a' },
  { name: 'Side Income', icon: 'sparkles',        color: '#0891b2' },
  { name: 'Loans In',    icon: 'arrow-down-left', color: '#f59e0b' },
  { name: 'Gift',        icon: 'gift',            color: '#db2777' },
  { name: 'Refund',      icon: 'undo-2',          color: '#7c3aed' },
  { name: 'Other',       icon: 'circle',          color: '#6b7280' },
];

const pinInput = z.object({
  pin: z.string().refine(isValidPin, 'PIN must be 4-6 digits'),
  confirm: z.string(),
});

export async function setPinAction(formData: FormData) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const parsed = pinInput.safeParse({
    pin: formData.get('pin'),
    confirm: formData.get('confirm'),
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? 'Invalid PIN' };
  }
  if (parsed.data.pin !== parsed.data.confirm) {
    return { ok: false as const, error: 'PINs do not match' };
  }

  const hash = await hashPin(parsed.data.pin);
  const admin = supabaseAdmin();

  // upsert auth_pin
  const { error: pinErr } = await admin
    .from('auth_pin')
    .upsert({ owner_id: userId, pin_hash: hash, failed_attempts: 0, locked_until: null });
  if (pinErr) return { ok: false as const, error: pinErr.message };

  // ensure app_settings exists
  const { error: settingsErr } = await admin
    .from('app_settings')
    .upsert({ owner_id: userId, base_currency: 'CNY', theme: 'system', pin_lock_minutes: 10, reminder_days_before_due: 3 });
  if (settingsErr) return { ok: false as const, error: settingsErr.message };

  // seed default categories if none exist for this owner
  const { count } = await admin
    .from('categories')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', userId);
  if ((count ?? 0) === 0) {
    const rows = [
      ...DEFAULT_EXPENSE_CATEGORIES.map((c, i) => ({
        owner_id: userId, type: 'expense', is_system: true, sort_order: i,
        name: c.name, icon: c.icon, color: c.color,
      })),
      ...DEFAULT_INCOME_CATEGORIES.map((c, i) => ({
        owner_id: userId, type: 'income', is_system: true, sort_order: i,
        name: c.name, icon: c.icon, color: c.color,
      })),
    ];
    const { error: catErr } = await admin.from('categories').insert(rows);
    if (catErr) return { ok: false as const, error: catErr.message };
  }

  return { ok: true as const };
}

const telegramInput = z.object({
  enabled: z.string().optional(),
  chatId: z.string().optional(),
});

export async function setTelegramAction(formData: FormData) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const parsed = telegramInput.parse({
    enabled: formData.get('enabled') ?? undefined,
    chatId: formData.get('chatId') ?? undefined,
  });
  const enabled = parsed.enabled === 'on';
  const chatId = enabled ? (parsed.chatId?.trim() || null) : null;

  const admin = supabaseAdmin();
  await admin
    .from('app_settings')
    .update({ telegram_enabled: enabled, telegram_chat_id: chatId })
    .eq('owner_id', userId);
  return { ok: true as const };
}

export async function completeSetupAction() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  const admin = supabaseAdmin();
  await admin
    .from('app_settings')
    .update({ setup_completed_at: new Date().toISOString() })
    .eq('owner_id', userId);

  // immediately unlock the session for convenience
  const { data: settings } = await admin
    .from('app_settings')
    .select('pin_lock_minutes')
    .eq('owner_id', userId)
    .single();
  await setPinCookie(userId, settings?.pin_lock_minutes ?? 10);
  redirect('/dashboard');
}
```

- [ ] **Step 2: PIN step component**

Create `src/app/(auth)/setup/pin-step.tsx`:

```tsx
'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { setPinAction } from './actions';

export function PinStep({ onDone }: { onDone: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await setPinAction(fd);
      if (res.ok) onDone();
      else setError(res.error);
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold">Set your PIN</h2>
      <p className="text-sm text-[var(--color-muted)]">4–6 digits. You'll enter this every time you open the app.</p>

      <div className="space-y-2">
        <Label htmlFor="pin">PIN</Label>
        <Input id="pin" name="pin" type="password" inputMode="numeric" pattern="\d{4,6}" required autoFocus />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Confirm PIN</Label>
        <Input id="confirm" name="confirm" type="password" inputMode="numeric" pattern="\d{4,6}" required />
      </div>

      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Saving…' : 'Continue'}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Telegram step component**

Create `src/app/(auth)/setup/telegram-step.tsx`:

```tsx
'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { completeSetupAction, setTelegramAction } from './actions';

export function TelegramStep() {
  const [enabled, setEnabled] = useState(false);
  const [pending, start] = useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      await setTelegramAction(fd);
      await completeSetupAction();
    });
  };

  const onSkip = () => start(async () => { await completeSetupAction(); });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold">Bind Telegram (optional)</h2>
      <p className="text-sm text-[var(--color-muted)]">
        Reminders can be pushed to Telegram via your n8n workflow. Paste your Telegram chat id (you can find it via @userinfobot).
        You can change or skip this later.
      </p>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="enabled" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        Enable Telegram reminders
      </label>

      {enabled && (
        <div className="space-y-2">
          <Label htmlFor="chatId">Telegram chat id</Label>
          <Input id="chatId" name="chatId" placeholder="e.g. 123456789" />
        </div>
      )}

      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onSkip} disabled={pending}>Skip</Button>
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? 'Finishing…' : 'Finish setup'}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Setup page (router between steps)**

Create `src/app/(auth)/setup/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { PinStep } from './pin-step';
import { TelegramStep } from './telegram-step';

export default function SetupPage() {
  const [step, setStep] = useState<'pin' | 'telegram'>('pin');

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-6">
      <p className="mb-4 text-xs uppercase tracking-wide text-[var(--color-muted)]">
        Step {step === 'pin' ? 1 : 2} of 2
      </p>
      {step === 'pin' ? <PinStep onDone={() => setStep('telegram')} /> : <TelegramStep />}
    </div>
  );
}
```

- [ ] **Step 5: Typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(auth): add /setup wizard with PIN and Telegram steps"
```

---

## Task 21: App shell — sidebar (desktop) + bottom-nav (mobile) + header

**Files:**
- Create: `src/components/layout/sidebar.tsx`, `bottom-nav.tsx`, `header.tsx`, `shell.tsx`, `theme-toggle.tsx`
- Create: `src/app/(app)/layout.tsx`
- Create: `src/providers/theme-provider.tsx`, `query-provider.tsx`

- [ ] **Step 1: Add `next-themes`**

```bash
pnpm add next-themes
```

- [ ] **Step 2: Theme provider**

```bash
mkdir -p src/providers
```

Create `src/providers/theme-provider.tsx`:

```tsx
'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
```

- [ ] **Step 3: Query provider**

Create `src/providers/query-provider.tsx`:

```tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
  }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

- [ ] **Step 4: Wrap root layout with both providers**

Update `src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/providers/theme-provider';
import { QueryProvider } from '@/providers/query-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fleucy',
  description: 'Personal finance OS',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className="min-h-screen antialiased">
          <ThemeProvider>
            <QueryProvider>
              {children}
              <Toaster richColors position="top-right" />
            </QueryProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
```

- [ ] **Step 5: Theme toggle**

```bash
mkdir -p src/components/layout
```

Create `src/components/layout/theme-toggle.tsx`:

```tsx
'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Theme">
          {theme === 'dark' ? <Moon className="size-4" /> : theme === 'light' ? <Sun className="size-4" /> : <Monitor className="size-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}><Sun className="mr-2 size-4" />Light</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}><Moon className="mr-2 size-4" />Dark</DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}><Monitor className="mr-2 size-4" />System</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 6: Sidebar (desktop)**

Create `src/components/layout/sidebar.tsx`:

```tsx
import Link from 'next/link';
import { LayoutDashboard, ListChecks, Wallet, Users, Tag, Repeat, Target, BarChart3, Bell, Settings } from 'lucide-react';

const items = [
  { href: '/dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/transactions',  label: 'Transactions',  icon: ListChecks },
  { href: '/accounts',      label: 'Accounts',      icon: Wallet },
  { href: '/debts',         label: 'Debts',         icon: Users },
  { href: '/categories',    label: 'Categories',    icon: Tag },
  { href: '/recurring',     label: 'Recurring',     icon: Repeat },
  { href: '/budgets',       label: 'Budgets',       icon: Target },
  { href: '/reports',       label: 'Reports',       icon: BarChart3 },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/settings',      label: 'Settings',      icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="hidden border-r border-[var(--color-border)] bg-[var(--color-card)] md:flex md:w-56 md:flex-col">
      <div className="px-4 py-5 text-lg font-semibold">Fleucy</div>
      <nav className="flex-1 space-y-1 px-2">
        {items.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5"
          >
            <Icon className="size-4" /> {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 7: Bottom nav (mobile)**

Create `src/components/layout/bottom-nav.tsx`:

```tsx
import Link from 'next/link';
import { LayoutDashboard, ListChecks, Users, Menu } from 'lucide-react';

export function BottomNav() {
  const items = [
    { href: '/dashboard',    label: 'Home',  icon: LayoutDashboard },
    { href: '/transactions', label: 'Tx',    icon: ListChecks },
    { href: '/debts',        label: 'Debts', icon: Users },
    { href: '/settings',     label: 'More',  icon: Menu },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-[var(--color-border)] bg-[var(--color-card)] md:hidden">
      {items.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className="flex flex-col items-center gap-1 py-2 text-xs">
          <Icon className="size-5" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
```

- [ ] **Step 8: Header**

Create `src/components/layout/header.tsx`:

```tsx
import { Bell } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from './theme-toggle';

export function Header() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-card)] px-4">
      <div className="text-sm text-[var(--color-muted)]">¥ RMB</div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="size-4" />
        </Button>
        <ThemeToggle />
        <UserButton appearance={{ elements: { avatarBox: 'size-7' } }} />
      </div>
    </header>
  );
}
```

- [ ] **Step 9: Shell wrapper**

Create `src/components/layout/shell.tsx`:

```tsx
import { Sidebar } from './sidebar';
import { BottomNav } from './bottom-nav';
import { Header } from './header';

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen md:grid-cols-[14rem_1fr]">
      <Sidebar />
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 px-4 py-6 pb-20 md:pb-6">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 10: App layout**

```bash
mkdir -p "src/app/(app)/dashboard"
```

Create `src/app/(app)/layout.tsx`:

```tsx
import { Shell } from '@/components/layout/shell';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>;
}
```

- [ ] **Step 11: Empty dashboard**

Create `src/app/(app)/dashboard/page.tsx`:

```tsx
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-[var(--color-muted)]">Welcome to Fleucy. Widgets land in Phase 1.</p>
      </div>
      <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] bg-[var(--color-card)] p-10 text-center text-sm text-[var(--color-muted)]">
        Phase 0 complete — your foundation is wired up.
      </div>
    </div>
  );
}
```

- [ ] **Step 12: Root page redirect**

Replace `src/app/page.tsx`:

```tsx
import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/dashboard');
}
```

- [ ] **Step 13: Verify build**

```bash
pnpm typecheck && pnpm lint && pnpm build
```

Expected: all pass.

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "feat(layout): add app shell, sidebar, bottom-nav, header, theme toggle, empty dashboard"
```

---

## Task 22: End-to-end smoke test (manual)

This is a verification step, not code. Run through the full first-launch flow.

- [ ] **Step 1: Start dev**

```bash
pnpm dev
```

- [ ] **Step 2: Sign-up flow**

1. Open http://localhost:3000 → redirected to `/sign-in`.
2. Click "Sign up" → Clerk widget. Sign up with your email. Verify the email code.
3. After Clerk redirect → land on `/setup`.
4. Set PIN: enter 6 digits, confirm matches → click Continue.
5. Telegram step: leave disabled, click Skip → redirected to `/dashboard`.

Expected: dashboard renders with the layout shell, theme respects OS, user avatar visible top-right.

- [ ] **Step 3: Lock + unlock**

1. Sign out from the user menu, sign back in → land on `/lock`.
2. Enter wrong PIN 5 times → see lockout message with countdown.
3. Wait 1 min, refresh — note: real lock is 15 min; for test you can manually clear `auth_pin.locked_until` in Supabase SQL editor.
4. Enter correct PIN → land on `/dashboard`.

- [ ] **Step 4: PIN cookie expiry**

1. While on `/dashboard`, open browser DevTools → Application → Cookies.
2. Confirm `pin_unlocked` cookie exists, `HttpOnly`, `SameSite=Lax`.
3. Delete the cookie. Refresh → redirected to `/lock`.

- [ ] **Step 5: RLS verification (in Supabase SQL editor)**

In Supabase dashboard → SQL editor, run:

```sql
select tablename, rowsecurity from pg_tables where schemaname = 'public' and tablename in
  ('accounts','categories','people','transactions','debts','debt_payments',
   'recurring_rules','budgets','notifications','auth_pin','app_settings');
```

Expected: every row shows `rowsecurity = true`.

```sql
select policyname, tablename from pg_policies where schemaname = 'public';
```

Expected: 11 rows, one `owner_all_<table>` per user-data table.

- [ ] **Step 6: Theme toggle test**

Click theme toggle → switch Light/Dark/System. Layout adapts; tokens render correctly in both themes.

- [ ] **Step 7: Stop dev, document any issues**

Stop dev server. If anything failed, file an issue/note before moving on.

- [ ] **Step 8: Commit verification log**

Append to `docs/superpowers/plans/2026-04-26-fleucy-phase-0-foundation.md` (this file) a `## Verification log` section with date + checklist outcomes:

```markdown
## Verification log

- 2026-04-26 — All Phase 0 verifications passed (sign-up, PIN setup, lock/unlock, RLS, theme toggle).
```

```bash
git add -A
git commit -m "docs: log Phase 0 verification results"
```

---

## Task 23: CLAUDE.md + README

**Files:**
- Create: `CLAUDE.md`, `README.md`

- [ ] **Step 1: CLAUDE.md**

Create `CLAUDE.md`:

```markdown
# Fleucy — Project Rules for Claude Code

## Stack (locked)

- Next.js 15 App Router + React 19 + TypeScript
- Tailwind CSS v4 (CSS-first, `@theme` tokens) + shadcn/ui
- Clerk (auth) + custom PIN gate (bcrypt + HMAC cookie)
- Supabase (Postgres + Storage)
- Prisma (schema + migrations only) + `@supabase/supabase-js` (runtime; RLS-aware)
- TanStack Query (server state) + Zustand (UI state)
- React Hook Form + Zod
- Sonner (toasts), Lucide (icons)
- Day.js (date)
- Biome (lint + format)
- pnpm

## Hard rules

1. **Money is `bigint` fen.** Never `number`. 1 RMB = 100 fen. Use `src/lib/money` for conversion.
2. **Every user-data table has `owner_id text` (Clerk user id) + RLS policy `auth.jwt() ->> 'sub' = owner_id`.** Verify in code review.
3. **Runtime queries use `@supabase/supabase-js`** (carries Clerk JWT → RLS works). **Prisma is for schema/migrations + admin scripts only.**
4. **Server Actions for writes; Server Components for reads** where possible.
5. **Zod schemas are the single source of truth** for form validation. Derive types with `z.infer`.
6. **Server-only modules** must `import 'server-only'` if they handle secrets.
7. **Migrations are append-only.** Never edit a shipped migration. Hand-written migrations live alongside Prisma's auto migrations.
8. **No commits with secrets.** `.env.example` mirrors `.env.local` keys with empty values.
9. **n8n workflows live in `n8n/*.json`.** When edited in n8n UI, re-export and commit.
10. **Phase boundaries.** Don't pull P3 features (OCR, voice, PDF, animations) into P1.

## Commands

- `pnpm dev` — dev server (Turbopack)
- `pnpm build` — production build
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm lint` / `pnpm lint:fix` — Biome
- `pnpm test` / `pnpm test:run` — Vitest
- `pnpm prisma migrate dev` — new local migration
- `pnpm prisma migrate deploy` — apply pending migrations to Supabase
- `pnpm prisma generate` — regenerate client after schema edits

## File conventions

- `src/features/<domain>/` — vertical slices: `actions.ts`, `queries.ts`, `schemas.ts`, components.
- `src/lib/` — horizontal infra (no domain logic).
- `src/components/ui/` — shadcn primitives only. Don't add domain logic here.
- `src/components/layout/` — shell pieces.
- `src/app/(auth)/` — public + setup + lock routes.
- `src/app/(app)/` — gated routes (require Clerk session + PIN cookie).

## Commit style

Conventional Commits: `feat:`, `fix:`, `chore:`, `test:`, `docs:`, `refactor:`. Subject ≤ 72 chars, imperative.

## Phase 0 (current) — Foundation

Done when: setup wizard works, PIN locks/unlocks, RLS verified, layout renders, dashboard placeholder.

## Phases not yet implemented

- Phase 1 — MVP (accounts, categories, transactions, people, debts, basic dashboard)
- Phase 2 — Smart (budgets, recurring, n8n cron, notifications, charts, ⌘K)
- Phase 3 — Polish (OCR, voice/Whisper, PDF, animations, danger zone)
- Phase 4 — Future (Web Push/PWA, multi-currency, i18n)
```

- [ ] **Step 2: README**

Create `README.md`:

```markdown
# Fleucy

Private personal finance OS. Single-user. RMB-denominated. Premium feel.

## Stack

Next.js 15 · React 19 · TypeScript · Tailwind v4 · shadcn/ui · Clerk · Supabase · Prisma · TanStack Query · Zustand · Day.js · n8n (Telegram reminders).

## Local development

1. **Install deps:** `pnpm install`
2. **Configure secrets:** copy `.env.example` to `.env.local` and fill in Clerk + Supabase + PIN secret values. See `supabase/README.md` and `src/lib/clerk/SETUP.md`.
3. **Apply migrations:** `pnpm prisma migrate deploy`
4. **Dev:** `pnpm dev` → http://localhost:3000
5. **First launch:** `/sign-up` → set PIN → optional Telegram bind → `/dashboard`.

## Commands

| Command | Purpose |
|---|---|
| `pnpm dev` | dev server |
| `pnpm build` | production build |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | Biome check |
| `pnpm test` / `pnpm test:run` | Vitest |
| `pnpm prisma migrate deploy` | apply migrations |
| `pnpm prisma studio` | DB GUI |

## Deploy

Push to GitHub → import in Vercel → set env vars → deploy. See spec for env var list.

## Architecture

See `docs/superpowers/specs/` for the full spec and `docs/superpowers/plans/` for phased implementation plans.
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "docs: add CLAUDE.md (project rules) and README"
```

---

## Task 24: Vercel deploy

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Vercel config**

Create `vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "regions": ["sin1"]
}
```

(Adjust `regions` to nearest to user — `sin1` Singapore is reasonable for Chinese RMB user. Other options: `hnd1` Tokyo, `hkg1` Hong Kong.)

- [ ] **Step 2: Push to GitHub**

```bash
gh repo create fleucy --private --source=. --remote=origin --push
```

If `gh` not installed: create the repo manually in GitHub UI, then `git remote add origin <url>` and `git push -u origin main`.

- [ ] **Step 3: Import to Vercel**

1. Browser → https://vercel.com/new → import `fleucy` repo.
2. Framework: Next.js (auto-detected).
3. **Environment Variables:** add all keys from `.env.local`. Mark `CLERK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `DIRECT_URL`, `PIN_SESSION_SECRET` as **secret**.
4. Build command: `pnpm prisma generate && pnpm build` (Vercel auto-detects).
5. Install command: `pnpm install`.
6. Click Deploy.

- [ ] **Step 4: Configure Clerk for production**

In Clerk dashboard → your app → Domains → add the Vercel domain (e.g. `fleucy.vercel.app`). Switch instance to Production if desired (or keep Dev for personal use — Dev tier allows production-like usage at lower limits but that's fine for one user).

- [ ] **Step 5: Verify production**

Open `https://fleucy.vercel.app`. Walk through Task 22 flow on the live URL. Test from your phone.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: add vercel.json"
git push
```

---

## Verification — Phase 0 Definition of Done

After all 24 tasks complete, all of these must be green:

- [ ] `pnpm typecheck && pnpm lint && pnpm test:run && pnpm build` exits 0
- [ ] `/setup` flow works on a fresh Clerk user (sign-up → PIN → optional Telegram → dashboard)
- [ ] `/lock` rejects wrong PIN, locks after 5 attempts, unlocks correct PIN
- [ ] `pin_unlocked` cookie is HttpOnly, Secure (in prod), SameSite=Lax
- [ ] Every user-data table has RLS enabled and an `owner_all_<table>` policy
- [ ] Storage buckets `receipts` and `avatars` have owner-scoped policies
- [ ] All three views (`v_account_balances`, `v_monthly_summary`, `v_debt_summary`) exist
- [ ] Default 16 categories (10 expense + 6 income) seeded for the new user
- [ ] App shell renders sidebar (≥md) + bottom-nav (<md) + header
- [ ] Theme toggle switches light/dark/system, persists across reload
- [ ] Deployed to Vercel and accessible from phone over HTTPS

---

## Self-Review

**Spec coverage check:**

| Spec section | Phase 0 task(s) |
|---|---|
| Final Stack table | Tasks 1–5, 8, 12 |
| High-Level Architecture diagram | Tasks 13, 17 |
| Auth & Security Model (Layers 1, 2, 4, 5) | Tasks 12, 14–17, 19, 20 |
| Database Schema (all tables) | Tasks 8, 9 |
| RLS + storage policies | Task 9 |
| Views (3) | Task 9 |
| Cron / n8n (Workflow A, B) | **Deferred to Phase 2 plan** |
| Telegram dispatch | **Bind in Task 20; dispatch deferred to P2** |
| Feature modules | Empty shell only (Task 21); content per phase |
| Folder structure | Tasks 1, 4, 21, throughout |
| CLAUDE.md | Task 23 |
| Critical files (P0) list | All covered |
| Verification (P0 list from spec) | Covered by Task 22 + final verification block |

**Placeholder scan:** No `TBD`/`TODO`/`fill in`/`Similar to Task N` references. All test code is concrete. All Server Action code is complete.

**Type consistency:** `setPinCookie(userId, lockMinutes)` signature consistent across Tasks 16, 20. `verifyPinAction` return shape `VerifyResult` referenced consistently in Task 19's keypad handler. `clerk_user_id()` SQL function name consistent across all RLS policies in Task 9.

**Decomposition rationale:** 24 tasks averaging 5–8 steps each. Heaviest are Task 9 (RLS migration) and Task 21 (layout shell) — both broken into multiple small steps with verification gates.

---

## Plan complete — handoff

After Phase 0 ships, write Phase 1 (MVP) plan covering: accounts CRUD, categories CRUD, transactions CRUD with TanStack Table + filters + quick-add + receipt upload, people CRUD, debts CRUD + payments, basic dashboard widgets, theme persistence in `app_settings`, PIN change in settings, CSV export.
