import { describe, expect, it } from 'vitest';
import { objednavkaSchema, udajeSchema, vyzadujeVydejniMisto } from './objednavka';

const zaklad = {
  polozky: [{ variantId: 'v1', mnozstvi: 1 }],
  email: 'Zakaznice@Example.CZ',
  dodaciJmenoPrijmeni: 'Marie Nováková',
  dodaciUlice: 'Vodičkova 45',
  dodaciMesto: 'Praha 1',
  dodaciPsc: '110 00',
  dodaciTelefon: '+420 777 888 999',
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
   *
   * Dnes o tom rozhoduje přítomnost klíčů v `.env`, ne pevný výčet: statický
   * seznam by se musel při nasazení brány měnit v kódu, a to je krok, na
   * který se zapomene.
   */
  it('nepustí platbu kartou, dokud brána není zapojená', () => {
    expect(objednavkaSchema.safeParse({ ...zaklad, zpusobPlatby: 'gopay' }).success).toBe(false);
  });

  it('platbu kartou pustí, jakmile jsou v .env klíče GoPay', () => {
    const puvodni = { ...process.env };

    process.env.GOPAY_GOID = '8123456789';
    process.env.GOPAY_CLIENT_ID = 'test-client';
    process.env.GOPAY_CLIENT_SECRET = 'test-secret';

    try {
      expect(objednavkaSchema.safeParse({ ...zaklad, zpusobPlatby: 'gopay' }).success).toBe(true);

      // Dobírka zůstává zakázaná i se zapojenou bránou – nenabízí se vůbec.
      expect(objednavkaSchema.safeParse({ ...zaklad, zpusobPlatby: 'dobirka' }).success).toBe(false);
    } finally {
      process.env = puvodni;
    }
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

describe('ocekavanaCena', () => {
  it('je nepovinná', () => {
    expect(objednavkaSchema.safeParse(zaklad).success).toBe(true);
  });

  it('přijme celé haléře', () => {
    const vysledek = objednavkaSchema.safeParse({
      ...zaklad,
      ocekavanaCena: { celkemHaleru: 259000, kUhradeHaleru: 0 },
    });
    expect(vysledek.success).toBe(true);
  });

  it('odmítne zlomky a záporné částky', () => {
    for (const ocekavanaCena of [
      { celkemHaleru: 10.5, kUhradeHaleru: 0 },
      { celkemHaleru: 100, kUhradeHaleru: -1 },
    ]) {
      expect(objednavkaSchema.safeParse({ ...zaklad, ocekavanaCena }).success).toBe(false);
    }
  });
});

describe('udajeSchema', () => {
  it('stejné hlášky jako objednávka – prázdné PSČ i e-mail', () => {
    const vysledek = udajeSchema.safeParse({ ...zaklad, email: '', dodaciPsc: '' });
    expect(vysledek.success).toBe(false);
    if (vysledek.success) return;

    const pole = vysledek.error.issues.map((i) => i.path[0]);
    expect(pole).toContain('email');
    expect(pole).toContain('dodaciPsc');
  });

  it('poznámka je nepovinná', () => {
    expect(udajeSchema.safeParse({ ...zaklad, poznamka: null }).success).toBe(true);
  });

  it('telefon je povinný – dopravce na něj posílá SMS', () => {
    for (const dodaciTelefon of [null, undefined, '', '   ']) {
      const v = udajeSchema.safeParse({ ...zaklad, dodaciTelefon });
      expect(v.success).toBe(false);
      if (!v.success) expect(v.error.issues[0].message).toBe('Vyplňte telefon.');
    }
  });

  it('telefon přijme běžné zápisy a srovná mezery', () => {
    for (const dodaciTelefon of ['777888999', '+420 777 888 999', '00420777888999', '777-888-999']) {
      expect(udajeSchema.safeParse({ ...zaklad, dodaciTelefon }).success).toBe(true);
    }
    const v = udajeSchema.parse({ ...zaklad, dodaciTelefon: '  +420   777 888  999 ' });
    expect(v.dodaciTelefon).toBe('+420 777 888 999');
  });

  it('telefon odmítne příliš krátké číslo i písmena', () => {
    for (const dodaciTelefon of ['12345', 'zavolejte mi', '777 888 99x']) {
      expect(udajeSchema.safeParse({ ...zaklad, dodaciTelefon }).success).toBe(false);
    }
  });
});

describe('vyzadujeVydejniMisto', () => {
  it('výdejní místo chce jen Zásilkovna', () => {
    expect(vyzadujeVydejniMisto('zasilkovna')).toBe(true);
    expect(vyzadujeVydejniMisto('ppl')).toBe(false);
    expect(vyzadujeVydejniMisto('ceska_posta')).toBe(false);
  });
});
