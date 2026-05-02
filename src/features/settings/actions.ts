'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { hashPin, isValidPin, setPinCookie, verifyPin } from '@/lib/auth/pin';
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
