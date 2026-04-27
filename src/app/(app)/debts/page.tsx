'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { AmountInput } from '@/components/feature/amount-input';
import { Button } from '@/components/ui/button';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createDebtAction, updateDebtStatusAction } from '@/features/debts/actions';
import { DEBTS_KEY, useDebts } from '@/features/debts/queries';
import type { Debt } from '@/features/debts/schemas';
import { usePeople } from '@/features/people/queries';
import { fmtDate } from '@/lib/date';
import { formatRMB } from '@/lib/money';

function CreateDebtForm({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const { data: people } = usePeople();
  const [amountFen, setAmountFen] = useState(0n);

  const { mutate, isPending } = useMutation({
    mutationFn: async (fd: FormData) => {
      const r = await createDebtAction(fd);
      if (!r.ok) throw new Error(r.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEBTS_KEY });
      toast.success('Debt added');
      onSuccess();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (amountFen <= 0n) {
      toast.error('Amount must be > 0');
      return;
    }
    const fd = new FormData(e.currentTarget);
    fd.set('principal_fen', amountFen.toString());
    mutate(fd);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label>Direction</Label>
        <Select name="direction" defaultValue="owed_to_me">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="owed_to_me">Someone owes me</SelectItem>
            <SelectItem value="i_owe">I owe someone</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Person</Label>
        <Select name="person_id" required>
          <SelectTrigger>
            <SelectValue placeholder="Select person" />
          </SelectTrigger>
          <SelectContent>
            {(people ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label>Amount</Label>
        <AmountInput value={amountFen} onChange={setAmountFen} />
      </div>
      <div className="space-y-1">
        <Label>Description (optional)</Label>
        <Input name="description" placeholder="e.g. Borrowed for rent" />
      </div>
      <div className="space-y-1">
        <Label>Due date (optional)</Label>
        <Input name="due_date" type="date" />
      </div>
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Saving…' : 'Add debt'}
      </Button>
    </form>
  );
}

function DebtCard({ debt }: { debt: Debt }) {
  const queryClient = useQueryClient();
  const { mutate: settle, isPending } = useMutation({
    mutationFn: (status: 'settled' | 'written_off') => updateDebtStatusAction(debt.id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DEBTS_KEY });
      toast.success('Status updated');
    },
    onError: (e) => toast.error(e.message),
  });

  const isOverdue = debt.due_date && new Date(debt.due_date) < new Date();

  return (
    <div className="space-y-2 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-4">
      <div className="flex items-center justify-between">
        <p className="font-medium">{debt.people?.full_name ?? '—'}</p>
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            debt.status === 'partially_paid'
              ? 'bg-[var(--color-warning)]/20 text-[var(--color-warning)]'
              : 'bg-[var(--color-border)] text-[var(--color-muted)]'
          }`}
        >
          {debt.status.replace('_', ' ')}
        </span>
      </div>
      <p className="text-lg font-semibold tabular-nums">{formatRMB(BigInt(debt.principal_fen))}</p>
      {debt.description && <p className="text-sm text-[var(--color-muted)]">{debt.description}</p>}
      {debt.due_date && (
        <p
          className={`text-xs ${isOverdue ? 'text-[var(--color-danger)]' : 'text-[var(--color-muted)]'}`}
        >
          Due {fmtDate(debt.due_date)}
          {isOverdue ? ' — OVERDUE' : ''}
        </p>
      )}
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          variant="outline"
          onClick={() => settle('settled')}
          disabled={isPending}
          className="flex-1"
        >
          Mark settled
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => settle('written_off')}
          disabled={isPending}
        >
          Write off
        </Button>
      </div>
    </div>
  );
}

function DebtsList({ direction }: { direction: 'owed_to_me' | 'i_owe' }) {
  const { data, isLoading } = useDebts(direction);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 size-4" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New debt</DialogTitle>
            </DialogHeader>
            <CreateDebtForm onSuccess={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? (
        <p className="text-sm text-[var(--color-muted)]">Loading…</p>
      ) : (data ?? []).length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--color-muted)]">No open debts.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {(data ?? []).map((d) => (
            <DebtCard key={d.id} debt={d} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DebtsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Debts</h1>
      <Tabs defaultValue="owed_to_me">
        <TabsList>
          <TabsTrigger value="owed_to_me">Owed to me</TabsTrigger>
          <TabsTrigger value="i_owe">I owe</TabsTrigger>
        </TabsList>
        <TabsContent value="owed_to_me" className="mt-4">
          <DebtsList direction="owed_to_me" />
        </TabsContent>
        <TabsContent value="i_owe" className="mt-4">
          <DebtsList direction="i_owe" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
