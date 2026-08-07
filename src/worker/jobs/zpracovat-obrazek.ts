/**
 * Úloha: zpracování nahrané fotky Sharpem (sekce 9 zadání).
 *
 * Tohle je ta část, kvůli které vůbec existuje samostatný `worker` kontejner.
 * Zmenšení a komprese jedné fotky trvá stovky milisekund a vytíží CPU –
 * kdyby běželo v `web`, dvacet fotek najednou by zpomalilo i běžné nakupující.
 */
import { db } from '../../lib/db';
import { zpracovatObrazek } from '../../lib/sharp-image';
import { cestaTmp, jePlatnyToken, smazatTise } from '../../lib/uloziste';
import type { UlohaZpracovatObrazek } from '../../lib/queue';

function formatKb(bajtu: number): string {
  return `${Math.round(bajtu / 1024)} kB`;
}

export async function zpracovatObrazekUloha(data: UlohaZpracovatObrazek): Promise<void> {
  const { obrazekId, token } = data;

  if (!obrazekId || !token || !jePlatnyToken(token)) {
    console.error('[obrázek] Úloha má neplatná data:', data);
    return;
  }

  const obrazek = await db.productImage.findUnique({
    where: { id: obrazekId },
    select: { id: true, stavZpracovani: true, productId: true },
  });

  // Fotku mohl admin mezitím smazat – originál po sobě ukliďme a končíme.
  if (!obrazek) {
    console.warn(`[obrázek] ${obrazekId} už v databázi není, mažu dočasný originál.`);
    await smazatTise(cestaTmp(token));
    return;
  }

  if (obrazek.stavZpracovani === 'HOTOVO') {
    return; // pg-boss úlohu zopakoval, ale práce už je hotová
  }

  // `zpracovaniOd` je značka pro úklid: podle ní pozná fotku, která uvízla
  // v rozpracovaném stavu, protože worker mezitím spadl.
  await db.productImage.update({
    where: { id: obrazekId },
    data: { stavZpracovani: 'ZPRACOVAVA_SE', chybaDuvod: null, zpracovaniOd: new Date() },
  });

  try {
    const vysledek = await zpracovatObrazek(cestaTmp(token), obrazekId);

    await db.productImage.update({
      where: { id: obrazekId },
      data: {
        url: vysledek.large.url,
        urlMedium: vysledek.medium.url,
        urlThumb: vysledek.thumb.url,
        sirka: vysledek.large.sirka,
        vyska: vysledek.large.vyska,
        stavZpracovani: 'HOTOVO',
        chybaDuvod: null,
        // Originál je smazaný, odkaz na něj by už jen mátl.
        originalSoubor: null,
        zpracovaniOd: null,
      },
    });

    const poZpracovani = vysledek.large.bajtu + vysledek.medium.bajtu + vysledek.thumb.bajtu;
    const uspora =
      vysledek.puvodniBajtu > 0
        ? ` (úspora ${Math.round((1 - poZpracovani / vysledek.puvodniBajtu) * 100)} %)`
        : '';

    console.log(
      `[obrázek] ${obrazekId} hotovo: ${formatKb(vysledek.puvodniBajtu)} → ${formatKb(poZpracovani)}${uspora}`
    );
  } catch (err) {
    const duvod = err instanceof Error ? err.message : 'Neznámá chyba při zpracování.';

    // Stav CHYBA i s důvodem, ať admin v administraci vidí, že má fotku
    // nahrát znovu (sekce 9, krok 4).
    await db.productImage.update({
      where: { id: obrazekId },
      data: {
        stavZpracovani: 'CHYBA',
        chybaDuvod: duvod.slice(0, 500),
        zpracovaniOd: null,
        // `originalSoubor` tu schválně necháváme – pg-boss úlohu ještě zopakuje
        // a bez originálu by neměl s čím pracovat. Až se pokusy vyčerpají,
        // originál z disku odstraní úklidová úloha (uklid-uloziste.ts).
      },
    });

    console.error(`[obrázek] ${obrazekId} selhalo:`, duvod);

    // Vyhodíme dál – pg-boss si úlohu zopakuje (retryLimit v queue.ts).
    throw err;
  }
}
