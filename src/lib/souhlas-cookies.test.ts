import { describe, expect, it } from 'vitest';
import { PLATNOST_SOUHLASU_DNU, VERZE_ZASAD_COOKIES, platnySouhlas } from './souhlas-cookies';

const TED = new Date('2026-10-13T12:00:00Z');
const OBA = { analyticke: true, marketingove: true };
const JEN_GA = { analyticke: true, marketingove: false };

function ulozeno(prepis: Record<string, unknown> = {}): string {
  return JSON.stringify({
    analyticke: true,
    marketingove: false,
    verze: VERZE_ZASAD_COOKIES,
    rozhodnutoAt: '2026-10-01T12:00:00Z',
    nabidnuto: OBA,
    ...prepis,
  });
}

describe('platnySouhlas', () => {
  it('vrátí platnou volbu', () => {
    expect(platnySouhlas(ulozeno(), TED, OBA)).toEqual({
      nezbytne: true,
      analyticke: true,
      marketingove: false,
    });
  });

  it('nic uloženého ani rozbitý JSON neplatí', () => {
    expect(platnySouhlas(null, TED, OBA)).toBeNull();
    expect(platnySouhlas('{nedopsane', TED, OBA)).toBeNull();
    expect(platnySouhlas('5', TED, OBA)).toBeNull();
  });

  /* Starší lišta ukládala jen booleany a analytiku popisovala jako anonymní.
     Na takový text daný souhlas se nesmí převzít. */
  it('volba bez verze nebo k jiné verzi zásad neplatí', () => {
    expect(platnySouhlas(JSON.stringify({ analyticke: true, marketingove: true }), TED, OBA)).toBeNull();
    expect(platnySouhlas(ulozeno({ verze: '2026-08-18' }), TED, OBA)).toBeNull();
  });

  it(`po ${PLATNOST_SOUHLASU_DNU} dnech se ptá znovu`, () => {
    const den = 24 * 60 * 60 * 1000;
    const tesneVcas = new Date(TED.getTime() - (PLATNOST_SOUHLASU_DNU - 1) * den).toISOString();
    const pozde = new Date(TED.getTime() - (PLATNOST_SOUHLASU_DNU + 1) * den).toISOString();

    expect(platnySouhlas(ulozeno({ rozhodnutoAt: tesneVcas }), TED, OBA)).not.toBeNull();
    expect(platnySouhlas(ulozeno({ rozhodnutoAt: pozde }), TED, OBA)).toBeNull();
    expect(platnySouhlas(ulozeno({ rozhodnutoAt: 'nesmysl' }), TED, OBA)).toBeNull();
  });

  /* „Povolit vše" z doby, kdy běžela jen analytika, nesmí tiše pokrýt
     Pixel přidaný později – o ten se nikdo nerozhodoval. */
  it('ptá se znovu, když přibyl nástroj, který tehdy nebyl nabídnutý', () => {
    const zDobyJenGa = ulozeno({ nabidnuto: JEN_GA, marketingove: true });
    expect(platnySouhlas(zDobyJenGa, TED, JEN_GA)).not.toBeNull();
    expect(platnySouhlas(zDobyJenGa, TED, OBA)).toBeNull();
  });

  it('souhlas s nástrojem, který už neběží, nevrací', () => {
    const souhlas = platnySouhlas(ulozeno({ marketingove: true }), TED, JEN_GA);
    expect(souhlas?.analyticke).toBe(true);
    expect(souhlas?.marketingove).toBe(false);
  });
});
