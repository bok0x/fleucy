'use server';

import { auth } from '@clerk/nextjs/server';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { supabaseServer } from '@/lib/supabase/server';
import { colorHexSchema } from '@/lib/validation';

// Use a safe bigint-as-string schema that doesn't call BigInt() inside refine
// (avoids unhandled throws that escape safeParse in Zod v4)
const fenStringSchema = z.string().regex(/^\d+$/, 'Amount must be a non-negative integer');

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
  kind: z.enum(['cash', 'bank', 'mobile_wallet']),
  icon: z.string().trim().min(1).max(30).default('wallet'),
  color: colorHexSchema.default('#3b82f6'),
  opening_balance_fen: fenStringSchema.default('0'),
  low_balance_threshold_fen: fenStringSchema.nullable().default(null),
});

export type AccountActionResult = { ok: true } | { ok: false; error: string };

function parseFields(formData: FormData) {
  return createSchema.safeParse({
    name: formData.get('name'),
    kind: formData.get('kind'),
    icon: formData.get('icon') ?? 'wallet',
    color: formData.get('color') ?? '#3b82f6',
    opening_balance_fen: formData.get('opening_balance_fen') ?? '0',
    low_balance_threshold_fen: formData.get('low_balance_threshold_fen') || null,
  });
}

export async function createAccountAction(formData: FormData): Promise<AccountActionResult> {
  try {
    const { userId } = await auth();
    if (!userId) redirect('/sign-in');

    const parsed = parseFields(formData);
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
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return { ok: false, error: err instanceof Error ? err.message : 'Unexpected error' };
  }
}

export async function updateAccountAction(
  id: string,
  formData: FormData,
): Promise<AccountActionResult> {
  try {
    const { userId } = await auth();
    if (!userId) redirect('/sign-in');

    const parsed = parseFields(formData);
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
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return { ok: false, error: err instanceof Error ? err.message : 'Unexpected error' };
  }
}

export async function archiveAccountAction(id: string): Promise<AccountActionResult> {
  try {
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
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return { ok: false, error: err instanceof Error ? err.message : 'Unexpected error' };
  }
}

export async function deleteAccountAction(id: string): Promise<AccountActionResult> {
  try {
    const { userId } = await auth();
    if (!userId) redirect('/sign-in');

    const supabase = await supabaseServer();
    const { error } = await supabase.from('accounts').delete().eq('id', id).eq('owner_id', userId);
    if (error) {
      if (error.code === '23503')
        return {
          ok: false,
          error: 'Account has existing transactions and cannot be deleted. Archive it instead.',
        };
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return { ok: false, error: err instanceof Error ? err.message : 'Unexpected error' };
  }
}
