/**
 * Testy nad „nejnižší cenou za 30 dnů“ (§ 12a zák. č. 634/1992 Sb.).
 *
 * Tohle je jediné místo v e-shopu, kde chyba znamená pokutu, ne rozbitý
 * layout – a přitom se chová nenápadně: špatně spočítaná referenční cena
 * stránku nerozbije, jen na ní tiše svítí číslo, které neplatí.
 *
 * Databáze se tu nepotřebuje. Evidence se čte přes dvě metody
 * (`aggregate`, `findFirst`), takže stačí klient, který na ně odpoví –
 * a testy pak popisují **rozhodování**, ne SQL.
 */
import { describe, expect, it } from 'vitest';
import {
  cenaSeZmenila,
  nejnizsiCenaVOkne,
  stavSlevyNovehoProduktu,
  urcitStavSlevy,
  zacatekOkna,
} from './cenova-historie';

/** Záznam evidence tak, jak ho testy zapisují – jen to, na čem záleží. */
interface Zaznam {
  cenaHaleru: number;
  platnaOd: Date;
}

/**
 * Klient nad polem záznamů v paměti.
 *
 * Schválně počítá `_min` i `findFirst` sám, místo aby vracel předpřipravené
 * odpovědi: kdyby jen přehrával, co mu test nadiktuje, ověřoval by, že
 * `nejnizsiCenaVOkne` umí přečíst objekt – ne že správně vymezí okno.
 */
function fakeKlient(zaznamy: Zaznam[]) {
  return {
    priceHistory: {
      aggregate: async ({ where }: { where: { platnaOd: { gte: Date; lt: Date } } }) => {
        const vOkne = zaznamy.filter(
          (z) => z.platnaOd >= where.platnaOd.gte && z.platnaOd < where.platnaOd.lt
        );
        return {
          _min: {
            cenaHaleru: vOkne.length ? Math.min(...vOkne.map((z) => z.cenaHaleru)) : null,
          },
        };
      },
      findFirst: async ({ where }: { where: { platnaOd: { lt: Date } } }) => {
        const predtim = zaznamy
          .filter((z) => z.platnaOd < where.platnaOd.lt)
          .sort((a, b) => b.platnaOd.getTime() - a.platnaOd.getTime());
        return predtim[0] ?? null;
      },
    },
    /*
     * Přetypování je záměr: fake imítuje z `Prisma.TransactionClient` přesně
     * ty dvě metody, které `nejnizsiCenaVOkne` volá. Doplňovat zbylé desítky
     * metod klienta jen kvůli typu by test zahltilo bez jakéhokoli přínosu.
     */
  } as unknown as Parameters<typeof nejnizsiCenaVOkne>[0];
}

const TED = new Date('2026-08-18T12:00:00Z');
const dnyZpet = (d: number) => new Date(TED.getTime() - d * 24 * 60 * 60 * 1000);

describe('zacatekOkna', () => {
  it('vymezí přesně 30 dnů zpět', () => {
    expect(zacatekOkna(TED).toISOString()).toBe('2026-07-19T12:00:00.000Z');
  });
});

describe('nejnizsiCenaVOkne', () => {
  it('vezme nejnižší cenu ze záznamů uvnitř okna', () => {
    const klient = fakeKlient([
      { cenaHaleru: 300000, platnaOd: dnyZpet(25) },
      { cenaHaleru: 250000, platnaOd: dnyZpet(10) },
      { cenaHaleru: 280000, platnaOd: dnyZpet(5) },
    ]);

    return expect(nejnizsiCenaVOkne(klient, 'p1', TED)).resolves.toBe(250000);
  });

  it('započítá i cenu platnou před začátkem okna', async () => {
    /*
     * Nejčastější reálný případ: cena se naposledy měnila před půl rokem.
     * V okně není ani jeden záznam, ale prodávalo se za ni celou dobu –
     * bez tohohle by produkt vypadal jako produkt bez historie.
     */
    const klient = fakeKlient([{ cenaHaleru: 199000, platnaOd: dnyZpet(200) }]);

    await expect(nejnizsiCenaVOkne(klient, 'p1', TED)).resolves.toBe(199000);
  });

  it('vybere nižší z ceny před oknem a cen v okně', async () => {
    const klient = fakeKlient([
      { cenaHaleru: 150000, platnaOd: dnyZpet(90) },
      { cenaHaleru: 220000, platnaOd: dnyZpet(3) },
    ]);

    await expect(nejnizsiCenaVOkne(klient, 'p1', TED)).resolves.toBe(150000);
  });

  it('ignoruje záznamy starší než okno, pokud existuje novější před ním', async () => {
    // Rozhoduje cena, která na začátku okna platila – ne nejnižší cena
    // za celou historii produktu.
    const klient = fakeKlient([
      { cenaHaleru: 100000, platnaOd: dnyZpet(300) },
      { cenaHaleru: 400000, platnaOd: dnyZpet(60) },
    ]);

    await expect(nejnizsiCenaVOkne(klient, 'p1', TED)).resolves.toBe(400000);
  });

  it('bez jakéhokoli záznamu vrací null', async () => {
    await expect(nejnizsiCenaVOkne(fakeKlient([]), 'p1', TED)).resolves.toBeNull();
  });
});

