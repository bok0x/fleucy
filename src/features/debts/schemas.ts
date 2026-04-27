import { z } from 'zod';

export const debtDirections = ['owed_to_me', 'i_owe'] as const;
export type DebtDirection = (typeof debtDirections)[number];
export const debtStatuses = ['open', 'partially_paid', 'settled', 'written_off'] as const;
export type DebtStatus = (typeof debtStatuses)[number];

export interface Debt {
  id: string;
  owner_id: string;
  person_id: string;
  direction: DebtDirection;
  principal_fen: string;
  description: string | null;
  due_date: string | null;
  status: DebtStatus;
  created_at: string;
  people?: { full_name: string; phone: string | null } | null;
}

export interface DebtPayment {
  id: string;
  debt_id: string;
  account_id: string;
  amount_fen: string;
  paid_at: string;
  note: string | null;
}

export const debtSchema = z.object({
  person_id: z.string().uuid(),
  direction: z.enum(debtDirections),
  principal_fen: z.string().min(1),
  description: z.string().max(300).optional(),
  due_date: z.string().optional(),
});
