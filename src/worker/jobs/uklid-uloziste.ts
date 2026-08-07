/**
 * Úklid úložiště – aby e-shop nezaplnil disk.
 *
 * Řeší dvě netěsnosti, kterými by jinak místo pomalu utíkalo:
 *
 * 1. Osiřelé originály ve storage/tmp. Admin vybere fotky v formuláři nového
 *    produktu a pak ho neuloží → originály zůstanou ležet, protože k nim
 *    nikdy nevznikl řádek ProductImage.
 *
 * 2. Zaseknuté fotky ve stavu CEKA. Když se v okamžiku nahrání nepodařilo
 *    oslovit frontu (`publishJob` vrátil null), fotka by čekala navěky.
 *    Tady se úloha doplní.
 */
import path from 'path';
import fs from 'fs/promises';
import { db } from '../../lib/db';
import { TMP_DIR, jePlatnyToken, smazatTise } from '../../lib/uloziste';
import { FRONTY, publishJob, type UlohaZpracovatObrazek } from '../../lib/queue';

/** Originál starší než tohle už na nic nečeká. */
const STARI_HODIN = 24;

export async function uklidUlozisteUloha(): Promise<void> {
  await doplnitZaseknuteFotky();
  await smazatOsireleOriginaly();
}

/** Fotky, které visí v CEKA déle než pár minut, znovu zařadíme do fronty. */
async function doplnitZaseknuteFotky(): Promise<void> {
  const hranice = new Date(Date.now() - 5 * 60 * 1000);

  const zaseknute = await db.productImage.findMany({
    where: {
      stavZpracovani: 'CEKA',
      createdAt: { lt: hranice },
      originalSoubor: { not: null },
    },
    select: { id: true, originalSoubor: true },
    take: 100,
  });

  for (const obrazek of zaseknute) {
    if (!obrazek.originalSoubor) continue;

    const uloha: UlohaZpracovatObrazek = { obrazekId: obrazek.id, token: obrazek.originalSoubor };
    await publishJob(FRONTY.ZPRACOVAT_OBRAZEK, uloha);
    console.log(`[úklid] Fotka ${obrazek.id} uvízla ve frontě, zařazuji znovu.`);
  }
}

/** Dočasné originály, ke kterým už neexistuje žádný čekající řádek. */
async function smazatOsireleOriginaly(): Promise<void> {
  const slozka = path.join(process.cwd(), TMP_DIR);

  let soubory: string[];
  try {
    soubory = await fs.readdir(slozka);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw err;
  }

  if (soubory.length === 0) return;

  // Tokeny, na které se ještě někdo odkazuje – ty se nesmí smazat.
  const pouzivane = new Set(
    (
      await db.productImage.findMany({
        where: { originalSoubor: { not: null } },
        select: { originalSoubor: true },
      })
    )
      .map((o) => o.originalSoubor)
      .filter((t): t is string => t !== null)
  );

  const hranice = Date.now() - STARI_HODIN * 60 * 60 * 1000;
  let smazano = 0;
  let uvolneno = 0;

  for (const soubor of soubory) {
    if (!jePlatnyToken(soubor) || pouzivane.has(soubor)) continue;

    const cesta = path.join(slozka, soubor);

    try {
      const info = await fs.stat(cesta);
      if (info.mtimeMs > hranice) continue; // ještě může patřit k rozdělanému formuláři

      await smazatTise(cesta);
      smazano++;
      uvolneno += info.size;
    } catch {
      // Soubor mezitím zmizel – nic se neděje.
    }
  }

  if (smazano > 0) {
    console.log(`[úklid] Smazáno ${smazano} osiřelých originálů, uvolněno ${Math.round(uvolneno / 1024)} kB.`);
  }
}
