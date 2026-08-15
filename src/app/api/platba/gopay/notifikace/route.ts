import { NextResponse } from 'next/server';
import { odpovedChyba, zpracovatChybu } from '@/lib/api';
import { klientskaIp, zkontrolovatLimit } from '@/lib/rate-limit';
import { jeNastaveno } from '@/lib/gopay';
import { vyhodnotitPlatbu } from '@/lib/platba';

export const dynamic = 'force-dynamic';

/**
 * Notifikace o změně stavu platby (server → server).
 *
 * GoPay tuhle adresu volá metodou GET s parametrem `id` (id platby). Nic víc
 * v požadavku není – a hlavně v něm **není informace, že je zaplaceno**.
 * Adresa je veřejná, takže kdokoliv, kdo uhodne id, ji umí zavolat; proto se
 * stav vždycky doptá zpátky u brány ([platba.ts](src/lib/platba.ts)).
 *
 * `jeStejnyPuvod` se tu volat nesmí: požadavek přichází ze serverů GoPay,
 * ne z prohlížeče, takže žádný `Origin` ani `Sec-Fetch-Site` nenese a kontrola
 * by ho odmítla. Autorizací je zpětný dotaz na bránu.
 *
 * **Odpovídá se 200 i na neznámé id.** Brána nedoručenou notifikaci opakuje;
 * u platby, která k nám nepatří, by opakování nikdy neskončilo. Chybu 5xx si
 * necháváme na případ, kdy má opakování smysl (nedostupná databáze, výpadek
 * brány).
 */
async function zpracovat(request: Request) {
  try {
    if (!jeNastaveno()) {
      // Bez klíčů nemáme jak stav ověřit; 503 je pravdivější než tiché 200.
      return odpovedChyba('Platební brána není nastavená.', 503);
    }

    /*
     * Brzda proti zahlcení. Limit je vysoký schválně – notifikace chodí
     * ze serverů GoPay, takže všechny sdílejí pár IP adres. Nižší hodnota
     * by při větším provozu zahazovala vlastní notifikace.
     */
    const limit = zkontrolovatLimit(`gopay-notifikace:${klientskaIp(request)}`, 600, 10 * 60 * 1000);
    if (!limit.povoleno) {
      // 429 je tady na místě: brána si notifikaci zopakuje později.
      return odpovedChyba('Příliš mnoho požadavků.', 429);
    }

    const platbaId = new URL(request.url).searchParams.get('id')?.trim();

    if (!platbaId) {
      return odpovedChyba('Chybí identifikátor platby.', 400);
    }

    const vysledek = await vyhodnotitPlatbu(platbaId);

    if (vysledek.stav === 'neznama') {
      console.warn(`[gopay] Notifikace k neznámé platbě ${platbaId} – ignorováno.`);
    }

    // Tělo brána nečte, zajímá ji jen stavový kód.
    return NextResponse.json({ prijato: true }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return zpracovatChybu(err);
  }
}

export const GET = zpracovat;

/**
 * POST je tu jen jako pojistka: GoPay dnes notifikuje GETem, ale změna metody
 * na jejich straně by jinak znamenala tiše nedoručované platby.
 */
export const POST = zpracovat;
