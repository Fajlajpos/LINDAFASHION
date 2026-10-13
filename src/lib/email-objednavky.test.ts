import { describe, expect, it } from 'vitest';
import { obsahEmailuObjednavky, type ObjednavkaProEmail } from './email-objednavky';

const NASTAVENI = {
  nazevFirmy: 'Dnešní název',
  icoFirmy: '99999999',
  dicFirmy: null,
  adresaFirmy: 'Dnešní adresa',
  emailFirmy: 'dnes@example.cz',
  zapisVRejstriku: null,
};

const BANKA = { cisloUctu: '123456789/0800', iban: 'CZ6508000000000123456789' };

function objednavka(prepis: Partial<ObjednavkaProEmail> = {}): ObjednavkaProEmail {
  return {
    cisloObjednavky: '2026-00016',
    zpusobPlatby: 'bankovni_prevod',
    mezisoucet: '1890.00',
    slevaCastka: '0',
    cenaDopravy: '109.00',
    castkaZGiftCard: null,
    celkovaCena: '1999.00',
    jePlatceDph: false,
    sazbaDph: 21,
    dphHaleru: 0,
    dodaciJmenoPrijmeni: 'Jana Nováková',
    dodaciUlice: 'Dlouhá 1',
    dodaciMesto: 'Sokolov',
    dodaciPsc: '356 01',
    vydejniMistoNazev: null,
    dodavatelSnapshot: {
      nazev: 'Martina Ludvíková',
      ico: '02688468',
      dic: null,
      adresa: 'Rokycanova 1929, Sokolov',
      email: 'obchod@example.cz',
      zapisVRejstriku: null,
    },
    items: [
      { mnozstvi: 2, cenaVDobeNakupu: '945.00', variant: { velikost: 'M (38)', product: { nazev: 'Halenka Siena' } } },
    ],
    ...prepis,
  };
}

describe('obsahEmailuObjednavky', () => {
  it('bere položky a ceny z uložené objednávky', () => {
    const obsah = obsahEmailuObjednavky(objednavka(), NASTAVENI, BANKA);
    expect(obsah.polozky).toEqual([{ nazev: 'Halenka Siena', velikost: 'M (38)', mnozstvi: 2, celkemKc: 1890 }]);
    expect(obsah.mezisoucetKc).toBe(1890);
    expect(obsah.dopravaKc).toBe(109);
    expect(obsah.kUhradeKc).toBe(1999);
  });

  /* Faktura i e-mail musí říkat totéž, co platilo při nákupu – ne co je
     dnes v nastavení. */
  it('prodávající je ze snímku objednávky, ne z dnešního nastavení', () => {
    const obsah = obsahEmailuObjednavky(objednavka(), NASTAVENI, BANKA);
    expect(obsah.dodavatel.nazev).toBe('Martina Ludvíková');
    expect(obsah.dodavatel.ico).toBe('02688468');
  });

  it('bez snímku sáhne do nastavení', () => {
    const obsah = obsahEmailuObjednavky(objednavka({ dodavatelSnapshot: null }), NASTAVENI, BANKA);
    expect(obsah.dodavatel.nazev).toBe('Dnešní název');
  });

  it('platební údaje u převodu, s VS z čísla objednávky', () => {
    const obsah = obsahEmailuObjednavky(objednavka(), NASTAVENI, BANKA);
    expect(obsah.platebniUdaje).toEqual({ ...BANKA, vs: '202600016', castkaKc: 1999 });
  });

  it('bez platebních údajů u karty, u zaplaceného poukazem a bez účtu', () => {
    expect(obsahEmailuObjednavky(objednavka({ zpusobPlatby: 'gopay' }), NASTAVENI, BANKA).platebniUdaje).toBeNull();
    expect(
      obsahEmailuObjednavky(objednavka({ castkaZGiftCard: '1999.00' }), NASTAVENI, BANKA).platebniUdaje
    ).toBeNull();
    expect(
      obsahEmailuObjednavky(objednavka(), NASTAVENI, { cisloUctu: null, iban: null }).platebniUdaje
    ).toBeNull();
  });

  it('částečně poukazem: k úhradě jen zbytek', () => {
    const obsah = obsahEmailuObjednavky(objednavka({ castkaZGiftCard: '500.00' }), NASTAVENI, BANKA);
    expect(obsah.zPoukazuKc).toBe(500);
    expect(obsah.kUhradeKc).toBe(1499);
    expect(obsah.platebniUdaje?.castkaKc).toBe(1499);
  });

  it('u výdejního místa neuvádí domácí adresu', () => {
    const obsah = obsahEmailuObjednavky(
      objednavka({ vydejniMistoNazev: 'Z-BOX Sokolov, Gagarinova 2048' }),
      NASTAVENI,
      BANKA
    );
    expect(obsah.dodani).toEqual({
      jmeno: 'Jana Nováková',
      vydejniMisto: 'Z-BOX Sokolov, Gagarinova 2048',
      adresa: null,
    });
  });
});
