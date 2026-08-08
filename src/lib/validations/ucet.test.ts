import { describe, expect, it } from 'vitest';
import { adresaSchema, profilSchema, reklamaceSchema, zmenaHeslaSchema } from './ucet';

describe('profilSchema', () => {
  it('prázdné jméno i telefon převede na null, ne na prázdný řetězec', () => {
    // V databázi má „nevyplněno“ jedinou podobu; prázdný řetězec by z ní
    // udělal druhou a výpisy by pak musely testovat obojí.
    const v = profilSchema.parse({ jmeno: '   ', telefon: '' });

    expect(v.jmeno).toBeNull();
    expect(v.telefon).toBeNull();
  });

  it('ořízne okolní mezery', () => {
    expect(profilSchema.parse({ jmeno: '  Marie Nováková  ' }).jmeno).toBe('Marie Nováková');
  });

  it('e-mail ignoruje – mění se jen ověřeným postupem', () => {
    const v = profilSchema.parse({ jmeno: 'Marie', email: 'utocnik@example.com' } as never);

    expect(v).not.toHaveProperty('email');
  });
});

describe('zmenaHeslaSchema', () => {
  const zaklad = { stareHeslo: 'stare123', heslo: 'nove12345', hesloZnovu: 'nove12345' };

  it('přijme platnou změnu', () => {
    expect(zmenaHeslaSchema.safeParse(zaklad).success).toBe(true);
  });

  it('odmítne neshodující se hesla a chybu umístí k druhému poli', () => {
    const vysledek = zmenaHeslaSchema.safeParse({ ...zaklad, hesloZnovu: 'jine12345' });

    expect(vysledek.success).toBe(false);
    if (!vysledek.success) {
      expect(vysledek.error.errors[0].path).toEqual(['hesloZnovu']);
    }
  });

  it('odmítne nové heslo shodné se stávajícím', () => {
    const vysledek = zmenaHeslaSchema.safeParse({
      stareHeslo: 'stejne123',
      heslo: 'stejne123',
      hesloZnovu: 'stejne123',
    });

    expect(vysledek.success).toBe(false);
  });

  it('drží stejnou politiku hesla jako registrace', () => {
    // Bez číslice ani bez písmene heslo neprojde; jinak by šlo přes změnu
    // hesla obejít pravidla, která platí při zakládání účtu.
    expect(zmenaHeslaSchema.safeParse({ ...zaklad, heslo: 'kratke1', hesloZnovu: 'kratke1' }).success).toBe(false);
    expect(
      zmenaHeslaSchema.safeParse({ ...zaklad, heslo: 'bezcislic', hesloZnovu: 'bezcislic' }).success
    ).toBe(false);
    expect(
      zmenaHeslaSchema.safeParse({ ...zaklad, heslo: '123456789', hesloZnovu: '123456789' }).success
    ).toBe(false);
  });
});

describe('adresaSchema', () => {
  const zaklad = {
    jmenoPrijmeni: 'Marie Nováková',
    ulice: 'Vodičkova 45',
    mesto: 'Praha 1',
    psc: '110 00',
    typ: 'DODACI',
  };

  it('znormalizuje PSČ a doplní výchozí zemi', () => {
    const v = adresaSchema.parse(zaklad);

    expect(v.psc).toBe('11000');
    expect(v.zeme).toBe('CZ');
    expect(v.jeVychozi).toBe(false);
  });

  it('odmítne nesmyslné PSČ', () => {
    expect(adresaSchema.safeParse({ ...zaklad, psc: '110' }).success).toBe(false);
    expect(adresaSchema.safeParse({ ...zaklad, psc: 'abcde' }).success).toBe(false);
  });

  it('odmítne neznámý typ adresy', () => {
    expect(adresaSchema.safeParse({ ...zaklad, typ: 'SKLADOVA' }).success).toBe(false);
  });

  it('prázdný telefon uloží jako null', () => {
    expect(adresaSchema.parse({ ...zaklad, telefon: '  ' }).telefon).toBeNull();
  });
});

describe('reklamaceSchema', () => {
  const zaklad = {
    orderId: 'o1',
    typ: 'VRACENI',
    duvod: 'Velikost mi bohužel nesedí, kalhoty jsou v pase široké.',
  };

  it('přijme platnou žádost', () => {
    expect(reklamaceSchema.safeParse(zaklad).success).toBe(true);
  });

  it('vyžaduje popis delší než pár znaků', () => {
    // Jednoslovný důvod nedá majitelce nic, z čeho by mohla rozhodnout.
    expect(reklamaceSchema.safeParse({ ...zaklad, duvod: 'nesedi' }).success).toBe(false);
  });

  it('odmítne neznámý typ žádosti', () => {
    expect(reklamaceSchema.safeParse({ ...zaklad, typ: 'STIZNOST' }).success).toBe(false);
  });

  it('položka je nepovinná – žádost může platit pro celou objednávku', () => {
    const v = reklamaceSchema.parse({ ...zaklad, orderItemId: null });

    expect(v.orderItemId).toBeNull();
  });
});
