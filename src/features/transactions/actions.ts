'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase/server';
import { fenSchema, isoDateSchema, optionalText } from '@/lib/validation';

const createSchema = z.object({
  account_id: z.string().uuid(),
  category_id: z.string().uuid(),
  type: z.enum(['income', 'expense']),
  amount_fen: fenSchema,
  occurred_at: isoDateSchema,
  note: optionalText(300),
  receipt_url: z.string().trim().url('Receipt URL must be valid').optional(),
});

export type TxActionResult = { ok: true; id?: string } | { ok: false; error: string };

export async function createTransactionAction(formData: FormData): Promise<TxActionResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const parsed = createSchema.safeParse({
    account_id: formData.get('account_id'),
    category_id: formData.get('category_id'),
    type: formData.get('type'),
    amount_fen: formData.get('amount_fen'),
    occurred_at: formData.get('occurred_at'),
    note: formData.get('note') || undefined,
    receipt_url: formData.get('receipt_url') || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid' };

  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      owner_id: userId,
      account_id: parsed.data.account_id,
      category_id: parsed.data.category_id,
      type: parsed.data.type,
      amount_fen: parsed.data.amount_fen,
      occurred_at: parsed.data.occurred_at,
      note: parsed.data.note ?? null,
      receipt_url: parsed.data.receipt_url ?? null,
      is_pending: false,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id };
}

export async function updateTransactionAction(
  id: string,
  formData: FormData,
): Promise<TxActionResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const parsed = createSchema.safeParse({
    account_id: formData.get('account_id'),
    category_id: formData.get('category_id'),
    type: formData.get('type'),
    amount_fen: formData.get('amount_fen'),
    occurred_at: formData.get('occurred_at'),
    note: formData.get('note') || undefined,
    receipt_url: formData.get('receipt_url') || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid' };

  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('transactions')
    .update({
      account_id: parsed.data.account_id,
      category_id: parsed.data.category_id,
      type: parsed.data.type,
      amount_fen: parsed.data.amount_fen,
      occurred_at: parsed.data.occurred_at,
      note: parsed.data.note ?? null,
      receipt_url: parsed.data.receipt_url ?? null,
    })
    .eq('id', id)
    .eq('owner_id', userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteTransactionAction(id: string): Promise<TxActionResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('transactions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('owner_id', userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
