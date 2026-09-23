import { Prisma } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/lib/db';
import { vytvoritObjednavku } from '@/lib/objednavka';
import { vstupObjednavky, vycistitDatabazi, zalozitNastaveni, zalozitProdukt } from '@/test/data';

/**
 * Založení zásilky u Zásilkovny, nad skutečnou databází.
 *
 * Zásilka **stojí peníze a vzniká u dopravce**, ne jen v naší tabulce. Dvojklik
 * na tlačítko by proto neznamenal jen zmatek v datech, ale dva skutečné balíky
 * a dva vytištěné štítky. Rezervace se kvůli tomu zapisuje podmínkou uvnitř
 * `UPDATE`, ještě než se zavolá API – a právě to tyhle testy hlídají.
 *
 * Druhá polovina je opačný směr: když API selže, rezervace se musí uvolnit.
 * Jinak by jedna chyba u dopravce objednávku zamkla a zásilka by pro ni nešla
 * založit už nikdy.
 */

const stav = vi.hoisted(() => ({ volani: 0, selhat: false }));

vi.mock('@/lib/admin', async () => {
  const { odpovedChyba } = await import('@/lib/api');

  return {
    overitAdmina: async () => ({ email: 'admin@example.cz' }),
    odpovedNeautorizovano: () => odpovedChyba('K této akci nemáte oprávnění.', 403),
    zapsatDoAuditu: async () => undefined,
  };
});

// Fronta v testech neběží; `publishJob` si chybu ošetří sám a vrátí null.
vi.mock('@/lib/queue', () => ({
  FRONTY: { ODESLAT_EMAIL: 'odeslat-email' },
  publishJob: async () => null,
}));

/*
 * Zásilkovna se nevolá doopravdy – test by jinak zakládal skutečné zásilky
 * na účtu majitelky. Počítadlo `volani` je tu to podstatné: říká, kolikrát
 * by u dopravce balík opravdu vznikl.
 */
vi.mock('@/lib/packeta-api', async () => {
  const skutecny = await vi.importActual<typeof import('@/lib/packeta-api')>('@/lib/packeta-api');

  return {
    ...skutecny,
    jeNastaveno: () => true,
    vytvoritZasilku: async () => {
      stav.volani += 1;

      if (stav.selhat) {
        throw new skutecny.ChybaPackety('Zásilkovna zásilku nepřijala.', 'chybí telefon');
      }

      return `Z${1000 + stav.volani}`;
    },
  };
});

const { POST } = await import('./route');

/** Požadavek bez hlavičky Origin – tak, jak dorazí od stejného původu. */
function pozadavek(): Request {
  return new Request('http://localhost:3000/api/admin/objednavky/x/zasilka', { method: 'POST' });
}

async function objednavkaZasilkovnou(navic: Record<string, unknown> = {}) {
  const { variantId } = await zalozitProdukt({ cena: 1000, skladem: 5 });

  const zalozeni = await vytvoritObjednavku(
    vstupObjednavky([{ variantId, mnozstvi: 1 }], {
      zpusobDopravy: 'zasilkovna',
      vydejniMistoId: '452',
      vydejniMistoNazev: 'Sokolov, Gagarinova 2048',
      dodaciTelefon: '+420 607 030 764',
      ...navic,
    }),
    null
  );

  if (!zalozeni.ok) throw new Error('objednávku se nepodařilo založit');
  return zalozeni.data;
}

