import { describe, it, expect } from 'vitest';
import { otisk, PLATNOST_HODIN } from './zmena-emailu';

/**
 * Do databáze se ukládá jen otisk. Kdyby se do ní někdo dostal, odkaz na
 * změnu e-mailu z ní nesmí jít sestavit – jinak by stačil přístup k záloze
 * k převzetí libovolného účtu.
 */
describe('otisk tokenu', () => {
  it('je stabilní pro tentýž vstup', () => {
    expect(otisk('abc')).toBe(otisk('abc'));
  });

  it('se liší i při drobné změně vstupu', () => {
    expect(otisk('abc')).not.toBe(otisk('abd'));
  });

  it('je SHA-256, tedy 64 hexadecimálních znaků', () => {
    expect(otisk('cokoliv')).toMatch(/^[0-9a-f]{64}$/);
  });

  /* Otisk nesmí obsahovat původní token – to je celý smysl. */
  it('neobsahuje samotný token', () => {
    const token = 'velmiTajnyTokenKteryNesmiUniknout';
    expect(otisk(token)).not.toContain(token);
  });
});

describe('platnost odkazu', () => {
  /*
   * Delší než hodina u resetu hesla schválně: e-mail chodí na adresu, do
   * které se zákaznice teprve chystá přejít, takže si ji nemusí přečíst hned.
   * Nesmí to ale být bez konce – token musí propadnout sám.
   */
  it('je v rozumném okně – ne minuty, ne týdny', () => {
    expect(PLATNOST_HODIN).toBeGreaterThanOrEqual(1);
    expect(PLATNOST_HODIN).toBeLessThanOrEqual(72);
  });
});
