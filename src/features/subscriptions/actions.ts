'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { subscriptionSchema } from './schemas';

export type SubActionResult = { ok: true; id?: string } | { ok: false; error: string };

function parseFormData(formData: FormData) {
  return subscriptionSchema.safeParse({
    name: formData.get('name'),
    amount_fen: formData.get('amount_fen'),
    cadence: formData.get('cadence'),
    day_of_month: formData.get('day_of_month'),
    account_id: formData.get('account_id'),
    category_id: formData.get('category_id') || undefined,
    start_date: formData.get('start_date'),
    end_date: formData.get('end_date') || undefined,
    website_url: formData.get('website_url') || undefined,
    subscription_notes: formData.get('subscription_notes') || undefined,
    service_type: formData.get('service_type') || undefined,
  });
}

export async function createSubscriptionAction(formData: FormData): Promise<SubActionResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const parsed = parseFormData(formData);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid' };

  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from('recurring_rules')
    .insert({
      owner_id: userId,
      name: parsed.data.name,
      type: 'expense',
      amount_fen: parsed.data.amount_fen,
      cadence: parsed.data.cadence,
      day_of_month: parsed.data.day_of_month,
      account_id: parsed.data.account_id,
      category_id: parsed.data.category_id ?? null,
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date ?? null,
      is_active: true,
      is_subscription: true,
      website_url: parsed.data.website_url || null,
      subscription_notes: parsed.data.subscription_notes ?? null,
      service_type: parsed.data.service_type ?? null,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath('/subscriptions');
  revalidatePath('/dashboard');
  return { ok: true, id: data.id };
}

export async function updateSubscriptionAction(
  id: string,
  formData: FormData,
): Promise<SubActionResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const parsed = parseFormData(formData);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid' };

  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('recurring_rules')
    .update({
      name: parsed.data.name,
      amount_fen: parsed.data.amount_fen,
      cadence: parsed.data.cadence,
      day_of_month: parsed.data.day_of_month,
      account_id: parsed.data.account_id,
      category_id: parsed.data.category_id ?? null,
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date ?? null,
      website_url: parsed.data.website_url || null,
      subscription_notes: parsed.data.subscription_notes ?? null,
      service_type: parsed.data.service_type ?? null,
    })
    .eq('id', id)
    .eq('owner_id', userId)
    .eq('is_subscription', true);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/subscriptions');
  revalidatePath('/dashboard');
  return { ok: true };
}

export async function toggleSubscriptionAction(
  id: string,
  isActive: boolean,
): Promise<SubActionResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('recurring_rules')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('owner_id', userId)
    .eq('is_subscription', true);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/subscriptions');
  revalidatePath('/dashboard');
  return { ok: true };
}

export async function deleteSubscriptionAction(id: string): Promise<SubActionResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('recurring_rules')
    .delete()
    .eq('id', id)
    .eq('owner_id', userId)
    .eq('is_subscription', true);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/subscriptions');
  revalidatePath('/dashboard');
  return { ok: true };
}
