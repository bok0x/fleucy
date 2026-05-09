'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase/server';
import { optionalEmailSchema, optionalPhoneSchema, optionalText } from '@/lib/validation';

const schema = z.object({
  full_name: z.string().trim().min(1).max(100),
  phone: optionalPhoneSchema,
  email: optionalEmailSchema,
  relationship_tag: optionalText(30),
  notes: optionalText(500),
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

export async function deletePersonAction(id: string): Promise<PersonActionResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  const supabase = await supabaseServer();
  const { error } = await supabase.from('people').delete().eq('id', id).eq('owner_id', userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
