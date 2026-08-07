import { describe, expect, it } from 'vitest';
import { castkaZVarianty, vygenerovatKodPoukazu } from './poukazy';

describe('castkaZVarianty', () => {
  it('přečte částku z běžných zápisů', () => {
    expect(castkaZVarianty('1000 Kč')).toBe(1000);
    expect(castkaZVarianty('500 Kc')).toBe(500);
    expect(castkaZVarianty('2 000 Kč')).toBe(2000);
    expect(castkaZVarianty('5000')).toBe(5000);
  });

  it('vrátí null, když v názvu žádná částka není', () => {
    // Radši žádný poukaz než karta na nulu.
    expect(castkaZVarianty('M (38)')).toBeNull();
    expect(castkaZVarianty('Kč')).toBeNull();
    expect(castkaZVarianty('')).toBeNull();
  });

  it('nulovou částku nepovažuje za platnou', () => {
    expect(castkaZVarianty('0 Kč')).toBeNull();
  });
});

describe('vygenerovatKodPoukazu', () => {
  it('má tvar XXXX-XXXX-XXXX', () => {
    expect(vygenerovatKodPoukazu()).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  });

  it('neobsahuje znaky, které jdou splést (0, O, 1, I)', () => {
    const kody = Array.from({ length: 200 }, () => vygenerovatKodPoukazu()).join('');
    expect(kody).not.toMatch(/[01OI]/);
  });

  it('negeneruje kolize v rozumném vzorku', () => {
    const kody = new Set(Array.from({ length: 1000 }, () => vygenerovatKodPoukazu()));
    expect(kody.size).toBe(1000);
  });
});
