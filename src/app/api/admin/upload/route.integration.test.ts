import fs from 'fs/promises';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { db } from '@/lib/db';
import { cestaTmp } from '@/lib/uloziste';
import { vycistitDatabazi, zalozitProdukt } from '@/test/data';

/**
 * Nahrání fotek v administraci.
 *
 * Endpoint je první článek řetězce: ověří soubor, uloží originál do
 * `storage/tmp` a vrátí token, se kterým se pak fotka připojí k produktu.
 * Když spadne tady, zůstane produkt bez fotek a v databázi po tom není
 * jediná stopa – právě proto se to špatně hledá.
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

const { POST } = await import('./route');

/** Skutečný JPEG, ne vymyšlené bajty – kontrola typu čte hlavičku souboru. */
async function jpeg(sirka = 40, vyska = 30): Promise<Buffer> {
  return sharp({
    create: { width: sirka, height: vyska, channels: 3, background: { r: 200, g: 180, b: 160 } },
  })
    .jpeg()
    .toBuffer();
}

function pozadavek(formData: FormData): Request {
  return new Request('http://localhost:3000/api/admin/upload', { method: 'POST', body: formData });
}

function soubor(obsah: Buffer, nazev: string, typ = 'image/jpeg'): File {
  return new File([new Uint8Array(obsah)], nazev, { type: typ });
}

/**
 * Endpoint zapisuje do skutečného `storage/tmp`. Test po sobě uklízí – jinak
 * by ve vývojovém úložišti zůstávaly cizí soubory a hlášky úklidové úlohy
 * o „osiřelých originálech“ by pak mátly při hledání skutečných problémů.
 */
const vytvorene: string[] = [];

interface OdpovedUploadu {
  nahrane: Array<{ token: string; puvodniNazev: string; obrazekId?: string }>;
  odmitnute: Array<{ nazev: string; duvod: string }>;
}

/** Přečte tělo odpovědi a zároveň si poznamená soubory k úklidu. */
async function telo(odpoved: Response): Promise<OdpovedUploadu> {
  const data = (await odpoved.json()) as OdpovedUploadu;

  for (const nahrana of data.nahrane ?? []) {
    if (nahrana.token) vytvorene.push(cestaTmp(nahrana.token));
  }

  return data;
}

describe('POST /api/admin/upload', () => {
  beforeEach(async () => {
    await vycistitDatabazi();
    stav.admin = { email: 'admin@example.cz' };
  });

  afterEach(async () => {
    for (const cesta of vytvorene.splice(0)) {
      await fs.rm(cesta, { force: true });
    }
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('přijme fotku a vrátí token', async () => {
    const formData = new FormData();
    formData.append('fotky', soubor(await jpeg(), 'saty.jpg'));

    const odpoved = await POST(pozadavek(formData));
    const data = await telo(odpoved);

    expect(odpoved.status).toBe(201);
    expect(data.nahrane).toHaveLength(1);
    expect(data.nahrane[0].token).toMatch(/^[a-f0-9]{32}\.jpg$/);
    expect(data.odmitnute).toHaveLength(0);
  });

  it('s productId založí rovnou řádek fotky ve stavu CEKA', async () => {
    const { productId } = await zalozitProdukt();

    const formData = new FormData();
    formData.append('fotky', soubor(await jpeg(), 'saty.jpg'));
    formData.append('productId', productId);

    const odpoved = await POST(pozadavek(formData));
    const data = await telo(odpoved);

    expect(odpoved.status).toBe(201);
    expect(data.nahrane[0].obrazekId).toBeTruthy();

    const fotka = await db.productImage.findUniqueOrThrow({
      where: { id: data.nahrane[0].obrazekId as string },
    });

    expect(fotka.productId).toBe(productId);
    expect(fotka.stavZpracovani).toBe('CEKA');
    expect(fotka.jeHlavni).toBe(true);
  });

  it('odmítne soubor, který se jen tváří jako obrázek', async () => {
    const formData = new FormData();
    // Přejmenovaný spustitelný soubor s podvrženým MIME typem od prohlížeče.
    formData.append('fotky', soubor(Buffer.from('MZ\x90\x00tohle je .exe'), 'virus.jpg'));

    const odpoved = await POST(pozadavek(formData));

    expect(odpoved.status).toBe(400);
  });

  it('bez souboru vrátí srozumitelnou chybu', async () => {
    const odpoved = await POST(pozadavek(new FormData()));

    expect(odpoved.status).toBe(400);
  });

  it('bez administrátorských práv nepustí dál', async () => {
    stav.admin = null;

    const formData = new FormData();
    formData.append('fotky', soubor(await jpeg(), 'saty.jpg'));

    const odpoved = await POST(pozadavek(formData));

    expect(odpoved.status).toBe(403);
  });
});
