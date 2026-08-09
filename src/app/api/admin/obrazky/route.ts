import { db } from '@/lib/db';
import { odpovedChyba, odpovedOk, zpracovatChybu } from '@/lib/api';
import { overitAdmina, odpovedNeautorizovano } from '@/lib/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/obrazky?produkt=<id>
 * GET /api/admin/obrazky?ids=<id>,<id>
 *
 * Polling stavu zpracování (sekce 9, krok 5). Websocket by tu byl zbytečný –
 * administraci stačí dotaz jednou za pár sekund, a jen dokud něco čeká.
 */
export async function GET(request: Request) {
  try {
    if (!(await overitAdmina())) return odpovedNeautorizovano();

    const url = new URL(request.url);
    const produkt = url.searchParams.get('produkt');
    const ids = url.searchParams.get('ids')?.split(',').filter(Boolean);

    if (!produkt && (!ids || ids.length === 0)) {
      return odpovedChyba('Chybí parametr `produkt` nebo `ids`.', 400);
    }

    const obrazky = await db.productImage.findMany({
      where: produkt ? { productId: produkt } : { id: { in: ids } },
      orderBy: { poradi: 'asc' },
      select: {
        id: true,
        url: true,
        urlMedium: true,
        urlThumb: true,
        sirka: true,
        vyska: true,
        altText: true,
        poradi: true,
        jeHlavni: true,
        stavZpracovani: true,
        chybaDuvod: true,
        // Podle stáří pozná administrace fotku, kterou si nikdo nevyzvedl –
        // typicky proto, že neběží worker. Bez toho by u ní točila spinner
        // donekonečna a tvrdila, že se zpracovává.
        createdAt: true,
        zpracovaniOd: true,
      },
    });

    return odpovedOk({
      obrazky,
      // Dokud je tohle true, administrace se ptá dál; pak polling zastaví.
      zpracovavaSe: obrazky.some((o) => o.stavZpracovani === 'CEKA' || o.stavZpracovani === 'ZPRACOVAVA_SE'),
    });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
