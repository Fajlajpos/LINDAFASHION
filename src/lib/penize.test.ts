import { describe, expect, it } from 'vitest';
import {
  czkNaHalere,
  formatovatCenu,
  formatovatProcentoSlevy,
  mezisoucet,
  prodejniCena,
  slevaKZobrazeni,
  slevaZProcent,
  spocitatObjednavku,
} from './penize';

/**
 * Co se smí ukázat jako sleva – § 12a zák. č. 634/1992 Sb.
 *
 * Přeškrtnutá cena je vždy reference za 30 dnů, nikdy `Product.cena`, a bez
 * reference nebo bez skutečného poklesu pod ni se sleva neoznamuje vůbec.
 */
describe('slevaKZobrazeni', () => {
  it('přeškrtává referenci, spočítá úsporu i procento', () => {
    expect(slevaKZobrazeni(279000, 349000)).toEqual({
      puvodniHaleru: 349000,
      aktualniHaleru: 279000,
      usporaHaleru: 70000,
      procento: 20,
    });
  });

  // Cena zvednutá těsně před akcí: `cena` je 3 990, ale za 30 dnů se prodávalo
  // za 3 490. Přeškrtnout se smí jen 3 490 – a úspora se počítá od ní.
  it('přeškrtnutá je reference, i když byla základní cena vyšší', () => {
    const sleva = slevaKZobrazeni(299000, 349000);
    expect(sleva?.puvodniHaleru).toBe(349000);
    expect(sleva?.usporaHaleru).toBe(50000);
  });

  it('bez reference slevu neoznamuje', () => {
    expect(slevaKZobrazeni(279000, null)).toBeNull();
  });

  it('cena, která pod referenci nespadla, není sleva', () => {
    expect(slevaKZobrazeni(349000, 349000)).toBeNull();
    expect(slevaKZobrazeni(359000, 349000)).toBeNull();
  });
});

describe('formatovatProcentoSlevy', () => {
  it('píše skutečné minus a nezlomitelnou mezeru před %', () => {
    expect(formatovatProcentoSlevy(20)).toBe('−20 %');
  });
});

describe('czkNaHalere', () => {
  it('převádí koruny na celé haléře', () => {
    expect(czkNaHalere(3490)).toBe(349000);
    expect(czkNaHalere('2990.50')).toBe(299050);
  });

  it('zvládne Decimal z Prismy (má toString)', () => {
    expect(czkNaHalere({ toString: () => '1234.56' })).toBe(123456);
  });

  it('nenechá projít nesmyslnou hodnotu', () => {
    expect(() => czkNaHalere('nic')).toThrow();
  });
});

describe('prodejniCena', () => {
  // Sekce 6.6: sleva se počítá z ceny, za kterou se právě prodává.
  it('bere zlevněnou cenu, pokud ji produkt má', () => {
    expect(prodejniCena(2990, 2390)).toBe(239000);
  });

  it('bez zlevněné ceny bere běžnou', () => {
    expect(prodejniCena(2990, null)).toBe(299000);
    expect(prodejniCena(2990)).toBe(299000);
  });
});

describe('slevaZProcent', () => {
  it('spočítá procenta ze základu', () => {
    expect(slevaZProcent(100000, 10)).toBe(10000);
  });

  it('zaokrouhluje dolů, ať sleva nepřeroste slib', () => {
    // 15 % z 333,33 Kč = 4,99995 Kč → 499 haléřů, ne 500
    expect(slevaZProcent(33333, 15)).toBe(4999);
  });

  it('ignoruje záporná procenta a nepřeleze sto', () => {
    expect(slevaZProcent(100000, -5)).toBe(0);
    expect(slevaZProcent(100000, 250)).toBe(100000);
  });
});

describe('mezisoucet', () => {
  it('nenasčítá chybu jako float', () => {
    // 0.1 + 0.2 by ve float aritmetice dalo 0.30000000000000004
    const polozky = [
      { cenaZaKus: czkNaHalere(0.1), mnozstvi: 1 },
      { cenaZaKus: czkNaHalere(0.2), mnozstvi: 1 },
    ];
    expect(mezisoucet(polozky)).toBe(30);
  });

  it('násobí množstvím', () => {
    expect(mezisoucet([{ cenaZaKus: 349000, mnozstvi: 3 }])).toBe(1047000);
  });
});

describe('spocitatObjednavku', () => {
  const polozky = [
    { cenaZaKus: czkNaHalere(3490), mnozstvi: 1 },
    { cenaZaKus: czkNaHalere(1890), mnozstvi: 2 },
  ];

  it('sečte položky a přičte dopravu', () => {
    const r = spocitatObjednavku({ polozky, doprava: czkNaHalere(79) });

    expect(r.mezisoucet).toBe(czkNaHalere(7270));
    expect(r.sleva).toBe(0);
    expect(r.celkem).toBe(czkNaHalere(7349));
    expect(r.kUhrade).toBe(czkNaHalere(7349));
  });

  it('slevu počítá jen ze zboží, ne z dopravy', () => {
    const r = spocitatObjednavku({ polozky, procentoSlevy: 10, doprava: czkNaHalere(100) });

    expect(r.sleva).toBe(czkNaHalere(727));
    expect(r.celkem).toBe(czkNaHalere(7270 - 727 + 100));
  });

  it('poukaz uplatní až po slevě (sekce 6.11)', () => {
    const r = spocitatObjednavku({
      polozky,
      procentoSlevy: 10,
      doprava: 0,
      zustatekPoukazu: czkNaHalere(1000),
    });

    // 7270 − 727 = 6543, poukaz pokryje 1000, zbývá 5543
    expect(r.zPoukazu).toBe(czkNaHalere(1000));
    expect(r.kUhrade).toBe(czkNaHalere(5543));
  });

  it('poukaz nepokryje víc, než kolik zbývá zaplatit', () => {
    const r = spocitatObjednavku({
      polozky: [{ cenaZaKus: czkNaHalere(500), mnozstvi: 1 }],
      zustatekPoukazu: czkNaHalere(2000),
    });

    // Přeplatek by se jinak z poukazu odepsal, aniž by ho zákaznice využila.
    expect(r.zPoukazu).toBe(czkNaHalere(500));
    expect(r.kUhrade).toBe(0);
  });

  it('prázdný košík dá nuly', () => {
    const r = spocitatObjednavku({ polozky: [] });
    expect(r.celkem).toBe(0);
    expect(r.kUhrade).toBe(0);
  });
});

describe('formatovatCenu', () => {
  it('formátuje celé koruny bez desetinných míst', () => {
    // Mezera v tisících je nedělitelná (U+00A0), proto porovnáváme normalizovaně.
    expect(formatovatCenu(349000).replace(/ /g, ' ')).toBe('3 490 Kč');
  });

  it('desetinná místa ukáže, jen když nejsou nulová', () => {
    expect(formatovatCenu(34950).replace(/ /g, ' ')).toBe('349,50 Kč');
  });
});
