'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase/server';

const schema = z.object({
  full_name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().optional(),
  relationship_tag: z.string().optional(),
  notes: z.string().optional(),
});

export type PersonActionResult = { ok: true; id?: string } | { ok: false; error: string };

export async function createPersonAction(formData: FormData): Promise<PersonActionResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  const parsed = schema.safeParse({
    full_name: formData.get('full_name'),
    phone: formData.get('phone') || undefined,
    email: formData.get('email') || undefined,
    relationship_tag: formData.get('relationship_tag') || undefined,
    notes: formData.get('notes') || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid' };
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from('people')
    .insert({ owner_id: userId, ...parsed.data })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id };
}

export async function updatePersonAction(
  id: string,
  formData: FormData,
): Promise<PersonActionResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  const parsed = schema.safeParse({
    full_name: formData.get('full_name'),
    phone: formData.get('phone') || undefined,
    email: formData.get('email') || undefined,
    relationship_tag: formData.get('relationship_tag') || undefined,
    notes: formData.get('notes') || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid' };
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('people')
    .update(parsed.data)
    .eq('id', id)
    .eq('owner_id', userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
