import { z } from 'zod';

export const txTypes = ['income', 'expense'] as const;
export type TxType = (typeof txTypes)[number];

export const txSchema = z.object({
  account_id: z.string().uuid(),
  category_id: z.string().uuid(),
  type: z.enum(txTypes),
  amount_fen: z.string().min(1),
  occurred_at: z.string(),
  note: z.string().max(500).optional(),
});

export interface Transaction {
  id: string;
  owner_id: string;
  account_id: string;
  category_id: string;
  type: TxType;
  amount_fen: string;
  occurred_at: string;
  note: string | null;
  receipt_url: string | null;
  is_pending: boolean;
  debt_id: string | null;
  created_at: string;
  // joined relations (optional)
  accounts?: { name: string; kind: string } | null;
  categories?: { name: string; color: string; icon: string } | null;
}

export interface TransactionFilters {
  accountId?: string;
  categoryId?: string;
  type?: TxType;
  search?: string;
  from?: string;
  to?: string;
}
