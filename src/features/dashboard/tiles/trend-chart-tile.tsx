'use client';

import { Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useMonthlyTrend } from '@/features/dashboard/queries';
import { BentoTile } from './bento-grid';

export function TrendChartTile() {
  const { data, isLoading, isError, refetch } = useMonthlyTrend(6);

  const chartData = (data ?? []).map((r) => ({
    label: r.label,
    income: Number(r.income) / 100,
    expense: Number(r.expense) / 100,
  }));

  return (
    <BentoTile className="md:[grid-column:1/4] md:[grid-row:3/4]">
      <p className="mb-4 text-sm font-medium text-[var(--color-muted)]">
        Income vs Expense — last 6 months
      </p>

      {isError && (
        <button
          type="button"
          onClick={() => refetch()}
          className="text-xs underline text-[var(--color-muted)]"
        >
          Retry
        </button>
      )}

      {isLoading && <div className="h-48 animate-pulse rounded-lg bg-[var(--color-border)]" />}

      {!isLoading && !isError && (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `¥${v}`}
              width={55}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--color-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v: unknown) => [`¥${(v as number).toFixed(2)}`, '']}
              labelStyle={{ color: 'var(--color-fg)' }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, color: 'var(--color-muted)' }}
            />
            <Line
              type="monotone"
              dataKey="income"
              name="Income"
              stroke="var(--color-success)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="expense"
              name="Expense"
              stroke="var(--color-danger)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              strokeDasharray="4 2"
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </BentoTile>
  );
}
