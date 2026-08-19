import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/db';
import { vycistitDatabazi } from '@/test/data';
import { najitProOdstoupeni } from '@/lib/odstoupeni';

/**
 * Vyhledání objednávky pro odstoupení od smlouvy.
 *
 * Testuje se nad skutečnou databází, protože jádro věci je dotaz: shoda
 * e-mailu bez ohledu na velikost písmen a dopočet toho, které položky už
 * pokrývá dřívější žádost. Zesměšněná Prisma by potvrdila jen to, že jsme
 * `where` napsali tak, jak jsme ho napsali.
 */

async function zalozitObjednavku(pocetPolozek = 2) {
  const kategorie = await db.category.create({
    data: { nazev: 'Šaty', slug: `saty-${Date.now()}` },
  });

  const produkt = await db.product.create({
    data: {
      nazev: 'Lněné šaty',
      slug: `lnene-saty-${Date.now()}`,
      popis: 'Test',
      cena: 2990,
      categoryId: kategorie.id,
    },
  });

  const varianty = await Promise.all(
    Array.from({ length: pocetPolozek }, (_, i) =>
      db.productVariant.create({
        data: { productId: produkt.id, velikost: `S${i}`, skladem: 5 },
      })
    )
  );

  return db.order.create({
    data: {
      cisloObjednavky: `2026-0000${Math.floor(Math.random() * 9) + 1}`,
      email: 'Jana.Novakova@Example.COM',
      celkovaCena: 2990 * pocetPolozek,
      zpusobDopravy: 'ppl',
      zpusobPlatby: 'bankovni_prevod',
      stavPlatby: 'ZAPLACENO',
      stav: 'DORUCENA',
      datumDoruceni: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      dodaciJmenoPrijmeni: 'Jana Nováková',
      dodaciUlice: 'Dlouhá 1',
      dodaciMesto: 'Praha',
      dodaciPsc: '11000',
      items: {
        create: varianty.map((v) => ({ variantId: v.id, mnozstvi: 1, cenaVDobeNakupu: 2990 })),
      },
    },
    include: { items: true },
  });
}

beforeEach(async () => {
  await vycistitDatabazi();
});

afterAll(async () => {
  await db.$disconnect();
});

describe('najitProOdstoupeni – autorizace bez přihlášení', () => {
  it('najde objednávku podle tokenu', async () => {
    const objednavka = await zalozitObjednavku();

    const { objednavka: nalezena, duvod } = await najitProOdstoupeni({
      token: objednavka.verejnyToken,
    });

    expect(duvod).toBeNull();
    expect(nalezena?.cisloObjednavky).toBe(objednavka.cisloObjednavky);
  });

  it('e-mail porovnává bez ohledu na velikost písmen', async () => {
    // Zákaznice ho do formuláře napíše, jak ji napadne, ne jak ho máme uložený.
    const objednavka = await zalozitObjednavku();

    const { duvod } = await najitProOdstoupeni({
      cisloObjednavky: objednavka.cisloObjednavky,
      email: 'jana.novakova@example.com',
    });

    expect(duvod).toBeNull();
  });

  it('samotné číslo objednávky se špatným e-mailem nestačí', async () => {
    // Čísla jdou po sobě – kdyby stačila, dalo by se jimi procházet cizí nákupy.
    const objednavka = await zalozitObjednavku();

    const { duvod } = await najitProOdstoupeni({
      cisloObjednavky: objednavka.cisloObjednavky,
      email: 'nekdo.jiny@example.com',
    });

    expect(duvod).toBe('nenalezeno');
  });
});

describe('najitProOdstoupeni – částečné odstoupení', () => {
  it('po vrácení jednoho kusu nechá druhý vrátit taky', async () => {
    // Odstoupit lze i částečně. Původní kontrola blokovala jakoukoli druhou
    // žádost, takže zákaznici, která minulý týden vrátila jedny šaty, upírala
    // právo, na které jí lhůta pořád běží.
    const objednavka = await zalozitObjednavku(2);
    const [prvni] = objednavka.items;

    await db.reklamace.create({
      data: { orderId: objednavka.id, orderItemId: prvni.id, typ: 'VRACENI' },
    });

    const { duvod, jizPodanePolozky } = await najitProOdstoupeni({
      token: objednavka.verejnyToken,
    });

    expect(duvod).toBeNull();
    expect(jizPodanePolozky).toEqual([prvni.id]);
  });

  it('když už jsou pokryté všechny položky, odmítne další žádost', async () => {
    const objednavka = await zalozitObjednavku(2);

    for (const polozka of objednavka.items) {
      await db.reklamace.create({
        data: { orderId: objednavka.id, orderItemId: polozka.id, typ: 'VRACENI' },
      });
    }

    const { duvod } = await najitProOdstoupeni({ token: objednavka.verejnyToken });

    expect(duvod).toBe('jiz_podano');
  });

  it('odstoupení od celé objednávky (bez položky) pokrývá všechno', async () => {
    const objednavka = await zalozitObjednavku(2);

    await db.reklamace.create({
      data: { orderId: objednavka.id, orderItemId: null, typ: 'VRACENI' },
    });

    const { duvod } = await najitProOdstoupeni({ token: objednavka.verejnyToken });

    expect(duvod).toBe('jiz_podano');
  });

  it('vyřízená žádost už další odstoupení neblokuje', async () => {
    const objednavka = await zalozitObjednavku(1);

    await db.reklamace.create({
      data: {
        orderId: objednavka.id,
        orderItemId: objednavka.items[0].id,
        typ: 'VRACENI',
        stav: 'VYRIZENA_ZAMITNUTA',
      },
    });

    const { duvod, jizPodanePolozky } = await najitProOdstoupeni({
      token: objednavka.verejnyToken,
    });

    expect(duvod).toBeNull();
    expect(jizPodanePolozky).toEqual([]);
  });
});

describe('najitProOdstoupeni – lhůty a stavy', () => {
  it('po čtrnácti dnech od doručení odmítne', async () => {
    const objednavka = await zalozitObjednavku();

    await db.order.update({
      where: { id: objednavka.id },
      data: { datumDoruceni: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) },
    });

    const { duvod } = await najitProOdstoupeni({ token: objednavka.verejnyToken });

    expect(duvod).toBe('lhuta_vyprsela');
  });

  it('nedoručenou objednávku pustí dál – lhůta ještě nezačala běžet', async () => {
    const objednavka = await zalozitObjednavku();

    await db.order.update({
      where: { id: objednavka.id },
      data: { datumDoruceni: null, stav: 'EXPEDOVANA' },
    });

    const { duvod } = await najitProOdstoupeni({ token: objednavka.verejnyToken });

    expect(duvod).toBeNull();
  });

  it('u zrušené objednávky nemá odstoupení od čeho', async () => {
    const objednavka = await zalozitObjednavku();

    await db.order.update({ where: { id: objednavka.id }, data: { stav: 'ZRUSENA' } });

    const { duvod } = await najitProOdstoupeni({ token: objednavka.verejnyToken });

    expect(duvod).toBe('uzavrena');
  });
});
