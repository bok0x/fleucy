'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { hashPin, isValidPin, setPinCookie } from '@/lib/auth/pin';
import { supabaseAdmin } from '@/lib/supabase/service-role';

const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Food', icon: 'utensils', color: '#f97316' },
  { name: 'Transport', icon: 'car', color: '#0ea5e9' },
  { name: 'Shopping', icon: 'shopping-bag', color: '#a855f7' },
  { name: 'Subscriptions', icon: 'repeat', color: '#14b8a6' },
  { name: 'Bills', icon: 'receipt', color: '#64748b' },
  { name: 'Entertainment', icon: 'film', color: '#ec4899' },
  { name: 'Health', icon: 'heart-pulse', color: '#ef4444' },
  { name: 'Education', icon: 'book-open', color: '#22c55e' },
  { name: 'Loans Out', icon: 'arrow-up-right', color: '#f59e0b' },
  { name: 'Other', icon: 'circle', color: '#6b7280' },
];

const DEFAULT_INCOME_CATEGORIES = [
  { name: 'Salary', icon: 'briefcase', color: '#16a34a' },
  { name: 'Side Income', icon: 'sparkles', color: '#0891b2' },
  { name: 'Loans In', icon: 'arrow-down-left', color: '#f59e0b' },
  { name: 'Gift', icon: 'gift', color: '#db2777' },
  { name: 'Refund', icon: 'undo-2', color: '#7c3aed' },
  { name: 'Other', icon: 'circle', color: '#6b7280' },
];

const pinInput = z.object({
  pin: z.string().refine(isValidPin, 'PIN must be 4–6 digits'),
  confirm: z.string(),
});

export type SetPinResult = { ok: true } | { ok: false; error: string };

export async function setPinAction(formData: FormData): Promise<SetPinResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const parsed = pinInput.safeParse({
    pin: formData.get('pin'),
    confirm: formData.get('confirm'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid PIN' };
  }
  if (parsed.data.pin !== parsed.data.confirm) {
    return { ok: false, error: 'PINs do not match' };
  }

  const pinHash = await hashPin(parsed.data.pin);
  const admin = supabaseAdmin();

  const { error: pinErr } = await admin
    .from('auth_pin')
    .upsert({ owner_id: userId, pin_hash: pinHash, failed_attempts: 0, locked_until: null });
  if (pinErr) return { ok: false, error: pinErr.message };

  const { error: settingsErr } = await admin.from('app_settings').upsert({
    owner_id: userId,
    base_currency: 'CNY',
    theme: 'system',
    pin_lock_minutes: 10,
    reminder_days_before_due: 3,
  });
  if (settingsErr) return { ok: false, error: settingsErr.message };

  // Seed default categories if none exist for this user
  const { count } = await admin
    .from('categories')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', userId);

  if ((count ?? 0) === 0) {
    const rows = [
      ...DEFAULT_EXPENSE_CATEGORIES.map((c, i) => ({
        owner_id: userId,
        type: 'expense' as const,
        is_system: true,
        sort_order: i,
        name: c.name,
        icon: c.icon,
        color: c.color,
      })),
      ...DEFAULT_INCOME_CATEGORIES.map((c, i) => ({
        owner_id: userId,
        type: 'income' as const,
        is_system: true,
        sort_order: i,
        name: c.name,
        icon: c.icon,
        color: c.color,
      })),
    ];
    const { error: catErr } = await admin.from('categories').insert(rows);
    if (catErr) return { ok: false, error: catErr.message };
  }

  return { ok: true };
}

const telegramInput = z.object({
  enabled: z.string().optional(),
  chatId: z.string().optional(),
});

export async function setTelegramAction(formData: FormData): Promise<void> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const parsed = telegramInput.parse({
    enabled: formData.get('enabled') ?? undefined,
    chatId: formData.get('chatId') ?? undefined,
  });
  const enabled = parsed.enabled === 'on';
  const chatId = enabled ? parsed.chatId?.trim() || null : null;

  const admin = supabaseAdmin();
  await admin
    .from('app_settings')
    .update({ telegram_enabled: enabled, telegram_chat_id: chatId })
    .eq('owner_id', userId);
}

export async function completeSetupAction(): Promise<void> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const admin = supabaseAdmin();
  await admin
    .from('app_settings')
    .update({ setup_completed_at: new Date().toISOString() })
    .eq('owner_id', userId);

  // Set the PIN cookie so user lands directly on dashboard
  const { data: settings } = await admin
    .from('app_settings')
    .select('pin_lock_minutes')
    .eq('owner_id', userId)
    .single();
  await setPinCookie(userId, (settings?.pin_lock_minutes as number | null) ?? 10);
  redirect('/dashboard');
}
