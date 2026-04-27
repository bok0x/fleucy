'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase/server';

const schema = z.object({
  type: z.enum(['income', 'expense']),
  name: z.string().min(1),
  icon: z.string().default('circle'),
  color: z.string().default('#6b7280'),
});

export type CatActionResult = { ok: true } | { ok: false; error: string };

export async function createCategoryAction(formData: FormData): Promise<CatActionResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const parsed = schema.safeParse({
    type: formData.get('type'),
    name: formData.get('name'),
    icon: formData.get('icon') ?? 'circle',
    color: formData.get('color') ?? '#6b7280',
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid' };

  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('categories')
    .insert({ owner_id: userId, ...parsed.data, is_system: false });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateCategoryAction(
  id: string,
  formData: FormData,
): Promise<CatActionResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const parsed = schema.safeParse({
    type: formData.get('type'),
    name: formData.get('name'),
    icon: formData.get('icon') ?? 'circle',
    color: formData.get('color') ?? '#6b7280',
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid' };

  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('categories')
    .update({ name: parsed.data.name, icon: parsed.data.icon, color: parsed.data.color })
    .eq('id', id)
    .eq('owner_id', userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
