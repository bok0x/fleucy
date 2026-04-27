'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { isValidPin, setPinCookie, verifyPin } from '@/lib/auth/pin';
import { supabaseAdmin } from '@/lib/supabase/service-role';

const inputSchema = z.object({ pin: z.string() });

export type VerifyResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'invalid_format' | 'no_pin_set' | 'wrong_pin' | 'locked';
      lockedUntilMs?: number;
      remaining?: number;
    };

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export async function verifyPinAction(formData: FormData): Promise<VerifyResult> {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const parsed = inputSchema.safeParse({ pin: formData.get('pin') });
  if (!parsed.success || !isValidPin(parsed.data.pin)) {
    return { ok: false, reason: 'invalid_format' };
  }

  const admin = supabaseAdmin();
  const { data: row, error } = await admin
    .from('auth_pin')
    .select('pin_hash, failed_attempts, locked_until')
    .eq('owner_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!row) return { ok: false, reason: 'no_pin_set' };

  const lockedUntilMs = row.locked_until ? new Date(row.locked_until as string).getTime() : 0;
  if (lockedUntilMs > Date.now()) {
    return { ok: false, reason: 'locked', lockedUntilMs };
  }

  const ok = await verifyPin(parsed.data.pin, row.pin_hash as string);
  if (!ok) {
    const newFailed = (row.failed_attempts as number) + 1;
    const shouldLock = newFailed >= MAX_ATTEMPTS;
    await admin
      .from('auth_pin')
      .update({
        failed_attempts: shouldLock ? 0 : newFailed,
        locked_until: shouldLock
          ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString()
          : null,
      })
      .eq('owner_id', userId);
    return shouldLock
      ? { ok: false, reason: 'locked', lockedUntilMs: Date.now() + LOCK_MINUTES * 60_000 }
      : { ok: false, reason: 'wrong_pin', remaining: MAX_ATTEMPTS - newFailed };
  }

  // success — reset attempts, get lock minutes, set cookie
  const { data: settings } = await admin
    .from('app_settings')
    .select('pin_lock_minutes')
    .eq('owner_id', userId)
    .single();
  await admin
    .from('auth_pin')
    .update({ failed_attempts: 0, locked_until: null })
    .eq('owner_id', userId);
  await setPinCookie(userId, (settings?.pin_lock_minutes as number | null) ?? 10);
  return { ok: true };
}

export async function lockNowAction(): Promise<void> {
  const { clearPinCookie } = await import('@/lib/auth/pin');
  await clearPinCookie();
  redirect('/lock');
}
