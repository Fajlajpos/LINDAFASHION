import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/db';
import { vycistitDatabazi } from '@/test/data';
import { RETENCE, hranice, spustitRetenci } from '@/lib/retence';

/**
 * Retence osobních údajů nad skutečnou databází.
 *
 * Zesměšněná Prisma by tady neověřila to podstatné. Celá hodnota téhle úlohy
 * je v tom, **co po ní v databázi zbude** – a stejně důležité je, co zbýt
 * musí. Smazat doklad nebo záznam o souhlasu je horší vada než nesmazat
 * starou zprávu z formuláře: první porušuje jiný zákon a nedá se vzít zpět.
 */

/** Datum o `dnu` dnů starší, než je hranice daného pravidla. */
function starsiNez(dnu: number): Date {
  return new Date(hranice(dnu).getTime() - 24 * 60 * 60 * 1000);
}

async function zalozitObjednavkuSIp(vek: number) {
  return db.order.create({
    data: {
      cisloObjednavky: `2026-${String(Math.floor(Math.random() * 90000) + 10000)}`,
      celkovaCena: 1000,
      zpusobDopravy: 'ppl',
      zpusobPlatby: 'bankovni_prevod',
      stavPlatby: 'ZAPLACENO',
      dodaciJmenoPrijmeni: 'Jana Nováková',
      dodaciUlice: 'Dlouhá 1',
      dodaciMesto: 'Praha',
      dodaciPsc: '11000',
      ipObjednavky: '192.0.2.10',
      createdAt: starsiNez(vek),
    },
  });
}

beforeEach(async () => {
  await vycistitDatabazi();
});

afterAll(async () => {
  await db.$disconnect();
});

describe('spustitRetenci – co se maže', () => {
  it('smaže staré zprávy z kontaktního formuláře a nechá čerstvé', async () => {
    await db.contactMessage.create({
      data: {
        jmeno: 'Stará',
        email: 'stara@example.com',
        zprava: 'Dotaz z loňska',
        createdAt: starsiNez(RETENCE.zpravyDnu),
      },
    });
    await db.contactMessage.create({
      data: { jmeno: 'Nová', email: 'nova@example.com', zprava: 'Dotaz z dneška' },
    });

    const vysledek = await spustitRetenci();

    expect(vysledek.zpravy).toBe(1);
    const zbyle = await db.contactMessage.findMany();
    expect(zbyle).toHaveLength(1);
    expect(zbyle[0].jmeno).toBe('Nová');
  });

  it('smaže vyřízené hlídání skladu dřív než nevyřízené', async () => {
    const kategorie = await db.category.create({
      data: { nazev: 'Šaty', slug: 'saty-retence' },
    });
    const produkt = await db.product.create({
      data: {
        nazev: 'Lněné šaty',
        slug: 'lnene-saty-retence',
        popis: 'Test',
        cena: 2000,
        categoryId: kategorie.id,
      },
    });
    const varianta = await db.productVariant.create({
      data: { productId: produkt.id, velikost: 'M', skladem: 0 },
    });

    // Vyřízené a starší než 90 dnů → pryč.
    await db.stockNotification.create({
      data: {
        email: 'vyrizeno@example.com',
        variantId: varianta.id,
        vyrizeno: true,
        createdAt: starsiNez(RETENCE.hlidaniVyrizenoDnu),
      },
    });

    // Nevyřízené a stejně staré → zůstává, roční lhůta ještě neuplynula.
    await db.stockNotification.create({
      data: {
        email: 'ceka@example.com',
        variantId: varianta.id,
        vyrizeno: false,
        createdAt: starsiNez(RETENCE.hlidaniVyrizenoDnu),
      },
    });

    const vysledek = await spustitRetenci();

    expect(vysledek.hlidani).toBe(1);
    const zbyla = await db.stockNotification.findMany();
    expect(zbyla).toHaveLength(1);
    expect(zbyla[0].email).toBe('ceka@example.com');
  });

  it('vynuluje starou IP u objednávky, ale objednávku nechá být', async () => {
    const stara = await zalozitObjednavkuSIp(RETENCE.ipObjednavkyDnu);

    const vysledek = await spustitRetenci();

    expect(vysledek.ipObjednavek).toBe(1);

    const poUklidu = await db.order.findUnique({ where: { id: stara.id } });
    // Objednávka je účetní doklad – zmizet nesmí ani po deseti letech.
    expect(poUklidu).not.toBeNull();
    expect(poUklidu?.ipObjednavky).toBeNull();
    expect(poUklidu?.celkovaCena.toString()).toBe('1000');
  });

  it('nepočítá znovu objednávky, kterým už IP smazal', async () => {
    await zalozitObjednavkuSIp(RETENCE.ipObjednavkyDnu);

    await spustitRetenci();
    const druhyBeh = await spustitRetenci();

    // Bez podmínky `not: null` by druhý běh hlásil totéž číslo znovu a do logu
    // by každou noc psal tisíce „smazaných" IP, které tam dávno nebyly.
    expect(druhyBeh.ipObjednavek).toBe(0);
  });

  it('smaže nepotvrzenou přihlášku k newsletteru – souhlas nikdy nevznikl', async () => {
    await db.newsletterSubscriber.create({
      data: {
        email: 'nepotvrzeno@example.com',
        potvrzeno: false,
        createdAt: starsiNez(RETENCE.nepotvrzenyNewsletterDnu),
      },
    });
    await db.newsletterSubscriber.create({
      data: {
        email: 'potvrzeno@example.com',
        potvrzeno: true,
        potvrzenoAt: new Date(),
        createdAt: starsiNez(RETENCE.nepotvrzenyNewsletterDnu),
      },
    });

    const vysledek = await spustitRetenci();

    expect(vysledek.newsletterNepotvrzeny).toBe(1);
    const zbyli = await db.newsletterSubscriber.findMany();
    expect(zbyli).toHaveLength(1);
    expect(zbyli[0].email).toBe('potvrzeno@example.com');
  });
});

