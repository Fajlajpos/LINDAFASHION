import fs from 'fs/promises';
import { NextResponse } from 'next/server';
import { cestaUploads } from '@/lib/uloziste';

export const dynamic = 'force-dynamic';

/**
 * Fotky produktů nahrané až za běhu serveru.
 *
 * Produkční Next.js si seznam souborů v `public/` přečte **jednou při startu**
 * (`router-utils/filesystem.js`, `publicFolderItems`) a na nic jiného se
 * neptá. Varianty, které worker uloží do `public/uploads` potom, proto vracely
 * 404 – produkt se uložil, fotky se neukázaly a objevily se až po dalším
 * restartu nebo nasazení. `next dev` složku prochází při každém požadavku,
 * takže ve vývoji chyba vidět nebyla.
 *
 * `next.config.js` sem posílá `/uploads/*` přepisem typu `afterFiles`: soubory
 * známé od startu dál servíruje Next sám, sem dojdou jen ty novější. Adresy
 * v databázi i v `next/image` zůstávají beze změny.
 */

/** Jen to, co vyrábí worker (`<id>_<varianta>.webp`) – žádné `../`, žádné podsložky. */
const NAZEV_VARIANTY = /^[a-z0-9]+_(large|medium|thumb)\.webp$/;

export async function GET(_request: Request, { params }: { params: { soubor: string } }) {
  if (!NAZEV_VARIANTY.test(params.soubor)) {
    return new NextResponse('Nenalezeno', { status: 404 });
  }

  let obsah: Buffer;
  try {
    obsah = await fs.readFile(cestaUploads(params.soubor));
  } catch {
    return new NextResponse('Nenalezeno', { status: 404 });
  }

  return new NextResponse(new Uint8Array(obsah), {
    headers: {
      'Content-Type': 'image/webp',
      'Content-Length': String(obsah.length),
      // Název nese id obrázku, nová fotka tedy vždy dostane nový název.
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
