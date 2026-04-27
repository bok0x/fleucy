import { z } from 'zod';

export const accountKinds = ['cash', 'bank', 'mobile_wallet'] as const;
export type AccountKind = (typeof accountKinds)[number];

export const accountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  kind: z.enum(accountKinds),
  icon: z.string().default('wallet'),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Invalid color')
    .default('#3b82f6'),
});

// Row returned from the accounts table
export interface Account {
  id: string;
  owner_id: string;
  name: string;
  kind: AccountKind;
  icon: string;
  color: string;
  opening_balance_fen: string; // bigint as string from Supabase
  low_balance_threshold_fen: string | null;
  is_archived: boolean;
  sort_order: number;
  created_at: string;
}

// Row from v_account_balances view
export interface AccountBalance {
  account_id: string;
  owner_id: string;
  name: string;
  kind: AccountKind;
  balance_fen: string; // bigint as string
  low_balance_threshold_fen: string | null;
}

/** Safely parse a bigint string from Supabase (returns 0n on null/undefined/empty) */
export function parseFen(val: string | null | undefined): bigint {
  if (!val) return 0n;
  try {
    return BigInt(val);
  } catch {
    return 0n;
  }
}
