'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import Link from 'next/link';
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
import { ACCOUNT_BALANCES_KEY, useAccounts } from '@/features/accounts/queries';
import { useCategories } from '@/features/categories/queries';
import { createTransactionAction } from '@/features/transactions/actions';
import { TX_KEY } from '@/features/transactions/queries';

interface Props {
  defaultType?: 'income' | 'expense';
}

export function QuickAddModal({ defaultType = 'expense' }: Props) {
  const [open, setOpen] = useState(false);
  const [amountFen, setAmountFen] = useState(0n);
  const [type, setType] = useState<'income' | 'expense'>(defaultType);
  const queryClient = useQueryClient();

  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories(type);
  const hasAccounts = (accounts?.length ?? 0) > 0;
  const hasCategories = (categories?.length ?? 0) > 0;

  const { mutate, isPending } = useMutation({
    mutationFn: async (fd: FormData) => {
      const r = await createTransactionAction(fd);
      if (!r.ok) throw new Error(r.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TX_KEY });
      queryClient.invalidateQueries({ queryKey: ACCOUNT_BALANCES_KEY });
      toast.success('Transaction added');
      setOpen(false);
      setAmountFen(0n);
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
    fd.set('type', type);
    mutate(fd);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 size-4" />
          Add
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add transaction</DialogTitle>
        </DialogHeader>
        {!hasAccounts || !hasCategories ? (
          <div className="space-y-3 rounded-md border border-dashed border-[var(--color-border)] p-4">
            <p className="text-sm text-[var(--color-muted)]">
              Add required setup items before creating transactions.
            </p>
            {!hasAccounts ? (
              <Button asChild className="w-full" variant="outline">
                <Link href="/accounts" onClick={() => setOpen(false)}>
                  Create an account
                </Link>
              </Button>
            ) : null}
            {!hasCategories ? (
              <Button asChild className="w-full" variant="outline">
                <Link href="/categories" onClick={() => setOpen(false)}>
                  Create a {type} category
                </Link>
              </Button>
            ) : null}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={type === 'expense' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setType('expense')}
              >
                Expense
              </Button>
              <Button
                type="button"
                variant={type === 'income' ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setType('income')}
              >
                Income
              </Button>
            </div>
            <div className="space-y-1">
              <Label>Amount</Label>
              <AmountInput value={amountFen} onChange={setAmountFen} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="qa-account">Account</Label>
              <Select name="account_id" required>
                <SelectTrigger id="qa-account">
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
            <div className="space-y-1">
              <Label htmlFor="qa-category">Category</Label>
              <Select name="category_id" required>
                <SelectTrigger id="qa-category">
                  <SelectValue placeholder="Pick category" />
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
            <div className="space-y-1">
              <Label htmlFor="qa-date">Date</Label>
              <Input
                id="qa-date"
                name="occurred_at"
                type="date"
                defaultValue={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="qa-note">Note (optional)</Label>
              <Input id="qa-note" name="note" placeholder="e.g. Lunch at restaurant" />
            </div>
            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? 'Saving…' : 'Add transaction'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
