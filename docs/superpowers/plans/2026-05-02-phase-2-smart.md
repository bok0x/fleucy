# Fleucy Phase 2 — Smart Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add budgets, recurring rules, automated n8n notifications/Telegram dispatch, reports page with Recharts charts, ⌘K command palette, people avatar upload, and global search to the Fleucy personal finance app.

**Architecture:** Phase 1 vertical-slice pattern continues (`src/features/<domain>/`). n8n acts as scheduler only — two protected Next.js API routes (`/api/n8n/generate` and `/api/n8n/telegram`) hold all business logic and are called by n8n cron jobs on Contabo VPS. The DB already has a `notifications_dedup_daily` unique index, so notification dedup is handled at DB level (just ignore `23505` errors on insert).

**Tech Stack:** Next.js 16 App Router · Supabase (service-role for n8n routes, RLS for app routes) · TanStack Query v5 · Recharts · cmdk · shadcn/ui · Zod v4 · Day.js · Sonner · pnpm

---

## Key Invariants (read before touching any file)

- Money is `bigint` fen. Supabase returns DB `bigint` as **string** — always `BigInt(str)`. Never use floats.
- `updated_at` is set by Postgres trigger — never pass it in inserts/updates.
- Server Actions return `{ ok: true; id?: string } | { ok: false; error: string }`.
- TanStack Query v5: `invalidateQueries({ queryKey: [...] })` — object form, not array.
- `v_account_balances` view column is `account_id` (not `id`).
- Notification dedup: DB unique index on `(owner_id, kind, related_id, utc_day(created_at))` — catch Supabase error code `'23505'` and ignore it.
- `supabaseAdmin()` from `@/lib/supabase/service-role` — server-only, bypasses RLS.
- `supabaseServer()` from `@/lib/supabase/server` — async, carries Clerk JWT, respects RLS.
- `useSupabase()` from `@/lib/supabase/browser` — client hook, respects RLS.

---

## File Map

**Create:**
- `src/features/budgets/schemas.ts`
- `src/features/budgets/actions.ts`
- `src/features/budgets/queries.ts`
- `src/app/(app)/budgets/page.tsx`
- `src/features/recurring/schemas.ts`
- `src/features/recurring/actions.ts`
- `src/features/recurring/queries.ts`
- `src/app/(app)/recurring/page.tsx`
- `src/features/notifications/schemas.ts`
- `src/features/notifications/actions.ts`
- `src/features/notifications/queries.ts`
- `src/app/(app)/notifications/page.tsx`
- `src/lib/n8n-auth.ts`
- `src/app/api/n8n/generate/helpers.ts`
- `src/app/api/n8n/generate/helpers.test.ts`
- `src/app/api/n8n/generate/route.ts`
- `src/app/api/n8n/telegram/route.ts`
- `src/features/reports/queries.ts`
- `src/app/(app)/reports/page.tsx`
- `src/components/command-palette.tsx`
- `src/components/layout/search-bar.tsx`

**Modify:**
- `package.json` — add `recharts`, `cmdk`
- `src/components/ui/progress.tsx` — new via shadcn CLI
- `src/components/layout/header.tsx` — bell badge + search bar
- `src/components/layout/shell.tsx` — command palette mount
- `src/proxy.ts` — allow `/api/n8n/(.*)` as public route
- `src/features/people/actions.ts` — add `uploadAvatarAction`, `updatePersonAction`
- `src/app/(app)/debts/people/page.tsx` — avatar UI + notes field + delete
- `src/app/(app)/dashboard/page.tsx` — budget progress widget

---

## Task 1: Install packages and add Progress component

**Files:**
- Modify: `package.json`
- Create: `src/components/ui/progress.tsx` (via CLI)

- [ ] **Step 1: Install recharts and cmdk**

```bash
cd "e:\Claude Project\Daily Expensise"
pnpm add recharts cmdk
```

Expected: `packages added` — no peer dep warnings needed.

- [ ] **Step 2: Add shadcn Progress component**

```bash
pnpm dlx shadcn@latest add progress
```

Expected: `src/components/ui/progress.tsx` created.

- [ ] **Step 3: Verify build still passes**

```bash
pnpm typecheck
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml src/components/ui/progress.tsx
git commit -m "chore: add recharts, cmdk, and shadcn progress for Phase 2"
```

---

## Task 2: Budget schemas and actions

**Files:**
- Create: `src/features/budgets/schemas.ts`
- Create: `src/features/budgets/actions.ts`

- [ ] **Step 1: Create `src/features/budgets/schemas.ts`**

```typescript
import { z } from 'zod';

export const budgetSchema = z.object({
  category_id: z.string().uuid().nullable().optional(),
  monthly_limit_fen: z.string().min(1, 'Amount required'),
});

export interface Budget {
  id: string;
  owner_id: string;
  category_id: string | null;
  monthly_limit_fen: string; // Supabase returns bigint as string
  created_at: string;
  updated_at: string;
  categories?: { id: string; name: string; icon: string; color: string } | null;
}
```

- [ ] **Step 2: Create `src/features/budgets/actions.ts`**

```typescript
'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { budgetSchema } from './schemas';

type BudgetResult = { ok: true; id?: string } | { ok: false; error: string };

export async function upsertBudgetAction(formData: FormData): Promise<BudgetResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const parsed = budgetSchema.safeParse({
    category_id: (formData.get('category_id') as string) || null,
    monthly_limit_fen: formData.get('monthly_limit_fen'),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid' };

  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from('budgets')
    .upsert(
      {
        owner_id: userId,
        category_id: parsed.data.category_id ?? null,
        monthly_limit_fen: BigInt(parsed.data.monthly_limit_fen),
      },
      { onConflict: 'owner_id,category_id' },
    )
    .select('id')
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id };
}

export async function deleteBudgetAction(formData: FormData): Promise<BudgetResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const id = formData.get('id') as string;
  if (!id) return { ok: false, error: 'Missing id' };

  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('budgets')
    .delete()
    .eq('id', id)
    .eq('owner_id', userId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/budgets/
git commit -m "feat(budgets): add schemas and server actions"
```

---

## Task 3: Budget queries and page

**Files:**
- Create: `src/features/budgets/queries.ts`
- Create: `src/app/(app)/budgets/page.tsx`

- [ ] **Step 1: Create `src/features/budgets/queries.ts`**

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/lib/supabase/browser';
import { startOfMonthIso, endOfMonthIso } from '@/lib/date';
import type { Budget } from './schemas';

export const BUDGETS_KEY = ['budgets'] as const;

export interface BudgetProgress {
  id: string;
  category_id: string | null;
  monthly_limit_fen: bigint;
  spent_fen: bigint;
  pct: number;
  category: { id: string; name: string; icon: string; color: string } | null;
}

export function useBudgets() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: BUDGETS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('*, categories(id, name, icon, color)')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Budget[];
    },
  });
}

export function useBudgetProgress() {
  const supabase = useSupabase();
  const monthStart = startOfMonthIso();

  return useQuery({
    queryKey: [...BUDGETS_KEY, 'progress', monthStart],
    queryFn: async () => {
      const [budgetsRes, txRes] = await Promise.all([
        supabase
          .from('budgets')
          .select('*, categories(id, name, icon, color)')
          .order('created_at', { ascending: true }),
        supabase
          .from('transactions')
          .select('category_id, amount_fen')
          .eq('type', 'expense')
          .gte('occurred_at', monthStart)
          .lte('occurred_at', endOfMonthIso())
          .is('deleted_at', null)
          .is('is_pending', false),
      ]);

      if (budgetsRes.error) throw budgetsRes.error;
      if (txRes.error) throw txRes.error;

      // Aggregate spending by category
      const spendingByCat: Record<string, bigint> = {};
      let totalSpent = 0n;
      for (const tx of txRes.data ?? []) {
        const fen = BigInt(tx.amount_fen);
        spendingByCat[tx.category_id] = (spendingByCat[tx.category_id] ?? 0n) + fen;
        totalSpent += fen;
      }

      return (budgetsRes.data ?? []).map((b): BudgetProgress => {
        const limit = BigInt(b.monthly_limit_fen);
        const spent = b.category_id === null ? totalSpent : (spendingByCat[b.category_id] ?? 0n);
        const pct = limit > 0n ? Number((spent * 100n) / limit) : 0;
        return {
          id: b.id,
          category_id: b.category_id,
          monthly_limit_fen: limit,
          spent_fen: spent,
          pct,
          category: (b as any).categories ?? null,
        };
      });
    },
  });
}
```

- [ ] **Step 2: Create `src/app/(app)/budgets/page.tsx`**

```typescript
'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AmountInput } from '@/components/feature/amount-input';
import { formatRMB } from '@/lib/money';
import { useBudgetProgress, BUDGETS_KEY } from '@/features/budgets/queries';
import { useCategories } from '@/features/categories/queries';
import { upsertBudgetAction, deleteBudgetAction } from '@/features/budgets/actions';

