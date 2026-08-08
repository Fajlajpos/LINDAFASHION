import { z } from 'zod';
import { odpovedChyba, odpovedOk, jeStejnyPuvod, zpracovatChybu } from '@/lib/api';
import { overitDostupnost } from '@/lib/kosik-server';

export const dynamic = 'force-dynamic';

const schema = z.object({
  polozky: z
    .array(
      z.object({
        variantId: z.string().min(1),
        mnozstvi: z.coerce.number().int().min(1).max(99),
      })
    )
    .max(100),
});

/**
 * POST /api/kosik/overit – přepočet košíku, který žije jen v prohlížeči.
 *
 * Protějšek `/api/kosik` pro nepřihlášenou zákaznici: nic neukládá, jen vrátí
 * aktuální ceny a skladovost. Bez něj si košík držel údaje z okamžiku vložení,
 * takže o zdražení nebo vyprodání se zákaznice dozvěděla až v pokladně.
 *
 * Ceny odsud jsou informativní; objednávku stejně počítá server znovu.
 */
export async function POST(request: Request) {
  try {
    if (!jeStejnyPuvod(request)) return odpovedChyba('Neplatný požadavek.', 403);

    const { polozky } = schema.parse(await request.json());
    const kosik = await overitDostupnost(polozky);

    return odpovedOk({ prihlasen: false, polozky: kosik.polozky, odebrano: kosik.odebrano });
  } catch (err) {
    return zpracovatChybu(err);
  }
}
