'use client';

import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/lib/supabase/browser';
import type { Subscription } from './schemas';

export const SUBSCRIPTIONS_KEY = ['subscriptions'] as const;

export function useSubscriptions() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: SUBSCRIPTIONS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recurring_rules')
        .select('*, accounts(name, kind, icon, color), categories(name, icon, color)')
        .eq('is_subscription', true)
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Subscription[];
    },
  });
}
