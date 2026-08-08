import { describe, expect, it } from 'vitest';
import { objednavkaSchema, vyzadujeVydejniMisto } from './objednavka';

const zaklad = {
  polozky: [{ variantId: 'v1', mnozstvi: 1 }],
  email: 'Zakaznice@Example.CZ',
  dodaciJmenoPrijmeni: 'Marie Nováková',
  dodaciUlice: 'Vodičkova 45',
  dodaciMesto: 'Praha 1',
  dodaciPsc: '110 00',
  zpusobDopravy: 'ppl',
  zpusobPlatby: 'bankovni_prevod',
  souhlasPodminky: true,
};

describe('objednavkaSchema', () => {
  it('přijme platnou objednávku a znormalizuje vstupy', () => {
    const v = objednavkaSchema.parse(zaklad);

    expect(v.email).toBe('zakaznice@example.cz');
    // PSČ lidé píšou s mezerou i bez ní.
    expect(v.dodaciPsc).toBe('11000');
  });

  it('bez souhlasu s podmínkami neprojde (sekce 5)', () => {
    const vysledek = objednavkaSchema.safeParse({ ...zaklad, souhlasPodminky: false });

    expect(vysledek.success).toBe(false);
    if (!vysledek.success) {
      expect(vysledek.error.errors[0].message).toContain('obchodními podmínkami');
    }
  });

  it('odmítne prázdný košík', () => {
    expect(objednavkaSchema.safeParse({ ...zaklad, polozky: [] }).success).toBe(false);
  });

  it('odmítne nesmyslné PSČ', () => {
    expect(objednavkaSchema.safeParse({ ...zaklad, dodaciPsc: '110' }).success).toBe(false);
    expect(objednavkaSchema.safeParse({ ...zaklad, dodaciPsc: 'abcde' }).success).toBe(false);
  });

  it('nepustí dobírku – e-shop ji vůbec nenabízí (sekce 8)', () => {
    expect(objednavkaSchema.safeParse({ ...zaklad, zpusobPlatby: 'dobirka' }).success).toBe(false);
  });

  /*
   * Regrese: `gopay` bylo ve výčtu, přestože brána není zapojená. Formulář
   * volbu zakazoval, ale ručně sestavený požadavek prošel – a založil
   * objednávku, která odečetla sklad, nikdy nebyla zaplacená a na potvrzení
   * nedostala ani platební údaje (QR se zobrazuje jen u převodu).
   * Hodnota se sem vrátí, až budou v `.env` klíče.
   */
  it('nepustí platbu kartou, dokud brána není zapojená', () => {
    expect(objednavkaSchema.safeParse({ ...zaklad, zpusobPlatby: 'gopay' }).success).toBe(false);
  });

  it('odmítne neznámého dopravce', () => {
    expect(objednavkaSchema.safeParse({ ...zaklad, zpusobDopravy: 'dhl' }).success).toBe(false);
  });

  it('slevový kód i poukaz převede na velká písmena', () => {
    const v = objednavkaSchema.parse({ ...zaklad, slevovyKod: ' jaro25 ', darkovyPoukaz: 'abcd-efgh' });

    expect(v.slevovyKod).toBe('JARO25');
    expect(v.darkovyPoukaz).toBe('ABCD-EFGH');
  });

  it('prázdný kód znamená žádný kód, ne prázdný řetězec', () => {
    const v = objednavkaSchema.parse({ ...zaklad, slevovyKod: '   ' });
    expect(v.slevovyKod).toBeNull();
  });
});

describe('vyzadujeVydejniMisto', () => {
  it('výdejní místo chce jen Zásilkovna', () => {
    expect(vyzadujeVydejniMisto('zasilkovna')).toBe(true);
    expect(vyzadujeVydejniMisto('ppl')).toBe(false);
    expect(vyzadujeVydejniMisto('ceska_posta')).toBe(false);
  });
});
