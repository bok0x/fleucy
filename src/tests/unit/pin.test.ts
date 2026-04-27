import { describe, expect, it } from 'vitest';
import { hashPin, isValidPin, verifyPin } from '@/lib/auth/pin';

describe('isValidPin', () => {
  it('accepts 4-6 digit pins', () => {
    expect(isValidPin('1234')).toBe(true);
    expect(isValidPin('123456')).toBe(true);
  });
  it('rejects too short', () => {
    expect(isValidPin('123')).toBe(false);
  });
  it('rejects too long', () => {
    expect(isValidPin('1234567')).toBe(false);
  });
  it('rejects non-digits', () => {
    expect(isValidPin('12a4')).toBe(false);
  });
  it('rejects empty', () => {
    expect(isValidPin('')).toBe(false);
  });
});

describe('hashPin/verifyPin', () => {
  it('hashes a pin and verifies it', async () => {
    const hash = await hashPin('1234');
    expect(hash).not.toBe('1234');
    expect(hash.length).toBeGreaterThan(20);
    expect(await verifyPin('1234', hash)).toBe(true);
  });
  it('rejects wrong pin', async () => {
    const hash = await hashPin('1234');
    expect(await verifyPin('5678', hash)).toBe(false);
  });
  it('produces different hashes for same pin (salt)', async () => {
    const a = await hashPin('1234');
    const b = await hashPin('1234');
    expect(a).not.toBe(b);
  });
});
