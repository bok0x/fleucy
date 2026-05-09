import { describe, expect, it } from 'vitest';
// This import will fail until schemas.ts exists — that's expected.
import { SERVICE_TYPES, subscriptionSchema } from '@/features/subscriptions/schemas';

describe('subscriptionSchema', () => {
  const base = {
    name: 'Spotify',
    amount_fen: '3800',
    cadence: 'monthly',
    day_of_month: '5',
    account_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    start_date: '2026-01-01',
  };

  it('accepts valid monthly subscription', () => {
    const r = subscriptionSchema.safeParse(base);
    expect(r.success).toBe(true);
  });

  it('accepts yearly cadence', () => {
    const r = subscriptionSchema.safeParse({ ...base, cadence: 'yearly' });
    expect(r.success).toBe(true);
  });

  it('rejects invalid cadence', () => {
    const r = subscriptionSchema.safeParse({ ...base, cadence: 'weekly' });
    expect(r.success).toBe(false);
  });

  it('rejects empty name', () => {
    const r = subscriptionSchema.safeParse({ ...base, name: '' });
    expect(r.success).toBe(false);
  });

  it('rejects day_of_month > 28', () => {
    const r = subscriptionSchema.safeParse({ ...base, day_of_month: '31' });
    expect(r.success).toBe(false);
  });

  it('rejects day_of_month < 1', () => {
    const r = subscriptionSchema.safeParse({ ...base, day_of_month: '0' });
    expect(r.success).toBe(false);
  });

  it('accepts valid service_type', () => {
    const r = subscriptionSchema.safeParse({ ...base, service_type: 'streaming' });
    expect(r.success).toBe(true);
  });

  it('rejects unknown service_type', () => {
    const r = subscriptionSchema.safeParse({ ...base, service_type: 'social_media' });
    expect(r.success).toBe(false);
  });

  it('SERVICE_TYPES contains expected values', () => {
    expect(SERVICE_TYPES).toContain('streaming');
    expect(SERVICE_TYPES).toContain('vpn');
    expect(SERVICE_TYPES).toContain('internet');
  });
});