describe('spustitRetenci – co zůstat musí', () => {
  it('nesahá na souhlas s newsletterem ani s podmínkami, jakkoli je starý', async () => {
    // Čl. 7 odst. 1 GDPR: správce musí umět souhlas doložit. Smazat důkaz
    // kvůli „úklidu" znamená přijít o obhajobu, ne uklidit.
    const davno = starsiNez(RETENCE.souhlasCookiesDnu * 2);

    await db.souhlasZaznam.create({
      data: { typ: 'NEWSLETTER', subjekt: 'jana@example.com', udeleno: true, createdAt: davno },
    });
    await db.souhlasZaznam.create({
      data: {
        typ: 'OBCHODNI_PODMINKY',
        subjekt: 'jana@example.com',
        udeleno: true,
        createdAt: davno,
      },
    });
    await db.souhlasZaznam.create({
      data: { typ: 'COOKIES', subjekt: 'nahodne-id', udeleno: true, createdAt: davno },
    });

    const vysledek = await spustitRetenci();

    expect(vysledek.souhlasyCookies).toBe(1);

    const zbyle = await db.souhlasZaznam.findMany({ orderBy: { typ: 'asc' } });
    expect(zbyle.map((z) => z.typ)).toEqual(['NEWSLETTER', 'OBCHODNI_PODMINKY']);
  });

  it('nemaže objednávky ani jejich položky', async () => {
    const objednavka = await zalozitObjednavkuSIp(RETENCE.ipObjednavkyDnu * 3);

    await spustitRetenci();

    expect(await db.order.count()).toBe(1);
    expect((await db.order.findUnique({ where: { id: objednavka.id } }))?.cisloObjednavky).toBe(
      objednavka.cisloObjednavky
    );
  });
});
