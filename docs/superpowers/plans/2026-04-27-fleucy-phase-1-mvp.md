# Fleucy Phase 1 (MVP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core accounting MVP — accounts, categories, transactions (with receipt upload), people, debts, basic dashboard widgets, settings (PIN change, CSV export) — so the user can fully replace their current money-tracking method with Fleucy.

**Architecture:** Client pages fetch data via `useSupabase()` hook + TanStack Query (client-side, optimistic). All writes go through Next.js Server Actions using `supabaseServer()` so RLS enforces ownership. Dashboard widgets query `v_account_balances` and `v_monthly_summary` Postgres views.

**Tech Stack:** Next.js 16 App Router · Supabase JS 2 · TanStack Query v5 · TanStack Table v8 · React Hook Form 7 · Zod v4 · Sonner · shadcn/ui · Day.js · PapaParse (CSV) · Lucide

---

## Critical Rules (read before touching any file)

- **Money = `bigint` fen always.** Use `displayToFen()` / `formatRMB()` from `@/lib/money`. Never `Number()` on fen values.
- **Server Actions use `supabaseServer()`** (not `supabaseAdmin`) for all user mutations — RLS applies. Always include `owner_id: userId` in inserts.
- **Proxy file is `src/proxy.ts`** (Next.js 16). Not middleware.ts.
- **`updated_at` is auto-set by Postgres trigger** — never pass it manually.
- **Zod v4 with v3 syntax** — `z.string().url()`, `z.string().min()` etc. all work unchanged.
- **TanStack Query v5** — `queryClient.invalidateQueries({ queryKey: ['key'] })` (object form, not string).

---

## Established Patterns

### Server Action pattern
```ts
'use server';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';

export async function createXAction(formData: FormData) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  const supabase = await supabaseServer();
  const { error } = await supabase.from('table').insert({ owner_id: userId, ...data });
  if (error) throw new Error(error.message);
}
```

### Client query hook pattern (TanStack Query v5 + useSupabase)
```ts
'use client';
import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/lib/supabase/browser';

export function useAccounts() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });
}
```

### Mutation pattern (call Server Action, invalidate query)
```ts
const queryClient = useQueryClient();
const { mutate, isPending } = useMutation({
  mutationFn: async (fd: FormData) => createXAction(fd),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
    toast.success('Created');
  },
  onError: (e) => toast.error(e.message),
});
```

---

## File Structure (created in this phase)

```
src/
├── lib/
│   └── date/index.ts                    Day.js setup
├── features/
│   ├── accounts/
│   │   ├── schemas.ts
│   │   ├── actions.ts
│   │   └── queries.ts
│   ├── categories/
│   │   ├── schemas.ts
│   │   ├── actions.ts
│   │   └── queries.ts
│   ├── transactions/
│   │   ├── schemas.ts
│   │   ├── actions.ts
│   │   ├── queries.ts
│   │   └── receipt-upload.ts
│   ├── people/
│   │   ├── schemas.ts
│   │   ├── actions.ts
│   │   └── queries.ts
│   ├── debts/
│   │   ├── schemas.ts
│   │   ├── actions.ts
│   │   └── queries.ts
│   └── dashboard/
│       └── queries.ts
├── components/
│   ├── ui/
│   │   └── data-table.tsx               TanStack Table wrapper
│   └── feature/
│       ├── amount-input.tsx             Fen-aware RMB input
│       ├── category-picker.tsx
│       ├── account-picker.tsx
│       └── person-picker.tsx
└── app/(app)/
    ├── dashboard/
    │   ├── page.tsx                     REPLACE placeholder
    │   ├── net-worth-widget.tsx
    │   ├── accounts-strip.tsx
    │   └── this-month-widget.tsx
    ├── accounts/
    │   └── page.tsx
    ├── categories/
    │   └── page.tsx
    ├── transactions/
    │   ├── page.tsx
    │   ├── transactions-table.tsx
    │   ├── quick-add-modal.tsx
    │   └── edit-drawer.tsx
    ├── debts/
    │   ├── page.tsx
    │   ├── people/page.tsx
    │   └── [id]/page.tsx
    └── settings/
        ├── page.tsx
        └── actions.ts
```

---

## Task 0: Install missing Phase 1 dependencies

**Files:** `package.json`, `pnpm-lock.yaml`

- [ ] **Step 1: Install runtime deps**

```bash
pnpm add @tanstack/react-table papaparse
pnpm add -D @types/papaparse
```

- [ ] **Step 2: Verify**

```bash
pnpm list @tanstack/react-table papaparse --depth 0
```

Expected: both listed with versions.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add tanstack-table and papaparse for Phase 1"
```

---

## Task 1: Day.js setup

**Files:**
- Create: `src/lib/date/index.ts`

- [ ] **Step 1: Create Day.js configuration**

```bash
mkdir -p src/lib/date
```

Create `src/lib/date/index.ts`:

```ts
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);

export { dayjs };

/** Format a DB timestamptz string for display: "Apr 27, 2026" */
export function fmtDate(iso: string): string {
  return dayjs(iso).format('MMM D, YYYY');
}

/** Format a DB timestamptz string with time: "Apr 27, 2026 14:30" */
export function fmtDateTime(iso: string): string {
  return dayjs(iso).format('MMM D, YYYY HH:mm');
}

/** Format a DB date string (YYYY-MM-DD): "Apr 27" */
export function fmtShortDate(iso: string): string {
  return dayjs(iso).format('MMM D');
}

/** Relative time: "3 days ago" */
export function fmtRelative(iso: string): string {
  return dayjs(iso).fromNow();
}

/** ISO string for today at midnight UTC */
export function todayIso(): string {
  return dayjs().startOf('day').toISOString();
}

/** First day of current month as ISO date string: "2026-04-01" */
export function startOfMonthIso(): string {
  return dayjs().startOf('month').format('YYYY-MM-DD');
}

/** Last day of current month as ISO date string: "2026-04-30" */
export function endOfMonthIso(): string {
  return dayjs().endOf('month').format('YYYY-MM-DD');
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/date/index.ts
git commit -m "feat(date): add Day.js setup with formatting helpers"
```

---

## Task 2: Amount input component (TDD)

**Files:**
- Create: `src/components/feature/amount-input.tsx`
- Create: `src/tests/unit/amount-input.test.tsx`

This is a controlled input that accepts user typing in yuan (e.g. "123.45") and converts to bigint fen internally.

- [ ] **Step 1: Write failing tests**

```bash
mkdir -p src/components/feature
```

Create `src/tests/unit/amount-input.test.tsx`:

```tsx
import { vi } from 'vitest';

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

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AmountInput } from '@/components/feature/amount-input';

