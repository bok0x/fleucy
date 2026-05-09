'use client';

import { useSession } from '@clerk/nextjs';
import { createClient } from '@supabase/supabase-js';
import { Download, KeyRound, Lock, Monitor, Moon, Sun, Timer } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import Papa from 'papaparse';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { lockNowAction } from '@/app/(auth)/lock/actions';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  changePinAction,
  deleteAllDataAction,
  exportAllDataAction,
  updateLockTimerAction,
} from '@/features/settings/actions';
import { clientEnv } from '@/lib/env';
import { fenToDisplay } from '@/lib/money';

const LOCK_OPTIONS = [
  { value: '5', label: '5 minutes' },
  { value: '10', label: '10 minutes' },
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '60', label: '1 hour' },
];

interface Props {
  initialLockMinutes: number;
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-6 space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
        {title}
      </h2>
      {children}
    </div>
  );
}

export function SettingsClient({ initialLockMinutes }: Props) {
  const env = clientEnv();
  const { theme, setTheme } = useTheme();
  const { session } = useSession();
  const [pinPending, startPin] = useTransition();
  const [timerPending, startTimer] = useTransition();
  const [exportPending, startExport] = useTransition();
  const [fullExportPending, startFullExport] = useTransition();
  const [deletePending, startDelete] = useTransition();
  const [lockPending, startLock] = useTransition();

  function handleChangePinSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    startPin(async () => {
      const result = await changePinAction(new FormData(form));
      if (result.ok) {
        toast.success('PIN updated');
        form.reset();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleLockTimerSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTimer(async () => {
      const result = await updateLockTimerAction(new FormData(e.currentTarget));
      if (result.ok) toast.success('Lock timer updated');
      else toast.error(result.error);
    });
  }

  function handleExport() {
    startExport(async () => {
      try {
        const token = (await session?.getToken({ template: 'supabase' })) ?? '';
        const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
          global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        });

        const { data, error } = await sb
          .from('transactions')
          .select('occurred_at, type, amount_fen, note, accounts(name), categories(name)')
          .is('deleted_at', null)
          .order('occurred_at', { ascending: false });

        if (error) throw error;

        const rows = (data ?? []).map((tx) => ({
          Date: tx.occurred_at?.slice(0, 10) ?? '',
          Type: tx.type,
          Amount: fenToDisplay(BigInt(tx.amount_fen as string)),
          Account: (tx.accounts as unknown as { name: string } | null)?.name ?? '',
          Category: (tx.categories as unknown as { name: string } | null)?.name ?? '',
          Note: tx.note ?? '',
        }));

        const csv = Papa.unparse(rows);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fleucy-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('CSV downloaded');
      } catch {
        toast.error('Export failed');
      }
    });
  }

  function handleFullExport() {
    startFullExport(async () => {
      const result = await exportAllDataAction();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const blob = new Blob([JSON.stringify(result.payload, null, 2)], {
        type: 'application/json;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fleucy-full-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Full data export downloaded');
    });
  }

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-semibold">Settings</h1>

      {/* Appearance */}
      <SectionCard title="Appearance">
        <div className="flex items-center gap-2">
          <Button
            variant={theme === 'light' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTheme('light')}
          >
            <Sun className="size-4" /> Light
          </Button>
          <Button
            variant={theme === 'dark' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTheme('dark')}
          >
            <Moon className="size-4" /> Dark
          </Button>
          <Button
            variant={theme === 'system' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTheme('system')}
          >
            <Monitor className="size-4" /> System
          </Button>
        </div>
      </SectionCard>

      {/* Security – change PIN */}
      <SectionCard title="Security">
        <form onSubmit={handleChangePinSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="currentPin">Current PIN</Label>
            <Input
              id="currentPin"
              name="currentPin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              autoComplete="current-password"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="newPin">New PIN (4–6 digits)</Label>
            <Input
              id="newPin"
              name="newPin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              autoComplete="new-password"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirmPin">Confirm new PIN</Label>
            <Input
              id="confirmPin"
              name="confirmPin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              autoComplete="new-password"
              required
            />
          </div>
          <Button type="submit" disabled={pinPending} className="w-full">
            <KeyRound className="size-4" />
            {pinPending ? 'Updating…' : 'Update PIN'}
          </Button>
        </form>
      </SectionCard>

      {/* Session – lock timer */}
      <SectionCard title="Session">
        <form onSubmit={handleLockTimerSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="minutes">Auto-lock after</Label>
            <Select name="minutes" defaultValue={String(initialLockMinutes)}>
              <SelectTrigger id="minutes">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOCK_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" variant="outline" disabled={timerPending} className="w-full">
            <Timer className="size-4" />
            {timerPending ? 'Saving…' : 'Save'}
          </Button>
        </form>
        <div className="pt-2 border-t border-[var(--color-border)]">
          <Button
            variant="destructive"
            className="w-full"
            disabled={lockPending}
            onClick={() => startLock(() => lockNowAction())}
          >
            <Lock className="size-4" />
            Lock now
          </Button>
        </div>
      </SectionCard>

      {/* Data export */}
      <SectionCard title="Data">
        <p className="text-sm text-[var(--color-muted)]">
          Export all your transactions as a CSV file.
        </p>
        <Button
          variant="outline"
          disabled={exportPending}
          onClick={handleExport}
          className="w-full"
        >
          <Download className="size-4" />
          {exportPending ? 'Exporting…' : 'Export transactions CSV'}
        </Button>
        <Button
          variant="outline"
          disabled={fullExportPending}
          onClick={handleFullExport}
          className="w-full"
        >
          <Download className="size-4" />
          {fullExportPending ? 'Exporting…' : 'Export full account data (JSON)'}
        </Button>
      </SectionCard>

      <SectionCard title="Trust & Legal">
        <div className="space-y-2 text-sm">
          <p className="text-[var(--color-muted)]">
            Fleucy stores your data under your account and supports full export/deletion controls.
          </p>
          <div className="flex gap-2">
            <Button asChild variant="outline" className="flex-1">
              <Link href="/privacy">Privacy Policy</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/terms">Terms of Service</Link>
            </Button>
          </div>
          <Button asChild variant="outline" className="w-full">
            <Link href="/support">Contact Support</Link>
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Danger Zone">
        <p className="text-sm text-[var(--color-muted)]">
          Permanently delete all your Fleucy data. This cannot be undone.
        </p>
        <ConfirmDialog
          title="Delete all account data"
          description='To confirm deletion, type "DELETE" in the prompt.'
          confirmLabel={deletePending ? 'Deleting…' : 'Delete all data'}
          variant="destructive"
          disabled={deletePending}
          onConfirm={async () => {
            const confirmText = window.prompt('Type DELETE to confirm permanent deletion') ?? '';
            startDelete(async () => {
              const result = await deleteAllDataAction(confirmText);
              if (result.ok) {
                toast.success('All data deleted');
                window.location.href = '/setup';
              } else {
                toast.error(result.error);
              }
            });
          }}
          trigger={
            <Button variant="destructive" className="w-full" disabled={deletePending}>
              Delete all account data
            </Button>
          }
        />
      </SectionCard>
    </div>
  );
}
