'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase/server';
import { colorHexSchema, fenSchema } from '@/lib/validation';

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
  kind: z.enum(['cash', 'bank', 'mobile_wallet']),
  icon: z.string().trim().min(1).max(30).default('wallet'),
  color: colorHexSchema.default('#3b82f6'),
  opening_balance_fen: fenSchema.default('0'),
  low_balance_threshold_fen: fenSchema.nullable().default(null),
});

export type AccountActionResult = { ok: true } | { ok: false; error: string };

export async function createAccountAction(formData: FormData): Promise<AccountActionResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const parsed = createSchema.safeParse({
    name: formData.get('name'),
    kind: formData.get('kind'),
    icon: formData.get('icon') ?? 'wallet',
    color: formData.get('color') ?? '#3b82f6',
    opening_balance_fen: formData.get('opening_balance_fen') ?? '0',
    low_balance_threshold_fen: formData.get('low_balance_threshold_fen') || null,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid' };

  const supabase = await supabaseServer();
  const { error } = await supabase.from('accounts').insert({
    owner_id: userId,
    name: parsed.data.name,
    kind: parsed.data.kind,
    icon: parsed.data.icon,
    color: parsed.data.color,
    opening_balance_fen: parsed.data.opening_balance_fen,
    low_balance_threshold_fen: parsed.data.low_balance_threshold_fen,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateAccountAction(
  id: string,
  formData: FormData,
): Promise<AccountActionResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const parsed = createSchema.safeParse({
    name: formData.get('name'),
    kind: formData.get('kind'),
    icon: formData.get('icon') ?? 'wallet',
    color: formData.get('color') ?? '#3b82f6',
    opening_balance_fen: formData.get('opening_balance_fen') ?? '0',
    low_balance_threshold_fen: formData.get('low_balance_threshold_fen') || null,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid' };

  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('accounts')
    .update({
      name: parsed.data.name,
      kind: parsed.data.kind,
      icon: parsed.data.icon,
      color: parsed.data.color,
      opening_balance_fen: parsed.data.opening_balance_fen,
      low_balance_threshold_fen: parsed.data.low_balance_threshold_fen,
    })
    .eq('id', id)
    .eq('owner_id', userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function archiveAccountAction(id: string): Promise<AccountActionResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('accounts')
    .update({ is_archived: true })
    .eq('id', id)
    .eq('owner_id', userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