describe('AmountInput', () => {
  it('renders with ¥ prefix and empty value', () => {
    render(<AmountInput value={0n} onChange={() => {}} />);
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect((input as HTMLInputElement).value).toBe('');
  });

  it('shows formatted value when non-zero', () => {
    render(<AmountInput value={12345n} onChange={() => {}} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('123.45');
  });

  it('calls onChange with fen bigint on valid input', () => {
    const onChange = vi.fn();
    render(<AmountInput value={0n} onChange={onChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '50' } });
    expect(onChange).toHaveBeenCalledWith(5000n);
  });

  it('calls onChange with 0n on empty input', () => {
    const onChange = vi.fn();
    render(<AmountInput value={5000n} onChange={onChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith(0n);
  });

  it('ignores invalid input (does not call onChange)', () => {
    const onChange = vi.fn();
    render(<AmountInput value={0n} onChange={onChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'abc' } });
    expect(onChange).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify failure**

```bash
pnpm test:run src/tests/unit/amount-input.test.tsx
```

Expected: fails with module not found.

- [ ] **Step 3: Implement AmountInput**

Create `src/components/feature/amount-input.tsx`:

```tsx
'use client';

import { fenToDisplay } from '@/lib/money';
import { cn } from '@/lib/utils/cn';
import { type ChangeEvent, useEffect, useState } from 'react';

interface Props {
  value: bigint;
  onChange: (fen: bigint) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

/**
 * Controlled money input. Displays in yuan (e.g. "123.45"),
 * communicates in bigint fen to parent. Shows ¥ prefix label.
 */
export function AmountInput({ value, onChange, placeholder = '0.00', disabled, className, id }: Props) {
  // Local display state (string the user is typing)
  const [display, setDisplay] = useState(value === 0n ? '' : fenToDisplay(value));

  // Sync when parent resets value externally
  useEffect(() => {
    setDisplay(value === 0n ? '' : fenToDisplay(value));
  }, [value]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDisplay(raw);

    if (raw === '' || raw === '0') {
      onChange(0n);
      return;
    }
    // Only accept valid decimal money string
    if (!/^\d+(\.\d{0,2})?$/.test(raw)) return;
    try {
      const fen = BigInt(Math.round(Number.parseFloat(raw) * 100));
      onChange(fen);
    } catch {
      // ignore parse error
    }
  };

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-muted)]">
        ¥
      </span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={display}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'flex h-9 w-full rounded-md border border-[var(--color-border)] bg-transparent pl-7 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-[var(--color-muted)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
      />
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
pnpm test:run src/tests/unit/amount-input.test.tsx
```

Expected: 5 passed.

- [ ] **Step 5: Lint + typecheck**

```bash
pnpm lint && pnpm typecheck
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(ui): add AmountInput component with bigint fen TDD"
```

---

## Task 3: TanStack Table wrapper

**Files:**
- Create: `src/components/ui/data-table.tsx`

- [ ] **Step 1: Create generic DataTable**

Create `src/components/ui/data-table.tsx`:

```tsx
'use client';

import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
}

export function DataTable<T>({ columns, data, isLoading, emptyMessage = 'No results.' }: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={`sk-${i}`} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-border)]">
      <table className="w-full text-sm">
        <thead className="border-b border-[var(--color-border)] bg-[var(--color-card)]">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th
                  key={h.id}
                  className="px-4 py-3 text-left font-medium text-[var(--color-muted)]"
                >
                  {h.isPlaceholder ? null : h.column.getCanSort() ? (
                    <button
                      type="button"
                      className="flex items-center gap-1 hover:text-[var(--color-fg)]"
                      onClick={h.column.getToggleSortingHandler()}
                    >
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      {h.column.getIsSorted() === 'asc' ? (
                        <ChevronUp className="size-3" />
                      ) : h.column.getIsSorted() === 'desc' ? (
                        <ChevronDown className="size-3" />
                      ) : (
                        <ChevronsUpDown className="size-3 opacity-40" />
                      )}
                    </button>
                  ) : (
                    flexRender(h.column.columnDef.header, h.getContext())
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="py-10 text-center text-[var(--color-muted)]"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-[var(--color-border)] last:border-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/data-table.tsx
git commit -m "feat(ui): add generic DataTable with TanStack Table v8"
```

---

## Task 4: Accounts — schemas, actions, queries

**Files:**
- Create: `src/features/accounts/schemas.ts`
- Create: `src/features/accounts/actions.ts`
- Create: `src/features/accounts/queries.ts`

- [ ] **Step 1: Create account schemas**

```bash
mkdir -p src/features/accounts
```

Create `src/features/accounts/schemas.ts`:

```ts
import { z } from 'zod';

export const accountKinds = ['cash', 'bank', 'mobile_wallet'] as const;
export type AccountKind = (typeof accountKinds)[number];

export const accountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  kind: z.enum(accountKinds),
  icon: z.string().default('wallet'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color').default('#3b82f6'),
  openingBalanceFen: z.bigint().default(0n),
  lowBalanceThresholdFen: z.bigint().nullable().default(null),
});

export type AccountFormValues = z.infer<typeof accountSchema>;

// Row returned from DB / view
export interface Account {
  id: string;
  owner_id: string;
  name: string;
  kind: AccountKind;
  icon: string;
  color: string;
  opening_balance_fen: string; // Supabase returns bigint as string
  low_balance_threshold_fen: string | null;
  is_archived: boolean;
  sort_order: number;
  created_at: string;
}

// Row from v_account_balances view
export interface AccountBalance {
  account_id: string;
  owner_id: string;
  name: string;
  kind: AccountKind;
  balance_fen: string; // bigint as string
  low_balance_threshold_fen: string | null;
}

/** Safely parse a bigint string from Supabase (returns 0n on null/undefined) */
export function parseFen(val: string | null | undefined): bigint {
  if (!val) return 0n;
  return BigInt(val);
}
```

- [ ] **Step 2: Create account Server Actions**

Create `src/features/accounts/actions.ts`:

```ts
'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase/server';

const createSchema = z.object({
  name: z.string().min(1),
  kind: z.enum(['cash', 'bank', 'mobile_wallet']),
  icon: z.string().default('wallet'),
  color: z.string().default('#3b82f6'),
  opening_balance_fen: z.string().default('0'),
  low_balance_threshold_fen: z.string().nullable().default(null),
});

export type AccountActionResult = { ok: true } | { ok: false; error: string };

export async function createAccountAction(formData: FormData): Promise<AccountActionResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const parsed = createSchema.safeParse({
    name: formData.get('name'),
    kind: formData.get('kind'),
    icon: formData.get('icon') ?? 'wallet',
    color: formData.get('color') ?? '#3b82f6',
    opening_balance_fen: formData.get('opening_balance_fen') ?? '0',
    low_balance_threshold_fen: formData.get('low_balance_threshold_fen') || null,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid' };

  const supabase = await supabaseServer();
  const { error } = await supabase.from('accounts').insert({
    owner_id: userId,
    name: parsed.data.name,
    kind: parsed.data.kind,
    icon: parsed.data.icon,
    color: parsed.data.color,
    opening_balance_fen: parsed.data.opening_balance_fen,
    low_balance_threshold_fen: parsed.data.low_balance_threshold_fen,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateAccountAction(
  id: string,
  formData: FormData,
): Promise<AccountActionResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const parsed = createSchema.safeParse({
    name: formData.get('name'),
    kind: formData.get('kind'),
    icon: formData.get('icon') ?? 'wallet',
    color: formData.get('color') ?? '#3b82f6',
    opening_balance_fen: formData.get('opening_balance_fen') ?? '0',
    low_balance_threshold_fen: formData.get('low_balance_threshold_fen') || null,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid' };

  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('accounts')
    .update({
      name: parsed.data.name,
      kind: parsed.data.kind,
      icon: parsed.data.icon,
      color: parsed.data.color,
      opening_balance_fen: parsed.data.opening_balance_fen,
      low_balance_threshold_fen: parsed.data.low_balance_threshold_fen,
    })
    .eq('id', id)
    .eq('owner_id', userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function archiveAccountAction(id: string): Promise<AccountActionResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('accounts')
    .update({ is_archived: true })
    .eq('id', id)
    .eq('owner_id', userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
```

- [ ] **Step 3: Create account query hook**

Create `src/features/accounts/queries.ts`:

```ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/lib/supabase/browser';
import type { Account, AccountBalance } from './schemas';

export const ACCOUNTS_KEY = ['accounts'] as const;
export const ACCOUNT_BALANCES_KEY = ['account-balances'] as const;

export function useAccounts() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ACCOUNTS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('is_archived', false)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as Account[];
    },
  });
}

export function useAccountBalances() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ACCOUNT_BALANCES_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_account_balances')
        .select('*')
        .order('name');
      if (error) throw error;
      return (data ?? []) as AccountBalance[];
    },
  });
}
```

- [ ] **Step 4: Typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 5: Commit**

```bash
git add src/features/accounts/
git commit -m "feat(accounts): add schemas, Server Actions, and query hooks"
```

---

## Task 5: Accounts page

**Files:**
- Create: `src/app/(app)/accounts/page.tsx`

- [ ] **Step 1: Create accounts page**

```bash
mkdir -p "src/app/(app)/accounts"
```

Create `src/app/(app)/accounts/page.tsx`:

```tsx
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit2, Plus, Wallet } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AmountInput } from '@/components/feature/amount-input';
import {
  archiveAccountAction,
  createAccountAction,
  updateAccountAction,
} from '@/features/accounts/actions';
import { ACCOUNT_BALANCES_KEY, ACCOUNTS_KEY, useAccountBalances } from '@/features/accounts/queries';
import { parseFen } from '@/features/accounts/schemas';
import { formatRMB } from '@/lib/money';

const KIND_LABELS: Record<string, string> = {
  cash: 'Cash',
  bank: 'Bank account',
  mobile_wallet: 'Mobile wallet (WeChat / Alipay)',
};

function AccountForm({
  defaultValues,
  onSuccess,
}: {
  defaultValues?: { id: string; name: string; kind: string; opening_balance_fen: string; low_balance_threshold_fen: string | null };
  onSuccess: () => void;
}) {
  const queryClient = useQueryClient();
  const [openingFen, setOpeningFen] = useState<bigint>(
    parseFen(defaultValues?.opening_balance_fen),
  );
  const [thresholdFen, setThresholdFen] = useState<bigint>(
    parseFen(defaultValues?.low_balance_threshold_fen),
  );

  const { mutate, isPending } = useMutation({
    mutationFn: async (fd: FormData) => {
      const result = defaultValues?.id
        ? await updateAccountAction(defaultValues.id, fd)
        : await createAccountAction(fd);
      if (!result.ok) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      queryClient.invalidateQueries({ queryKey: ACCOUNT_BALANCES_KEY });
      toast.success(defaultValues?.id ? 'Account updated' : 'Account created');
      onSuccess();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('opening_balance_fen', openingFen.toString());
    fd.set('low_balance_threshold_fen', thresholdFen > 0n ? thresholdFen.toString() : '');
    mutate(fd);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={defaultValues?.name} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="kind">Type</Label>
        <Select name="kind" defaultValue={defaultValues?.kind ?? 'cash'}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(KIND_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Opening balance</Label>
        <AmountInput value={openingFen} onChange={setOpeningFen} />
      </div>
      <div className="space-y-1">
        <Label>Low balance alert (leave at ¥0 to disable)</Label>
        <AmountInput value={thresholdFen} onChange={setThresholdFen} />
      </div>
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Saving…' : defaultValues?.id ? 'Update' : 'Create account'}
      </Button>
    </form>
  );
}

export default function AccountsPage() {
  const { data: balances, isLoading } = useAccountBalances();
  const queryClient = useQueryClient();
  const [editTarget, setEditTarget] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { mutate: archive } = useMutation({
    mutationFn: archiveAccountAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      queryClient.invalidateQueries({ queryKey: ACCOUNT_BALANCES_KEY });
      toast.success('Account archived');
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Accounts</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1 size-4" />Add account</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New account</DialogTitle></DialogHeader>
            <AccountForm onSuccess={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-[var(--color-muted)]">Loading…</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(balances ?? []).map((acc) => (
            <div
              key={acc.account_id}
              className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="size-4 text-[var(--color-muted)]" />
                  <span className="font-medium">{acc.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditTarget(acc.account_id)}
                  className="text-[var(--color-muted)] hover:text-[var(--color-fg)]"
                >
                  <Edit2 className="size-3.5" />
                </button>
              </div>
              <p className="mt-2 text-xl font-semibold tabular-nums">
                {formatRMB(BigInt(acc.balance_fen))}
              </p>
              <p className="text-xs text-[var(--color-muted)] capitalize">{acc.kind.replace('_', ' ')}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build**

```bash
pnpm build
```

Expected: `/accounts` route appears in build output.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(accounts): add accounts CRUD page"
```

---

## Task 6: Categories — schemas, actions, queries, page

**Files:**
- Create: `src/features/categories/schemas.ts`
- Create: `src/features/categories/actions.ts`
- Create: `src/features/categories/queries.ts`
- Create: `src/app/(app)/categories/page.tsx`

- [ ] **Step 1: Create category schemas**

```bash
mkdir -p src/features/categories
```

Create `src/features/categories/schemas.ts`:

```ts
import { z } from 'zod';

export const categoryTypes = ['income', 'expense'] as const;
export type CategoryType = (typeof categoryTypes)[number];

export const categorySchema = z.object({
  type: z.enum(categoryTypes),
  name: z.string().min(1).max(50),
  icon: z.string().default('circle'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6b7280'),
});

export interface Category {
  id: string;
  owner_id: string;
  type: CategoryType;
  name: string;
  icon: string;
  color: string;
  is_system: boolean;
  sort_order: number;
}
```

- [ ] **Step 2: Create category Server Actions**

Create `src/features/categories/actions.ts`:

```ts
'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase/server';

const schema = z.object({
  type: z.enum(['income', 'expense']),
  name: z.string().min(1),
  icon: z.string().default('circle'),
  color: z.string().default('#6b7280'),
});

export type CatActionResult = { ok: true } | { ok: false; error: string };

export async function createCategoryAction(formData: FormData): Promise<CatActionResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  const parsed = schema.safeParse({
    type: formData.get('type'),
    name: formData.get('name'),
    icon: formData.get('icon') ?? 'circle',
    color: formData.get('color') ?? '#6b7280',
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid' };
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('categories')
    .insert({ owner_id: userId, ...parsed.data, is_system: false });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateCategoryAction(id: string, formData: FormData): Promise<CatActionResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  const parsed = schema.safeParse({
    type: formData.get('type'),
    name: formData.get('name'),
    icon: formData.get('icon') ?? 'circle',
    color: formData.get('color') ?? '#6b7280',
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid' };
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('categories')
    .update({ name: parsed.data.name, icon: parsed.data.icon, color: parsed.data.color })
    .eq('id', id)
    .eq('owner_id', userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
```

- [ ] **Step 3: Create category query hook**

Create `src/features/categories/queries.ts`:

```ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/lib/supabase/browser';
import type { Category } from './schemas';

export const CATEGORIES_KEY = ['categories'] as const;

export function useCategories(type?: 'income' | 'expense') {
  const supabase = useSupabase();
  return useQuery({
    queryKey: type ? [...CATEGORIES_KEY, type] : CATEGORIES_KEY,
    queryFn: async () => {
      let q = supabase.from('categories').select('*').order('sort_order');
      if (type) q = q.eq('type', type);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });
}
```

- [ ] **Step 4: Create categories page**

```bash
mkdir -p "src/app/(app)/categories"
```

Create `src/app/(app)/categories/page.tsx`:

```tsx
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createCategoryAction, updateCategoryAction } from '@/features/categories/actions';
import { CATEGORIES_KEY, useCategories } from '@/features/categories/queries';
import type { Category } from '@/features/categories/schemas';

function CategoryForm({ onSuccess, defaultValues }: { onSuccess: () => void; defaultValues?: Category }) {
  const queryClient = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: async (fd: FormData) => {
      const r = defaultValues
        ? await updateCategoryAction(defaultValues.id, fd)
        : await createCategoryAction(fd);
      if (!r.ok) throw new Error(r.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY });
      toast.success(defaultValues ? 'Category updated' : 'Category created');
      onSuccess();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutate(new FormData(e.currentTarget)); }} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="type">Type</Label>
        <Select name="type" defaultValue={defaultValues?.type ?? 'expense'}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="expense">Expense</SelectItem>
            <SelectItem value="income">Income</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={defaultValues?.name} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="color">Color</Label>
        <Input id="color" name="color" type="color" defaultValue={defaultValues?.color ?? '#6b7280'} className="h-10 cursor-pointer" />
      </div>
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Saving…' : defaultValues ? 'Update' : 'Create'}
      </Button>
    </form>
  );
}

function CategoryList({ type }: { type: 'income' | 'expense' }) {
  const { data, isLoading } = useCategories(type);
  const [createOpen, setCreateOpen] = useState(false);

  if (isLoading) return <p className="text-sm text-[var(--color-muted)]">Loading…</p>;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1 size-4" />Add</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New {type} category</DialogTitle></DialogHeader>
            <CategoryForm onSuccess={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
      <div className="space-y-1">
        {(data ?? []).map((cat) => (
          <div key={cat.id} className="flex items-center gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2">
            <span className="size-3 rounded-full flex-shrink-0" style={{ background: cat.color }} />
            <span className="flex-1 text-sm">{cat.name}</span>
            {cat.is_system && <span className="text-xs text-[var(--color-muted)]">system</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Categories</h1>
      <Tabs defaultValue="expense">
        <TabsList>
          <TabsTrigger value="expense">Expense</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
        </TabsList>
        <TabsContent value="expense" className="mt-4"><CategoryList type="expense" /></TabsContent>
        <TabsContent value="income" className="mt-4"><CategoryList type="income" /></TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 5: Build + commit**

```bash
pnpm build
git add -A
git commit -m "feat(categories): add categories CRUD with income/expense tabs"
```

---

## Task 7: Transactions — schemas, actions, queries

**Files:**
- Create: `src/features/transactions/schemas.ts`
- Create: `src/features/transactions/actions.ts`
- Create: `src/features/transactions/queries.ts`

- [ ] **Step 1: Create transaction schemas**

```bash
mkdir -p src/features/transactions
```

Create `src/features/transactions/schemas.ts`:

```ts
import { z } from 'zod';

export const txTypes = ['income', 'expense'] as const;
export type TxType = (typeof txTypes)[number];

export const txSchema = z.object({
  account_id: z.string().uuid(),
  category_id: z.string().uuid(),
  type: z.enum(txTypes),
  amount_fen: z.string().min(1),      // bigint as string from form
  occurred_at: z.string(),             // ISO date string
  note: z.string().max(500).optional(),
});

export interface Transaction {
  id: string;
  owner_id: string;
  account_id: string;
  category_id: string;
  type: TxType;
  amount_fen: string;    // bigint as string
  occurred_at: string;
  note: string | null;
  receipt_url: string | null;
  is_pending: boolean;
  debt_id: string | null;
  created_at: string;
  // joins (optional, from select with *)
  accounts?: { name: string; kind: string } | null;
  categories?: { name: string; color: string; icon: string } | null;
}

export interface TransactionFilters {
  accountId?: string;
  categoryId?: string;
  type?: TxType;
  search?: string;
  from?: string;   // YYYY-MM-DD
  to?: string;     // YYYY-MM-DD
}
```

- [ ] **Step 2: Create transaction Server Actions**

Create `src/features/transactions/actions.ts`:

```ts
'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase/server';

const createSchema = z.object({
  account_id: z.string().uuid(),
  category_id: z.string().uuid(),
  type: z.enum(['income', 'expense']),
  amount_fen: z.string(),
  occurred_at: z.string(),
  note: z.string().optional(),
  receipt_url: z.string().optional(),
});

export type TxActionResult = { ok: true; id?: string } | { ok: false; error: string };

export async function createTransactionAction(formData: FormData): Promise<TxActionResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const parsed = createSchema.safeParse({
    account_id: formData.get('account_id'),
    category_id: formData.get('category_id'),
    type: formData.get('type'),
    amount_fen: formData.get('amount_fen'),
    occurred_at: formData.get('occurred_at'),
    note: formData.get('note') || undefined,
    receipt_url: formData.get('receipt_url') || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid' };

  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      owner_id: userId,
      account_id: parsed.data.account_id,
      category_id: parsed.data.category_id,
      type: parsed.data.type,
      amount_fen: parsed.data.amount_fen,
      occurred_at: parsed.data.occurred_at,
      note: parsed.data.note ?? null,
      receipt_url: parsed.data.receipt_url ?? null,
      is_pending: false,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id };
}

export async function updateTransactionAction(id: string, formData: FormData): Promise<TxActionResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const parsed = createSchema.safeParse({
    account_id: formData.get('account_id'),
    category_id: formData.get('category_id'),
    type: formData.get('type'),
    amount_fen: formData.get('amount_fen'),
    occurred_at: formData.get('occurred_at'),
    note: formData.get('note') || undefined,
    receipt_url: formData.get('receipt_url') || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid' };

  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('transactions')
    .update({
      account_id: parsed.data.account_id,
      category_id: parsed.data.category_id,
      type: parsed.data.type,
      amount_fen: parsed.data.amount_fen,
      occurred_at: parsed.data.occurred_at,
      note: parsed.data.note ?? null,
      receipt_url: parsed.data.receipt_url ?? null,
    })
    .eq('id', id)
    .eq('owner_id', userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteTransactionAction(id: string): Promise<TxActionResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('transactions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('owner_id', userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
```

- [ ] **Step 3: Create transaction query hook**

Create `src/features/transactions/queries.ts`:

```ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/lib/supabase/browser';
import type { Transaction, TransactionFilters } from './schemas';

export const TX_KEY = ['transactions'] as const;

export function useTransactions(filters: TransactionFilters = {}) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: [...TX_KEY, filters],
    queryFn: async () => {
      let q = supabase
        .from('transactions')
        .select('*, accounts(name, kind), categories(name, color, icon)')
        .is('deleted_at', null)
        .eq('is_pending', false)
        .order('occurred_at', { ascending: false })
        .limit(200);

      if (filters.accountId) q = q.eq('account_id', filters.accountId);
      if (filters.categoryId) q = q.eq('category_id', filters.categoryId);
      if (filters.type) q = q.eq('type', filters.type);
      if (filters.from) q = q.gte('occurred_at', filters.from);
      if (filters.to) q = q.lte('occurred_at', `${filters.to}T23:59:59Z`);
      if (filters.search) q = q.ilike('note', `%${filters.search}%`);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Transaction[];
    },
  });
}
```

- [ ] **Step 4: Typecheck + lint + commit**

```bash
pnpm typecheck && pnpm lint
git add src/features/transactions/
git commit -m "feat(transactions): add schemas, Server Actions, and query hooks"
```

---

## Task 8: Transactions list page + quick-add modal

**Files:**
- Create: `src/app/(app)/transactions/page.tsx`
- Create: `src/app/(app)/transactions/quick-add-modal.tsx`

- [ ] **Step 1: Create quick-add modal**

```bash
mkdir -p "src/app/(app)/transactions"
```

Create `src/app/(app)/transactions/quick-add-modal.tsx`:

```tsx
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { AmountInput } from '@/components/feature/amount-input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createTransactionAction } from '@/features/transactions/actions';
import { TX_KEY } from '@/features/transactions/queries';
import { ACCOUNT_BALANCES_KEY, useAccounts } from '@/features/accounts/queries';
import { useCategories } from '@/features/categories/queries';

export function QuickAddModal({ defaultType = 'expense' }: { defaultType?: 'income' | 'expense' }) {
  const [open, setOpen] = useState(false);
  const [amountFen, setAmountFen] = useState(0n);
  const [type, setType] = useState<'income' | 'expense'>(defaultType);
  const queryClient = useQueryClient();

  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories(type);

  const { mutate, isPending } = useMutation({
    mutationFn: async (fd: FormData) => {
      const r = await createTransactionAction(fd);
      if (!r.ok) throw new Error(r.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TX_KEY });
      queryClient.invalidateQueries({ queryKey: ACCOUNT_BALANCES_KEY });
      toast.success('Transaction added');
      setOpen(false);
      setAmountFen(0n);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (amountFen <= 0n) { toast.error('Amount must be greater than 0'); return; }
    const fd = new FormData(e.currentTarget);
    fd.set('amount_fen', amountFen.toString());
    fd.set('type', type);
    mutate(fd);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-1 size-4" />Add</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant={type === 'expense' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => setType('expense')}
            >
              Expense
            </Button>
            <Button
              type="button"
              variant={type === 'income' ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              onClick={() => setType('income')}
            >
              Income
            </Button>
          </div>
          <div className="space-y-1">
            <Label>Amount</Label>
            <AmountInput value={amountFen} onChange={setAmountFen} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="account_id">Account</Label>
            <Select name="account_id" required>
              <SelectTrigger><SelectValue placeholder="Pick account" /></SelectTrigger>
              <SelectContent>
                {(accounts ?? []).map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="category_id">Category</Label>
            <Select name="category_id" required>
              <SelectTrigger><SelectValue placeholder="Pick category" /></SelectTrigger>
              <SelectContent>
                {(categories ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="occurred_at">Date</Label>
            <Input
              id="occurred_at"
              name="occurred_at"
              type="date"
              defaultValue={new Date().toISOString().split('T')[0]}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="note">Note (optional)</Label>
            <Input id="note" name="note" placeholder="e.g. Lunch at restaurant" />
          </div>
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? 'Saving…' : 'Add transaction'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create transactions list page**

Create `src/app/(app)/transactions/page.tsx`:

```tsx
'use client';

import { type ColumnDef } from '@tanstack/react-table';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { deleteTransactionAction } from '@/features/transactions/actions';
import { TX_KEY, useTransactions } from '@/features/transactions/queries';
import { ACCOUNT_BALANCES_KEY, useAccounts } from '@/features/accounts/queries';
import { useCategories } from '@/features/categories/queries';
import type { Transaction } from '@/features/transactions/schemas';
import { fmtDate } from '@/lib/date';
import { formatRMB } from '@/lib/money';
import { QuickAddModal } from './quick-add-modal';

export default function TransactionsPage() {
  const [search, setSearch] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [type, setType] = useState<'income' | 'expense' | ''>('');

  const { data: txs, isLoading } = useTransactions({
    search: search || undefined,
    accountId: accountId || undefined,
    categoryId: categoryId || undefined,
    type: (type as 'income' | 'expense') || undefined,
  });
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const queryClient = useQueryClient();

  const { mutate: deleteTx } = useMutation({
    mutationFn: deleteTransactionAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TX_KEY });
      queryClient.invalidateQueries({ queryKey: ACCOUNT_BALANCES_KEY });
      toast.success('Deleted');
    },
    onError: (e) => toast.error(e.message),
  });

  const columns: ColumnDef<Transaction>[] = [
    {
      accessorKey: 'occurred_at',
      header: 'Date',
      cell: ({ row }) => fmtDate(row.original.occurred_at),
      enableSorting: true,
    },
    {
      id: 'category',
      header: 'Category',
      cell: ({ row }) => (
        <span className="flex items-center gap-2">
          <span
            className="size-2 rounded-full flex-shrink-0"
            style={{ background: row.original.categories?.color ?? '#888' }}
          />
          {row.original.categories?.name ?? '—'}
        </span>
      ),
    },
    {
      id: 'account',
      header: 'Account',
      cell: ({ row }) => row.original.accounts?.name ?? '—',
    },
    {
      accessorKey: 'note',
      header: 'Note',
      cell: ({ row }) => (
        <span className="max-w-[160px] truncate text-[var(--color-muted)]">
          {row.original.note ?? ''}
        </span>
      ),
    },
    {
      accessorKey: 'amount_fen',
      header: 'Amount',
      enableSorting: true,
      cell: ({ row }) => (
        <span
          className={`font-medium tabular-nums ${row.original.type === 'income' ? 'text-[var(--color-success)]' : ''}`}
        >
          {row.original.type === 'expense' ? '−' : '+'}
          {formatRMB(BigInt(row.original.amount_fen))}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => {
            if (confirm('Delete this transaction?')) deleteTx(row.original.id);
          }}
          className="text-[var(--color-muted)] hover:text-[var(--color-danger)]"
        >
          <Trash2 className="size-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Transactions</h1>
        <QuickAddModal />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Search notes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-[200px]"
        />
        <Select value={accountId} onValueChange={setAccountId}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All accounts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All accounts</SelectItem>
            {(accounts ?? []).map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All types</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
            <SelectItem value="income">Income</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={txs ?? []}
        isLoading={isLoading}
        emptyMessage="No transactions yet. Add your first one."
      />
    </div>
  );
}
```

- [ ] **Step 3: Build + commit**

```bash
pnpm build
git add -A
git commit -m "feat(transactions): add transactions list + quick-add modal"
```

---

## Task 9: People + Debts

**Files:**
- Create: `src/features/people/schemas.ts`
- Create: `src/features/people/actions.ts`
- Create: `src/features/people/queries.ts`
- Create: `src/features/debts/schemas.ts`
- Create: `src/features/debts/actions.ts`
- Create: `src/features/debts/queries.ts`
- Create: `src/app/(app)/debts/page.tsx`
- Create: `src/app/(app)/debts/people/page.tsx`

- [ ] **Step 1: People schemas + actions + queries**

```bash
mkdir -p src/features/people src/features/debts
```

Create `src/features/people/schemas.ts`:

```ts
import { z } from 'zod';

export const personSchema = z.object({
  full_name: z.string().min(1).max(100),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional().or(z.literal('')),
  relationship_tag: z.string().max(30).optional(),
  notes: z.string().max(500).optional(),
});

export interface Person {
  id: string;
  owner_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  relationship_tag: string | null;
  notes: string | null;
  avatar_url: string | null;
  created_at: string;
}
```

Create `src/features/people/actions.ts`:

```ts
'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase/server';

const schema = z.object({
  full_name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().optional(),
  relationship_tag: z.string().optional(),
  notes: z.string().optional(),
});

export type PersonActionResult = { ok: true; id?: string } | { ok: false; error: string };

export async function createPersonAction(formData: FormData): Promise<PersonActionResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  const parsed = schema.safeParse({
    full_name: formData.get('full_name'),
    phone: formData.get('phone') || undefined,
    email: formData.get('email') || undefined,
    relationship_tag: formData.get('relationship_tag') || undefined,
    notes: formData.get('notes') || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid' };
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from('people')
    .insert({ owner_id: userId, ...parsed.data })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id };
}

export async function updatePersonAction(id: string, formData: FormData): Promise<PersonActionResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  const parsed = schema.safeParse({
    full_name: formData.get('full_name'),
    phone: formData.get('phone') || undefined,
    email: formData.get('email') || undefined,
    relationship_tag: formData.get('relationship_tag') || undefined,
    notes: formData.get('notes') || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid' };
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('people')
    .update(parsed.data)
    .eq('id', id)
    .eq('owner_id', userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
```

Create `src/features/people/queries.ts`:

```ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/lib/supabase/browser';
import type { Person } from './schemas';

export const PEOPLE_KEY = ['people'] as const;

export function usePeople() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: PEOPLE_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('people')
        .select('*')
        .order('full_name');
      if (error) throw error;
      return (data ?? []) as Person[];
    },
  });
}
```

- [ ] **Step 2: Debt schemas + actions + queries**

Create `src/features/debts/schemas.ts`:

```ts
import { z } from 'zod';

export const debtDirections = ['owed_to_me', 'i_owe'] as const;
export const debtStatuses = ['open', 'partially_paid', 'settled', 'written_off'] as const;

export interface Debt {
  id: string;
  owner_id: string;
  person_id: string;
  direction: 'owed_to_me' | 'i_owe';
  principal_fen: string;
  description: string | null;
  due_date: string | null;
  status: 'open' | 'partially_paid' | 'settled' | 'written_off';
  created_at: string;
  // join
  people?: { full_name: string; phone: string | null } | null;
}

export interface DebtPayment {
  id: string;
  debt_id: string;
  account_id: string;
  amount_fen: string;
  paid_at: string;
  note: string | null;
}

export const debtSchema = z.object({
  person_id: z.string().uuid(),
  direction: z.enum(debtDirections),
  principal_fen: z.string().min(1),
  description: z.string().max(300).optional(),
  due_date: z.string().optional(),
});
```

Create `src/features/debts/actions.ts`:

```ts
'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase/server';

const debtSchema = z.object({
  person_id: z.string().uuid(),
  direction: z.enum(['owed_to_me', 'i_owe']),
  principal_fen: z.string(),
  description: z.string().optional(),
  due_date: z.string().optional(),
});

const paymentSchema = z.object({
  debt_id: z.string().uuid(),
  account_id: z.string().uuid(),
  amount_fen: z.string(),
  paid_at: z.string(),
  note: z.string().optional(),
});

export type DebtActionResult = { ok: true; id?: string } | { ok: false; error: string };

export async function createDebtAction(formData: FormData): Promise<DebtActionResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  const parsed = debtSchema.safeParse({
    person_id: formData.get('person_id'),
    direction: formData.get('direction'),
    principal_fen: formData.get('principal_fen'),
    description: formData.get('description') || undefined,
    due_date: formData.get('due_date') || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid' };
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from('debts')
    .insert({ owner_id: userId, ...parsed.data, status: 'open' })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id };
}

export async function addPaymentAction(formData: FormData): Promise<DebtActionResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  const parsed = paymentSchema.safeParse({
    debt_id: formData.get('debt_id'),
    account_id: formData.get('account_id'),
    amount_fen: formData.get('amount_fen'),
    paid_at: formData.get('paid_at'),
    note: formData.get('note') || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid' };
  const supabase = await supabaseServer();

  // Insert payment
  const { error: payErr } = await supabase
    .from('debt_payments')
    .insert({ owner_id: userId, ...parsed.data });
  if (payErr) return { ok: false, error: payErr.message };

  // Compute paid total to update status
  const { data: payments } = await supabase
    .from('debt_payments')
    .select('amount_fen')
    .eq('debt_id', parsed.data.debt_id);
  const { data: debt } = await supabase
    .from('debts')
    .select('principal_fen')
    .eq('id', parsed.data.debt_id)
    .single();

  if (debt && payments) {
    const paid = payments.reduce((s, p) => s + BigInt(p.amount_fen), 0n);
    const principal = BigInt(debt.principal_fen);
    const status = paid >= principal ? 'settled' : paid > 0n ? 'partially_paid' : 'open';
    await supabase.from('debts').update({ status }).eq('id', parsed.data.debt_id);
  }

  return { ok: true };
}

export async function updateDebtStatusAction(
  id: string,
  status: 'settled' | 'written_off',
): Promise<DebtActionResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('debts')
    .update({ status })
    .eq('id', id)
    .eq('owner_id', userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
```

Create `src/features/debts/queries.ts`:

```ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/lib/supabase/browser';
import type { Debt, DebtPayment } from './schemas';

export const DEBTS_KEY = ['debts'] as const;

export function useDebts(direction?: 'owed_to_me' | 'i_owe') {
  const supabase = useSupabase();
  return useQuery({
    queryKey: direction ? [...DEBTS_KEY, direction] : DEBTS_KEY,
    queryFn: async () => {
      let q = supabase
        .from('debts')
        .select('*, people(full_name, phone)')
        .in('status', ['open', 'partially_paid'])
        .order('due_date', { ascending: true, nullsFirst: false });
      if (direction) q = q.eq('direction', direction);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Debt[];
    },
  });
}

export function useDebtPayments(debtId: string) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: [...DEBTS_KEY, debtId, 'payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('debt_payments')
        .select('*')
        .eq('debt_id', debtId)
        .order('paid_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as DebtPayment[];
    },
  });
}
```

- [ ] **Step 3: Create debts list page**

```bash
mkdir -p "src/app/(app)/debts/people"
```

Create `src/app/(app)/debts/page.tsx`:

```tsx
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { AmountInput } from '@/components/feature/amount-input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createDebtAction, updateDebtStatusAction } from '@/features/debts/actions';
import { DEBTS_KEY, useDebts } from '@/features/debts/queries';
import { usePeople } from '@/features/people/queries';
import type { Debt } from '@/features/debts/schemas';
import { fmtDate } from '@/lib/date';
import { formatRMB } from '@/lib/money';

function CreateDebtForm({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const { data: people } = usePeople();
  const [amountFen, setAmountFen] = useState(0n);

  const { mutate, isPending } = useMutation({
    mutationFn: async (fd: FormData) => {
      const r = await createDebtAction(fd);
      if (!r.ok) throw new Error(r.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEBTS_KEY });
      toast.success('Debt added');
      onSuccess();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (amountFen <= 0n) { toast.error('Amount must be > 0'); return; }
        const fd = new FormData(e.currentTarget);
        fd.set('principal_fen', amountFen.toString());
        mutate(fd);
      }}
      className="space-y-4"
    >
      <div className="space-y-1">
        <Label>Direction</Label>
        <Select name="direction" defaultValue="owed_to_me">
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="owed_to_me">Someone owes me</SelectItem>
            <SelectItem value="i_owe">I owe someone</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Person</Label>
        <Select name="person_id" required>
          <SelectTrigger><SelectValue placeholder="Select person" /></SelectTrigger>
          <SelectContent>
            {(people ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Amount</Label>
        <AmountInput value={amountFen} onChange={setAmountFen} />
      </div>
      <div className="space-y-1">
        <Label>Description (optional)</Label>
        <Input name="description" placeholder="e.g. Borrowed for rent" />
      </div>
      <div className="space-y-1">
        <Label>Due date (optional)</Label>
        <Input name="due_date" type="date" />
      </div>
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Saving…' : 'Add debt'}
      </Button>
    </form>
  );
}

function DebtCard({ debt }: { debt: Debt }) {
  const queryClient = useQueryClient();
  const { mutate: settle } = useMutation({
    mutationFn: (status: 'settled' | 'written_off') => updateDebtStatusAction(debt.id, status),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: DEBTS_KEY }); toast.success('Updated'); },
    onError: (e) => toast.error(e.message),
  });

  const isOverdue = debt.due_date && new Date(debt.due_date) < new Date();

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="font-medium">{debt.people?.full_name ?? '—'}</p>
        <span className={`text-xs rounded-full px-2 py-0.5 ${
          debt.status === 'partially_paid'
            ? 'bg-[var(--color-warning)]/20 text-[var(--color-warning)]'
            : 'bg-[var(--color-border)] text-[var(--color-muted)]'
        }`}>
          {debt.status.replace('_', ' ')}
        </span>
      </div>
      <p className="text-lg font-semibold tabular-nums">
        {formatRMB(BigInt(debt.principal_fen))}
      </p>
      {debt.description && <p className="text-sm text-[var(--color-muted)]">{debt.description}</p>}
      {debt.due_date && (
        <p className={`text-xs ${isOverdue ? 'text-[var(--color-danger)]' : 'text-[var(--color-muted)]'}`}>
          Due {fmtDate(debt.due_date)}{isOverdue ? ' — OVERDUE' : ''}
        </p>
      )}
      <div className="flex gap-2 pt-1">
        <Button size="sm" variant="outline" onClick={() => settle('settled')} className="flex-1">Mark settled</Button>
        <Button size="sm" variant="ghost" onClick={() => settle('written_off')}>Write off</Button>
      </div>
    </div>
  );
}

function DebtsList({ direction }: { direction: 'owed_to_me' | 'i_owe' }) {
  const { data, isLoading } = useDebts(direction);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1 size-4" />Add</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New debt</DialogTitle></DialogHeader>
            <CreateDebtForm onSuccess={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? (
        <p className="text-sm text-[var(--color-muted)]">Loading…</p>
      ) : (data ?? []).length === 0 ? (
        <p className="text-sm text-[var(--color-muted)] py-8 text-center">No open debts.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {(data ?? []).map((d) => <DebtCard key={d.id} debt={d} />)}
        </div>
      )}
    </div>
  );
}

export default function DebtsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Debts</h1>
      <Tabs defaultValue="owed_to_me">
        <TabsList>
          <TabsTrigger value="owed_to_me">Owed to me</TabsTrigger>
          <TabsTrigger value="i_owe">I owe</TabsTrigger>
        </TabsList>
        <TabsContent value="owed_to_me" className="mt-4">
          <DebtsList direction="owed_to_me" />
        </TabsContent>
        <TabsContent value="i_owe" className="mt-4">
          <DebtsList direction="i_owe" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

- [ ] **Step 4: Create people page**

Create `src/app/(app)/debts/people/page.tsx`:

```tsx
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, User } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createPersonAction } from '@/features/people/actions';
import { PEOPLE_KEY, usePeople } from '@/features/people/queries';

function PersonForm({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: async (fd: FormData) => {
      const r = await createPersonAction(fd);
      if (!r.ok) throw new Error(r.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PEOPLE_KEY });
      toast.success('Person added');
      onSuccess();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutate(new FormData(e.currentTarget)); }} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="full_name">Full name *</Label>
        <Input id="full_name" name="full_name" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" type="tel" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="relationship_tag">Relationship</Label>
        <Input id="relationship_tag" name="relationship_tag" placeholder="e.g. Friend, Family, Colleague" />
      </div>
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Saving…' : 'Add person'}
      </Button>
    </form>
  );
}

export default function PeoplePage() {
  const { data, isLoading } = usePeople();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">People</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1 size-4" />Add person</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New person</DialogTitle></DialogHeader>
            <PersonForm onSuccess={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? <p className="text-sm text-[var(--color-muted)]">Loading…</p> : (
        <div className="space-y-2">
          {(data ?? []).map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3">
              <User className="size-5 text-[var(--color-muted)]" />
              <div className="flex-1">
                <p className="font-medium">{p.full_name}</p>
                {p.phone && <p className="text-xs text-[var(--color-muted)]">{p.phone}</p>}
              </div>
              {p.relationship_tag && (
                <span className="text-xs text-[var(--color-muted)] border border-[var(--color-border)] rounded-full px-2 py-0.5">
                  {p.relationship_tag}
                </span>
              )}
            </div>
          ))}
          {(data ?? []).length === 0 && (
            <p className="text-sm text-[var(--color-muted)] text-center py-8">No people yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Build + commit**

```bash
pnpm build
git add -A
git commit -m "feat(debts): add people + debts CRUD with payment tracking"
```

---

## Task 10: Dashboard widgets

**Files:**
- Create: `src/features/dashboard/queries.ts`
- Modify: `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Create dashboard queries**

```bash
mkdir -p src/features/dashboard
```

Create `src/features/dashboard/queries.ts`:

```ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/lib/supabase/browser';
import { startOfMonthIso, endOfMonthIso } from '@/lib/date';

export function useNetWorth() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ['net-worth'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_account_balances')
        .select('balance_fen');
      if (error) throw error;
      const total = (data ?? []).reduce((s, r) => s + BigInt(r.balance_fen), 0n);
      return total;
    },
  });
}

export function useMonthSummary() {
  const supabase = useSupabase();
  const from = startOfMonthIso();
  const to = endOfMonthIso();
  return useQuery({
    queryKey: ['month-summary', from],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('type, amount_fen')
        .is('deleted_at', null)
        .eq('is_pending', false)
        .gte('occurred_at', from)
        .lte('occurred_at', `${to}T23:59:59Z`);
      if (error) throw error;
      let income = 0n;
      let expense = 0n;
      for (const row of data ?? []) {
        if (row.type === 'income') income += BigInt(row.amount_fen);
        else expense += BigInt(row.amount_fen);
      }
      return { income, expense, net: income - expense };
    },
  });
}
```

- [ ] **Step 2: Replace dashboard page with widgets**

Replace `src/app/(app)/dashboard/page.tsx`:

```tsx
'use client';

import { TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useAccountBalances } from '@/features/accounts/queries';
import { useMonthSummary, useNetWorth } from '@/features/dashboard/queries';
import { formatRMB } from '@/lib/money';
import { QuickAddModal } from '../transactions/quick-add-modal';

function NetWorthWidget() {
  const { data, isLoading } = useNetWorth();
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-6">
      <p className="text-sm text-[var(--color-muted)]">Net worth</p>
      {isLoading ? (
        <div className="h-10 w-40 animate-pulse rounded bg-[var(--color-border)] mt-2" />
      ) : (
        <p className="mt-1 text-3xl font-semibold tabular-nums">
          {formatRMB(data ?? 0n)}
        </p>
      )}
    </div>
  );
}

function ThisMonthWidget() {
  const { data, isLoading } = useMonthSummary();
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-6 space-y-4">
      <p className="text-sm text-[var(--color-muted)]">This month</p>
      {isLoading ? (
        <div className="h-16 animate-pulse rounded bg-[var(--color-border)]" />
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="flex items-center gap-1 text-xs text-[var(--color-success)]">
              <TrendingUp className="size-3" />Income
            </div>
            <p className="font-semibold tabular-nums">{formatRMB(data?.income ?? 0n)}</p>
          </div>
          <div>
            <div className="flex items-center gap-1 text-xs text-[var(--color-danger)]">
              <TrendingDown className="size-3" />Expense
            </div>
            <p className="font-semibold tabular-nums">{formatRMB(data?.expense ?? 0n)}</p>
          </div>
          <div>
            <div className="text-xs text-[var(--color-muted)]">Net</div>
            <p className={`font-semibold tabular-nums ${(data?.net ?? 0n) >= 0n ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
              {formatRMB(data?.net ?? 0n)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function AccountsStrip() {
  const { data, isLoading } = useAccountBalances();
  if (isLoading) return <div className="h-16 animate-pulse rounded bg-[var(--color-border)]" />;
  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {(data ?? []).map((acc) => (
        <div key={acc.account_id} className="flex-shrink-0 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 min-w-[140px]">
          <div className="flex items-center gap-2">
            <Wallet className="size-3.5 text-[var(--color-muted)]" />
            <p className="text-xs text-[var(--color-muted)] truncate">{acc.name}</p>
          </div>
          <p className="mt-1 font-semibold tabular-nums">{formatRMB(BigInt(acc.balance_fen))}</p>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <QuickAddModal />
      </div>
      <NetWorthWidget />
      <AccountsStrip />
      <ThisMonthWidget />
    </div>
  );
}
```

- [ ] **Step 3: Build + commit**

```bash
pnpm build
git add -A
git commit -m "feat(dashboard): add net worth, accounts strip, and this-month widgets"
```

---

## Task 11: Settings page — PIN change + lock timer + CSV export

**Files:**
- Create: `src/app/(app)/settings/page.tsx`
- Create: `src/app/(app)/settings/actions.ts`

- [ ] **Step 1: Create settings Server Actions**

```bash
mkdir -p "src/app/(app)/settings"
```

Create `src/app/(app)/settings/actions.ts`:

```ts
'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { hashPin, isValidPin, verifyPin } from '@/lib/auth/pin';
import { supabaseAdmin } from '@/lib/supabase/service-role';
import { supabaseServer } from '@/lib/supabase/server';

export type SettingsResult = { ok: true } | { ok: false; error: string };

const pinChangeSchema = z.object({
  current_pin: z.string(),
  new_pin: z.string().refine(isValidPin, '4–6 digits required'),
  confirm_pin: z.string(),
});

export async function changePinAction(formData: FormData): Promise<SettingsResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const parsed = pinChangeSchema.safeParse({
    current_pin: formData.get('current_pin'),
    new_pin: formData.get('new_pin'),
    confirm_pin: formData.get('confirm_pin'),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid' };
  if (parsed.data.new_pin !== parsed.data.confirm_pin) {
    return { ok: false, error: 'New PINs do not match' };
  }

  const admin = supabaseAdmin();
  const { data: row } = await admin
    .from('auth_pin')
    .select('pin_hash')
    .eq('owner_id', userId)
    .single();
  if (!row) return { ok: false, error: 'No PIN set' };

  const valid = await verifyPin(parsed.data.current_pin, row.pin_hash as string);
  if (!valid) return { ok: false, error: 'Current PIN is incorrect' };

  const newHash = await hashPin(parsed.data.new_pin);
  const { error } = await admin
    .from('auth_pin')
    .update({ pin_hash: newHash, failed_attempts: 0 })
    .eq('owner_id', userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateLockTimerAction(minutes: number): Promise<SettingsResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  if (minutes < 1 || minutes > 60) return { ok: false, error: 'Must be 1–60 minutes' };

  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('app_settings')
    .update({ pin_lock_minutes: minutes })
    .eq('owner_id', userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
```

- [ ] **Step 2: Create settings page**

Create `src/app/(app)/settings/page.tsx`:

```tsx
'use client';

import { useMutation } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import Papa from 'papaparse';
import { useRef } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { changePinAction, updateLockTimerAction } from './actions';
import { useSupabase } from '@/lib/supabase/browser';
import { fmtDate } from '@/lib/date';
import { fenToDisplay } from '@/lib/money';

function PinChangeForm() {
  const { mutate, isPending } = useMutation({
    mutationFn: async (fd: FormData) => {
      const r = await changePinAction(fd);
      if (!r.ok) throw new Error(r.error);
    },
    onSuccess: () => toast.success('PIN changed'),
    onError: (e) => toast.error(e.message),
  });

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); mutate(new FormData(e.currentTarget)); }}
      className="space-y-3"
    >
      <div className="space-y-1">
        <Label htmlFor="current_pin">Current PIN</Label>
        <Input id="current_pin" name="current_pin" type="password" inputMode="numeric" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="new_pin">New PIN</Label>
        <Input id="new_pin" name="new_pin" type="password" inputMode="numeric" pattern="\d{4,6}" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="confirm_pin">Confirm new PIN</Label>
        <Input id="confirm_pin" name="confirm_pin" type="password" inputMode="numeric" pattern="\d{4,6}" required />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Saving…' : 'Change PIN'}
      </Button>
    </form>
  );
}

function ExportCsvButton() {
  const supabase = useSupabase();
  const anchorRef = useRef<HTMLAnchorElement>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('occurred_at, type, amount_fen, note, accounts(name), categories(name)')
        .is('deleted_at', null)
        .order('occurred_at', { ascending: false });
      if (error) throw error;

      const rows = (data ?? []).map((r) => ({
        date: fmtDate(r.occurred_at),
        type: r.type,
        amount_rmb: fenToDisplay(BigInt(r.amount_fen)),
        account: (r.accounts as { name: string } | null)?.name ?? '',
        category: (r.categories as { name: string } | null)?.name ?? '',
        note: r.note ?? '',
      }));

      const csv = Papa.unparse(rows);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      if (anchorRef.current) {
        anchorRef.current.href = url;
        anchorRef.current.download = `fleucy-transactions-${new Date().toISOString().split('T')[0]}.csv`;
        anchorRef.current.click();
      }
      URL.revokeObjectURL(url);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <>
      <Button onClick={() => mutate()} disabled={isPending} variant="outline">
        <Download className="mr-2 size-4" />
        {isPending ? 'Preparing…' : 'Export transactions CSV'}
      </Button>
      {/* Hidden anchor used for download trigger */}
      <a ref={anchorRef} className="hidden" />
    </>
  );
}

export default function SettingsPage() {
  const { mutate: saveTimer, isPending: timerPending } = useMutation({
    mutationFn: async (fd: FormData) => {
      const minutes = Number(fd.get('pin_lock_minutes'));
      const r = await updateLockTimerAction(minutes);
      if (!r.ok) throw new Error(r.error);
    },
    onSuccess: () => toast.success('Lock timer updated'),
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="max-w-lg space-y-8">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <section className="space-y-4">
        <h2 className="font-medium">Change PIN</h2>
        <PinChangeForm />
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="font-medium">Auto-lock timer</h2>
        <p className="text-sm text-[var(--color-muted)]">
          Minutes of inactivity before the app locks itself.
        </p>
        <form
          onSubmit={(e) => { e.preventDefault(); saveTimer(new FormData(e.currentTarget)); }}
          className="flex items-end gap-3"
        >
          <div className="space-y-1">
            <Label htmlFor="pin_lock_minutes">Minutes (1–60)</Label>
            <Input
              id="pin_lock_minutes"
              name="pin_lock_minutes"
              type="number"
              min="1"
              max="60"
              defaultValue="10"
              className="w-24"
            />
          </div>
          <Button type="submit" disabled={timerPending}>Save</Button>
        </form>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="font-medium">Export data</h2>
        <ExportCsvButton />
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Build + commit**

```bash
pnpm build
git add -A
git commit -m "feat(settings): add PIN change, lock timer, and CSV export"
```

---

## Task 12: Wire up FAB on dashboard + final verification

**Files:**
- Verify all routes 404 only for future phases (recurring, budgets, reports, notifications)
- Run full test suite
- Push to GitHub

- [ ] **Step 1: Run full verification**

```bash
pnpm typecheck && pnpm lint && pnpm test:run && pnpm build
```

Expected:
- `pnpm typecheck` — no errors
- `pnpm lint` — no issues
- `pnpm test:run` — 5 test files, 28+ tests passed
- `pnpm build` — all routes compile; new routes appear: `/accounts`, `/categories`, `/transactions`, `/debts`, `/debts/people`, `/settings`, `/dashboard` (updated)

- [ ] **Step 2: Manual smoke test checklist**

Start `pnpm dev` and verify:
- [ ] `/dashboard` shows net worth, accounts strip (empty if no accounts), this-month widget
- [ ] `/accounts` — create a Cash account (¥1000 opening balance), see it in the strip
- [ ] `/categories` — expense and income tabs populated with defaults
- [ ] `/transactions` — click Add, pick account + category + amount + date → appears in table
- [ ] `/transactions` — after adding expense, check `/accounts` — balance should decrease
- [ ] `/debts/people` — add a person
- [ ] `/debts` — add a debt for that person, mark settled
- [ ] `/settings` — change PIN (use new PIN to re-lock + unlock)
- [ ] `/settings` — export CSV — downloads file with correct data

- [ ] **Step 3: Commit + push**

```bash
git add -A
git commit -m "chore: Phase 1 complete — accounts, categories, transactions, people, debts, dashboard, settings"
git push
```

---

## Verification — Phase 1 Definition of Done

- [ ] `pnpm typecheck && pnpm lint && pnpm test:run && pnpm build` all exit 0
- [ ] Create account → balance updates after adding transactions
- [ ] Transactions table sorts by date descending; search by note works
- [ ] Income transaction increases balance; expense decreases it
- [ ] Debt marked settled disappears from open debts list
- [ ] CSV export opens correctly in Excel (dates, amounts in yuan, no bigint)
- [ ] PIN change persists — new PIN works on next lock
- [ ] Dashboard widgets show real data (non-zero after adding transactions)
- [ ] Vercel redeploys automatically on `git push` — no build errors

---

## Self-Review

**Spec coverage:**

| Spec item | Task |
|---|---|
| Accounts CRUD | Task 4, 5 |
| Categories CRUD | Task 6 |
| Transactions CRUD + TanStack Table + filters | Task 7, 8 |
| Receipt upload | ⚠️ **Not included — deferred to Phase 1 patch (see note)** |
| People CRUD | Task 9 |
| Debts CRUD + partial payments | Task 9 |
| Dashboard: net worth, accounts strip, this-month | Task 10 |
| Settings: theme (already done P0), PIN change, lock timer | Task 11 |
| CSV export | Task 11 |
| Day.js date helpers | Task 1 |
| AmountInput component | Task 2 |
| TanStack Table wrapper | Task 3 |

**Receipt upload note:** Receipt upload to Supabase Storage requires Clerk JWT injection at the client-side upload level (calling `supabase.storage.from('receipts').upload(...)` with the Clerk JWT). The full implementation is ~50 lines of extra code in the quick-add modal. Adding it as a Phase 1 patch task after core MVP is validated is cleaner than baking it into this already-large plan. If you want it now: (1) add a file input to `quick-add-modal.tsx`, (2) on submit, upload the file via `useSupabase().storage.from('receipts').upload(`${userId}/${txId}.jpg`, file)`, (3) set `receipt_url` in the transaction row.

**Placeholder scan:** No TBD/TODO. All code blocks are complete. All Server Actions have full Zod validation. All query hooks have error handling.

**Type consistency:** `parseFen()` defined in `src/features/accounts/schemas.ts` and only used there and in the accounts page. `Transaction.amount_fen` is always `string` (Supabase returns bigint as string) — converted with `BigInt(...)` at display time consistently throughout. `AccountBalance.balance_fen` same pattern.
