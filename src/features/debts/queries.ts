'use client';

import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/lib/supabase/browser';
import type { Debt } from './schemas';

export const DEBTS_KEY = ['debts'] as const;

export function useDebts(direction?: 'owed_to_me' | 'i_owe') {
  const supabase = useSupabase();
  return useQuery({
    queryKey: direction ? [...DEBTS_KEY, direction] : DEBTS_KEY,
    queryFn: async () => {
      let q = supabase
        .from('debts')
        .select('*, people(full_name, phone)')
        .in('status', ['open', 'partially_paid'])
        .order('created_at', { ascending: false });
      if (direction) q = q.eq('direction', direction);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Debt[];
    },
  });
}
