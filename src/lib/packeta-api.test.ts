import { describe, expect, it } from 'vitest';
import { hmotnostKg, jeDoruceno, rozdelitJmeno } from './packeta-api';

/**
 * Testy nad čistou logikou klienta Zásilkovny.
 *
 * Volání API se netestuje – bez databáze i bez sítě by se tím ověřovalo jen
 * to, že jsme kód napsali tak, jak jsme ho napsali. Smysl má naopak to, co
 * překládá objednávku na podklad pro dopravce: rozdělení jména, přepočet
 * hmotnosti a vyhodnocení doručení.
 */

describe('rozdelitJmeno', () => {
  it('rozdělí běžné jméno a příjmení', () => {
    expect(rozdelitJmeno('Marie Nováková')).toEqual({ jmeno: 'Marie', prijmeni: 'Nováková' });
  });

  it('dělí na poslední mezeře, takže prostřední jméno zůstane u křestního', () => {
    // E-shop má jedno pole a zákaznice do něj píšou i tituly a druhá jména.
    // Příjmení je skoro vždycky poslední slovo.
    expect(rozdelitJmeno('Anna Marie Svobodová')).toEqual({
      jmeno: 'Anna Marie',
      prijmeni: 'Svobodová',
    });
    expect(rozdelitJmeno('Ing. Petra Dvořáková')).toEqual({
      jmeno: 'Ing. Petra',
      prijmeni: 'Dvořáková',
    });
  });

  it('u jednoho slova nechá příjmení prázdné, místo aby jméno zopakovalo', () => {
    expect(rozdelitJmeno('Novakova')).toEqual({ jmeno: 'Novakova', prijmeni: '' });
  });

  it('poradí si s přebytečnými mezerami', () => {
    expect(rozdelitJmeno('  Marie   Nováková  ')).toEqual({
      jmeno: 'Marie',
      prijmeni: 'Nováková',
    });
  });

  it('prázdný vstup nespadne', () => {
    expect(rozdelitJmeno('   ')).toEqual({ jmeno: '', prijmeni: '' });
  });
});

describe('hmotnostKg', () => {
  it('převede gramy na kilogramy', () => {
    expect(hmotnostKg(500, 1)).toBe(0.5);
  });

  it('násobí počtem kusů', () => {
    expect(hmotnostKg(500, 3)).toBe(1.5);
    expect(hmotnostKg(250, 4)).toBe(1);
  });

  it('bere nulový počet kusů jako jeden', () => {
    // Objednávka bez položek nevznikne, ale zásilka o nulové hmotnosti
    // by u dopravce skončila chybou, ne prázdným balíkem.
    expect(hmotnostKg(500, 0)).toBe(0.5);
  });
});

describe('jeDoruceno', () => {
  it('pozná doručenou zásilku', () => {
    expect(jeDoruceno('delivered')).toBe(true);
  });

  it('nevadí mu velikost písmen ani mezery', () => {
    expect(jeDoruceno('  Delivered ')).toBe(true);
  });

  /*
   * Od převzetí běží čtrnáctidenní lhůta pro odstoupení (§ 1829), takže
   * seznam doručených stavů je schválně úzký. Zásilka připravená na pobočce
   * ještě není u zákaznice – kdyby se brala jako doručená, lhůta by začala
   * běžet dřív, než si zboží vůbec vyzvedla, a to je v její neprospěch.
   */
  it('zásilku na cestě ani připravenou k vyzvednutí za doručenou nepovažuje', () => {
    for (const kod of [
      'received data',
      'arrived',
      'prepared for departure',
      'ready for pickup',
      'handed over to carrier',
      'returned',
      'cancelled',
      '',
    ]) {
      expect(jeDoruceno(kod), kod).toBe(false);
    }
  });
});
