import { describe, expect, it } from 'vitest';
import { DEFAULT_PALETTE, PALETTES } from '@/lib/themes';

describe('PALETTES', () => {
  it('has exactly 6 entries', () => {
    expect(PALETTES).toHaveLength(6);
  });

  it('every palette has required fields', () => {
    for (const p of PALETTES) {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.gradientA).toMatch(/^#/);
      expect(p.gradientB).toMatch(/^#/);
    }
  });

  it('DEFAULT_PALETTE is in PALETTES', () => {
    expect(PALETTES.map((p) => p.id)).toContain(DEFAULT_PALETTE);
  });
});
