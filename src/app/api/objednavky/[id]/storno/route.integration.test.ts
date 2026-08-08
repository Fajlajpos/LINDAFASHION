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
 * Storno objednávky zákaznicí, nad skutečnou databází.
 *
 * Storno **rozdává peníze**: vrací zboží na sklad, uvolňuje limit slevového
 * kódu a připisuje zpět zůstatek dárkového poukazu. Když se spustí dvakrát,
 * přijde e-shop o zboží i o peníze – a projeví se to jen při souběhu, který
 * vyrobí obyčejný dvojklik na tlačítko. Přesně na to jsou tyhle testy.
 */

/*
 * `overitUzivatele` sahá na `next/headers`, které mimo požadavek Next.js
 * neexistuje. Nahrazujeme celý modul; přihlášenou zákaznici pak řídí
 * `prihlasenyUzivatel` níž.
 */
const stav = vi.hoisted(() => ({ prihlasenyUzivatel: null as { id: string } | null }));

vi.mock('@/lib/auth', () => ({
  overitUzivatele: async () => stav.prihlasenyUzivatel,
}));

const { POST } = await import('./route');

/** Požadavek bez hlavičky Origin – tak, jak dorazí od stejného původu. */
function pozadavek(): Request {
  return new Request('http://localhost:3000/api/objednavky/x/storno', { method: 'POST' });
}

async function zalozitZakaznici(email = 'zakaznice@example.cz') {
  const uzivatel = await db.user.create({ data: { email, passwordHash: 'x' } });
  stav.prihlasenyUzivatel = { id: uzivatel.id };
  return uzivatel;
}

describe('POST /api/objednavky/[id]/storno', () => {
  beforeEach(async () => {
    await vycistitDatabazi();
    await zalozitNastaveni();
    stav.prihlasenyUzivatel = null;
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('vrátí zboží na sklad, uvolní slevový kód i poukaz', async () => {
    const uzivatel = await zalozitZakaznici();
    const { variantId } = await zalozitProdukt({ cena: 1000, skladem: 5 });
    await zalozitSlevovyKod('JARO10', 10);
    await zalozitPoukaz('POUKAZ300', 300);

    const zalozeni = await vytvoritObjednavku(
      vstupObjednavky([{ variantId, mnozstvi: 2 }], {
        slevovyKod: 'JARO10',
        darkovyPoukaz: 'POUKAZ300',
      }),
      uzivatel.id
    );

    expect(zalozeni.ok).toBe(true);
    if (!zalozeni.ok) return;

    expect(await skladem(variantId)).toBe(3);

    const odpoved = await POST(pozadavek(), { params: { id: zalozeni.data.id } });
    expect(odpoved.status).toBe(200);

    expect(await skladem(variantId)).toBe(5);

    const objednavka = await db.order.findUniqueOrThrow({ where: { id: zalozeni.data.id } });
    expect(objednavka.stav).toBe('ZRUSENA');
    expect(objednavka.zrusil).toBe('ZAKAZNICE');

    const kod = await db.discountCode.findUniqueOrThrow({ where: { kod: 'JARO10' } });
    expect(kod.pocetPouziti).toBe(0);

    const poukaz = await db.giftCard.findUniqueOrThrow({ where: { kod: 'POUKAZ300' } });
    expect(Number(poukaz.zustatek)).toBe(300);
    expect(poukaz.aktivni).toBe(true);
  });

  /*
   * Regrese: kontrola stavu bývala nad `UPDATE`, ne v něm. Dvojklik poslal dva
   * požadavky, oba přečetly stav NOVA, oba prošly – a zboží se vrátilo na
   * sklad dvakrát, stejně jako zůstatek poukazu. Tohle je ta dražší strana
   * závodu: storno vydává peníze.
   */
  it('dvojklik vrátí zboží i peníze jen jednou', async () => {
    const uzivatel = await zalozitZakaznici();
    const { variantId } = await zalozitProdukt({ cena: 1000, skladem: 5 });
    await zalozitPoukaz('POUKAZ300', 300);

    const zalozeni = await vytvoritObjednavku(
      vstupObjednavky([{ variantId, mnozstvi: 2 }], { darkovyPoukaz: 'POUKAZ300' }),
      uzivatel.id
    );
    if (!zalozeni.ok) throw new Error('objednávku se nepodařilo založit');

    const odpovedi = await Promise.all([
      POST(pozadavek(), { params: { id: zalozeni.data.id } }),
      POST(pozadavek(), { params: { id: zalozeni.data.id } }),
      POST(pozadavek(), { params: { id: zalozeni.data.id } }),
    ]);

    expect(odpovedi.filter((o) => o.status === 200)).toHaveLength(1);

    // Kdyby zámek nefungoval, bylo by tu 7 nebo 9 kusů a 600 nebo 900 Kč.
    expect(await skladem(variantId)).toBe(5);

    const poukaz = await db.giftCard.findUniqueOrThrow({ where: { kod: 'POUKAZ300' } });
    expect(Number(poukaz.zustatek)).toBe(300);
  });

  it('cizí objednávku neprozradí ani její existencí', async () => {
    const cizi = await zalozitZakaznici('cizi@example.cz');
    const { variantId } = await zalozitProdukt();

    const zalozeni = await vytvoritObjednavku(vstupObjednavky([{ variantId, mnozstvi: 1 }]), cizi.id);
    if (!zalozeni.ok) throw new Error('objednávku se nepodařilo založit');

    // Přihlásíme někoho jiného.
    await zalozitZakaznici('utocnice@example.cz');

    const odpoved = await POST(pozadavek(), { params: { id: zalozeni.data.id } });

    expect(odpoved.status).toBe(404);
    // Sklad se nesmí pohnout.
    expect(await skladem(variantId)).toBe(4);
  });

  it('nedovolí zrušit objednávku, kterou už majitelka zpracovává', async () => {
    const uzivatel = await zalozitZakaznici();
    const { variantId } = await zalozitProdukt();

    const zalozeni = await vytvoritObjednavku(
      vstupObjednavky([{ variantId, mnozstvi: 1 }]),
      uzivatel.id
    );
    if (!zalozeni.ok) throw new Error('objednávku se nepodařilo založit');

    await db.order.update({ where: { id: zalozeni.data.id }, data: { stav: 'EXPEDOVANA' } });

    const odpoved = await POST(pozadavek(), { params: { id: zalozeni.data.id } });

    expect(odpoved.status).toBe(409);
    expect(await skladem(variantId)).toBe(4);
  });

  it('nepřihlášenou zákaznici odmítne', async () => {
    stav.prihlasenyUzivatel = null;

    const odpoved = await POST(pozadavek(), { params: { id: 'cokoliv' } });

    expect(odpoved.status).toBe(401);
  });
});
