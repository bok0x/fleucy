import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { supabaseAdmin } from '@/lib/supabase/service-role';
import { Keypad } from './keypad';

export default async function LockPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const admin = supabaseAdmin();
  const { data: pin } = await admin
    .from('auth_pin')
    .select('owner_id')
    .eq('owner_id', userId)
    .maybeSingle();
  if (!pin) redirect('/setup');

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)]">
      <Suspense
        fallback={<div className="p-6 text-center text-sm text-[var(--color-muted)]">Loading…</div>}
      >
        <Keypad />
      </Suspense>
    </div>
  );
}
