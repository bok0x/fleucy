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
        <div className="mt-2 h-10 w-40 animate-pulse rounded bg-[var(--color-border)]" />
      ) : (
        <p className="mt-1 text-3xl font-semibold tabular-nums">{formatRMB(data ?? 0n)}</p>
      )}
    </div>
  );
}

function ThisMonthWidget() {
  const { data, isLoading } = useMonthSummary();
  return (
    <div className="space-y-4 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-6">
      <p className="text-sm text-[var(--color-muted)]">This month</p>
      {isLoading ? (
        <div className="h-16 animate-pulse rounded bg-[var(--color-border)]" />
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="flex items-center gap-1 text-xs text-[var(--color-success)]">
              <TrendingUp className="size-3" />
              Income
            </div>
            <p className="font-semibold tabular-nums">{formatRMB(data?.income ?? 0n)}</p>
          </div>
          <div>
            <div className="flex items-center gap-1 text-xs text-[var(--color-danger)]">
              <TrendingDown className="size-3" />
              Expense
            </div>
            <p className="font-semibold tabular-nums">{formatRMB(data?.expense ?? 0n)}</p>
          </div>
          <div>
            <div className="text-xs text-[var(--color-muted)]">Net</div>
            <p
              className={`font-semibold tabular-nums ${
                (data?.net ?? 0n) >= 0n
                  ? 'text-[var(--color-success)]'
                  : 'text-[var(--color-danger)]'
              }`}
            >
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
  if (isLoading) {
    return (
      <div className="h-16 animate-pulse rounded-[var(--radius-card)] bg-[var(--color-border)]" />
    );
  }
  if ((data ?? []).length === 0) return null;
  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {(data ?? []).map((acc) => (
        <div
          key={acc.account_id}
          className="min-w-[140px] flex-shrink-0 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <Wallet className="size-3.5 text-[var(--color-muted)]" />
            <p className="truncate text-xs text-[var(--color-muted)]">{acc.name}</p>
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
