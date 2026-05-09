'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Edit2, Globe, Pause, Play, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { AmountInput } from '@/components/feature/amount-input';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAccounts } from '@/features/accounts/queries';
import { useCategories } from '@/features/categories/queries';
import {
  createSubscriptionAction,
  deleteSubscriptionAction,
  toggleSubscriptionAction,
  updateSubscriptionAction,
} from '@/features/subscriptions/actions';
import { SUBSCRIPTIONS_KEY, useSubscriptions } from '@/features/subscriptions/queries';
import { SERVICE_TYPES, type Subscription } from '@/features/subscriptions/schemas';
import { formatRMB } from '@/lib/money';

const SERVICE_TYPE_LABELS: Record<string, string> = {
  streaming: 'Streaming',
  internet: 'Internet',
  software: 'Software',
  music: 'Music',
  vpn: 'VPN',
  other: 'Other',
};

const DAY_OPTIONS = Array.from({ length: 28 }, (_, i) => i + 1);

// Normalize to monthly amount for display (yearly ÷ 12)
function toMonthlyFen(sub: Subscription): bigint {
  const fen = BigInt(sub.amount_fen);
  return sub.cadence === 'yearly' ? fen / 12n : fen;
}

interface SubscriptionFormProps {
  defaultValues?: Subscription;
  onSuccess: () => void;
}

function SubscriptionForm({ defaultValues, onSuccess }: SubscriptionFormProps) {
  const queryClient = useQueryClient();
  const isEdit = !!defaultValues;

  const defaultFen = defaultValues ? BigInt(defaultValues.amount_fen) : 0n;
  const [amountFen, setAmountFen] = useState<bigint>(defaultFen);

  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories('expense');

  const { mutate, isPending } = useMutation({
    mutationFn: async (fd: FormData) => {
      const result = isEdit
        ? await updateSubscriptionAction(defaultValues.id, fd)
        : await createSubscriptionAction(fd);
      if (!result.ok) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ['subscription-summary'] });
      toast.success(isEdit ? 'Subscription updated' : 'Subscription added');
      onSuccess();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (amountFen <= 0n) {
      toast.error('Amount must be greater than 0');
      return;
    }
    const fd = new FormData(e.currentTarget);
    fd.set('amount_fen', amountFen.toString());
    mutate(fd);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div className="space-y-1">
        <Label htmlFor="sub-name">Service name</Label>
        <Input
          id="sub-name"
          name="name"
          placeholder="e.g. Spotify"
          defaultValue={defaultValues?.name}
          required
        />
      </div>

      {/* Amount */}
      <div className="space-y-1">
        <Label>Amount</Label>
        <AmountInput value={amountFen} onChange={setAmountFen} />
      </div>

      {/* Cadence */}
      <div className="space-y-1">
        <Label htmlFor="sub-cadence">Billing cycle</Label>
        <Select name="cadence" defaultValue={defaultValues?.cadence ?? 'monthly'} required>
          <SelectTrigger id="sub-cadence">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Billing day */}
      <div className="space-y-1">
        <Label htmlFor="sub-day">Billing day of month</Label>
        <Select
          name="day_of_month"
          defaultValue={String(defaultValues?.day_of_month ?? 1)}
          required
        >
          <SelectTrigger id="sub-day">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DAY_OPTIONS.map((d) => (
              <SelectItem key={d} value={String(d)}>
                Day {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Payment account */}
      <div className="space-y-1">
        <Label htmlFor="sub-account">Payment account</Label>
        <Select name="account_id" defaultValue={defaultValues?.account_id} required>
          <SelectTrigger id="sub-account">
            <SelectValue placeholder="Pick account" />
          </SelectTrigger>
          <SelectContent>
            {(accounts ?? []).map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Service type */}
      <div className="space-y-1">
        <Label htmlFor="sub-type">Type (optional)</Label>
        <Select name="service_type" defaultValue={defaultValues?.service_type ?? ''}>
          <SelectTrigger id="sub-type">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {SERVICE_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {SERVICE_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Category */}
      <div className="space-y-1">
        <Label htmlFor="sub-cat">Category (optional)</Label>
        <Select name="category_id" defaultValue={defaultValues?.category_id ?? ''}>
          <SelectTrigger id="sub-cat">
            <SelectValue placeholder="No category" />
          </SelectTrigger>
          <SelectContent>
            {(categories ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Start date */}
      <div className="space-y-1">
        <Label htmlFor="sub-start">Start date</Label>
        <Input
          id="sub-start"
          name="start_date"
          type="date"
          defaultValue={defaultValues?.start_date ?? new Date().toISOString().split('T')[0]}
          required
        />
      </div>

      {/* Website URL */}
      <div className="space-y-1">
        <Label htmlFor="sub-url">Website (optional)</Label>
        <Input
          id="sub-url"
          name="website_url"
          type="url"
          placeholder="https://spotify.com"
          defaultValue={defaultValues?.website_url ?? ''}
        />
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <Label htmlFor="sub-notes">Notes (optional)</Label>
        <Input
          id="sub-notes"
          name="subscription_notes"
          placeholder="e.g. Family plan"
          defaultValue={defaultValues?.subscription_notes ?? ''}
        />
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Saving…' : isEdit ? 'Update subscription' : 'Add subscription'}
      </Button>
    </form>
  );
}

interface SubscriptionCardProps {
  sub: Subscription;
}

function SubscriptionCard({ sub }: SubscriptionCardProps) {
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const { mutate: toggle, isPending: toggling } = useMutation({
    mutationFn: () => toggleSubscriptionAction(sub.id, !sub.is_active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ['subscription-summary'] });
      toast.success(sub.is_active ? 'Subscription paused' : 'Subscription resumed');
    },
    onError: (e) => toast.error(e.message),
  });

  const { mutateAsync: removeAsync, isPending: removing } = useMutation({
    mutationFn: () => deleteSubscriptionAction(sub.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUBSCRIPTIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ['subscription-summary'] });
      toast.success('Subscription deleted');
    },
    onError: (e) => toast.error(e.message),
  });

  const monthlyFen = toMonthlyFen(sub);
  const amountLabel =
    sub.cadence === 'yearly'
      ? `${formatRMB(BigInt(sub.amount_fen))}/yr`
      : `${formatRMB(monthlyFen)}/mo`;

  return (
    <div
      className="flex items-center gap-4 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-4"
      style={{ opacity: sub.is_active ? 1 : 0.6 }}
    >
      {/* Icon */}
      <div
        className="flex size-10 flex-shrink-0 items-center justify-center rounded-lg"
        style={{ background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)' }}
      >
        <CreditCard className="size-5" style={{ color: 'var(--color-primary)' }} />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium">{sub.name}</p>
          {sub.service_type && (
            <span
              className="rounded px-1.5 py-0.5 text-xs"
              style={{
                background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
                color: 'var(--color-primary)',
              }}
            >
              {SERVICE_TYPE_LABELS[sub.service_type] ?? sub.service_type}
            </span>
          )}
        </div>
        <p className="text-sm text-[var(--color-muted)]">
          {amountLabel} · Day {sub.day_of_month}
          {sub.accounts ? ` · ${sub.accounts.name}` : ''}
        </p>
      </div>

      {/* Status badge */}
      <span
        className="flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
        style={{
          background: sub.is_active
            ? 'color-mix(in srgb, var(--color-success) 12%, transparent)'
            : 'color-mix(in srgb, var(--color-muted) 12%, transparent)',
          color: sub.is_active ? 'var(--color-success)' : 'var(--color-muted)',
        }}
      >
        {sub.is_active ? 'Active' : 'Paused'}
      </span>

      {/* Actions */}
      <div className="flex flex-shrink-0 items-center gap-1">
        {sub.website_url && (
          <Button size="icon" variant="ghost" className="size-8" asChild>
            <a href={sub.website_url} target="_blank" rel="noopener noreferrer">
              <Globe className="size-4" />
            </a>
          </Button>
        )}

        <Button
          size="icon"
          variant="ghost"
          className="size-8"
          onClick={() => toggle()}
          disabled={toggling}
          title={sub.is_active ? 'Pause' : 'Resume'}
        >
          {sub.is_active ? <Pause className="size-4" /> : <Play className="size-4" />}
        </Button>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild>
            <Button size="icon" variant="ghost" className="size-8" title="Edit">
              <Edit2 className="size-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit subscription</DialogTitle>
            </DialogHeader>
            <SubscriptionForm defaultValues={sub} onSuccess={() => setEditOpen(false)} />
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          trigger={
            <Button
              size="icon"
              variant="ghost"
              className="size-8 text-[var(--color-danger)]"
              title="Delete"
              disabled={removing}
            >
              <Trash2 className="size-4" />
            </Button>
          }
          title="Delete subscription?"
          description={`This will permanently remove "${sub.name}". Future transactions will not be generated.`}
          onConfirm={async () => {
            await removeAsync();
          }}
        />
      </div>
    </div>
  );
}

