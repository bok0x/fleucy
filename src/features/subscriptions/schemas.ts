import { z } from 'zod';
import { fenSchema, isoDateSchema, optionalText } from '@/lib/validation';

export const SERVICE_TYPES = [
  'streaming',
  'internet',
  'software',
  'music',
  'vpn',
  'other',
] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];

export const subscriptionSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  amount_fen: fenSchema,
  cadence: z.enum(['monthly', 'yearly']),
  day_of_month: z.coerce.number().int().min(1, 'Day must be ≥ 1').max(28, 'Day must be ≤ 28'),
  account_id: z.string().uuid('Account is required'),
  category_id: z.string().uuid().optional(),
  start_date: isoDateSchema,
  end_date: isoDateSchema.optional(),
  website_url: z.string().trim().url('Must be a valid URL').optional().or(z.literal('')),
  subscription_notes: optionalText(500),
  service_type: z.enum(SERVICE_TYPES).optional(),
});

export type SubscriptionInput = z.infer<typeof subscriptionSchema>;

// Subscription is a recurring_rule row with is_subscription = true.
// amount_fen is returned as string by Supabase (BIGINT over JSON).
export interface Subscription {
  id: string;
  owner_id: string;
  name: string;
  type: 'expense';
  amount_fen: string;
  cadence: 'monthly' | 'yearly';
  day_of_month: number | null;
  account_id: string;
  category_id: string | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  is_subscription: boolean;
  website_url: string | null;
  subscription_notes: string | null;
  service_type: string | null;
  last_generated_for_date: string | null;
  created_at: string;
  accounts?: { name: string; kind: string; icon: string; color: string } | null;
  categories?: { name: string; icon: string; color: string } | null;
}
