import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { vytvoritObjednavku } from './objednavka';
import {
  skladem,
  vstupObjednavky,
  vycistitDatabazi,
  zalozitNastaveni,
  zalozitPoukaz,
  zalozitProdukt,
  zalozitSlevovyKod,
} from '../test/data';

/**
 * Založení objednávky nad skutečnou databází.
 *
 * `vytvoritObjednavku` je nejdražší funkce v projektu: v jedné transakci hýbe
 * skladem, počítadlem slevového kódu a zůstatkem dárkového poukazu. Chyba tady
 * znamená buď zboží prodané dvakrát, nebo rozdané peníze – a **žádná z těch
 * chyb se neprojeví u jednoho požadavku**, jen při souběhu. Zesměšněná Prisma
 * by je proto nikdy nezachytila; ověřuje se tu chování databáze samotné.
 */
describe('vytvoritObjednavku', () => {
  beforeEach(async () => {
    await vycistitDatabazi();
    await zalozitNastaveni();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('spočítá objednávku z cen v databázi a sníží sklad', async () => {
    const { variantId } = await zalozitProdukt({ cena: 2500, skladem: 5 });

    const vysledek = await vytvoritObjednavku(vstupObjednavky([{ variantId, mnozstvi: 2 }]), null);

    expect(vysledek.ok).toBe(true);
    if (!vysledek.ok) return;

    // 2 × 2500 + doprava 90
    expect(vysledek.data.celkovaCenaKc).toBe(5090);
    expect(await skladem(variantId)).toBe(3);
  });

  it('počítá ze zlevněné ceny, ne z původní', async () => {
    const { variantId } = await zalozitProdukt({ cena: 2500, cenaPoSleve: 1900 });

    const vysledek = await vytvoritObjednavku(vstupObjednavky([{ variantId, mnozstvi: 1 }]), null);

    expect(vysledek.ok).toBe(true);
    if (!vysledek.ok) return;
    expect(vysledek.data.celkovaCenaKc).toBe(1990);
  });

  it('uloží rozpis, který sedí na celkovou cenu', async () => {
    const { variantId } = await zalozitProdukt({ cena: 1000 });
    await zalozitSlevovyKod('JARO10', 10);

    const vysledek = await vytvoritObjednavku(
      vstupObjednavky([{ variantId, mnozstvi: 3 }], { slevovyKod: 'jaro10' }),
      null
    );

    expect(vysledek.ok).toBe(true);
    if (!vysledek.ok) return;

    const objednavka = await db.order.findUniqueOrThrow({ where: { id: vysledek.data.id } });

    // Rozpis je součást účetního dokladu – musí být uložený, ne dopočítávaný.
    expect(Number(objednavka.mezisoucet)).toBe(3000);
    expect(Number(objednavka.slevaCastka)).toBe(300);
    expect(Number(objednavka.cenaDopravy)).toBe(90);
    expect(
      Number(objednavka.mezisoucet) - Number(objednavka.slevaCastka) + Number(objednavka.cenaDopravy)
    ).toBe(Number(objednavka.celkovaCena));
  });

  /*
   * Tohle je ten test, kvůli kterému integrační testy existují.
   *
   * Kontrola skladu v kroku 1 slouží jen k hezké hlášce; mezi ní a zápisem je
   * mezera, do které se vejde souběžná objednávka. Kdyby podmínka nebyla
   * součástí `UPDATE`, projde jich víc a sklad spadne do minusu – tedy zboží
   * prodané dvakrát.
   */
  it('při souběhu prodá poslední kus jen jednou a sklad nespadne do minusu', async () => {
    const { variantId } = await zalozitProdukt({ cena: 990, skladem: 1 });

    const pokusy = await Promise.all(
      Array.from({ length: 6 }, () =>
        vytvoritObjednavku(vstupObjednavky([{ variantId, mnozstvi: 1 }]), null)
      )
    );

    expect(pokusy.filter((v) => v.ok)).toHaveLength(1);
    expect(pokusy.filter((v) => !v.ok)).toHaveLength(5);
    expect(await skladem(variantId)).toBe(0);
    expect(await db.order.count()).toBe(1);
  });

  /*
   * Číslo objednávky se odvozuje z počtu objednávek v roce, takže dvě naráz
   * spočítají totéž. Unikátní index druhou odmítne a transakce se zopakuje
   * s posunem – bez toho zákaznici vyskočila hláška o obsazené hodnotě
   * a nákup propadl.
   */
  it('při souběhu přidělí každé objednávce vlastní číslo', async () => {
    const { variantId } = await zalozitProdukt({ cena: 500, skladem: 10 });

    const pokusy = await Promise.all(
      Array.from({ length: 5 }, () =>
        vytvoritObjednavku(vstupObjednavky([{ variantId, mnozstvi: 1 }]), null)
      )
    );

    expect(pokusy.every((v) => v.ok)).toBe(true);

    const cisla = pokusy.flatMap((v) => (v.ok ? [v.data.cisloObjednavky] : []));
    expect(new Set(cisla).size).toBe(5);
  });

  it('odmítne víc kusů, než je skladem, a nic nezapíše', async () => {
    const { variantId } = await zalozitProdukt({ skladem: 2 });

    const vysledek = await vytvoritObjednavku(vstupObjednavky([{ variantId, mnozstvi: 3 }]), null);

    expect(vysledek.ok).toBe(false);
    if (vysledek.ok) return;

    expect(vysledek.chyba.status).toBe(409);
    expect(vysledek.chyba.zprava).toContain('zbývá jen 2');
    expect(await db.order.count()).toBe(0);
    expect(await skladem(variantId)).toBe(2);
  });

  it('odmítne skrytý produkt', async () => {
    const { variantId } = await zalozitProdukt({ aktivni: false });

    const vysledek = await vytvoritObjednavku(vstupObjednavky([{ variantId, mnozstvi: 1 }]), null);

    expect(vysledek.ok).toBe(false);
    if (!vysledek.ok) expect(vysledek.chyba.status).toBe(409);
  });

  describe('slevový kód', () => {
    it('sníží cenu a zvýší počítadlo použití', async () => {
      const { variantId } = await zalozitProdukt({ cena: 1000 });
      await zalozitSlevovyKod('JARO25', 25);

      const vysledek = await vytvoritObjednavku(
        vstupObjednavky([{ variantId, mnozstvi: 1 }], { slevovyKod: 'JARO25' }),
        null
      );

      expect(vysledek.ok).toBe(true);
      if (!vysledek.ok) return;

      // 1000 − 250 + 90
      expect(vysledek.data.celkovaCenaKc).toBe(840);

      const kod = await db.discountCode.findUniqueOrThrow({ where: { kod: 'JARO25' } });
      expect(kod.pocetPouziti).toBe(1);
    });

    it('odmítne vyčerpaný kód a chybu vrátí u příslušného pole', async () => {
      const { variantId } = await zalozitProdukt();
      await zalozitSlevovyKod('VYCERPANY', 10, { limitPouziti: 1 });
      await db.discountCode.update({ where: { kod: 'VYCERPANY' }, data: { pocetPouziti: 1 } });

      const vysledek = await vytvoritObjednavku(
        vstupObjednavky([{ variantId, mnozstvi: 1 }], { slevovyKod: 'VYCERPANY' }),
        null
      );

      expect(vysledek.ok).toBe(false);
      if (vysledek.ok) return;

      expect(vysledek.chyba.status).toBe(422);
      expect(vysledek.chyba.pole?.slevovyKod).toBeTruthy();
      // Neplatný kód nesmí objednávku založit ani ukrojit ze skladu.
      expect(await db.order.count()).toBe(0);
      expect(await skladem(variantId)).toBe(5);
    });

    it('odmítne kód po vypršení platnosti', async () => {
      const { variantId } = await zalozitProdukt();
      await zalozitSlevovyKod('LONI', 10, { platnyDo: new Date('2020-01-01') });

      const vysledek = await vytvoritObjednavku(
        vstupObjednavky([{ variantId, mnozstvi: 1 }], { slevovyKod: 'LONI' }),
        null
      );

      expect(vysledek.ok).toBe(false);
    });
  });

  describe('dárkový poukaz', () => {
    it('strhne částku a sníží zůstatek', async () => {
      const { variantId } = await zalozitProdukt({ cena: 1000 });
      await zalozitPoukaz('POUKAZ500', 500);

      const vysledek = await vytvoritObjednavku(
        vstupObjednavky([{ variantId, mnozstvi: 1 }], { darkovyPoukaz: 'poukaz500' }),
        null
      );

      expect(vysledek.ok).toBe(true);
      if (!vysledek.ok) return;

      // 1000 + 90 doprava, z toho 500 z poukazu
      expect(vysledek.data.celkovaCenaKc).toBe(1090);
      expect(vysledek.data.kUhradeKc).toBe(590);

      const poukaz = await db.giftCard.findUniqueOrThrow({ where: { kod: 'POUKAZ500' } });
      expect(Number(poukaz.zustatek)).toBe(0);
      // Vyčerpaný poukaz se nemá nabízet znovu.
      expect(poukaz.aktivni).toBe(false);
    });

    it('nestrhne víc, než kolik je k úhradě, a objednávku rovnou označí za zaplacenou', async () => {
      const { variantId } = await zalozitProdukt({ cena: 200 });
      await zalozitPoukaz('POUKAZ5000', 5000);

      const vysledek = await vytvoritObjednavku(
        vstupObjednavky([{ variantId, mnozstvi: 1 }], { darkovyPoukaz: 'POUKAZ5000' }),
        null
      );

      expect(vysledek.ok).toBe(true);
      if (!vysledek.ok) return;

      expect(vysledek.data.kUhradeKc).toBe(0);

      // Přeplatek se nesmí „ztratit“ – z poukazu odejde jen 290 Kč.
      const poukaz = await db.giftCard.findUniqueOrThrow({ where: { kod: 'POUKAZ5000' } });
      expect(Number(poukaz.zustatek)).toBe(4710);
      expect(poukaz.aktivni).toBe(true);

      const objednavka = await db.order.findUniqueOrThrow({ where: { id: vysledek.data.id } });
      expect(objednavka.stavPlatby).toBe('ZAPLACENO');
    });

    it('odmítne vyčerpaný poukaz', async () => {
      const { variantId } = await zalozitProdukt();
      const poukaz = await zalozitPoukaz('PRAZDNY', 500);
      await db.giftCard.update({ where: { id: poukaz.id }, data: { zustatek: 0 } });

      const vysledek = await vytvoritObjednavku(
        vstupObjednavky([{ variantId, mnozstvi: 1 }], { darkovyPoukaz: 'PRAZDNY' }),
        null
      );

      expect(vysledek.ok).toBe(false);
      if (!vysledek.ok) expect(vysledek.chyba.pole?.darkovyPoukaz).toBeTruthy();
    });
  });

  describe('doprava', () => {
    it('je zdarma nad nastaveným prahem', async () => {
      await zalozitNastaveni({ prahDopravaZdarma: 2000 });
      const { variantId } = await zalozitProdukt({ cena: 2500 });

      const vysledek = await vytvoritObjednavku(vstupObjednavky([{ variantId, mnozstvi: 1 }]), null);

      expect(vysledek.ok).toBe(true);
      if (!vysledek.ok) return;
      expect(vysledek.data.celkovaCenaKc).toBe(2500);
    });

    it('práh se posuzuje z ceny po slevě, ne před ní', async () => {
      await zalozitNastaveni({ prahDopravaZdarma: 2000 });
      const { variantId } = await zalozitProdukt({ cena: 2100 });
      await zalozitSlevovyKod('DESET', 10);

      const vysledek = await vytvoritObjednavku(
        vstupObjednavky([{ variantId, mnozstvi: 1 }], { slevovyKod: 'DESET' }),
        null
      );

      expect(vysledek.ok).toBe(true);
      if (!vysledek.ok) return;

      // Po slevě 1890 < 2000, doprava se tedy platí.
      expect(vysledek.data.celkovaCenaKc).toBe(1980);
    });

    it('odmítne dopravce bez nastavené ceny', async () => {
      await zalozitNastaveni({ cenaDopravyPPL: null });
      const { variantId } = await zalozitProdukt();

      const vysledek = await vytvoritObjednavku(vstupObjednavky([{ variantId, mnozstvi: 1 }]), null);

      expect(vysledek.ok).toBe(false);
      if (!vysledek.ok) expect(vysledek.chyba.pole?.zpusobDopravy).toBeTruthy();
    });
  });

  it('během dovolené s blokací objednávky nepřijímá', async () => {
    await zalozitNastaveni({ rezimDovolene: true, zablokovatObjednavky: true });
    const { variantId } = await zalozitProdukt();

    const vysledek = await vytvoritObjednavku(vstupObjednavky([{ variantId, mnozstvi: 1 }]), null);

    expect(vysledek.ok).toBe(false);
    if (!vysledek.ok) expect(vysledek.chyba.status).toBe(409);
    expect(await db.order.count()).toBe(0);
  });

  it('přihlášené zákaznici vyprázdní košík a připojí objednávku k účtu', async () => {
    const { variantId } = await zalozitProdukt();

    const uzivatel = await db.user.create({
      data: { email: 'zakaznice@example.cz', passwordHash: 'x' },
    });
    const kosik = await db.cart.create({ data: { userId: uzivatel.id } });
    await db.cartItem.create({ data: { cartId: kosik.id, variantId, mnozstvi: 1 } });

    const vysledek = await vytvoritObjednavku(
      vstupObjednavky([{ variantId, mnozstvi: 1 }]),
      uzivatel.id
    );

    expect(vysledek.ok).toBe(true);
    if (!vysledek.ok) return;

    const objednavka = await db.order.findUniqueOrThrow({ where: { id: vysledek.data.id } });
    expect(objednavka.userId).toBe(uzivatel.id);
    expect(await db.cartItem.count({ where: { cartId: kosik.id } })).toBe(0);
  });
});
