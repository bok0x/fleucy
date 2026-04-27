import { z } from 'zod';

export const categoryTypes = ['income', 'expense'] as const;
export type CategoryType = (typeof categoryTypes)[number];

export const categorySchema = z.object({
  type: z.enum(categoryTypes),
  name: z.string().min(1, 'Name is required').max(50),
  icon: z.string().default('circle'),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color')
    .default('#6b7280'),
});

export interface Category {
  id: string;
  owner_id: string;
  type: CategoryType;
  name: string;
  icon: string;
  color: string;
  is_system: boolean;
  sort_order: number;
}
