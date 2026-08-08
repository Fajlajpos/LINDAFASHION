/**
 * Úklid úložiště – aby e-shop nezaplnil disk.
 *
 * Řeší čtyři netěsnosti, kterými by jinak místo pomalu utíkalo:
 *
 * 1. Osiřelé originály ve storage/tmp. Admin vybere fotky ve formuláři nového
 *    produktu a pak ho neuloží → originály zůstanou ležet, protože k nim
 *    nikdy nevznikl řádek ProductImage.
 *
 * 2. Fotky zaseknuté v CEKA. Když se v okamžiku nahrání nepodařilo oslovit
 *    frontu (`publishJob` vrátil null), fotka by čekala navěky.
 *
 * 3. Fotky zaseknuté v ZPRACOVAVA_SE. Worker si úlohu vyzvedl a spadl (nebo
 *    ho restartoval deploy) uprostřed práce – bez tohohle by fotka zůstala
 *    "zpracovává se" napořád a admin by koukal na věčný spinner.
 *
 * 4. Originály fotek, které skončily v CHYBA. Ty už nikdo nezpracuje, ale
 *    originál po nich zůstával na disku navždy – u fotky z mobilu až 15 MB
 *    za každý neúspěšný pokus.
 *
 * 5. Varianty WebP, ke kterým už neexistuje řádek v databázi (např. když
 *    smazání produktu selže mezi smazáním souborů a smazáním řádku).
 */
import path from 'path';
import fs from 'fs/promises';
import { db } from '../../lib/db';
import { TMP_DIR, UPLOAD_DIR, jePlatnyToken, smazatTise } from '../../lib/uloziste';
import { FRONTY, publishJob, type UlohaZpracovatObrazek } from '../../lib/queue';

/** Osiřelý originál starší než tohle už na nic nečeká. */
const STARI_HODIN = 24;

/** Jak dlouho čekáme, než fotku ve frontě prohlásíme za zaseknutou. */
const ZASEKNUTO_PO_MINUTACH = 5;

/**
 * Fotka ve ZPRACOVAVA_SE dostane víc času – běžící Sharp nechceme přerušit
 * druhou úlohou nad stejnými soubory. Ani velká fotka nezabere přes 15 minut.
 */
const ZPRACOVANI_MAX_MINUT = 15;

/** Po chybě necháme originál ještě chvíli ležet, kdyby admin sáhl po opakování. */
const CHYBA_UKLID_PO_MINUTACH = 60;

export async function uklidUlozisteUloha(): Promise<void> {
  await doplnitZaseknuteFotky();
  await uklidPoChybach();
  await smazatOsireleOriginaly();
  await smazatOsireleVarianty();
}

/** Fotky, které uvízly ve frontě nebo v rozpracovaném stavu, zařadíme znovu. */
async function doplnitZaseknuteFotky(): Promise<void> {
  const ted = Date.now();
  const cekaHranice = new Date(ted - ZASEKNUTO_PO_MINUTACH * 60 * 1000);
  const zpracovaniHranice = new Date(ted - ZPRACOVANI_MAX_MINUT * 60 * 1000);

  const zaseknute = await db.productImage.findMany({
    where: {
      originalSoubor: { not: null },
      OR: [
        { stavZpracovani: 'CEKA', createdAt: { lt: cekaHranice } },
        // Worker si ji vzal, ale nedokončil ji – typicky spadl nebo se
        // restartoval kontejner.
        { stavZpracovani: 'ZPRACOVAVA_SE', zpracovaniOd: { lt: zpracovaniHranice } },
        // Pojistka pro řádky z doby před zavedením `zpracovaniOd`.
        { stavZpracovani: 'ZPRACOVAVA_SE', zpracovaniOd: null, createdAt: { lt: zpracovaniHranice } },
      ],
    },
    select: { id: true, originalSoubor: true, stavZpracovani: true },
    take: 100,
  });

  for (const obrazek of zaseknute) {
    if (!obrazek.originalSoubor) continue;

    // Zpátky na CEKA, ať se stav shoduje s tím, co se právě děje.
    await db.productImage.update({
      where: { id: obrazek.id },
      data: { stavZpracovani: 'CEKA', zpracovaniOd: null },
    });

    const uloha: UlohaZpracovatObrazek = { obrazekId: obrazek.id, token: obrazek.originalSoubor };
    await publishJob(FRONTY.ZPRACOVAT_OBRAZEK, uloha);

    console.log(`[úklid] Fotka ${obrazek.id} uvízla (${obrazek.stavZpracovani}), zařazuji znovu.`);
  }
}

