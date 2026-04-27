import { z } from 'zod';

export const personSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(100),
  phone: z.string().max(30).optional(),
  email: z.string().max(100).optional(),
  relationship_tag: z.string().max(30).optional(),
  notes: z.string().max(500).optional(),
});

export interface Person {
  id: string;
  owner_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  relationship_tag: string | null;
  notes: string | null;
  avatar_url: string | null;
  created_at: string;
}
