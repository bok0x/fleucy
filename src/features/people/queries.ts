'use client';

import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@/lib/supabase/browser';
import type { Person } from './schemas';

export const PEOPLE_KEY = ['people'] as const;

export function usePeople() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: PEOPLE_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.from('people').select('*').order('full_name');
      if (error) throw error;
      return (data ?? []) as Person[];
    },
  });
}