describe('urcitStavSlevy', () => {
  it('bez slevy nedrží referenční cenu', async () => {
    const stav = await urcitStavSlevy(
      fakeKlient([{ cenaHaleru: 300000, platnaOd: dnyZpet(10) }]),
      'p1',
      2990,
      null,
      { cenaPoSleve: 2390, nejnizsiCena30DniHaleru: 299000, slevaOd: dnyZpet(5) },
      TED
    );

    // Konec slevy musí referenční cenu zahodit – jinak by u produktu bez
    // slevy zůstal viset údaj o slevě, která už neběží.
    expect(stav).toEqual({ nejnizsiCena30DniHaleru: null, slevaOd: null });
  });

  it('při začátku slevy zmrazí nejnižší cenu z evidence', async () => {
    const klient = fakeKlient([
      { cenaHaleru: 349000, platnaOd: dnyZpet(40) },
      { cenaHaleru: 299000, platnaOd: dnyZpet(20) },
    ]);

    const stav = await urcitStavSlevy(klient, 'p1', 3490, 2390, {
      cenaPoSleve: null,
      nejnizsiCena30DniHaleru: null,
      slevaOd: null,
    }, TED);

    expect(stav.nejnizsiCena30DniHaleru).toBe(299000);
    expect(stav.slevaOd).toEqual(TED);
  });

  it('při prohlubování slevy referenční cenu NEPŘEPOČÍTÁ', async () => {
    /*
     * Jádro § 12a odst. 3. Kdyby se reference počítala znovu, dala by se
     * povinnost obejít krokováním 3490 → 2990 → 2490: každý krok by si vzal
     * referenci z předchozího a inzerovaná sleva by se scvrkla na pár set,
     * přestože reálná sleva je tisícovka.
     */
    const klient = fakeKlient([
      { cenaHaleru: 349000, platnaOd: dnyZpet(40) },
      { cenaHaleru: 299000, platnaOd: dnyZpet(6) },
    ]);

    const slevaZacala = dnyZpet(6);

    const stav = await urcitStavSlevy(klient, 'p1', 3490, 2490, {
      cenaPoSleve: 2990,
      nejnizsiCena30DniHaleru: 349000,
      slevaOd: slevaZacala,
    }, TED);

    expect(stav.nejnizsiCena30DniHaleru).toBe(349000);
    expect(stav.slevaOd).toEqual(slevaZacala);
  });

  it('po přerušení slevy referenční cenu spočítá znovu', async () => {
    // Sleva skončila (`cenaPoSleve` byla null) a začíná nová akce –
    // tohle už není postupné zvyšování, reference se bere aktuální.
    const klient = fakeKlient([
      { cenaHaleru: 349000, platnaOd: dnyZpet(40) },
      { cenaHaleru: 259000, platnaOd: dnyZpet(15) },
    ]);

    const stav = await urcitStavSlevy(klient, 'p1', 3490, 2290, {
      cenaPoSleve: null,
      nejnizsiCena30DniHaleru: null,
      slevaOd: null,
    }, TED);

    expect(stav.nejnizsiCena30DniHaleru).toBe(259000);
  });

  it('u produktu bez evidence padne zpět na základní cenu', async () => {
    // § 12a odst. 2: u zboží v prodeji kratší než 30 dnů je referenční cenou
    // nejnižší cena od začátku prodeje – u nového produktu tedy jeho cena.
    const stav = await urcitStavSlevy(fakeKlient([]), 'p1', 3490, 2990, null, TED);

    expect(stav.nejnizsiCena30DniHaleru).toBe(349000);
  });
});

describe('stavSlevyNovehoProduktu', () => {
  it('nový produkt bez slevy nemá referenční cenu', () => {
    expect(stavSlevyNovehoProduktu(3490, null)).toEqual({
      nejnizsiCena30DniHaleru: null,
      slevaOd: null,
    });
  });

  it('nový produkt se slevou má referenční cenu rovnou své základní ceně', () => {
    const stav = stavSlevyNovehoProduktu(3490, 2990, TED);
    expect(stav.nejnizsiCena30DniHaleru).toBe(349000);
    expect(stav.slevaOd).toEqual(TED);
  });
});

describe('cenaSeZmenila', () => {
  it('stejné ceny neznamenají změnu', () => {
    // Bez téhle podmínky by každá úprava popisku přidala do evidence další
    // řádek se stejnou částkou a doklad pro ČOI by se utopil v šumu.
    expect(cenaSeZmenila({ cena: 3490, cenaPoSleve: null }, { cena: 3490, cenaPoSleve: null })).toBe(
      false
    );
  });

  it('zachytí změnu základní ceny', () => {
    expect(cenaSeZmenila({ cena: 3490, cenaPoSleve: null }, { cena: 3290, cenaPoSleve: null })).toBe(
      true
    );
  });

  it('zachytí začátek i konec slevy', () => {
    expect(cenaSeZmenila({ cena: 3490, cenaPoSleve: null }, { cena: 3490, cenaPoSleve: 2990 })).toBe(
      true
    );
    expect(cenaSeZmenila({ cena: 3490, cenaPoSleve: 2990 }, { cena: 3490, cenaPoSleve: null })).toBe(
      true
    );
  });

  it("porovnává v haléřích, takže ʼ3490ʼ a 3490 jsou totéž", () => {
    // Z formuláře chodí ceny jako řetězce, z databáze jako Decimal.
    expect(cenaSeZmenila({ cena: '3490', cenaPoSleve: null }, { cena: 3490, cenaPoSleve: null })).toBe(
      false
    );
  });
});
