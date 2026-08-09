import fs from 'fs/promises';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { db } from '../../lib/db';
import { cestaTmp, cestaUploads, vytvoritToken, zajistitSlozky } from '../../lib/uloziste';
import { zpracovatObrazekUloha } from './zpracovat-obrazek';
import { vycistitDatabazi, zalozitProdukt } from '../../test/data';

/**
 * Celý řetězec zpracování fotky: originál ve `storage/tmp` → tři WebP
 * varianty v `public/uploads` → zápis zpět do databáze.
 *
 * Bez tohohle testu se dalo ověřit jen to, že se soubor nahrál. Jestli ho
 * někdo doopravdy zpracoval, se poznalo až podle toho, že fotka v administraci
 * nikdy nezmizela ze stavu „čeká" – což vypadá jako rozbitý upload, i když je
 * upload v pořádku a jen neběží worker.
 */

/** Soubory, které test vyrobil na disku – po sobě je uklidíme. */
const vytvorene: string[] = [];

async function pripravitOriginal(sirka = 1200, vyska = 900): Promise<string> {
  await zajistitSlozky();

  const token = vytvoritToken('jpg');
  const obsah = await sharp({
    create: { width: sirka, height: vyska, channels: 3, background: { r: 200, g: 180, b: 160 } },
  })
    .jpeg()
    .toBuffer();

  await fs.writeFile(cestaTmp(token), obsah);
  vytvorene.push(cestaTmp(token));

  return token;
}

async function existuje(cesta: string): Promise<boolean> {
  try {
    await fs.access(cesta);
    return true;
  } catch {
    return false;
  }
}

describe('zpracovatObrazekUloha', () => {
  beforeEach(async () => {
    await vycistitDatabazi();
  });

  afterEach(async () => {
    for (const cesta of vytvorene.splice(0)) {
      await fs.rm(cesta, { force: true });
    }
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('vyrobí tři WebP varianty, zapíše je k fotce a smaže originál', async () => {
    const { productId } = await zalozitProdukt();
    const token = await pripravitOriginal();

    const obrazek = await db.productImage.create({
      data: { productId, stavZpracovani: 'CEKA', originalSoubor: token, poradi: 0, jeHlavni: true },
      select: { id: true },
    });

    for (const klic of ['large', 'medium', 'thumb']) {
      vytvorene.push(cestaUploads(`${obrazek.id}_${klic}.webp`));
    }

    await zpracovatObrazekUloha({ obrazekId: obrazek.id, token });

    const hotova = await db.productImage.findUniqueOrThrow({ where: { id: obrazek.id } });

    expect(hotova.stavZpracovani).toBe('HOTOVO');
    expect(hotova.url).toBe(`/uploads/${obrazek.id}_large.webp`);
    expect(hotova.urlMedium).toBe(`/uploads/${obrazek.id}_medium.webp`);
    expect(hotova.urlThumb).toBe(`/uploads/${obrazek.id}_thumb.webp`);

    // Rozměry velké varianty drží `next/image`, aby nedělal CLS.
    expect(hotova.sirka).toBe(1200);
    expect(hotova.vyska).toBe(900);

    expect(await existuje(cestaUploads(`${obrazek.id}_large.webp`))).toBe(true);
    expect(await existuje(cestaUploads(`${obrazek.id}_medium.webp`))).toBe(true);
    expect(await existuje(cestaUploads(`${obrazek.id}_thumb.webp`))).toBe(true);

    // Originál je to hlavní, co drží spotřebu disku dole – po zpracování mizí.
    expect(await existuje(cestaTmp(token))).toBe(false);
    expect(hotova.originalSoubor).toBeNull();
  });

  it('malou fotku nenafoukne', async () => {
    const { productId } = await zalozitProdukt();
    const token = await pripravitOriginal(200, 150);

    const obrazek = await db.productImage.create({
      data: { productId, stavZpracovani: 'CEKA', originalSoubor: token, poradi: 0 },
      select: { id: true },
    });

    for (const klic of ['large', 'medium', 'thumb']) {
      vytvorene.push(cestaUploads(`${obrazek.id}_${klic}.webp`));
    }

    await zpracovatObrazekUloha({ obrazekId: obrazek.id, token });

    const hotova = await db.productImage.findUniqueOrThrow({ where: { id: obrazek.id } });
    expect(hotova.sirka).toBe(200);
    expect(hotova.vyska).toBe(150);
  });

  it('rozbitý soubor označí jako chybu i s důvodem', async () => {
    const { productId } = await zalozitProdukt();

    await zajistitSlozky();
    const token = vytvoritToken('jpg');
    await fs.writeFile(cestaTmp(token), Buffer.from('tohle rozhodně není obrázek'));
    vytvorene.push(cestaTmp(token));

    const obrazek = await db.productImage.create({
      data: { productId, stavZpracovani: 'CEKA', originalSoubor: token, poradi: 0 },
      select: { id: true },
    });

    // Úloha chybu vyhodí dál, aby ji pg-boss mohl zopakovat.
    await expect(zpracovatObrazekUloha({ obrazekId: obrazek.id, token })).rejects.toThrow();

    const chybna = await db.productImage.findUniqueOrThrow({ where: { id: obrazek.id } });

    expect(chybna.stavZpracovani).toBe('CHYBA');
    expect(chybna.chybaDuvod).toBeTruthy();
    // Originál zůstává – opakovaný pokus by bez něj neměl s čím pracovat.
    expect(chybna.originalSoubor).toBe(token);
  });

  it('hotovou fotku podruhé nezpracovává', async () => {
    const { productId } = await zalozitProdukt();
    const token = await pripravitOriginal();

    const obrazek = await db.productImage.create({
      data: {
        productId,
        stavZpracovani: 'HOTOVO',
        url: '/uploads/puvodni_large.webp',
        originalSoubor: null,
        poradi: 0,
      },
      select: { id: true },
    });

    await zpracovatObrazekUloha({ obrazekId: obrazek.id, token });

    const bezeZmeny = await db.productImage.findUniqueOrThrow({ where: { id: obrazek.id } });
    expect(bezeZmeny.url).toBe('/uploads/puvodni_large.webp');
  });

  it('u smazané fotky uklidí originál a skončí', async () => {
    const token = await pripravitOriginal();

    await zpracovatObrazekUloha({ obrazekId: 'neexistujici-id', token });

    expect(await existuje(cestaTmp(token))).toBe(false);
  });
});
