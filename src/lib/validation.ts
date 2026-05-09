import { z } from 'zod';

export const fenSchema = z
  .string()
  .regex(/^\d+$/, 'Amount must be a non-negative integer in fen')
  .refine((v) => {
    try {
      return BigInt(v) <= 9_000_000_000_000_000n;
    } catch {
      return false;
    }
  }, 'Amount is too large');

export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

export const optionalText = (max: number) => z.string().trim().max(max).optional();

export const optionalPhoneSchema = z
  .string()
  .trim()
  .regex(/^[+0-9()\-\s]{6,20}$/, 'Invalid phone number')
  .optional();

export const optionalEmailSchema = z.string().trim().email('Invalid email').optional();

export const colorHexSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a valid hex value');