describe('POST /api/admin/objednavky/[id]/zasilka', () => {
  beforeEach(async () => {
    await vycistitDatabazi();
    await zalozitNastaveni();
    // Doprava bez ceny se vůbec nenabízí, takže bez tohohle objednávka nevznikne.
    await db.settings.update({
      where: { id: 1 },
      data: { cenaDopravyZasilkovna: new Prisma.Decimal(79) },
    });

    stav.volani = 0;
    stav.selhat = false;
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('založí zásilku, uloží číslo a přepne objednávku na expedovanou', async () => {
    const objednavka = await objednavkaZasilkovnou();

    const odpoved = await POST(pozadavek(), { params: { id: objednavka.id } });

    expect(odpoved.status).toBe(200);
    expect(stav.volani).toBe(1);

    const po = await db.order.findUnique({
      where: { id: objednavka.id },
      select: { cisloZasilky: true, stav: true, datumExpedice: true },
    });

    expect(po?.cisloZasilky).toBe('Z1001');
    expect(po?.stav).toBe('EXPEDOVANA');
    expect(po?.datumExpedice).not.toBeNull();
  });

  it('při dvojkliku vznikne právě jedna zásilka', async () => {
    const objednavka = await objednavkaZasilkovnou();

    const [prvni, druhy] = await Promise.all([
      POST(pozadavek(), { params: { id: objednavka.id } }),
      POST(pozadavek(), { params: { id: objednavka.id } }),
    ]);

    // Tohle je ta drahá část: u dopravce smí balík vzniknout jen jednou.
    expect(stav.volani).toBe(1);

    const kody = [prvni.status, druhy.status].sort();
    expect(kody).toEqual([200, 409]);
  });

  it('opakované kliknutí po dokončení zásilku nezaloží podruhé', async () => {
    const objednavka = await objednavkaZasilkovnou();

    await POST(pozadavek(), { params: { id: objednavka.id } });
    const druhy = await POST(pozadavek(), { params: { id: objednavka.id } });

    expect(druhy.status).toBe(409);
    expect(stav.volani).toBe(1);
  });

  it('když Zásilkovna odmítne, rezervace se uvolní a jde to zkusit znovu', async () => {
    const objednavka = await objednavkaZasilkovnou();
    stav.selhat = true;

    const neuspech = await POST(pozadavek(), { params: { id: objednavka.id } });
    expect(neuspech.status).toBe(502);

    const mezitim = await db.order.findUnique({
      where: { id: objednavka.id },
      select: { cisloZasilky: true, stav: true },
    });

    // `null`, ne prázdný řetězec – jinak by objednávka zůstala zamčená.
    expect(mezitim?.cisloZasilky).toBeNull();
    expect(mezitim?.stav).toBe('NOVA');

    stav.selhat = false;
    const opakovane = await POST(pozadavek(), { params: { id: objednavka.id } });
    expect(opakovane.status).toBe(200);

    const po = await db.order.findUnique({
      where: { id: objednavka.id },
      select: { cisloZasilky: true },
    });

    expect(po?.cisloZasilky).toBe('Z1002');
  });

  it('důvod odmítnutí od dopravce se dostane k obsluze', async () => {
    const objednavka = await objednavkaZasilkovnou();
    stav.selhat = true;

    const odpoved = await POST(pozadavek(), { params: { id: objednavka.id } });
    const telo = (await odpoved.json()) as { chyba?: string };

    // „chybí telefon" umí majitelka sama opravit – proto se text ukazuje.
    expect(telo.chyba).toContain('chybí telefon');
  });

  it('objednávku bez výdejního místa odmítne a nic u dopravce nezaloží', async () => {
    /*
     * Pokladna takovou objednávku dnes nepustí – výdejní místo u Zásilkovny
     * vyžaduje. Vzniknout ale mohla dřív, než mapa existovala, a tehdy stačil
     * volný text. Sloupec se proto vynuluje až po založení; test hlídá, že
     * route na takový řádek nesáhne a nezaloží zásilku „nikam".
     */
    const objednavka = await objednavkaZasilkovnou();
    await db.order.update({
      where: { id: objednavka.id },
      data: { vydejniMistoId: null, vydejniMistoNazev: null },
    });

    const odpoved = await POST(pozadavek(), { params: { id: objednavka.id } });

    expect(odpoved.status).toBe(400);
    expect(stav.volani).toBe(0);
  });

  it('objednávku jiným dopravcem odmítne', async () => {
    const { variantId } = await zalozitProdukt({ cena: 1000, skladem: 5 });
    const zalozeni = await vytvoritObjednavku(
      vstupObjednavky([{ variantId, mnozstvi: 1 }], { zpusobDopravy: 'ppl' }),
      null
    );

    if (!zalozeni.ok) throw new Error('objednávku se nepodařilo založit');

    const odpoved = await POST(pozadavek(), { params: { id: zalozeni.data.id } });

    expect(odpoved.status).toBe(400);
    expect(stav.volani).toBe(0);
  });

  it('zrušenou objednávku neodešle', async () => {
    const objednavka = await objednavkaZasilkovnou();
    await db.order.update({ where: { id: objednavka.id }, data: { stav: 'ZRUSENA' } });

    const odpoved = await POST(pozadavek(), { params: { id: objednavka.id } });

    expect(odpoved.status).toBe(409);
    expect(stav.volani).toBe(0);
  });
});
