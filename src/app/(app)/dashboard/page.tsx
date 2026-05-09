'use client';

import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { useMonthSummary } from '@/features/dashboard/queries';
import { AccountsTile } from '@/features/dashboard/tiles/accounts-tile';
import { BentoGrid } from '@/features/dashboard/tiles/bento-grid';
import { CategoryTile } from '@/features/dashboard/tiles/category-tile';
import { NetWorthTile } from '@/features/dashboard/tiles/net-worth-tile';
import { StatTile } from '@/features/dashboard/tiles/stat-tile';
import { TrendChartTile } from '@/features/dashboard/tiles/trend-chart-tile';
import { QuickAddModal } from '../transactions/quick-add-modal';

function MonthStats() {
  const { data, isLoading } = useMonthSummary();
  const income = data?.income ?? 0n;
  const expense = data?.expense ?? 0n;
  const net = data?.net ?? 0n;

  if (isLoading) {
    return (
      <>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 h-[88px] animate-pulse"
          />
        ))}
      </>
    );
  }

  return (
    <>
      <StatTile
        label="Income"
        value={income}
        icon={TrendingUp}
        accentColor="var(--color-success)"
        className="md:[grid-column:1/2] md:[grid-row:2/3]"
      />
      <StatTile
        label="Expense"
        value={expense}
        icon={TrendingDown}
        accentColor="var(--color-danger)"
        className="md:[grid-column:2/3] md:[grid-row:2/3]"
      />
      <StatTile
        label="Net"
        value={net}
        icon={Minus}
        accentColor={net >= 0n ? 'var(--color-success)' : 'var(--color-danger)'}
        className="md:[grid-column:3/4] md:[grid-row:2/3]"
      />
    </>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <QuickAddModal />
      </div>

      <BentoGrid>
        {/* Row 1 */}
        <NetWorthTile />
        <AccountsTile />

        {/* Row 2 */}
        <MonthStats />

        {/* Row 3 */}
        <TrendChartTile />
        <CategoryTile />
      </BentoGrid>
    </div>
  );
}
