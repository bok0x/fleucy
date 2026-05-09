'use client';

import { useQuery } from '@tanstack/react-query';
import { dayjs, endOfMonthIso, startOfMonthIso } from '@/lib/date';
import { useSupabase } from '@/lib/supabase/browser';

export function useNetWorth() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ['net-worth'],
    queryFn: async () => {
      const { data, error } = await supabase.from('v_account_balances').select('balance_fen');
      if (error) throw error;
      return (data ?? []).reduce((s, r) => s + BigInt(r.balance_fen), 0n);
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

export function useExpenseByCategory() {
  const supabase = useSupabase();
  const from = startOfMonthIso();
  const to = endOfMonthIso();

  return useQuery({
    queryKey: ['expense-by-category', from],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('amount_fen, categories(name, color)')
        .is('deleted_at', null)
        .eq('is_pending', false)
        .eq('type', 'expense')
        .gte('occurred_at', from)
        .lte('occurred_at', `${to}T23:59:59Z`);
      if (error) throw error;

      const map = new Map<string, { name: string; color: string; total: bigint }>();
      for (const row of data ?? []) {
        const cat = row.categories as { name?: string; color?: string } | null;
        const name = cat?.name ?? 'Uncategorized';
        const color = cat?.color ?? '#6b7280';
        const existing = map.get(name);
        const amount = BigInt(row.amount_fen);
        if (existing) existing.total += amount;
        else map.set(name, { name, color, total: amount });
      }
      return Array.from(map.values()).sort((a, b) => (a.total > b.total ? -1 : 1));
    },
  });
}

export function useMonthlyTrend(months = 6) {
  const supabase = useSupabase();
  const start = dayjs()
    .startOf('month')
    .subtract(months - 1, 'month')
    .format('YYYY-MM-DD');

  return useQuery({
    queryKey: ['monthly-trend', months, start],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('type, amount_fen, occurred_at')
        .is('deleted_at', null)
        .eq('is_pending', false)
        .gte('occurred_at', start)
        .order('occurred_at', { ascending: true });
      if (error) throw error;

      const bucket = new Map<string, { label: string; income: bigint; expense: bigint }>();
      for (let i = 0; i < months; i++) {
        const d = dayjs()
          .startOf('month')
          .subtract(months - 1 - i, 'month');
        const key = d.format('YYYY-MM');
        bucket.set(key, { label: d.format('MMM'), income: 0n, expense: 0n });
      }

      for (const row of data ?? []) {
        const key = dayjs(row.occurred_at).format('YYYY-MM');
        const b = bucket.get(key);
        if (!b) continue;
        if (row.type === 'income') b.income += BigInt(row.amount_fen);
        else b.expense += BigInt(row.amount_fen);
      }

      return Array.from(bucket.values());
    },
  });
}

export function useSubscriptionSummary() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ['subscription-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recurring_rules')
        .select('amount_fen, cadence')
        .eq('is_subscription', true)
        .eq('is_active', true);
      if (error) throw error;

      let monthlyTotal = 0n;
      let count = 0;
      for (const row of data ?? []) {
        const fen = BigInt(row.amount_fen);
        monthlyTotal += row.cadence === 'yearly' ? fen / 12n : fen;
        count++;
      }
      return { monthlyTotal, count };
    },
  });
}
