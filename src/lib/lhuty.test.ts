import { describe, expect, it } from 'vitest';
import {
  DNU_NA_ODSTOUPENI,
  DNU_NA_REKLAMACI,
  lhutaNaOdstoupeni,
  lhutaNaVyrizeni,
  lzeOdstoupit,
  stavLhuty,
  zbyvaDnu,
} from './lhuty';

/**
 * Lhůty mají právní následek, takže se testují i „samozřejmé" případy.
 *
 * Zajímavé jsou tři: nedoručená objednávka (lhůta ještě neběží, odstoupit
 * ale lze), poslední den lhůty (patří ještě zákaznici) a den po něm.
 */

const den = 24 * 60 * 60 * 1000;
const doruceno = new Date('2026-08-01T10:00:00Z');

describe('lhutaNaVyrizeni – 30 dnů na reklamaci', () => {
  it('přičte třicet dnů k datu uplatnění', () => {
    const prijeti = new Date('2026-08-01T10:00:00Z');
    expect(lhutaNaVyrizeni(prijeti).getTime()).toBe(prijeti.getTime() + DNU_NA_REKLAMACI * den);
  });

  it('nemění vstupní datum', () => {
    const prijeti = new Date('2026-08-01T10:00:00Z');
    lhutaNaVyrizeni(prijeti);
    expect(prijeti.toISOString()).toBe('2026-08-01T10:00:00.000Z');
  });
});

describe('lhutaNaOdstoupeni – 14 dnů od převzetí', () => {
  it('počítá od doručení, ne od objednání', () => {
    expect(lhutaNaOdstoupeni(doruceno)?.getTime()).toBe(
      doruceno.getTime() + DNU_NA_ODSTOUPENI * den
    );
  });

  it('bez data doručení vrací null – lhůta ještě nezačala běžet', () => {
    expect(lhutaNaOdstoupeni(null)).toBeNull();
  });
});

describe('lzeOdstoupit', () => {
  it('nedoručená objednávka jde stornovat odstoupením', () => {
    // § 1829 odst. 1 věta druhá: odstoupit lze i před převzetím zboží.
    // Kdyby tu bylo false, e-shop by odmítal nárok v době, kdy je nejjistější.
    expect(lzeOdstoupit(null)).toBe(true);
  });

  it('poslední den lhůty ještě patří zákaznici', () => {
    const konec = new Date(doruceno.getTime() + DNU_NA_ODSTOUPENI * den);
    expect(lzeOdstoupit(doruceno, konec)).toBe(true);
  });

  it('vteřinu po lhůtě už ne', () => {
    const poLhute = new Date(doruceno.getTime() + DNU_NA_ODSTOUPENI * den + 1000);
    expect(lzeOdstoupit(doruceno, poLhute)).toBe(false);
  });
});

describe('zbyvaDnu', () => {
  it('vrací kladné číslo před termínem', () => {
    const konec = new Date('2026-08-11T10:00:00Z');
    expect(zbyvaDnu(konec, new Date('2026-08-01T10:00:00Z'))).toBe(10);
  });

  it('vrací záporné číslo po termínu', () => {
    const konec = new Date('2026-08-01T10:00:00Z');
    expect(zbyvaDnu(konec, new Date('2026-08-04T10:00:00Z'))).toBe(-3);
  });
});

describe('stavLhuty', () => {
  const ted = new Date('2026-08-01T10:00:00Z');

  it('bez data lhůty nehlásí nic', () => {
    expect(stavLhuty(null, ted)).toBeNull();
  });

  it('daleký termín je v pořádku', () => {
    expect(stavLhuty(new Date('2026-08-20T10:00:00Z'), ted)).toBe('v_poradku');
  });

  it('pět a méně dnů se blíží', () => {
    expect(stavLhuty(new Date('2026-08-06T10:00:00Z'), ted)).toBe('blizi_se');
  });

  it('propadlá lhůta je po termínu', () => {
    expect(stavLhuty(new Date('2026-07-30T10:00:00Z'), ted)).toBe('po_terminu');
  });

  it('den termínu ještě není po termínu', () => {
    // Marné uplynutí zakládá právo odstoupit od smlouvy – hlásit ho o den
    // dřív by majitelku honilo zbytečně, o den později pozdě.
    expect(stavLhuty(ted, ted)).toBe('blizi_se');
  });
});
