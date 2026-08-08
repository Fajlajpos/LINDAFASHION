import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/lib/db';
import { vytvoritObjednavku } from '@/lib/objednavka';
import {
  skladem,
  vstupObjednavky,
  vycistitDatabazi,
  zalozitNastaveni,
  zalozitPoukaz,
  zalozitProdukt,
  zalozitSlevovyKod,
} from '@/test/data';

/**
 * Vyřízení reklamace a vrácení v administraci.
 *
 * Uznané vrácení hýbe skladem, počítadlem slevového kódu i zůstatkem poukazu –
 * stejně jako storno, jen z druhé strany. Testy hlídají dvě věci, které se
 * tady historicky rozbily: že se to nespustí dvakrát a že se nevrací jen sklad.
 */

const stav = vi.hoisted(() => ({ admin: { email: 'admin@example.cz' } as { email: string } | null }));

vi.mock('@/lib/admin', async () => {
  const { odpovedChyba } = await import('@/lib/api');

  return {
    overitAdmina: async () => stav.admin,
    odpovedNeautorizovano: () => odpovedChyba('K této akci nemáte oprávnění.', 403),
    // Audit log je vedlejší zápis; do těchhle testů nepatří.
    zapsatDoAuditu: async () => undefined,
  };
});

const { PATCH } = await import('./route');

function pozadavek(telo: unknown): Request {
  return new Request('http://localhost:3000/api/admin/reklamace/x', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(telo),
  });
}

/** Objednávka se dvěma různými položkami, slevovým kódem a poukazem. */
async function pripravitObjednavku() {
  const prvni = await zalozitProdukt({ cena: 1000, skladem: 5, nazev: 'Šaty' });
  const druhy = await zalozitProdukt({ cena: 500, skladem: 5, nazev: 'Halenka' });
  await zalozitSlevovyKod('JARO10', 10);
  await zalozitPoukaz('POUKAZ300', 300);

  const zalozeni = await vytvoritObjednavku(
    vstupObjednavky(
      [
        { variantId: prvni.variantId, mnozstvi: 1 },
        { variantId: druhy.variantId, mnozstvi: 1 },
      ],
      { slevovyKod: 'JARO10', darkovyPoukaz: 'POUKAZ300' }
    ),
    null
  );

  if (!zalozeni.ok) throw new Error('objednávku se nepodařilo založit');

  return { prvni, druhy, orderId: zalozeni.data.id };
}

