'use client';

import { useQuery } from '@tanstack/react-query';
import { endOfMonthIso, startOfMonthIso } from '@/lib/date';
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
