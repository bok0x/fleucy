'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { hashPin, isValidPin, setPinCookie, verifyPin } from '@/lib/auth/pin';
import { logSecurityEvent } from '@/lib/observability';
import { supabaseAdmin } from '@/lib/supabase/service-role';

export type SettingsResult = { ok: true } | { ok: false; error: string };

// ── PIN change ────────────────────────────────────────────────────────────────

const changePinSchema = z.object({
  currentPin: z.string(),
  newPin: z.string().refine(isValidPin, 'New PIN must be 4–6 digits'),
  confirmPin: z.string(),
});

export async function changePinAction(formData: FormData): Promise<SettingsResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const parsed = changePinSchema.safeParse({
    currentPin: formData.get('currentPin'),
    newPin: formData.get('newPin'),
    confirmPin: formData.get('confirmPin'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  if (parsed.data.newPin !== parsed.data.confirmPin) {
    return { ok: false, error: 'New PINs do not match' };
  }

  const admin = supabaseAdmin();
  const { data: row } = await admin
    .from('auth_pin')
    .select('pin_hash, locked_until')
    .eq('owner_id', userId)
    .maybeSingle();

  if (!row) return { ok: false, error: 'No PIN set' };
  if (row.locked_until && new Date(row.locked_until as string).getTime() > Date.now()) {
    return { ok: false, error: 'Account is locked. Try again later.' };
  }

  const currentOk = await verifyPin(parsed.data.currentPin, row.pin_hash as string);
  if (!currentOk) return { ok: false, error: 'Current PIN is incorrect' };

  const newHash = await hashPin(parsed.data.newPin);
  const { error } = await admin
    .from('auth_pin')
    .update({ pin_hash: newHash, failed_attempts: 0, locked_until: null })
    .eq('owner_id', userId);
  if (error) return { ok: false, error: error.message };
  logSecurityEvent({ event: 'pin_change', userId, outcome: 'success' });

  return { ok: true };
}

// ── Lock timer ────────────────────────────────────────────────────────────────

const lockTimerSchema = z.object({
  minutes: z.coerce.number().int().positive().max(1440),
});

export async function updateLockTimerAction(formData: FormData): Promise<SettingsResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const parsed = lockTimerSchema.safeParse({ minutes: formData.get('minutes') });
  if (!parsed.success) return { ok: false, error: 'Invalid value' };

  const admin = supabaseAdmin();
  const { error } = await admin
    .from('app_settings')
    .update({ pin_lock_minutes: parsed.data.minutes })
    .eq('owner_id', userId);
  if (error) return { ok: false, error: error.message };

  // Refresh the cookie TTL so it takes effect immediately
  await setPinCookie(userId, parsed.data.minutes);
  logSecurityEvent({
    event: 'pin_lock_timer_change',
    userId,
    outcome: 'success',
    detail: `${parsed.data.minutes}m`,
  });
  return { ok: true };
}

// ── App settings query ────────────────────────────────────────────────────────

export interface AppSettings {
  pin_lock_minutes: number;
  base_currency: string;
  theme: string;
}

export async function getAppSettingsAction(): Promise<AppSettings | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const admin = supabaseAdmin();
  const { data } = await admin
    .from('app_settings')
    .select('pin_lock_minutes, base_currency, theme')
    .eq('owner_id', userId)
    .maybeSingle();

  return data as AppSettings | null;
}

type ExportPayload = Record<string, unknown[]>;
export type ExportResult = { ok: true; payload: ExportPayload } | { ok: false; error: string };

async function selectAllByOwner(table: string, userId: string) {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase.from(table).select('*').eq('owner_id', userId);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function exportAllDataAction(): Promise<ExportResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  try {
    const payload: ExportPayload = {
      transactions: await selectAllByOwner('transactions', userId),
      accounts: await selectAllByOwner('accounts', userId),
      categories: await selectAllByOwner('categories', userId),
      people: await selectAllByOwner('people', userId),
      debts: await selectAllByOwner('debts', userId),
      debt_payments: await selectAllByOwner('debt_payments', userId),
      app_settings: await selectAllByOwner('app_settings', userId),
      exported_at: [{ value: new Date().toISOString() }],
    };
    logSecurityEvent({ event: 'full_data_export', userId, outcome: 'success' });
    return { ok: true, payload };
  } catch (error) {
    logSecurityEvent({ event: 'full_data_export', userId, outcome: 'failure' });
    return { ok: false, error: error instanceof Error ? error.message : 'Export failed' };
  }
}

export async function deleteAllDataAction(confirmText: string): Promise<SettingsResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  if (confirmText !== 'DELETE') return { ok: false, error: 'Type DELETE to confirm' };

  const supabase = supabaseAdmin();
  const tables = [
    'debt_payments',
    'debts',
    'transactions',
    'people',
    'accounts',
    'categories',
    'app_settings',
    'auth_pin',
  ] as const;

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq('owner_id', userId);
    if (error) return { ok: false, error: `Failed to delete ${table}: ${error.message}` };
  }

  const { clearPinCookie } = await import('@/lib/auth/pin');
  await clearPinCookie();
  logSecurityEvent({ event: 'full_data_delete', userId, outcome: 'success' });
  return { ok: true };
}