describe('PATCH /api/admin/reklamace/[id]', () => {
  beforeEach(async () => {
    await vycistitDatabazi();
    await zalozitNastaveni();
    stav.admin = { email: 'admin@example.cz' };
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('uznané vrácení celé objednávky vrátí sklad, kód i poukaz', async () => {
    const { prvni, druhy, orderId } = await pripravitObjednavku();

    const reklamace = await db.reklamace.create({
      data: { orderId, typ: 'VRACENI', duvod: 'Nesedí velikost.' },
    });

    const odpoved = await PATCH(pozadavek({ stav: 'VYRIZENA_UZNANA' }), {
      params: { id: reklamace.id },
    });

    expect(odpoved.status).toBe(200);

    expect(await skladem(prvni.variantId)).toBe(5);
    expect(await skladem(druhy.variantId)).toBe(5);

    const objednavka = await db.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(objednavka.stav).toBe('VRACENA');

    // Do téhle chvíle vrácení sáhlo jen na sklad – kód zůstal vyčerpaný
    // a peníze z poukazu propadly, přestože zboží přišlo zpátky.
    const kod = await db.discountCode.findUniqueOrThrow({ where: { kod: 'JARO10' } });
    expect(kod.pocetPouziti).toBe(0);

    const poukaz = await db.giftCard.findUniqueOrThrow({ where: { kod: 'POUKAZ300' } });
    expect(Number(poukaz.zustatek)).toBe(300);
    expect(poukaz.aktivni).toBe(true);
  });

  /*
   * Regrese: `vracetNaSklad` se počítalo z dat načtených **před** transakcí.
   * Dvojklik na „Uznat" tak prošel dvakrát a sklad se navýšil dvojnásobně.
   */
  it('dvojklik na uznání nevrátí zboží dvakrát', async () => {
    const { prvni, druhy, orderId } = await pripravitObjednavku();

    const reklamace = await db.reklamace.create({
      data: { orderId, typ: 'VRACENI', duvod: 'Nesedí velikost.' },
    });

    const odpovedi = await Promise.all([
      PATCH(pozadavek({ stav: 'VYRIZENA_UZNANA' }), { params: { id: reklamace.id } }),
      PATCH(pozadavek({ stav: 'VYRIZENA_UZNANA' }), { params: { id: reklamace.id } }),
      PATCH(pozadavek({ stav: 'VYRIZENA_UZNANA' }), { params: { id: reklamace.id } }),
    ]);

    expect(odpovedi.filter((o) => o.status === 200)).toHaveLength(1);
    expect(await skladem(prvni.variantId)).toBe(5);
    expect(await skladem(druhy.variantId)).toBe(5);

    const poukaz = await db.giftCard.findUniqueOrThrow({ where: { kod: 'POUKAZ300' } });
    expect(Number(poukaz.zustatek)).toBe(300);
  });

  it('uznaná reklamace sklad nezvyšuje – vadný kus se do prodeje nevrací', async () => {
    const { prvni, orderId } = await pripravitObjednavku();

    const reklamace = await db.reklamace.create({
      data: { orderId, typ: 'REKLAMACE', duvod: 'Rozpáraný šev.' },
    });

    const odpoved = await PATCH(pozadavek({ stav: 'VYRIZENA_UZNANA' }), {
      params: { id: reklamace.id },
    });

    expect(odpoved.status).toBe(200);
    expect(await skladem(prvni.variantId)).toBe(4);

    const objednavka = await db.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(objednavka.stav).not.toBe('VRACENA');
  });

  it('vrácení jedné položky nesahá na zbytek objednávky', async () => {
    const { prvni, druhy, orderId } = await pripravitObjednavku();

    const polozka = await db.orderItem.findFirstOrThrow({
      where: { orderId, variantId: prvni.variantId },
    });

    const reklamace = await db.reklamace.create({
      data: { orderId, orderItemId: polozka.id, typ: 'VRACENI', duvod: 'Vracím jen šaty.' },
    });

    const odpoved = await PATCH(pozadavek({ stav: 'VYRIZENA_UZNANA' }), {
      params: { id: reklamace.id },
    });

    expect(odpoved.status).toBe(200);

    expect(await skladem(prvni.variantId)).toBe(5);
    expect(await skladem(druhy.variantId)).toBe(4);

    // Objednávka dál platí, takže kód ani poukaz se nevrací.
    const objednavka = await db.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(objednavka.stav).not.toBe('VRACENA');

    const kod = await db.discountCode.findUniqueOrThrow({ where: { kod: 'JARO10' } });
    expect(kod.pocetPouziti).toBe(1);

    const poukaz = await db.giftCard.findUniqueOrThrow({ where: { kod: 'POUKAZ300' } });
    expect(Number(poukaz.zustatek)).toBe(0);
  });

  it('u zrušené objednávky vrácení sklad nezdvojí', async () => {
    const { prvni, orderId } = await pripravitObjednavku();

    // Storno už zboží na sklad vrátilo.
    await db.order.update({ where: { id: orderId }, data: { stav: 'ZRUSENA' } });
    await db.productVariant.update({ where: { id: prvni.variantId }, data: { skladem: 5 } });

    const reklamace = await db.reklamace.create({
      data: { orderId, typ: 'VRACENI', duvod: 'Nesedí velikost.' },
    });

    const odpoved = await PATCH(pozadavek({ stav: 'VYRIZENA_UZNANA' }), {
      params: { id: reklamace.id },
    });

    expect(odpoved.status).toBe(409);
    expect(await skladem(prvni.variantId)).toBe(5);
  });

  it('reklamaci s položkou z cizí objednávky odmítne', async () => {
    const { orderId } = await pripravitObjednavku();

    const jinyProdukt = await zalozitProdukt({ cena: 700, skladem: 3 });
    const jinaObjednavka = await vytvoritObjednavku(
      vstupObjednavky([{ variantId: jinyProdukt.variantId, mnozstvi: 1 }]),
      null
    );
    if (!jinaObjednavka.ok) throw new Error('objednávku se nepodařilo založit');

    const cizPolozka = await db.orderItem.findFirstOrThrow({
      where: { orderId: jinaObjednavka.data.id },
    });

    const reklamace = await db.reklamace.create({
      data: { orderId, orderItemId: cizPolozka.id, typ: 'VRACENI', duvod: 'Podvržená položka.' },
    });

    const odpoved = await PATCH(pozadavek({ stav: 'VYRIZENA_UZNANA' }), {
      params: { id: reklamace.id },
    });

    expect(odpoved.status).toBe(409);
    // Zboží z cizí objednávky se nesmí vrátit na sklad.
    expect(await skladem(jinyProdukt.variantId)).toBe(2);
  });

  it('bez administrátorských práv nepustí dál', async () => {
    stav.admin = null;

    const odpoved = await PATCH(pozadavek({ stav: 'VYRIZENA_UZNANA' }), { params: { id: 'x' } });

    expect(odpoved.status).toBe(403);
  });
});