export default function BudgetsPage() {
  const queryClient = useQueryClient();
  const { data: progress = [], isLoading } = useBudgetProgress();
  const { data: categories = [] } = useCategories('expense');

  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState('__total__');
  const [limitFen, setLimitFen] = useState(0n);

  const { mutate: upsert, isPending } = useMutation({
    mutationFn: async (fd: FormData) => {
      const r = await upsertBudgetAction(fd);
      if (!r.ok) throw new Error(r.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUDGETS_KEY });
      toast.success('Budget saved');
      setOpen(false);
      setLimitFen(0n);
      setCategoryId('__total__');
    },
    onError: (e) => toast.error(e.message),
  });

  const { mutate: remove } = useMutation({
    mutationFn: async (id: string) => {
      const fd = new FormData();
      fd.set('id', id);
      const r = await deleteBudgetAction(fd);
      if (!r.ok) throw new Error(r.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BUDGETS_KEY });
      toast.success('Budget removed');
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (limitFen <= 0n) {
      toast.error('Enter an amount');
      return;
    }
    const fd = new FormData();
    fd.set('monthly_limit_fen', limitFen.toString());
    if (categoryId !== '__total__') fd.set('category_id', categoryId);
    upsert(fd);
  };

  // Fire overrun toasts (deduplicated by toast id)
  for (const b of progress) {
    if (b.pct > 100) {
      const label = b.category?.name ?? 'Total';
      toast.warning(`${label} budget overrun (${b.pct}%)`, { id: `overrun-${b.id}` });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Budgets</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 size-4" />
              Add Budget
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set Monthly Budget</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label>Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__total__">Total (all expenses)</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Monthly limit</Label>
                <AmountInput value={limitFen} onChange={setLimitFen} />
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? 'Saving…' : 'Save'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-[var(--radius-card)] bg-[var(--color-card)]"
            />
          ))}
        </div>
      ) : progress.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">
          No budgets yet. Add one to track spending.
        </p>
      ) : (
        <div className="space-y-3">
          {progress.map((b) => {
            const barColor =
              b.pct > 100 ? 'bg-red-500' : b.pct > 80 ? 'bg-amber-500' : 'bg-green-500';
            return (
              <div
                key={b.id}
                className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {b.category ? `${b.category.icon} ${b.category.name}` : 'Total'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums text-xs text-[var(--color-muted)]">
                      {formatRMB(b.spent_fen)} / {formatRMB(b.monthly_limit_fen)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      onClick={() => remove(b.id)}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--color-border)]">
                  <div
                    className={`h-full rounded-full transition-all ${barColor}`}
                    style={{ width: `${Math.min(b.pct, 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-[var(--color-muted)]">{b.pct}% used</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck and lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: zero errors.

- [ ] **Step 4: Smoke test**

Run `pnpm dev`, navigate to `/budgets`. Add a budget, verify the progress bar appears. Add a transaction in the category and verify the bar updates.

- [ ] **Step 5: Commit**

```bash
git add src/features/budgets/ src/app/\(app\)/budgets/
git commit -m "feat(budgets): add budget CRUD with monthly progress bars"
```

---

## Task 4: Recurring rules schemas and actions (with TDD)

**Files:**
- Create: `src/features/recurring/schemas.ts`
- Create: `src/features/recurring/actions.ts`

- [ ] **Step 1: Create `src/features/recurring/schemas.ts`**

```typescript
import { z } from 'zod';
import type { TxType } from '@/features/transactions/schemas';

export const cadences = ['daily', 'weekly', 'monthly', 'yearly'] as const;
export type Cadence = (typeof cadences)[number];

export const recurringSchema = z.object({
  name: z.string().min(1, 'Name required').max(100),
  type: z.enum(['income', 'expense']),
  account_id: z.string().uuid(),
  category_id: z.string().uuid(),
  amount_fen: z.string().min(1, 'Amount required'),
  cadence: z.enum(cadences),
  day_of_month: z.coerce.number().int().min(1).max(31).nullable().optional(),
  day_of_week: z.coerce.number().int().min(0).max(6).nullable().optional(),
  start_date: z.string().min(1, 'Start date required'),
  end_date: z.string().nullable().optional(),
});

export const updateRecurringSchema = recurringSchema.extend({
  id: z.string().uuid(),
});

export interface RecurringRule {
  id: string;
  owner_id: string;
  name: string;
  type: TxType;
  account_id: string;
  category_id: string;
  amount_fen: string; // bigint as string from Supabase
  cadence: Cadence;
  day_of_month: number | null;
  day_of_week: number | null;
  start_date: string;
  end_date: string | null;
  last_generated_for_date: string | null;
  is_active: boolean;
  created_at: string;
  accounts?: { name: string; kind: string } | null;
  categories?: { name: string; icon: string; color: string } | null;
}
```

- [ ] **Step 2: Create `src/features/recurring/actions.ts`**

```typescript
'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { recurringSchema, updateRecurringSchema } from './schemas';

type RecurringResult = { ok: true; id?: string } | { ok: false; error: string };

export async function createRecurringAction(formData: FormData): Promise<RecurringResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const parsed = recurringSchema.safeParse({
    name: formData.get('name'),
    type: formData.get('type'),
    account_id: formData.get('account_id'),
    category_id: formData.get('category_id'),
    amount_fen: formData.get('amount_fen'),
    cadence: formData.get('cadence'),
    day_of_month: formData.get('day_of_month') || null,
    day_of_week: formData.get('day_of_week') || null,
    start_date: formData.get('start_date'),
    end_date: formData.get('end_date') || null,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid' };

  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from('recurring_rules')
    .insert({ owner_id: userId, ...parsed.data, amount_fen: BigInt(parsed.data.amount_fen) })
    .select('id')
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id };
}

export async function updateRecurringAction(formData: FormData): Promise<RecurringResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const parsed = updateRecurringSchema.safeParse({
    id: formData.get('id'),
    name: formData.get('name'),
    type: formData.get('type'),
    account_id: formData.get('account_id'),
    category_id: formData.get('category_id'),
    amount_fen: formData.get('amount_fen'),
    cadence: formData.get('cadence'),
    day_of_month: formData.get('day_of_month') || null,
    day_of_week: formData.get('day_of_week') || null,
    start_date: formData.get('start_date'),
    end_date: formData.get('end_date') || null,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid' };

  const { id, ...rest } = parsed.data;
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('recurring_rules')
    .update({ ...rest, amount_fen: BigInt(rest.amount_fen) })
    .eq('id', id)
    .eq('owner_id', userId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteRecurringAction(formData: FormData): Promise<RecurringResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const id = formData.get('id') as string;
  if (!id) return { ok: false, error: 'Missing id' };

  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('recurring_rules')
    .delete()
    .eq('id', id)
    .eq('owner_id', userId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function toggleRecurringAction(formData: FormData): Promise<RecurringResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const id = formData.get('id') as string;
  const isActive = formData.get('is_active') === 'true';

  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('recurring_rules')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('owner_id', userId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 4: Commit**

```bash
git add src/features/recurring/
git commit -m "feat(recurring): add schemas and server actions"
```

---

## Task 5: Recurring queries and page

**Files:**
- Create: `src/features/recurring/queries.ts`
- Create: `src/app/(app)/recurring/page.tsx`

- [ ] **Step 1: Create `src/features/recurring/queries.ts`**

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/lib/supabase/browser';
import type { RecurringRule } from './schemas';

export const RECURRING_KEY = ['recurring'] as const;

export function useRecurringRules() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: RECURRING_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recurring_rules')
        .select('*, accounts(name, kind), categories(name, icon, color)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as RecurringRule[];
    },
  });
}
```

- [ ] **Step 2: Create `src/app/(app)/recurring/page.tsx`**

```typescript
'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import dayjs from 'dayjs';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AmountInput } from '@/components/feature/amount-input';
import { formatRMB } from '@/lib/money';
import { useRecurringRules, RECURRING_KEY } from '@/features/recurring/queries';
import { useAccounts } from '@/features/accounts/queries';
import { useCategories } from '@/features/categories/queries';
import {
  createRecurringAction,
  updateRecurringAction,
  deleteRecurringAction,
  toggleRecurringAction,
} from '@/features/recurring/actions';
import type { RecurringRule } from '@/features/recurring/schemas';

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function cadenceLabel(rule: RecurringRule): string {
  switch (rule.cadence) {
    case 'daily':
      return 'Every day';
    case 'weekly':
      return `Every ${DOW_LABELS[rule.day_of_week ?? 0]}`;
    case 'monthly':
      return `${rule.day_of_month ?? 1}th of month`;
    case 'yearly': {
      const d = dayjs(rule.start_date);
      return `${d.format('MMM D')} yearly`;
    }
  }
}

interface RuleFormProps {
  initial?: RecurringRule;
  onSuccess: () => void;
}

function RuleForm({ initial, onSuccess }: RuleFormProps) {
  const queryClient = useQueryClient();
  const { data: accounts = [] } = useAccounts();
  const [txType, setTxType] = useState<'income' | 'expense'>(initial?.type ?? 'expense');
  const { data: categories = [] } = useCategories(txType);
  const [amountFen, setAmountFen] = useState<bigint>(
    initial ? BigInt(initial.amount_fen) : 0n,
  );
  const [cadence, setCadence] = useState(initial?.cadence ?? 'monthly');

  const action = initial ? updateRecurringAction : createRecurringAction;

  const { mutate, isPending } = useMutation({
    mutationFn: async (fd: FormData) => {
      const r = await action(fd);
      if (!r.ok) throw new Error(r.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECURRING_KEY });
      toast.success(initial ? 'Rule updated' : 'Rule created');
      onSuccess();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (amountFen <= 0n) {
      toast.error('Enter an amount');
      return;
    }
    const fd = new FormData(e.currentTarget);
    fd.set('amount_fen', amountFen.toString());
    if (initial) fd.set('id', initial.id);
    mutate(fd);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-2">
      <div className="space-y-1">
        <Label>Name</Label>
        <Input name="name" defaultValue={initial?.name} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Type</Label>
          <Select
            name="type"
            value={txType}
            onValueChange={(v) => setTxType(v as 'income' | 'expense')}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="income">Income</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Amount</Label>
          <AmountInput value={amountFen} onChange={setAmountFen} />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Account</Label>
        <Select name="account_id" defaultValue={initial?.account_id}>
          <SelectTrigger>
            <SelectValue placeholder="Select account" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Category</Label>
        <Select name="category_id" defaultValue={initial?.category_id}>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.icon} {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Repeats</Label>
          <Select name="cadence" value={cadence} onValueChange={setCadence}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {cadence === 'weekly' && (
          <div className="space-y-1">
            <Label>Day of week</Label>
            <Select name="day_of_week" defaultValue={String(initial?.day_of_week ?? 1)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOW_LABELS.map((d, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {cadence === 'monthly' && (
          <div className="space-y-1">
            <Label>Day of month</Label>
            <Input
              name="day_of_month"
              type="number"
              min={1}
              max={31}
              defaultValue={initial?.day_of_month ?? 1}
            />
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Start date</Label>
          <Input name="start_date" type="date" defaultValue={initial?.start_date} required />
        </div>
        <div className="space-y-1">
          <Label>End date (optional)</Label>
          <Input name="end_date" type="date" defaultValue={initial?.end_date ?? ''} />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Saving…' : initial ? 'Update' : 'Create'}
      </Button>
    </form>
  );
}

export default function RecurringPage() {
  const queryClient = useQueryClient();
  const { data: rules = [], isLoading } = useRecurringRules();
  const [createOpen, setCreateOpen] = useState(false);
  const [editRule, setEditRule] = useState<RecurringRule | null>(null);

  const { mutate: remove } = useMutation({
    mutationFn: async (id: string) => {
      const fd = new FormData();
      fd.set('id', id);
      const r = await deleteRecurringAction(fd);
      if (!r.ok) throw new Error(r.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECURRING_KEY });
      toast.success('Rule deleted');
    },
    onError: (e) => toast.error(e.message),
  });

  const { mutate: toggle } = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const fd = new FormData();
      fd.set('id', id);
      fd.set('is_active', String(isActive));
      const r = await toggleRecurringAction(fd);
      if (!r.ok) throw new Error(r.error);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RECURRING_KEY }),
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Recurring Rules</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 size-4" />
              Add Rule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Recurring Rule</DialogTitle>
            </DialogHeader>
            <RuleForm onSuccess={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-[var(--radius-card)] bg-[var(--color-card)]"
            />
          ))}
        </div>
      ) : rules.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">No recurring rules yet.</p>
      ) : (
        <div className="space-y-2">
          {rules.map((r) => (
            <div
              key={r.id}
              className={`flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 ${!r.is_active ? 'opacity-50' : ''}`}
            >
              <button
                onClick={() => toggle({ id: r.id, isActive: !r.is_active })}
                className="text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              >
                {r.is_active ? (
                  <ToggleRight className="size-5 text-green-500" />
                ) : (
                  <ToggleLeft className="size-5" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{r.name}</p>
                <p className="text-xs text-[var(--color-muted)]">
                  {cadenceLabel(r)} · {r.categories?.icon} {r.categories?.name} ·{' '}
                  {r.accounts?.name}
                </p>
              </div>
              <span
                className={`tabular-nums text-sm font-medium ${r.type === 'income' ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}
              >
                {r.type === 'income' ? '+' : '-'}{formatRMB(BigInt(r.amount_fen))}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => setEditRule(r)}
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => remove(r.id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editRule} onOpenChange={(o) => !o && setEditRule(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Rule</DialogTitle>
          </DialogHeader>
          {editRule && <RuleForm initial={editRule} onSuccess={() => setEditRule(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck and lint**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 4: Smoke test** — `pnpm dev`, go to `/recurring`, create a monthly rule, verify it appears.

- [ ] **Step 5: Commit**

```bash
git add src/features/recurring/ src/app/\(app\)/recurring/
git commit -m "feat(recurring): add recurring rules CRUD page"
```

---

## Task 6: Notification schemas and actions

**Files:**
- Create: `src/features/notifications/schemas.ts`
- Create: `src/features/notifications/actions.ts`

- [ ] **Step 1: Create `src/features/notifications/schemas.ts`**

```typescript
export type NotificationKind = 'recurring_due' | 'debt_due' | 'budget_overrun' | 'low_balance';
export type Severity = 'info' | 'warning' | 'critical';

export interface Notification {
  id: string;
  owner_id: string;
  kind: NotificationKind;
  severity: Severity;
  title: string;
  body: string;
  link_to: string | null;
  related_id: string | null;
  created_at: string;
  read_at: string | null;
  dismissed_at: string | null;
  telegram_sent_at: string | null;
}
```

- [ ] **Step 2: Create `src/features/notifications/actions.ts`**

```typescript
'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';

type NotifResult = { ok: true } | { ok: false; error: string };

export async function markReadAction(formData: FormData): Promise<NotifResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const id = formData.get('id') as string;
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('owner_id', userId)
    .is('read_at', null);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function dismissAction(formData: FormData): Promise<NotifResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const id = formData.get('id') as string;
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('notifications')
    .update({ dismissed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('owner_id', userId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function markAllReadAction(): Promise<NotifResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('owner_id', userId)
    .is('read_at', null)
    .is('dismissed_at', null);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 4: Commit**

```bash
git add src/features/notifications/
git commit -m "feat(notifications): add schemas and server actions"
```

---

## Task 7: Notification queries, inbox page, and header bell

**Files:**
- Create: `src/features/notifications/queries.ts`
- Create: `src/app/(app)/notifications/page.tsx`
- Modify: `src/components/layout/header.tsx`

- [ ] **Step 1: Create `src/features/notifications/queries.ts`**

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/lib/supabase/browser';
import type { Notification } from './schemas';

export const NOTIFICATIONS_KEY = ['notifications'] as const;

export function useNotifications(showDismissed = false) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, { showDismissed }],
    queryFn: async () => {
      let q = supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });
      if (!showDismissed) q = q.is('dismissed_at', null);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Notification[];
    },
  });
}

export function useUnreadCount() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, 'unread-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .is('read_at', null)
        .is('dismissed_at', null);
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 60_000, // refresh badge every minute
  });
}
```

- [ ] **Step 2: Create `src/app/(app)/notifications/page.tsx`**

```typescript
'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCheck, X, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fmtRelative } from '@/lib/date';
import { useNotifications, NOTIFICATIONS_KEY } from '@/features/notifications/queries';
import { markReadAction, dismissAction, markAllReadAction } from '@/features/notifications/actions';
import type { Notification } from '@/features/notifications/schemas';

function severityIcon(n: Notification) {
  if (n.severity === 'critical') return <AlertCircle className="size-4 text-red-500 shrink-0" />;
  if (n.severity === 'warning') return <AlertTriangle className="size-4 text-amber-500 shrink-0" />;
  return <Info className="size-4 text-blue-500 shrink-0" />;
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [showDismissed, setShowDismissed] = useState(false);
  const { data: notifications = [], isLoading } = useNotifications(showDismissed);

  const { mutate: markRead } = useMutation({
    mutationFn: async (id: string) => {
      const fd = new FormData();
      fd.set('id', id);
      const r = await markReadAction(fd);
      if (!r.ok) throw new Error(r.error);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
    onError: (e) => toast.error(e.message),
  });

  const { mutate: dismiss } = useMutation({
    mutationFn: async (id: string) => {
      const fd = new FormData();
      fd.set('id', id);
      const r = await dismissAction(fd);
      if (!r.ok) throw new Error(r.error);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
    onError: (e) => toast.error(e.message),
  });

  const { mutate: markAll, isPending: markingAll } = useMutation({
    mutationFn: async () => {
      const r = await markAllReadAction();
      if (!r.ok) throw new Error(r.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
      toast.success('All marked as read');
    },
    onError: (e) => toast.error(e.message),
  });

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-xs text-[var(--color-muted)]">{unreadCount} unread</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDismissed((v) => !v)}
          >
            {showDismissed ? 'Hide dismissed' : 'Show dismissed'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAll()}
            disabled={markingAll || unreadCount === 0}
          >
            <CheckCheck className="mr-1 size-4" />
            Mark all read
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-[var(--radius-card)] bg-[var(--color-card)]"
            />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <p className="py-12 text-center text-sm text-[var(--color-muted)]">
          All caught up! No notifications.
        </p>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3 transition-opacity ${n.read_at ? 'opacity-60' : ''}`}
            >
              {severityIcon(n)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs text-[var(--color-muted)] mt-0.5">{n.body}</p>
                <p className="text-xs text-[var(--color-muted)] mt-1">{fmtRelative(n.created_at)}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                {!n.read_at && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => markRead(n.id)}
                    title="Mark read"
                  >
                    <CheckCheck className="size-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => dismiss(n.id)}
                  title="Dismiss"
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Update `src/components/layout/header.tsx`** — replace the existing Bell button with a badge-aware link component

```typescript
'use client';

import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from './theme-toggle';
import { useUnreadCount } from '@/features/notifications/queries';

function BellButton() {
  const { data: count = 0 } = useUnreadCount();
  return (
    <Button variant="ghost" size="icon" asChild aria-label="Notifications">
      <Link href="/notifications" className="relative">
        <Bell className="size-4" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </Link>
    </Button>
  );
}

export function Header() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-card)] px-4">
      <div className="text-sm text-[var(--color-muted)]">¥ RMB</div>
      <div className="flex items-center gap-1">
        <BellButton />
        <ThemeToggle />
        <UserButton appearance={{ elements: { avatarBox: 'size-7' } }} />
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Typecheck and lint**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 5: Smoke test** — navigate to `/notifications`, verify empty state. Bell shows in header.

- [ ] **Step 6: Commit**

```bash
git add src/features/notifications/ src/app/\(app\)/notifications/ src/components/layout/header.tsx
git commit -m "feat(notifications): add inbox page and header bell badge"
```

---

## Task 8: n8n auth helper, proxy route, and isRuleDueToday TDD

**Files:**
- Create: `src/lib/n8n-auth.ts`
- Create: `src/app/api/n8n/generate/helpers.ts`
- Create: `src/app/api/n8n/generate/helpers.test.ts`
- Modify: `src/proxy.ts`

- [ ] **Step 1: Create `src/lib/n8n-auth.ts`**

```typescript
import { timingSafeEqual } from 'node:crypto';

export function verifyN8nSecret(req: Request): boolean {
  const header = req.headers.get('x-n8n-secret') ?? '';
  const secret = process.env.N8N_WEBHOOK_SECRET ?? '';
  if (!secret || !header || header.length !== secret.length) return false;
  try {
    return timingSafeEqual(Buffer.from(header, 'utf8'), Buffer.from(secret, 'utf8'));
  } catch {
    return false;
  }
}
```

- [ ] **Step 2: Write failing test — create `src/app/api/n8n/generate/helpers.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { isRuleDueToday } from './helpers';

const base = {
  id: 'r1',
  owner_id: 'u1',
  name: 'Test',
  type: 'expense' as const,
  account_id: 'a1',
  category_id: 'c1',
  amount_fen: '10000',
  start_date: '2026-01-01',
  end_date: null,
  last_generated_for_date: null,
  is_active: true,
  day_of_month: null,
  day_of_week: null,
};

describe('isRuleDueToday', () => {
  it('daily rule is always due', () => {
    expect(isRuleDueToday({ ...base, cadence: 'daily' }, '2026-05-02')).toBe(true);
  });

  it('skips if already generated today', () => {
    expect(
      isRuleDueToday(
        { ...base, cadence: 'daily', last_generated_for_date: '2026-05-02' },
        '2026-05-02',
      ),
    ).toBe(false);
  });

  it('weekly — due on matching weekday (Saturday = 6)', () => {
    // 2026-05-02 is a Saturday
    expect(isRuleDueToday({ ...base, cadence: 'weekly', day_of_week: 6 }, '2026-05-02')).toBe(
      true,
    );
  });

  it('weekly — not due on non-matching weekday', () => {
    expect(isRuleDueToday({ ...base, cadence: 'weekly', day_of_week: 1 }, '2026-05-02')).toBe(
      false,
    );
  });

  it('monthly — due on matching day of month', () => {
    expect(isRuleDueToday({ ...base, cadence: 'monthly', day_of_month: 2 }, '2026-05-02')).toBe(
      true,
    );
  });

  it('monthly — not due on non-matching day', () => {
    expect(isRuleDueToday({ ...base, cadence: 'monthly', day_of_month: 15 }, '2026-05-02')).toBe(
      false,
    );
  });

  it('yearly — due on matching month+day in any year', () => {
    expect(
      isRuleDueToday({ ...base, cadence: 'yearly', start_date: '2026-05-02' }, '2027-05-02'),
    ).toBe(true);
  });

  it('yearly — not due on non-matching month+day', () => {
    expect(
      isRuleDueToday({ ...base, cadence: 'yearly', start_date: '2026-01-15' }, '2026-05-02'),
    ).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests — expect FAIL (helpers.ts does not exist yet)**

```bash
pnpm test:run src/app/api/n8n/generate/helpers.test.ts
```

Expected: `Cannot find module './helpers'`

- [ ] **Step 4: Create `src/app/api/n8n/generate/helpers.ts`**

```typescript
import dayjs from 'dayjs';

export interface RecurringRuleRow {
  id: string;
  owner_id: string;
  name: string;
  type: 'income' | 'expense';
  account_id: string;
  category_id: string;
  amount_fen: string;
  cadence: 'daily' | 'weekly' | 'monthly' | 'yearly';
  day_of_month: number | null;
  day_of_week: number | null;
  start_date: string;
  end_date: string | null;
  last_generated_for_date: string | null;
  is_active: boolean;
}

/**
 * Returns true if this rule should generate a transaction on `today` (YYYY-MM-DD).
 * Idempotent: returns false if already generated today.
 */
export function isRuleDueToday(rule: RecurringRuleRow, today: string): boolean {
  if (rule.last_generated_for_date === today) return false;

  const t = dayjs(today);

  switch (rule.cadence) {
    case 'daily':
      return true;
    case 'weekly':
      return rule.day_of_week === t.day();
    case 'monthly':
      return rule.day_of_month === t.date();
    case 'yearly': {
      const start = dayjs(rule.start_date);
      return start.month() === t.month() && start.date() === t.date();
    }
    default:
      return false;
  }
}
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
pnpm test:run src/app/api/n8n/generate/helpers.test.ts
```

Expected: `8 tests passed`

- [ ] **Step 6: Update `src/proxy.ts`** — add `/api/n8n/(.*)` to public routes

Open `src/proxy.ts`. Find the `isPublicRoute` array/check and add the n8n API pattern. The exact implementation varies — look for where `/sign-in` and `/sign-up` are registered and add alongside them:

```typescript
// Add to the isPublicRoute matcher (exact syntax depends on current proxy.ts):
'/api/n8n/(.*)',
```

If using `createRouteMatcher` from `@clerk/nextjs/server`:
```typescript
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/n8n/(.*)',   // ← add this line
]);
```

- [ ] **Step 7: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/n8n-auth.ts src/app/api/n8n/ src/proxy.ts
git commit -m "feat(n8n): add HMAC auth helper, isRuleDueToday with tests, proxy route"
```

---

## Task 9: n8n generate route

**Files:**
- Create: `src/app/api/n8n/generate/route.ts`

- [ ] **Step 1: Create `src/app/api/n8n/generate/route.ts`**

```typescript
import 'server-only';
import { NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { supabaseAdmin } from '@/lib/supabase/service-role';
import { verifyN8nSecret } from '@/lib/n8n-auth';
import { isRuleDueToday, type RecurringRuleRow } from './helpers';

export async function POST(req: Request) {
  if (!verifyN8nSecret(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = supabaseAdmin();
  const today = dayjs().format('YYYY-MM-DD');
  const monthStart = dayjs().startOf('month').toISOString();
  const monthEnd = dayjs().endOf('month').toISOString();

  let generated = 0;
  let notifications = 0;

  try {
    // Load all owner IDs
    const { data: settings, error: settingsErr } = await supabase
      .from('app_settings')
      .select('owner_id, reminder_days_before_due');
    if (settingsErr) throw settingsErr;

    for (const setting of settings ?? []) {
      const ownerId = setting.owner_id;
      const reminderDays: number = setting.reminder_days_before_due ?? 3;

      // ── 1. Recurring transactions ──────────────────────────────────────
      const { data: rules } = await supabase
        .from('recurring_rules')
        .select('*')
        .eq('owner_id', ownerId)
        .eq('is_active', true)
        .lte('start_date', today)
        .or(`end_date.is.null,end_date.gte.${today}`);

      for (const rule of (rules ?? []) as RecurringRuleRow[]) {
        if (!isRuleDueToday(rule, today)) continue;

        const { error: txErr } = await supabase.from('transactions').insert({
          owner_id: ownerId,
          account_id: rule.account_id,
          category_id: rule.category_id,
          type: rule.type,
          amount_fen: BigInt(rule.amount_fen),
          occurred_at: new Date().toISOString(),
          recurring_rule_id: rule.id,
          is_pending: true,
        });

        if (!txErr) {
          generated++;
          await supabase
            .from('recurring_rules')
            .update({ last_generated_for_date: today })
            .eq('id', rule.id);

          const { error: nErr } = await supabase.from('notifications').insert({
            owner_id: ownerId,
            kind: 'recurring_due',
            severity: 'info',
            title: `${rule.name} due`,
            body: `Pending transaction for ¥${(BigInt(rule.amount_fen) / 100n).toString()} created.`,
            related_id: rule.id,
          });
          if (!nErr) notifications++;
          // 23505 = unique_violation (already notified today) — silently ignored
        }
      }

      // ── 2. Debt due alerts ────────────────────────────────────────────
      const dueCutoff = dayjs().add(reminderDays, 'day').format('YYYY-MM-DD');
      const { data: debts } = await supabase
        .from('debts')
        .select('id, description, due_date, principal_fen')
        .eq('owner_id', ownerId)
        .in('status', ['open', 'partially_paid'])
        .not('due_date', 'is', null)
        .lte('due_date', dueCutoff);

      for (const debt of debts ?? []) {
        const daysLeft = dayjs(debt.due_date).diff(dayjs(), 'day');
        const severity =
          daysLeft <= 0 ? 'critical' : daysLeft <= 1 ? 'warning' : 'info';
        const title =
          daysLeft <= 0
            ? 'Debt overdue'
            : `Debt due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`;
        const { error: nErr } = await supabase.from('notifications').insert({
          owner_id: ownerId,
          kind: 'debt_due',
          severity,
          title,
          body: debt.description ?? `¥${(BigInt(debt.principal_fen) / 100n).toString()}`,
          link_to: '/debts',
          related_id: debt.id,
        });
        if (!nErr) notifications++;
      }

      // ── 3. Budget overruns ────────────────────────────────────────────
      const { data: budgets } = await supabase
        .from('budgets')
        .select('id, category_id, monthly_limit_fen')
        .eq('owner_id', ownerId);

      const { data: monthlyTx } = await supabase
        .from('transactions')
        .select('category_id, amount_fen')
        .eq('owner_id', ownerId)
        .eq('type', 'expense')
        .gte('occurred_at', monthStart)
        .lte('occurred_at', monthEnd)
        .is('deleted_at', null)
        .is('is_pending', false);

      const spendByCat: Record<string, bigint> = {};
      let totalSpent = 0n;
      for (const tx of monthlyTx ?? []) {
        const f = BigInt(tx.amount_fen);
        spendByCat[tx.category_id] = (spendByCat[tx.category_id] ?? 0n) + f;
        totalSpent += f;
      }

      for (const budget of budgets ?? []) {
        const limit = BigInt(budget.monthly_limit_fen);
        const spent =
          budget.category_id === null ? totalSpent : (spendByCat[budget.category_id] ?? 0n);
        if (spent <= limit) continue;

        const pct = Number((spent * 100n) / limit);
        const { error: nErr } = await supabase.from('notifications').insert({
          owner_id: ownerId,
          kind: 'budget_overrun',
          severity: 'warning',
          title: 'Budget overrun',
          body: `${pct}% of ${budget.category_id ? 'category' : 'total'} budget spent this month.`,
          link_to: '/budgets',
          related_id: budget.id,
        });
        if (!nErr) notifications++;
      }

      // ── 4. Low balance alerts ─────────────────────────────────────────
      const { data: balances } = await supabase
        .from('v_account_balances')
        .select('account_id, name, balance_fen, low_balance_threshold_fen')
        .eq('owner_id', ownerId)
        .not('low_balance_threshold_fen', 'is', null);

      for (const acc of balances ?? []) {
        if (BigInt(acc.balance_fen) >= BigInt(acc.low_balance_threshold_fen)) continue;

        const { error: nErr } = await supabase.from('notifications').insert({
          owner_id: ownerId,
          kind: 'low_balance',
          severity: 'warning',
          title: `Low balance: ${acc.name}`,
          body: `Balance ¥${(BigInt(acc.balance_fen) / 100n).toString()} is below threshold.`,
          link_to: '/accounts',
          related_id: acc.account_id,
        });
        if (!nErr) notifications++;
      }
    }

    return NextResponse.json({ ok: true, generated, notifications });
  } catch (err) {
    console.error('[n8n/generate]', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
```

- [ ] **Step 2: Test the route locally with curl**

```bash
curl -X POST http://localhost:3000/api/n8n/generate \
  -H "x-n8n-secret: 851f52f29fed14426e2b98a6de5d0b07ca735cfa805f6a4b349a94107ec027c6" \
  -H "Content-Type: application/json"
```

Expected: `{"ok":true,"generated":0,"notifications":0}` (no rules yet)

- [ ] **Step 3: Test with wrong secret**

```bash
curl -X POST http://localhost:3000/api/n8n/generate \
  -H "x-n8n-secret: wrongsecret" \
  -H "Content-Type: application/json"
```

Expected: `{"ok":false,"error":"Unauthorized"}` with HTTP 401

- [ ] **Step 4: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/n8n/generate/route.ts
git commit -m "feat(n8n): add /api/n8n/generate route for recurring generation and notifications"
```

---

## Task 10: n8n Telegram dispatch route

**Files:**
- Create: `src/app/api/n8n/telegram/route.ts`

- [ ] **Step 1: Create `src/app/api/n8n/telegram/route.ts`**

```typescript
import 'server-only';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/service-role';
import { verifyN8nSecret } from '@/lib/n8n-auth';

const SEVERITY_EMOJI: Record<string, string> = {
  critical: '🔴',
  warning: '🟡',
  info: 'ℹ️',
};

export async function POST(req: Request) {
  if (!verifyN8nSecret(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ ok: false, error: 'TELEGRAM_BOT_TOKEN not set' }, { status: 500 });
  }

  const supabase = supabaseAdmin();
  let sent = 0;

  try {
    // Only owners with Telegram enabled
    const { data: settings } = await supabase
      .from('app_settings')
      .select('owner_id, telegram_chat_id, telegram_enabled')
      .eq('telegram_enabled', true)
      .not('telegram_chat_id', 'is', null);

    for (const setting of settings ?? []) {
      const { data: notifs } = await supabase
        .from('notifications')
        .select('id, severity, title, body')
        .eq('owner_id', setting.owner_id)
        .is('telegram_sent_at', null)
        .is('dismissed_at', null)
        .order('created_at', { ascending: true })
        .limit(10);

      for (const notif of notifs ?? []) {
        const emoji = SEVERITY_EMOJI[notif.severity] ?? 'ℹ️';
        const text = `${emoji} *${notif.title}*\n${notif.body}`;

        const tgRes = await fetch(
          `https://api.telegram.org/bot${botToken}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: setting.telegram_chat_id,
              text,
              parse_mode: 'Markdown',
            }),
          },
        );

        if (tgRes.ok) {
          await supabase
            .from('notifications')
            .update({ telegram_sent_at: new Date().toISOString() })
            .eq('id', notif.id);
          sent++;
        }
      }
    }

    return NextResponse.json({ ok: true, sent });
  } catch (err) {
    console.error('[n8n/telegram]', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
```

- [ ] **Step 2: Test the route locally**

```bash
curl -X POST http://localhost:3000/api/n8n/telegram \
  -H "x-n8n-secret: 851f52f29fed14426e2b98a6de5d0b07ca735cfa805f6a4b349a94107ec027c6"
```

Expected: `{"ok":true,"sent":0}` (telegram_enabled is false by default)

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/n8n/telegram/route.ts
git commit -m "feat(n8n): add /api/n8n/telegram dispatch route"
```

---

## Task 11: n8n workflows via MCP

**Files:**
- Create: `n8n/fleucy-daily-evaluation.json` (exported after MCP creation)
- Create: `n8n/fleucy-telegram-dispatch.json` (exported after MCP creation)

> **Note:** This task uses the `claude.ai n8n` MCP tools. Follow the MCP server instructions exactly (get_sdk_reference → search_nodes → get_node_types → write → validate → create_workflow_from_code).

- [ ] **Step 1: Read n8n SDK reference**

Call `mcp__claude_ai_n8n__get_sdk_reference` with sections `["overview", "guidelines", "design"]`.

- [ ] **Step 2: Search for required nodes**

Call `mcp__claude_ai_n8n__search_nodes` with queries `["schedule trigger", "http request"]`.

- [ ] **Step 3: Get type definitions**

Call `mcp__claude_ai_n8n__get_node_types` for all node IDs found in Step 2.

- [ ] **Step 4: Write and validate Workflow A (daily evaluation)**

Workflow code must:
- Use Schedule Trigger: cron `0 8 * * *` (08:00 daily)
- Use HTTP Request node: POST to `{{ $vars.FLEUCY_URL }}/api/n8n/generate` with header `x-n8n-secret: {{ $vars.N8N_WEBHOOK_SECRET }}`
- Include an IF node checking `{{ $json.ok === true }}`
- Success branch: Set node logging `{{ $json.generated }} transactions, {{ $json.notifications }} notifications`
- Failure branch: Set node with error message

Validate with `mcp__claude_ai_n8n__validate_workflow`.

- [ ] **Step 5: Create Workflow A**

Call `mcp__claude_ai_n8n__create_workflow_from_code` with description `"Daily 08:00: generates pending recurring transactions and creates budget/debt/balance notifications via Fleucy API."` Save the returned workflow ID.

- [ ] **Step 6: Write and validate Workflow B (Telegram dispatch)**

Workflow code must:
- Use Schedule Trigger: cron `*/5 * * * *` (every 5 minutes)
- Use HTTP Request node: POST to `{{ $vars.FLEUCY_URL }}/api/n8n/telegram` with header `x-n8n-secret: {{ $vars.N8N_WEBHOOK_SECRET }}`
- Include an IF node checking `{{ $json.ok === true }}`
- Success branch: Set node with `{{ $json.sent }} notifications sent`

Validate with `mcp__claude_ai_n8n__validate_workflow`.

- [ ] **Step 7: Create Workflow B**

Call `mcp__claude_ai_n8n__create_workflow_from_code` with description `"Every 5 min: dispatches unread Fleucy notifications to Telegram."` Save the returned workflow ID.

- [ ] **Step 8: Export JSONs and commit**

Call `mcp__claude_ai_n8n__get_workflow_details` for both workflow IDs. Save the workflow JSON to:
- `n8n/fleucy-daily-evaluation.json`
- `n8n/fleucy-telegram-dispatch.json`

```bash
mkdir -p n8n
# Write the JSON files, then:
git add n8n/
git commit -m "feat(n8n): add daily evaluation and Telegram dispatch workflows"
```

> **Pre-requisite reminder:** Before workflows will work, add to n8n Settings → Variables:
> - `FLEUCY_URL` = your Vercel production URL (e.g. `https://fleucy.vercel.app`)
> - `N8N_WEBHOOK_SECRET` = `851f52f29fed14426e2b98a6de5d0b07ca735cfa805f6a4b349a94107ec027c6`

---

## Task 12: Reports page (Recharts)

**Files:**
- Create: `src/features/reports/queries.ts`
- Create: `src/app/(app)/reports/page.tsx`

- [ ] **Step 1: Create `src/features/reports/queries.ts`**

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useSupabase } from '@/lib/supabase/browser';

export const REPORTS_KEY = ['reports'] as const;

type Period = '7d' | '30d' | '3m' | '12m';

function getRange(period: Period) {
  const now = dayjs();
  switch (period) {
    case '7d':
      return { start: now.subtract(6, 'day').startOf('day'), end: now.endOf('day'), fmt: 'MM-DD', step: 'day' as const };
    case '30d':
      return { start: now.subtract(29, 'day').startOf('day'), end: now.endOf('day'), fmt: 'MM-DD', step: 'day' as const };
    case '3m':
      return { start: now.subtract(2, 'month').startOf('month'), end: now.endOf('month'), fmt: 'MMM', step: 'month' as const };
    case '12m':
      return { start: now.subtract(11, 'month').startOf('month'), end: now.endOf('month'), fmt: 'MMM', step: 'month' as const };
  }
}

export function useCashflowData(period: Period) {
  const supabase = useSupabase();
  const { start, end, fmt, step } = getRange(period);

  return useQuery({
    queryKey: [...REPORTS_KEY, 'cashflow', period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('type, amount_fen, occurred_at')
        .gte('occurred_at', start.toISOString())
        .lte('occurred_at', end.toISOString())
        .is('deleted_at', null)
        .is('is_pending', false);

      if (error) throw error;

      // Build bucket keys for the period
      const buckets: Record<string, { income: number; expense: number; label: string }> = {};
      let cursor = start.clone();
      while (cursor.isBefore(end) || cursor.isSame(end, step)) {
        const key = cursor.format('YYYY-MM-DD');
        buckets[key] = { income: 0, expense: 0, label: cursor.format(fmt) };
        cursor = cursor.add(1, step);
      }

      for (const tx of data ?? []) {
        const bucketKey =
          step === 'day'
            ? dayjs(tx.occurred_at).format('YYYY-MM-DD')
            : dayjs(tx.occurred_at).startOf('month').format('YYYY-MM-DD');
        if (!buckets[bucketKey]) continue;
        const fen = Number(tx.amount_fen);
        if (tx.type === 'income') buckets[bucketKey].income += fen;
        else buckets[bucketKey].expense += fen;
      }

      return Object.values(buckets);
    },
  });
}

export function useTopCategories(period: Period, type: 'income' | 'expense') {
  const supabase = useSupabase();
  const { start, end } = getRange(period);

  return useQuery({
    queryKey: [...REPORTS_KEY, 'top-categories', period, type],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('amount_fen, categories(name, icon, color)')
        .eq('type', type)
        .gte('occurred_at', start.toISOString())
        .lte('occurred_at', end.toISOString())
        .is('deleted_at', null)
        .is('is_pending', false);

      if (error) throw error;

      const totals: Record<string, { name: string; color: string; total: number }> = {};
      for (const tx of data ?? []) {
        const cat = (tx as any).categories;
        if (!cat) continue;
        const key = cat.name as string;
        if (!totals[key])
          totals[key] = { name: `${cat.icon} ${cat.name}`, color: cat.color, total: 0 };
        totals[key].total += Number(tx.amount_fen);
      }

      return Object.values(totals)
        .sort((a, b) => b.total - a.total)
        .slice(0, 8);
    },
  });
}
```

- [ ] **Step 2: Create `src/app/(app)/reports/page.tsx`**

```typescript
'use client';

import { useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatRMB } from '@/lib/money';
import { useCashflowData, useTopCategories } from '@/features/reports/queries';

type Period = '7d' | '30d' | '3m' | '12m';
type TxType = 'expense' | 'income';

function fenFormatter(value: number): string {
  return formatRMB(BigInt(Math.round(value)));
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>('30d');
  const [txType, setTxType] = useState<TxType>('expense');

  const { data: cashflow = [], isLoading: cfLoading } = useCashflowData(period);
  const { data: topCats = [], isLoading: catLoading } = useTopCategories(period, txType);

  const cardClass =
    'rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-4';

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Reports</h1>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList>
            <TabsTrigger value="7d">7D</TabsTrigger>
            <TabsTrigger value="30d">30D</TabsTrigger>
            <TabsTrigger value="3m">3M</TabsTrigger>
            <TabsTrigger value="12m">12M</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Cashflow chart */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-[var(--color-muted)]">Cashflow</h2>
        {cfLoading ? (
          <div className={`${cardClass} h-[260px] animate-pulse`} />
        ) : (
          <div className={cardClass}>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={cashflow}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `¥${(v / 100).toFixed(0)}`} tick={{ fontSize: 11 }} width={60} />
                <Tooltip formatter={fenFormatter} />
                <Area
                  type="monotone"
                  dataKey="income"
                  name="Income"
                  stroke="#22c55e"
                  fill="#22c55e"
                  fillOpacity={0.2}
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  name="Expense"
                  stroke="#ef4444"
                  fill="#ef4444"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Top categories chart */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-[var(--color-muted)]">Top Categories</h2>
          <Tabs value={txType} onValueChange={(v) => setTxType(v as TxType)}>
            <TabsList>
              <TabsTrigger value="expense">Expense</TabsTrigger>
              <TabsTrigger value="income">Income</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {catLoading ? (
          <div className={`${cardClass} h-[260px] animate-pulse`} />
        ) : topCats.length === 0 ? (
          <div className={cardClass}>
            <p className="py-8 text-center text-sm text-[var(--color-muted)]">No data for this period.</p>
          </div>
        ) : (
          <div className={cardClass}>
            <ResponsiveContainer width="100%" height={Math.max(topCats.length * 44 + 40, 160)}>
              <BarChart data={topCats} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  type="number"
                  tickFormatter={(v) => `¥${(v / 100).toFixed(0)}`}
                  tick={{ fontSize: 11 }}
                />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                <Tooltip formatter={fenFormatter} />
                <Bar dataKey="total" name="Amount" radius={[0, 4, 4, 0]}>
                  {topCats.map((cat, i) => (
                    <Cell key={i} fill={cat.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck and lint**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 4: Smoke test** — `pnpm dev`, go to `/reports`, switch period tabs, switch expense/income toggle.

- [ ] **Step 5: Commit**

```bash
git add src/features/reports/ src/app/\(app\)/reports/
git commit -m "feat(reports): add cashflow area chart and top-categories bar chart"
```

---

## Task 13: ⌘K Command palette

**Files:**
- Create: `src/components/command-palette.tsx`
- Modify: `src/components/layout/shell.tsx`

- [ ] **Step 1: Create `src/components/command-palette.tsx`**

```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from 'cmdk';
import {
  BarChart3,
  Bell,
  LayoutDashboard,
  ListChecks,
  Repeat,
  Settings,
  Tag,
  Target,
  Users,
  Wallet,
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transactions', icon: ListChecks },
  { href: '/accounts', label: 'Accounts', icon: Wallet },
  { href: '/debts', label: 'Debts', icon: Users },
  { href: '/categories', label: 'Categories', icon: Tag },
  { href: '/recurring', label: 'Recurring Rules', icon: Repeat },
  { href: '/budgets', label: 'Budgets', icon: Target },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/settings', label: 'Settings', icon: Settings },
];

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();

  const navigate = (href: string) => {
    router.push(href);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 shadow-2xl">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-[var(--color-muted)] [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          <CommandInput placeholder="Go to page…" />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup heading="Navigate">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
                <CommandItem
                  key={href}
                  value={label}
                  onSelect={() => navigate(href)}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <Icon className="size-4 text-[var(--color-muted)]" />
                  {label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create `src/components/layout/command-palette-controller.tsx`**

```typescript
'use client';

import { useEffect, useState } from 'react';
import { CommandPalette } from '@/components/command-palette';

export function CommandPaletteController() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return <CommandPalette open={open} onOpenChange={setOpen} />;
}
```

- [ ] **Step 3: Modify `src/components/layout/shell.tsx`**

Add `CommandPaletteController` as the last child:

```typescript
import { BottomNav } from './bottom-nav';
import { Header } from './header';
import { Sidebar } from './sidebar';
import { CommandPaletteController } from './command-palette-controller';

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen md:grid-cols-[14rem_1fr]">
      <Sidebar />
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 px-4 py-6 pb-20 md:pb-6">{children}</main>
      </div>
      <BottomNav />
      <CommandPaletteController />
    </div>
  );
}
```

- [ ] **Step 4: Typecheck and lint**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 5: Smoke test** — press Ctrl+K (or ⌘K on Mac), verify palette opens. Type "reports", press Enter, verify navigation.

- [ ] **Step 6: Commit**

```bash
git add src/components/command-palette.tsx src/components/layout/command-palette-controller.tsx src/components/layout/shell.tsx
git commit -m "feat(palette): add ⌘K command palette with page navigation"
```

---

## Task 14: People enrichment (avatar upload + notes)

**Files:**
- Modify: `src/features/people/actions.ts`
- Modify: `src/app/(app)/debts/people/page.tsx`

- [ ] **Step 1: Read current `src/features/people/actions.ts`** to understand existing `createPersonAction` before modifying.

- [ ] **Step 2: Add `uploadAvatarAction` and `updatePersonAction` to `src/features/people/actions.ts`**

Append to the existing file (keep existing `createPersonAction` untouched):

```typescript
// Add at the bottom of src/features/people/actions.ts
import { supabaseAdmin } from '@/lib/supabase/service-role';

export async function uploadAvatarAction(
  formData: FormData,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const file = formData.get('file') as File | null;
  const personId = formData.get('person_id') as string;
  if (!file || !personId) return { ok: false, error: 'Missing file or person_id' };
  if (file.size > 2 * 1024 * 1024) return { ok: false, error: 'File too large (max 2 MB)' };

  const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase();
  const path = `${userId}/${personId}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const admin = supabaseAdmin();
  const { error: uploadErr } = await admin.storage
    .from('avatars')
    .upload(path, buffer, { contentType: file.type, upsert: true });
  if (uploadErr) return { ok: false, error: uploadErr.message };

  const {
    data: { publicUrl },
  } = admin.storage.from('avatars').getPublicUrl(path);

  // Update person record using RLS-aware client
  const supabase = await supabaseServer();
  const { error: updateErr } = await supabase
    .from('people')
    .update({ avatar_url: publicUrl })
    .eq('id', personId)
    .eq('owner_id', userId);

  if (updateErr) return { ok: false, error: updateErr.message };
  return { ok: true, url: publicUrl };
}

export async function updatePersonAction(formData: FormData): Promise<PersonResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const id = formData.get('id') as string;
  if (!id) return { ok: false, error: 'Missing id' };

  const parsed = personSchema.safeParse({
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

> **Note:** `PersonResult` and `personSchema` are already in the file — reference them without re-importing. Check the top of the existing `actions.ts` for the correct import names.

- [ ] **Step 3: Ensure the `avatars` bucket exists in Supabase**

The RLS policies for the `avatars` bucket are already set up in migration `20260427000100`. However, the bucket itself must be created in Supabase Storage. Go to your Supabase dashboard → Storage → New bucket, name it `avatars`, set public = true (for public URLs). Do this once.

- [ ] **Step 4: Update `src/app/(app)/debts/people/page.tsx`** — add avatar display, edit dialog, delete button

Replace the file content with this extended version that adds: avatar upload, notes field, edit dialog, and delete:

```typescript
'use client';

import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2, User } from 'lucide-react';
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
import {
  createPersonAction,
  updatePersonAction,
  uploadAvatarAction,
} from '@/features/people/actions';
import { PEOPLE_KEY, usePeople } from '@/features/people/queries';
import type { Person } from '@/features/people/schemas';

// Shared form used for both create and edit
function PersonForm({
  initial,
  onSuccess,
}: {
  initial?: Person;
  onSuccess: () => void;
}) {
  const queryClient = useQueryClient();
  const action = initial ? updatePersonAction : createPersonAction;

  const { mutate, isPending } = useMutation({
    mutationFn: async (fd: FormData) => {
      const r = await action(fd);
      if (!r.ok) throw new Error(r.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PEOPLE_KEY });
      toast.success(initial ? 'Person updated' : 'Person added');
      onSuccess();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        if (initial) fd.set('id', initial.id);
        mutate(fd);
      }}
      className="space-y-3"
    >
      <div className="space-y-1">
        <Label htmlFor="pf-name">Full name *</Label>
        <Input id="pf-name" name="full_name" defaultValue={initial?.full_name} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="pf-phone">Phone</Label>
        <Input id="pf-phone" name="phone" type="tel" defaultValue={initial?.phone ?? ''} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="pf-email">Email</Label>
        <Input id="pf-email" name="email" type="email" defaultValue={initial?.email ?? ''} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="pf-tag">Relationship</Label>
        <Input
          id="pf-tag"
          name="relationship_tag"
          placeholder="Friend, Family, Colleague…"
          defaultValue={initial?.relationship_tag ?? ''}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="pf-notes">Notes</Label>
        <Input id="pf-notes" name="notes" defaultValue={initial?.notes ?? ''} />
      </div>
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Saving…' : initial ? 'Update' : 'Add person'}
      </Button>
    </form>
  );
}

function AvatarUpload({ person }: { person: Person }) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const { mutate: upload, isPending } = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.set('file', file);
      fd.set('person_id', person.id);
      const r = await uploadAvatarAction(fd);
      if (!r.ok) throw new Error(r.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PEOPLE_KEY });
      toast.success('Avatar updated');
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <>
      <button
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
        className="relative shrink-0 overflow-hidden rounded-full size-10 bg-[var(--color-border)] hover:opacity-80 transition-opacity"
        title="Change avatar"
      >
        {person.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={person.avatar_url}
            alt={person.full_name}
            className="size-full object-cover"
          />
        ) : (
          <User className="size-5 m-auto text-[var(--color-muted)]" />
        )}
        {isPending && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <span className="size-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = '';
        }}
      />
    </>
  );
}

export default function PeoplePage() {
  const { data, isLoading } = usePeople();
  const [createOpen, setCreateOpen] = useState(false);
  const [editPerson, setEditPerson] = useState<Person | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">People</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 size-4" />
              Add person
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New person</DialogTitle>
            </DialogHeader>
            <PersonForm onSuccess={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-[var(--color-muted)]">Loading…</p>
      ) : (
        <div className="space-y-2">
          {(data ?? []).length === 0 && (
            <p className="py-8 text-center text-sm text-[var(--color-muted)]">No people yet.</p>
          )}
          {(data ?? []).map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3"
            >
              <AvatarUpload person={p} />
              <div className="flex-1 min-w-0">
                <p className="font-medium">{p.full_name}</p>
                {p.phone && (
                  <p className="text-xs text-[var(--color-muted)]">{p.phone}</p>
                )}
                {p.notes && (
                  <p className="text-xs text-[var(--color-muted)] truncate">{p.notes}</p>
                )}
              </div>
              {p.relationship_tag && (
                <span className="rounded-full border border-[var(--color-border)] px-2 py-0.5 text-xs text-[var(--color-muted)]">
                  {p.relationship_tag}
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="size-7 shrink-0"
                onClick={() => setEditPerson(p)}
              >
                <Pencil className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editPerson} onOpenChange={(o) => !o && setEditPerson(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit person</DialogTitle>
          </DialogHeader>
          {editPerson && (
            <PersonForm initial={editPerson} onSuccess={() => setEditPerson(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 5: Typecheck and lint**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 6: Smoke test** — go to `/debts/people`, add a person, click their avatar circle to upload a photo, verify it appears.

- [ ] **Step 7: Commit**

```bash
git add src/features/people/actions.ts src/app/\(app\)/debts/people/page.tsx
git commit -m "feat(people): add avatar upload and notes enrichment"
```

---

## Task 15: Global search bar

**Files:**
- Create: `src/components/layout/search-bar.tsx`
- Modify: `src/components/layout/header.tsx`

- [ ] **Step 1: Create `src/components/layout/search-bar.tsx`**

```typescript
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { useSupabase } from '@/lib/supabase/browser';

interface SearchResult {
  id: string;
  label: string;
  sub: string;
  href: string;
}

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const supabase = useSupabase();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: results = [] } = useQuery({
    queryKey: ['search', query],
    enabled: query.trim().length >= 2,
    staleTime: 300,
    queryFn: async (): Promise<SearchResult[]> => {
      const [txRes, peopleRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('id, note, amount_fen')
          .ilike('note', `%${query}%`)
          .is('deleted_at', null)
          .limit(5),
        supabase
          .from('people')
          .select('id, full_name, phone')
          .ilike('full_name', `%${query}%`)
          .limit(5),
      ]);

      const txResults: SearchResult[] = (txRes.data ?? []).map((tx) => ({
        id: `tx-${tx.id}`,
        label: tx.note ?? 'Transaction',
        sub: `¥${(BigInt(tx.amount_fen) / 100n).toString()}`,
        href: '/transactions',
      }));

      const peopleResults: SearchResult[] = (peopleRes.data ?? []).map((p) => ({
        id: `p-${p.id}`,
        label: p.full_name,
        sub: p.phone ?? 'Person',
        href: '/debts/people',
      }));

      return [...txResults, ...peopleResults];
    },
  });

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative hidden md:block">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--color-muted)]" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search…"
          className="h-8 w-48 pl-8 text-sm"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-full z-50 mt-1 w-72 overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] shadow-lg">
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                router.push(r.href);
                setOpen(false);
                setQuery('');
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5"
            >
              <span className="truncate font-medium">{r.label}</span>
              <span className="ml-2 shrink-0 text-xs text-[var(--color-muted)]">{r.sub}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update `src/components/layout/header.tsx`** — add SearchBar between the `¥ RMB` label and the right-side buttons

```typescript
'use client';

import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from './theme-toggle';
import { SearchBar } from './search-bar';
import { useUnreadCount } from '@/features/notifications/queries';

function BellButton() {
  const { data: count = 0 } = useUnreadCount();
  return (
    <Button variant="ghost" size="icon" asChild aria-label="Notifications">
      <Link href="/notifications" className="relative">
        <Bell className="size-4" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </Link>
    </Button>
  );
}

export function Header() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-card)] px-4">
      <div className="flex items-center gap-4">
        <div className="text-sm text-[var(--color-muted)]">¥ RMB</div>
        <SearchBar />
      </div>
      <div className="flex items-center gap-1">
        <BellButton />
        <ThemeToggle />
        <UserButton appearance={{ elements: { avatarBox: 'size-7' } }} />
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Typecheck and lint**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 4: Smoke test** — type at least 2 chars in the search bar, verify results dropdown appears.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/search-bar.tsx src/components/layout/header.tsx
git commit -m "feat(search): add global search bar in header for transactions and people"
```

---

## Task 16: Final verification

- [ ] **Step 1: Full build**

```bash
pnpm build
```

Expected: clean build with no TypeScript or lint errors.

- [ ] **Step 2: Run all tests**

```bash
pnpm test:run
```

Expected: all tests pass including the `isRuleDueToday` suite.

- [ ] **Step 3: Smoke all new routes**

Run `pnpm dev` and visit each new page:
- `/budgets` — add a budget, see progress bar
- `/recurring` — add a monthly rule, verify cadence label
- `/notifications` — empty state loads, bell badge in header
- `/reports` — charts render, period/type tabs work
- Press Ctrl+K — command palette opens, navigate to a page
- `/debts/people` — click avatar circle to upload photo, edit dialog has notes field
- Type 2+ chars in search bar — dropdown shows matching results

- [ ] **Step 4: Commit memory update** (update project_fleucy.md to reflect Phase 2 done)

Update `C:\Users\wokao\.claude\projects\e--Claude-Project-Daily-Expensise\memory\project_fleucy.md` — change Phase 2 status from NOT STARTED to DONE and record completion date.

---

## Pre-flight checklist for n8n

Before the n8n workflows can call the production API:

1. Deploy the app to Vercel (or wherever) and get the production URL.
2. In n8n `Settings → Variables`, set:
   - `FLEUCY_URL` = `https://your-production-url.vercel.app`
   - `N8N_WEBHOOK_SECRET` = `851f52f29fed14426e2b98a6de5d0b07ca735cfa805f6a4b349a94107ec027c6`
3. In your Fleucy `app_settings` row (via Supabase dashboard or Settings page), set `telegram_enabled = true` and `telegram_chat_id` = your Telegram chat ID (get it by messaging @userinfobot on Telegram).
4. Activate both n8n workflows.
