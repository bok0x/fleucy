'use client';

import { Wallet } from 'lucide-react';
import { useAccountBalances } from '@/features/accounts/queries';
import { formatRMB } from '@/lib/money';
import { BentoTile } from './bento-grid';

export function AccountsTile() {
  const { data, isLoading, isError, refetch } = useAccountBalances();

  const accounts = data ?? [];
  const maxBalance = accounts.reduce((m, a) => {
    const b = BigInt(a.balance_fen);
    return b > m ? b : m;
  }, 1n);

  return (
    <BentoTile className="md:[grid-column:4/5] md:[grid-row:1/3]">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-[var(--color-muted)]">Accounts</p>
        <Wallet className="size-4 text-[var(--color-muted)]" />
      </div>

      {isError && (
        <button
          type="button"
          onClick={() => refetch()}
          className="text-xs underline text-[var(--color-muted)]"
        >
          Retry
        </button>
      )}

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-[var(--color-border)]" />
          ))}
        </div>
      )}

      {!isLoading && !isError && (
        <div className="space-y-3 overflow-y-auto max-h-[280px]">
          {accounts.length === 0 && (
            <p className="text-xs text-[var(--color-muted)]">No accounts yet.</p>
          )}
          {accounts.map((acc) => {
            const balance = BigInt(acc.balance_fen);
            const pct = maxBalance > 0n ? Number((balance * 100n) / maxBalance) : 0;
            return (
              <div key={acc.account_id}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="truncate text-[var(--color-fg)]">{acc.name}</span>
                  <span className="tabular-nums text-[var(--color-muted)]">
                    {formatRMB(balance)}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--color-border)]">
                  <div
                    className="h-1.5 rounded-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      background:
                        'linear-gradient(90deg, var(--color-gradient-a), var(--color-gradient-b))',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </BentoTile>
  );
}
