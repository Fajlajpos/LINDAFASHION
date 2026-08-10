import crypto from 'crypto';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/lib/db';
import { vycistitDatabazi } from '@/test/data';

/**
 * Založení produktu s fotkami.
 *
 * Hlídá se hlavně jedna vlastnost: **hlavní fotka je právě jedna**. Kdyby jich
 * bylo víc, vybíral by si katalog náhodně podle pořadí v dotazu; kdyby žádná,
 * zobrazil by se zástupný symbol, přestože produkt fotky má.
 */

const stav = vi.hoisted(() => ({ admin: { email: 'admin@example.cz' } as { email: string } | null }));

vi.mock('@/lib/admin', async () => {
  const { odpovedChyba } = await import('@/lib/api');

  return {
    overitAdmina: async () => stav.admin,
    odpovedNeautorizovano: () => odpovedChyba('K této akci nemáte oprávnění.', 403),
    zapsatDoAuditu: async () => undefined,
  };
});

// Fronta v testech neběží; `publishJob` si chybu ošetří sám a vrátí null.
vi.mock('@/lib/queue', () => ({
  FRONTY: { ZPRACOVAT_OBRAZEK: 'zpracovat-obrazek' },
  publishJob: async () => null,
}));

const { POST } = await import('./route');

/** Token musí projít `jePlatnyToken` – 32 hex znaků a povolená přípona. */
function token(): string {
  return `${crypto.randomBytes(16).toString('hex')}.jpg`;
}

function pozadavek(telo: unknown): Request {
  return new Request('http://localhost:3000/api/admin/produkty', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(telo),
  });
}

async function kategorie() {
  return db.category.create({ data: { nazev: 'Šaty', slug: 'saty' } });
}

function produkt(categoryId: string, fotky: Array<{ token: string; puvodniNazev: string; jeHlavni?: boolean }>) {
  return {
    nazev: 'Hedvábné šaty Bellissima',
    popis: 'Popis produktu pro test.',
    categoryId,
    cena: 3490,
    varianty: [{ velikost: 'M', skladem: 3 }],
    fotky,
  };
}

describe('POST /api/admin/produkty', () => {
  beforeEach(async () => {
    await vycistitDatabazi();
    stav.admin = { email: 'admin@example.cz' };
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('uloží fotky v poslaném pořadí a označenou udělá hlavní', async () => {
    const kat = await kategorie();

    const odpoved = await POST(
      pozadavek(
        produkt(kat.id, [
          { token: token(), puvodniNazev: 'prvni.jpg' },
          { token: token(), puvodniNazev: 'druha.jpg', jeHlavni: true },
          { token: token(), puvodniNazev: 'treti.jpg' },
        ])
      )
    );

    expect(odpoved.status).toBe(201);

    const fotky = await db.productImage.findMany({ orderBy: { poradi: 'asc' } });

    expect(fotky).toHaveLength(3);
    expect(fotky.map((f) => f.poradi)).toEqual([0, 1, 2]);
    expect(fotky.filter((f) => f.jeHlavni)).toHaveLength(1);
    expect(fotky[1].jeHlavni).toBe(true);
  });

  it('bez označení udělá hlavní první fotku', async () => {
    const kat = await kategorie();

    await POST(
      pozadavek(
        produkt(kat.id, [
          { token: token(), puvodniNazev: 'prvni.jpg' },
          { token: token(), puvodniNazev: 'druha.jpg' },
        ])
      )
    );

    const fotky = await db.productImage.findMany({ orderBy: { poradi: 'asc' } });

    expect(fotky.filter((f) => f.jeHlavni)).toHaveLength(1);
    expect(fotky[0].jeHlavni).toBe(true);
  });

  it('při několika označených zůstane hlavní jen jedna', async () => {
    const kat = await kategorie();

    await POST(
      pozadavek(
        produkt(kat.id, [
          { token: token(), puvodniNazev: 'prvni.jpg', jeHlavni: true },
          { token: token(), puvodniNazev: 'druha.jpg', jeHlavni: true },
        ])
      )
    );

    expect(await db.productImage.count({ where: { jeHlavni: true } })).toBe(1);
  });

  it('zahodí fotku s podvrženým tokenem', async () => {
    const kat = await kategorie();

    const odpoved = await POST(
      pozadavek(
        produkt(kat.id, [
          { token: '../../../etc/passwd', puvodniNazev: 'podvrh.jpg' },
          { token: token(), puvodniNazev: 'poctiva.jpg' },
        ])
      )
    );

    expect(odpoved.status).toBe(201);

    // Do databáze se nesmí dostat cesta, kterou si vymyslel klient.
    const fotky = await db.productImage.findMany();
    expect(fotky).toHaveLength(1);
    expect(fotky[0].originalSoubor).toMatch(/^[a-f0-9]{32}\.jpg$/);
    expect(fotky[0].jeHlavni).toBe(true);
  });

  it('odmítne neexistující kategorii', async () => {
    const odpoved = await POST(pozadavek(produkt('neexistujici', [])));

    expect(odpoved.status).toBe(422);
    expect(await db.product.count()).toBe(0);
  });

  it('bez administrátorských práv nepustí dál', async () => {
    stav.admin = null;
    const odpoved = await POST(pozadavek(produkt('cokoliv', [])));

    expect(odpoved.status).toBe(403);
  });
});
