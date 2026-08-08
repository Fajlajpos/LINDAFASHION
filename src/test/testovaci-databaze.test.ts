import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  adresaSpravcovska,
  adresaTestovaciDatabaze,
  nazevDatabaze,
  overitBezpecnostAdresy,
} from './testovaci-databaze';

/**
 * Integrační testy mažou tabulky. Kdyby se do nich dostala adresa vývojové
 * databáze, přišla by zákaznice o data – takže tahle pojistka je jediné, co
 * mezi testy a ztrátou dat stojí. Proto má vlastní testy.
 */
describe('overitBezpecnostAdresy', () => {
  it('pustí databázi končící na _test', () => {
    expect(() =>
      overitBezpecnostAdresy('postgresql://u:p@localhost:5433/linda_fashion_test')
    ).not.toThrow();
  });

  it('odmítne vývojovou databázi', () => {
    expect(() => overitBezpecnostAdresy('postgresql://u:p@localhost:5433/linda_fashion')).toThrow(
      /linda_fashion/
    );
  });

  it('odmítne produkční databázi, i když je jinak pojmenovaná', () => {
    expect(() => overitBezpecnostAdresy('postgresql://u:p@db.server:5432/produkce')).toThrow();
  });

  it('nenechá se zmást příponou uprostřed názvu', () => {
    // `_test_zaloha` na `_test` nekončí – projít nesmí.
    expect(() =>
      overitBezpecnostAdresy('postgresql://u:p@localhost:5433/linda_test_zaloha')
    ).toThrow();
  });
});

describe('adresaTestovaciDatabaze', () => {
  const puvodni = { url: process.env.DATABASE_URL, test: process.env.DATABASE_URL_TEST };

  beforeEach(() => {
    delete process.env.DATABASE_URL;
    delete process.env.DATABASE_URL_TEST;
  });

  afterEach(() => {
    if (puvodni.url === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = puvodni.url;

    if (puvodni.test === undefined) delete process.env.DATABASE_URL_TEST;
    else process.env.DATABASE_URL_TEST = puvodni.test;
  });

  it('odvodí název s příponou _test z vývojové adresy', () => {
    process.env.DATABASE_URL = 'postgresql://u:p@localhost:5433/linda_fashion?schema=public';

    const adresa = adresaTestovaciDatabaze();

    expect(adresa).not.toBeNull();
    expect(nazevDatabaze(adresa as string)).toBe('linda_fashion_test');
    // Parametry připojení musí zůstat zachované.
    expect(adresa).toContain('schema=public');
  });

  it('příponu nepřidá dvakrát', () => {
    process.env.DATABASE_URL = 'postgresql://u:p@localhost:5433/linda_fashion_test';

    expect(nazevDatabaze(adresaTestovaciDatabaze() as string)).toBe('linda_fashion_test');
  });

  it('dá přednost výslovně zadané DATABASE_URL_TEST', () => {
    process.env.DATABASE_URL = 'postgresql://u:p@localhost:5433/linda_fashion';
    process.env.DATABASE_URL_TEST = 'postgresql://u:p@jinde:5432/vlastni_test';

    expect(nazevDatabaze(adresaTestovaciDatabaze() as string)).toBe('vlastni_test');
  });

  it('bez nastavené adresy vrátí null, ne rozbitou hodnotu', () => {
    expect(adresaTestovaciDatabaze()).toBeNull();
  });

  it('nespadne na nesmyslné adrese', () => {
    process.env.DATABASE_URL = 'tohle-neni-url';

    expect(adresaTestovaciDatabaze()).toBeNull();
  });
});

describe('adresaSpravcovska', () => {
  it('přesměruje na systémovou databázi a zahodí parametry', () => {
    const adresa = adresaSpravcovska('postgresql://u:p@localhost:5433/linda_fashion_test?schema=public');

    expect(nazevDatabaze(adresa)).toBe('postgres');
    expect(adresa).not.toContain('schema=public');
  });
});
