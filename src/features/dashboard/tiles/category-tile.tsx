'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useExpenseByCategory } from '@/features/dashboard/queries';
import { formatRMB } from '@/lib/money';
import { BentoTile } from './bento-grid';

export function CategoryTile() {
  const { data, isLoading, isError, refetch } = useExpenseByCategory();

  const rows = data ?? [];
  const total = rows.reduce((s, r) => s + r.total, 0n);

  const chartData = rows.map((r) => ({
    name: r.name,
    value: Number(r.total),
    color: r.color,
    pct: total > 0n ? Number((r.total * 10000n) / total) / 100 : 0,
  }));

  return (
    <BentoTile className="md:[grid-column:4/5] md:[grid-row:3/4]">
      <p className="mb-3 text-sm font-medium text-[var(--color-muted)]">By category</p>

      {isError && (
        <button
          type="button"
          onClick={() => refetch()}
          className="text-xs underline text-[var(--color-muted)]"
        >
          Retry
        </button>
      )}

      {isLoading && <div className="h-40 animate-pulse rounded-lg bg-[var(--color-border)]" />}

      {!isLoading && !isError && total === 0n && (
        <p className="text-xs text-[var(--color-muted)]">No expense data yet.</p>
      )}

      {!isLoading && !isError && total > 0n && (
        <>
          <ResponsiveContainer width="100%" height={120}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={55}
                dataKey="value"
                strokeWidth={0}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 8,
                  fontSize: 11,
                }}
                formatter={(v: unknown) => [formatRMB(BigInt(v as number)), '']}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="mt-2 space-y-1.5">
            {chartData.slice(0, 4).map((r) => (
              <div key={r.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span
                    className="size-2 rounded-full flex-shrink-0"
                    style={{ background: r.color }}
                  />
                  <span className="truncate max-w-[90px] text-[var(--color-fg)]">{r.name}</span>
                </div>
                <span className="tabular-nums text-[var(--color-muted)]">{r.pct.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </>
      )}
    </BentoTile>
  );
}
