import { describe, expect, it } from 'vitest';
import { displayToFen, fenToDisplay, formatRMB } from '@/lib/money';

describe('fenToDisplay', () => {
  it('converts whole yuan', () => {
    expect(fenToDisplay(10000n)).toBe('100.00');
  });
  it('converts fractional yuan', () => {
    expect(fenToDisplay(12345n)).toBe('123.45');
  });
  it('handles zero', () => {
    expect(fenToDisplay(0n)).toBe('0.00');
  });
  it('handles negative', () => {
    expect(fenToDisplay(-50n)).toBe('-0.50');
  });
});

describe('displayToFen', () => {
  it('converts whole yuan', () => {
    expect(displayToFen('100')).toBe(10000n);
  });
  it('converts decimal yuan', () => {
    expect(displayToFen('123.45')).toBe(12345n);
  });
  it('rounds extra precision', () => {
    expect(displayToFen('1.999')).toBe(200n);
  });
  it('strips currency symbol and commas', () => {
    expect(displayToFen('¥1,234.50')).toBe(123450n);
  });
  it('throws on garbage', () => {
    expect(() => displayToFen('abc')).toThrow();
  });
});

describe('formatRMB', () => {
  it('prepends symbol with two decimals', () => {
    expect(formatRMB(12345n)).toBe('¥123.45');
  });
  it('inserts thousands separators', () => {
    expect(formatRMB(123456789n)).toBe('¥1,234,567.89');
  });
  it('handles negative with sign before symbol', () => {
    expect(formatRMB(-12345n)).toBe('-¥123.45');
  });
});
