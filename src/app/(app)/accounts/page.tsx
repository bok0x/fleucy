'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit2, Plus, Wallet } from 'lucide-react';
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
import {
  archiveAccountAction,
  createAccountAction,
  deleteAccountAction,
  updateAccountAction,
} from '@/features/accounts/actions';
import {
  ACCOUNT_BALANCES_KEY,
  ACCOUNTS_KEY,
  useAccountBalances,
} from '@/features/accounts/queries';
import { type AccountBalance, parseFen } from '@/features/accounts/schemas';
import { formatRMB } from '@/lib/money';

const KIND_LABELS: Record<string, string> = {
  cash: 'Cash',
  bank: 'Bank account',
  mobile_wallet: 'Mobile wallet (WeChat / Alipay)',
};

interface AccountFormProps {
  defaultValues?: {
    id: string;
    name: string;
    kind: string;
    opening_balance_fen: string;
    low_balance_threshold_fen: string | null;
  };
  onSuccess: () => void;
}

function AccountForm({ defaultValues, onSuccess }: AccountFormProps) {
  const queryClient = useQueryClient();
  const [openingFen, setOpeningFen] = useState<bigint>(
    parseFen(defaultValues?.opening_balance_fen),
  );
  const [thresholdFen, setThresholdFen] = useState<bigint>(
    parseFen(defaultValues?.low_balance_threshold_fen),
  );

  const { mutate, isPending } = useMutation({
    mutationFn: async (fd: FormData) => {
      const result = defaultValues?.id
        ? await updateAccountAction(defaultValues.id, fd)
        : await createAccountAction(fd);
      if (!result.ok) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      queryClient.invalidateQueries({ queryKey: ACCOUNT_BALANCES_KEY });
      toast.success(defaultValues?.id ? 'Account updated' : 'Account created');
      onSuccess();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set('opening_balance_fen', openingFen.toString());
    fd.set('low_balance_threshold_fen', thresholdFen > 0n ? thresholdFen.toString() : '');
    mutate(fd);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="acc-name">Name</Label>
        <Input id="acc-name" name="name" defaultValue={defaultValues?.name} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="acc-kind">Type</Label>
        <Select name="kind" defaultValue={defaultValues?.kind ?? 'cash'}>
          <SelectTrigger id="acc-kind">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(KIND_LABELS).map(([v, l]) => (
              <SelectItem key={v} value={v}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Opening balance</Label>
        <AmountInput value={openingFen} onChange={setOpeningFen} />
      </div>
      <div className="space-y-1">
        <Label>Low balance alert (¥0 = disabled)</Label>
        <AmountInput value={thresholdFen} onChange={setThresholdFen} />
      </div>
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Saving…' : defaultValues?.id ? 'Update account' : 'Create account'}
      </Button>
    </form>
  );
}

function AccountCard({ acc }: { acc: AccountBalance }) {
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const { mutate: archive, isPending: archiving } = useMutation({
    mutationFn: () => archiveAccountAction(acc.account_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      queryClient.invalidateQueries({ queryKey: ACCOUNT_BALANCES_KEY });
      toast.success('Account archived');
    },
    onError: (e) => toast.error(e.message),
  });

  const { mutate: deleteAcc, isPending: deleting } = useMutation({
    mutationFn: () => deleteAccountAction(acc.account_id),
    onSuccess: (r) => {
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      queryClient.invalidateQueries({ queryKey: ACCOUNT_BALANCES_KEY });
      toast.success('Account deleted');
      setEditOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="size-4 text-[var(--color-muted)]" />
          <span className="font-medium">{acc.name}</span>
        </div>
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild>
            <button
              type="button"
              className="text-[var(--color-muted)] hover:text-[var(--color-fg)]"
              aria-label="Edit account"
            >
              <Edit2 className="size-3.5" />
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit account</DialogTitle>
            </DialogHeader>
            <AccountForm
              defaultValues={{
                id: acc.account_id,
                name: acc.name,
                kind: acc.kind,
                opening_balance_fen: '0',
                low_balance_threshold_fen: acc.low_balance_threshold_fen,
              }}
              onSuccess={() => setEditOpen(false)}
            />
            <div className="border-t border-[var(--color-border)] pt-3 flex gap-4">
              <ConfirmDialog
                title="Archive account"
                description="This account will be hidden from all views but its transactions are kept."
                confirmLabel="Archive"
                variant="destructive"
                disabled={archiving}
                onConfirm={() => {
                  archive();
                  setEditOpen(false);
                }}
                trigger={
                  <button
                    type="button"
                    className="text-sm text-[var(--color-muted)] hover:underline"
                  >
                    Archive
                  </button>
                }
              />
              <ConfirmDialog
                title="Delete account"
                description="This account will be permanently deleted. Accounts with existing transactions cannot be deleted — archive them instead."
                confirmLabel="Delete"
                variant="destructive"
                disabled={deleting}
                onConfirm={() => deleteAcc()}
                trigger={
                  <button
                    type="button"
                    className="text-sm text-[var(--color-danger)] hover:underline"
                  >
                    Delete
                  </button>
                }
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <p className="mt-2 text-xl font-semibold tabular-nums">
        {formatRMB(BigInt(acc.balance_fen))}
      </p>
      <p className="text-xs capitalize text-[var(--color-muted)]">{acc.kind.replace('_', ' ')}</p>
    </div>
  );
}

export default function AccountsPage() {
  const { data: balances, isLoading, isError, refetch } = useAccountBalances();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Accounts</h1>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 size-4" />
              Add account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New account</DialogTitle>
            </DialogHeader>
            <AccountForm onSuccess={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {isError ? (
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] p-6 text-center">
          <p className="text-sm text-[var(--color-muted)]">Could not load accounts.</p>
          <button type="button" onClick={() => refetch()} className="mt-3 text-sm underline">
            Retry
          </button>
        </div>
      ) : isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="h-24 animate-pulse rounded-[var(--radius-card)] bg-[var(--color-border)]" />
          <div className="h-24 animate-pulse rounded-[var(--radius-card)] bg-[var(--color-border)]" />
          <div className="h-24 animate-pulse rounded-[var(--radius-card)] bg-[var(--color-border)]" />
        </div>
      ) : (balances ?? []).length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] p-10 text-center text-sm text-[var(--color-muted)]">
          No accounts yet. Add your first one.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(balances ?? []).map((acc) => (
            <AccountCard key={acc.account_id} acc={acc} />
          ))}
        </div>
      )}
    </div>
  );
}
