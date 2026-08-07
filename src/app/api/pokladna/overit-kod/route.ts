import { z } from 'zod';
import { db } from '@/lib/db';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';
import { klientskaIp, zkontrolovatLimit } from '@/lib/rate-limit';
import { czkNaHalere, halereNaCzk } from '@/lib/penize';

export const dynamic = 'force-dynamic';

const schema = z.object({
  typ: z.enum(['slevovy-kod', 'darkovy-poukaz']),
  kod: z.string().min(1, 'Zadejte kód.').max(60).transform((v) => v.trim().toUpperCase()),
});

/**
 * POST /api/pokladna/overit-kod – ověření slevového kódu nebo poukazu
 * ještě před odesláním objednávky, ať zákaznice nevyplní celý formulář
 * a nedozví se až na konci, že kód neplatí.
 *
 * Skutečné uplatnění se stejně kontroluje znovu při zakládání objednávky –
 * tohle je jen pohodlí, ne autorita.
 */
export async function POST(request: Request) {
  try {
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    // Bez brzdy by šlo přes tenhle endpoint uhádnout platné kódy hrubou silou.
    const limit = zkontrolovatLimit(`kod:${klientskaIp(request)}`, 20, 10 * 60 * 1000);
    if (!limit.povoleno) {
      return odpovedChyba('Příliš mnoho pokusů. Zkuste to prosím za chvíli.', 429);
    }

    const { typ, kod } = schema.parse(await request.json());
    const ted = new Date();

    if (typ === 'slevovy-kod') {
      const zaznam = await db.discountCode.findUnique({ where: { kod } });

      const platny =
        zaznam &&
        zaznam.aktivni &&
        (!zaznam.platnyOd || zaznam.platnyOd <= ted) &&
        (!zaznam.platnyDo || zaznam.platnyDo >= ted) &&
        (zaznam.limitPouziti === null || zaznam.pocetPouziti < zaznam.limitPouziti);

      if (!platny) {
        return odpovedChyba('Zkontrolujte prosím vyplněné údaje.', 422, {
          slevovyKod: 'Tento slevový kód není platný.',
        });
      }

      return odpovedOk({
        typ,
        kod,
        procentoSlevy: zaznam.procentoSlevy,
        popis: `Sleva ${zaznam.procentoSlevy} % byla uplatněna.`,
      });
    }

    const poukaz = await db.giftCard.findUnique({ where: { kod } });

    const platny =
      poukaz && poukaz.aktivni && (!poukaz.platnyDo || poukaz.platnyDo >= ted) && czkNaHalere(poukaz.zustatek) > 0;

    if (!platny) {
      return odpovedChyba('Zkontrolujte prosím vyplněné údaje.', 422, {
        darkovyPoukaz: 'Tento dárkový poukaz není platný nebo je vyčerpaný.',
      });
    }

    const zustatek = halereNaCzk(czkNaHalere(poukaz.zustatek));

    return odpovedOk({
      typ,
      kod,
      zustatek,
      popis: `Na poukazu zbývá ${zustatek.toLocaleString('cs-CZ')} Kč.`,
    });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
