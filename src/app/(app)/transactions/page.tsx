'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ACCOUNT_BALANCES_KEY, useAccounts } from '@/features/accounts/queries';
import { deleteTransactionAction } from '@/features/transactions/actions';
import { TX_KEY, useTransactions } from '@/features/transactions/queries';
import type { Transaction } from '@/features/transactions/schemas';
import { fmtDate } from '@/lib/date';
import { formatRMB } from '@/lib/money';
import { QuickAddModal } from './quick-add-modal';

export default function TransactionsPage() {
  const [search, setSearch] = useState('');
  const [accountId, setAccountId] = useState('');
  const [type, setType] = useState<'income' | 'expense' | ''>('');

  const {
    data: txs,
    isLoading,
    isError,
    refetch,
  } = useTransactions({
    search: search || undefined,
    accountId: accountId || undefined,
    type: (type as 'income' | 'expense') || undefined,
  });
  const { data: accounts } = useAccounts();
  const queryClient = useQueryClient();

  const { mutate: deleteTx } = useMutation({
    mutationFn: deleteTransactionAction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TX_KEY });
      queryClient.invalidateQueries({ queryKey: ACCOUNT_BALANCES_KEY });
      toast.success('Transaction deleted');
    },
    onError: (e) => toast.error(e.message),
  });

  const columns: ColumnDef<Transaction>[] = [
    {
      accessorKey: 'occurred_at',
      header: 'Date',
      enableSorting: true,
      cell: ({ row }) => fmtDate(row.original.occurred_at),
    },
    {
      id: 'category',
      header: 'Category',
      cell: ({ row }) => (
        <span className="flex items-center gap-2">
          <span
            className="size-2 flex-shrink-0 rounded-full"
            style={{ background: row.original.categories?.color ?? '#888' }}
          />
          {row.original.categories?.name ?? '—'}
        </span>
      ),
    },
    {
      id: 'account',
      header: 'Account',
      cell: ({ row }) => row.original.accounts?.name ?? '—',
    },
    {
      accessorKey: 'note',
      header: 'Note',
      cell: ({ row }) => (
        <span className="max-w-[160px] truncate text-[var(--color-muted)]">
          {row.original.note ?? ''}
        </span>
      ),
    },
    {
      accessorKey: 'amount_fen',
      header: 'Amount',
      enableSorting: true,
      cell: ({ row }) => (
        <span
          className={`font-medium tabular-nums ${row.original.type === 'income' ? 'text-[var(--color-success)]' : ''}`}
        >
          {row.original.type === 'expense' ? '−' : '+'}
          {formatRMB(BigInt(row.original.amount_fen))}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <ConfirmDialog
          title="Delete transaction"
          description="This transaction will be removed from normal views."
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={() => deleteTx(row.original.id)}
          trigger={
            <button
              type="button"
              className="text-[var(--color-muted)] hover:text-[var(--color-danger)]"
              aria-label="Delete transaction"
            >
              <Trash2 className="size-4" />
            </button>
          }
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Transactions</h1>
        <QuickAddModal />
      </div>
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Search notes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-[200px]"
        />
        <Select
          value={accountId || '__all__'}
          onValueChange={(v) => setAccountId(v === '__all__' ? '' : v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All accounts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All accounts</SelectItem>
            {(accounts ?? []).map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={type || '__all__'}
          onValueChange={(v) => {
            const val = v === '__all__' ? '' : v;
            setType(val as 'income' | 'expense' | '');
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All types</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
            <SelectItem value="income">Income</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {isError ? (
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] p-6 text-center">
          <p className="text-sm text-[var(--color-muted)]">Could not load transactions.</p>
          <button type="button" onClick={() => refetch()} className="mt-3 text-sm underline">
            Retry
          </button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={txs ?? []}
          isLoading={isLoading}
          emptyMessage="No transactions yet. Add your first one."
        />
      )}
    </div>
  );
}
