'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase/server';
import { fenSchema, isoDateSchema, optionalText } from '@/lib/validation';

const debtSchema = z.object({
  person_id: z.string().uuid(),
  direction: z.enum(['owed_to_me', 'i_owe']),
  principal_fen: fenSchema,
  description: optionalText(300),
  due_date: isoDateSchema.optional(),
});

const paymentSchema = z.object({
  debt_id: z.string().uuid(),
  account_id: z.string().uuid(),
  amount_fen: fenSchema,
  paid_at: isoDateSchema,
  note: optionalText(300),
});

export type DebtActionResult = { ok: true; id?: string } | { ok: false; error: string };

export async function createDebtAction(formData: FormData): Promise<DebtActionResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  const parsed = debtSchema.safeParse({
    person_id: formData.get('person_id'),
    direction: formData.get('direction'),
    principal_fen: formData.get('principal_fen'),
    description: formData.get('description') || undefined,
    due_date: formData.get('due_date') || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid' };
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from('debts')
    .insert({ owner_id: userId, ...parsed.data, status: 'open' })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id };
}

export async function addPaymentAction(formData: FormData): Promise<DebtActionResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  const parsed = paymentSchema.safeParse({
    debt_id: formData.get('debt_id'),
    account_id: formData.get('account_id'),
    amount_fen: formData.get('amount_fen'),
    paid_at: formData.get('paid_at'),
    note: formData.get('note') || undefined,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid' };
  const supabase = await supabaseServer();

  const { error: payErr } = await supabase
    .from('debt_payments')
    .insert({ owner_id: userId, ...parsed.data });
  if (payErr) return { ok: false, error: payErr.message };

  // Recompute status from total payments vs principal
  const { data: payments } = await supabase
    .from('debt_payments')
    .select('amount_fen')
    .eq('debt_id', parsed.data.debt_id);
  const { data: debt } = await supabase
    .from('debts')
    .select('principal_fen')
    .eq('id', parsed.data.debt_id)
    .single();

  if (debt && payments) {
    const paid = payments.reduce((s, p) => s + BigInt(p.amount_fen), 0n);
    const principal = BigInt(debt.principal_fen);
    const status = paid >= principal ? 'settled' : paid > 0n ? 'partially_paid' : 'open';
    await supabase.from('debts').update({ status }).eq('id', parsed.data.debt_id);
  }

  return { ok: true };
}

export async function updateDebtStatusAction(
  id: string,
  status: 'settled' | 'written_off',
): Promise<DebtActionResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('debts')
    .update({ status })
    .eq('id', id)
    .eq('owner_id', userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
