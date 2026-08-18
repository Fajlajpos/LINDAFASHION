import { z } from 'zod';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';
import { klientskaIp, zkontrolovatLimit } from '@/lib/rate-limit';
import { VERZE_ZASAD_COOKIES, zaznamenatSouhlas } from '@/lib/souhlasy';

export const dynamic = 'force-dynamic';

const schema = z.object({
  /*
   * Náhodný identifikátor návštěvnice, který si drží prohlížeč.
   *
   * Schválně ho posílá klient a schválně **není** odvozený z IP ani z otisku
   * prohlížeče: takový klíč by sám o sobě byl sledováním, které tenhle souhlas
   * teprve povoluje. Server ho jen zapíše — je to spojnice mezi několika
   * rozhodnutími téže návštěvnice, ne identifikace osoby.
   */
  subjekt: z.string().min(8).max(80),
  analyticke: z.boolean(),
  marketingove: z.boolean(),
});

/**
 * POST /api/souhlas – evidence rozhodnutí o cookies (čl. 7 odst. 1 GDPR).
 *
 * Souhlas do téhle chvíle žil jen v `localStorage`. To znamená, že ho měla
 * v ruce návštěvnice a správce ne — přesně naopak, než jak zní povinnost
 * „být schopen doložit".
 *
 * Endpoint je bez přihlášení, protože rozhoduje i nepřihlášená návštěvnice.
 * Nic nevrací a nic nenastavuje: lišta funguje dál i tehdy, když zápis selže.
 * Souhlas je věc prohlížeče, evidence je věc serveru, a jedno nesmí zablokovat
 * druhé — nedostupná databáze nesmí znamenat, že se web nedá odklikat.
 */
export async function POST(request: Request) {
  try {
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const ip = klientskaIp(request);

    // Lišta se dá odklikat několikrát (změna předvoleb), ale ne donekonečna —
    // jinak je z endpointu zapisovadlo do cizí databáze.
    const limit = zkontrolovatLimit(`souhlas:${ip}`, 30, 60 * 60 * 1000);
    if (!limit.povoleno) {
      return odpovedChyba('Příliš mnoho pokusů. Zkuste to prosím později.', 429);
    }

    const vstup = schema.parse(await request.json());

    await zaznamenatSouhlas({
      typ: 'COOKIES',
      subjekt: vstup.subjekt,
      /*
       * `udeleno` je souhrn: udělila návštěvnice souhlas s čímkoliv volitelným?
       * Rozpis, s čím přesně, je v `podrobnosti` — bez něj by se nedalo
       * doložit, že marketing zapnutý nebyl.
       */
      udeleno: vstup.analyticke || vstup.marketingove,
      podrobnosti: { analyticke: vstup.analyticke, marketingove: vstup.marketingove },
      verze: VERZE_ZASAD_COOKIES,
      ip,
      userAgent: request.headers.get('user-agent'),
    });

    return odpovedOk({ zapsano: true });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
