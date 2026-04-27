'use client';

import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/lib/supabase/browser';
import type { Account, AccountBalance } from './schemas';

export const ACCOUNTS_KEY = ['accounts'] as const;
export const ACCOUNT_BALANCES_KEY = ['account-balances'] as const;

export function useAccounts() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ACCOUNTS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('is_archived', false)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as Account[];
    },
  });
}

export function useAccountBalances() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: ACCOUNT_BALANCES_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.from('v_account_balances').select('*').order('name');
      if (error) throw error;
      return (data ?? []) as AccountBalance[];
    },
  });
}
