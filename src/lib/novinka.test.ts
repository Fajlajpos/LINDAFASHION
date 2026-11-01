import { describe, expect, it } from 'vitest';
import { DNY_NOVINKY, jeNovinka } from './novinka';

const ted = new Date('2026-11-01T12:00:00Z');
const predDny = (dny: number) => new Date(ted.getTime() - dny * 24 * 60 * 60 * 1000);

describe('jeNovinka', () => {
  it('čerstvě přidaný produkt je novinka', () => {
    expect(jeNovinka(predDny(0), ted)).toBe(true);
    expect(jeNovinka(predDny(DNY_NOVINKY - 1), ted)).toBe(true);
  });

  it('po uplynutí lhůty štítek zmizí sám', () => {
    expect(jeNovinka(predDny(DNY_NOVINKY), ted)).toBe(false);
    expect(jeNovinka(predDny(365), ted)).toBe(false);
  });
});
