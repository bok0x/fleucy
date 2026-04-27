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