/**
 * Originály fotek, které skončily chybou. Řádek necháváme – admin má v
 * administraci vidět, že se fotka nepovedla a má ji nahrát znovu – ale
 * originál z disku pryč, jinak by tam ležel navždy.
 */
async function uklidPoChybach(): Promise<void> {
  const hranice = new Date(Date.now() - CHYBA_UKLID_PO_MINUTACH * 60 * 1000);

  const chybne = await db.productImage.findMany({
    where: {
      stavZpracovani: 'CHYBA',
      originalSoubor: { not: null },
      createdAt: { lt: hranice },
    },
    select: { id: true, originalSoubor: true },
    take: 100,
  });

  for (const obrazek of chybne) {
    if (!obrazek.originalSoubor || !jePlatnyToken(obrazek.originalSoubor)) continue;

    await smazatTise(path.join(process.cwd(), TMP_DIR, obrazek.originalSoubor));

    // Vynulovat je nutné – jinak by `smazatOsireleOriginaly` níž považoval
    // token za používaný a soubor by se nikdy nesmazal.
    await db.productImage.update({
      where: { id: obrazek.id },
      data: { originalSoubor: null },
    });

    console.log(`[úklid] Fotka ${obrazek.id} skončila chybou, originál smazán.`);
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

  // Chráníme jen originály, které ještě čekají na zpracování. Fotky v HOTOVO
  // mají `originalSoubor` vynulovaný, fotky v CHYBA jim ho vzal `uklidPoChybach`.
  //
  // Dotaz schválně nemá `take`: seznam musí být úplný. Ořízlý by znamenal, že
  // se za nepoužívaný prohlásí soubor, na který ještě čeká rozpracovaná úloha,
  // a úklid by ho smazal.
  const pouzivane = new Set(
    (
      await db.productImage.findMany({
        where: {
          originalSoubor: { not: null },
          stavZpracovani: { in: ['CEKA', 'ZPRACOVAVA_SE'] },
        },
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
    console.log(`[úklid] Smazáno ${smazano} osiřelých originálů, uvolněno ${formatMb(uvolneno)}.`);
  }
}

/**
 * Hotové WebP varianty bez odpovídajícího řádku v databázi.
 *
 * Mazání fotky i produktu soubory uklízí samo; tohle je záchranná síť pro
 * případ, že to mezi smazáním souborů a smazáním řádku spadne.
 */
async function smazatOsireleVarianty(): Promise<void> {
  const slozka = path.join(process.cwd(), UPLOAD_DIR);

  let soubory: string[];
  try {
    soubory = await fs.readdir(slozka);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw err;
  }

  // Název varianty je `<idObrázku>_large.webp` – z něj zpětně získáme id.
  const varianty = soubory.filter((s) => /^[a-z0-9]+_(large|medium|thumb)\.webp$/.test(s));
  if (varianty.length === 0) return;

  const idcka = Array.from(new Set(varianty.map((s) => s.split('_')[0])));

  const existujici = new Set(
    (
      await db.productImage.findMany({
        where: { id: { in: idcka } },
        select: { id: true },
      })
    ).map((o) => o.id)
  );

  const hranice = Date.now() - STARI_HODIN * 60 * 60 * 1000;
  let smazano = 0;
  let uvolneno = 0;

  for (const soubor of varianty) {
    if (existujici.has(soubor.split('_')[0])) continue;

    const cesta = path.join(slozka, soubor);

    try {
      const info = await fs.stat(cesta);
      // Mladé soubory necháme být – může jít o fotku, jejíž řádek se právě zakládá.
      if (info.mtimeMs > hranice) continue;

      await smazatTise(cesta);
      smazano++;
      uvolneno += info.size;
    } catch {
      // Soubor mezitím zmizel – nic se neděje.
    }
  }

  if (smazano > 0) {
    console.log(`[úklid] Smazáno ${smazano} osiřelých WebP variant, uvolněno ${formatMb(uvolneno)}.`);
  }
}

function formatMb(bajtu: number): string {
  return bajtu > 1024 * 1024
    ? `${(bajtu / 1024 / 1024).toFixed(1)} MB`
    : `${Math.round(bajtu / 1024)} kB`;
}
