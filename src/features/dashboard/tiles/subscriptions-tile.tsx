'use client';

import { CreditCard } from 'lucide-react';
import Link from 'next/link';
import { useSubscriptionSummary } from '@/features/dashboard/queries';
import { formatRMB } from '@/lib/money';
import { BentoTile } from './bento-grid';

export function SubscriptionsTile() {
  const { data, isLoading } = useSubscriptionSummary();

  if (isLoading) {
    return (
      <BentoTile className="md:[grid-column:4/5] md:[grid-row:1/2] h-[120px] animate-pulse">
        <div />
      </BentoTile>
    );
  }

  return (
    <BentoTile
      className="md:[grid-column:4/5] md:[grid-row:1/2]"
      style={{ borderLeft: '3px solid var(--color-primary)' }}
    >
      <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
        <CreditCard className="size-3.5" style={{ color: 'var(--color-primary)' }} />
        Subscriptions
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums" style={{ color: 'var(--color-primary)' }}>
        {formatRMB(data?.monthlyTotal ?? 0n)}
        <span className="ml-1 text-xs font-normal text-[var(--color-muted)]">/mo</span>
      </p>
      <p className="mt-1 text-xs text-[var(--color-muted)]">{data?.count ?? 0} active</p>
      <Link
        href="/subscriptions"
        className="mt-2 block text-xs"
        style={{ color: 'var(--color-primary)' }}
      >
        Manage →
      </Link>
    </BentoTile>
  );
}