export default function SubscriptionsPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const { data: subscriptions, isLoading } = useSubscriptions();

  const active = (subscriptions ?? []).filter((s) => s.is_active);

  // Monthly total: monthly subs + yearly subs normalized to monthly
  const monthlyTotal = active.reduce((sum, s) => sum + toMonthlyFen(s), 0n);
  // Yearly total: calculate directly from raw amounts to preserve precision
  const yearlyTotal = active.reduce((sum, s) => {
    const fen = BigInt(s.amount_fen);
    return sum + (s.cadence === 'yearly' ? fen : fen * 12n);
  }, 0n);

  const filtered =
    filter === 'all'
      ? (subscriptions ?? [])
      : (subscriptions ?? []).filter((s) => s.service_type === filter);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Subscriptions</h1>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 size-4" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add subscription</DialogTitle>
            </DialogHeader>
            <SubscriptionForm onSuccess={() => setAddOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Monthly', value: formatRMB(monthlyTotal) },
          { label: 'Yearly', value: formatRMB(yearlyTotal) },
          { label: 'Active', value: String(active.length) },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-3 text-center"
          >
            <p className="text-xs text-[var(--color-muted)]">{label}</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {['all', ...SERVICE_TYPES].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFilter(t)}
            className="flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors"
            style={{
              background:
                filter === t
                  ? 'color-mix(in srgb, var(--color-primary) 15%, transparent)'
                  : 'var(--color-card)',
              color: filter === t ? 'var(--color-primary)' : 'var(--color-muted)',
              border: `1px solid ${filter === t ? 'var(--color-primary)' : 'var(--color-border)'}`,
            }}
          >
            {t === 'all' ? 'All' : SERVICE_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[72px] animate-pulse rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)]"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] p-10 text-center">
          <CreditCard className="mx-auto mb-3 size-8 text-[var(--color-muted)]" />
          <p className="text-sm text-[var(--color-muted)]">
            {filter === 'all'
              ? 'No subscriptions yet. Add your first one.'
              : `No ${SERVICE_TYPE_LABELS[filter] ?? filter} subscriptions.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((sub) => (
            <SubscriptionCard key={sub.id} sub={sub} />
          ))}
        </div>
      )}
    </div>
  );
}
