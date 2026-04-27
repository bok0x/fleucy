'use client';

import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/lib/supabase/browser';
import type { Category } from './schemas';

export const CATEGORIES_KEY = ['categories'] as const;

export function useCategories(type?: 'income' | 'expense') {
  const supabase = useSupabase();
  return useQuery({
    queryKey: type ? [...CATEGORIES_KEY, type] : CATEGORIES_KEY,
    queryFn: async () => {
      let q = supabase.from('categories').select('*').order('sort_order');
      if (type) q = q.eq('type', type);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });
}
